"use client";

import { Fragment, useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  MapPin,
  Check,
  AlertTriangle,
  Minus,
  Plus,
  ShoppingCart,
  Package,
} from "lucide-react";
import { collection, addDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeParties } from "@/lib/parties";
import { subscribeColors } from "@/lib/colors";
import type { Party, Color } from "@/lib/types";

interface SelectedColor {
  colour: string;
  hex: string;
  category: string;
  subCategory: string;
  quantity: number;
  currentStock: number;
}

const LIGHT_HEXES = new Set(["#ffffff", "#fffdd0", "#fff700", "#f1f359", "#fff04d", "#ffb6c1", "#68ffd1", "#00ffff", "#9ecc1f", "#6cf205", "#fc97a7", "#afaffa", "#ffc400", "#ffcba4", "#93c572", "#71bce1"]);

const CAT_STYLES: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
  "5 TAR": { bg: "bg-sky-400/10", border: "border-sky-200", text: "text-sky-600", lightBg: "bg-sky-50" },
  "3 TAR": { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600", lightBg: "bg-purple-50" },
  "YARN": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", lightBg: "bg-amber-50" },
};

const DEFAULT_CAT_STYLE = { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", lightBg: "bg-slate-50" };

function getCatStyle(cat: string) {
  return CAT_STYLES[cat] ?? DEFAULT_CAT_STYLE;
}

function colorKey(c: SelectedColor): string {
  return `${c.category}::${c.subCategory}::${c.colour}`;
}

function stockColor(stock: number): string {
  if (stock < 0) return "text-red-500";
  if (stock === 0) return "text-slate-400";
  if (stock <= 10) return "text-amber-500";
  return "text-blue-600";
}

function stockBg(stock: number): string {
  if (stock < 0) return "bg-red-50";
  if (stock === 0) return "bg-slate-50";
  if (stock <= 10) return "bg-amber-50";
  return "bg-blue-50";
}

export default function CreateOrderPage() {
  const router = useRouter();

  const [parties, setParties] = useState<Party[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [formParty, setFormParty] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formAddress, setFormAddress] = useState("");
  const [formRoute, setFormRoute] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const partyRef = useRef<HTMLDivElement>(null);

  const [activeCat, setActiveCat] = useState("");
  const [activeSubCat, setActiveSubCat] = useState("");
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeParties(setParties);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = subscribeColors(setColors);
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (partyRef.current && !partyRef.current.contains(e.target as Node)) {
        setPartyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const categories = useMemo(() => [...new Set(colors.map(c => c.category))], [colors]);
  const subCategories = useMemo(() => [...new Set(colors.map(c => c.subCategory).filter(Boolean))], [colors]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCat)) {
      setActiveCat(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (subCategories.length > 0 && !subCategories.includes(activeSubCat)) {
      setActiveSubCat(subCategories[0]);
    }
  }, [subCategories]);

  const filteredParties = useMemo(() => {
    const q = partySearch.toLowerCase();
    return parties.filter((p) => !q || p.name.toLowerCase().includes(q) || p.route.toLowerCase().includes(q));
  }, [partySearch, parties]);

  const currentCatColors = useMemo(() =>
    colors.filter((c) => c.category === activeCat),
    [colors, activeCat]
  );

  const SUB_CAT_ORDER = ["Celtionic", "Litchy", "Polyester", "Multy", "Rani multy"];

  const colorsBySubCat = useMemo(() => {
    const map = new Map<string, Color[]>();
    for (const c of currentCatColors) {
      const list = map.get(c.subCategory) ?? [];
      list.push(c);
      map.set(c.subCategory, list);
    }
    const sorted = new Map<string, Color[]>();
    for (const sub of SUB_CAT_ORDER) {
      if (map.has(sub)) { sorted.set(sub, map.get(sub)!); map.delete(sub); }
    }
    for (const [sub, cols] of map) sorted.set(sub, cols);
    return sorted;
  }, [currentCatColors]);

  const summaryByCat = useMemo(() => {
    const map: Record<string, SelectedColor[]> = {};
    for (const c of selectedColors) {
      (map[c.category] ??= []).push(c);
    }
    return map;
  }, [selectedColors]);

  const totalSelectedQty = useMemo(() =>
    selectedColors.reduce((s, c) => s + c.quantity, 0),
    [selectedColors]
  );

  function selectParty(party: Party) {
    setFormParty(party.name);
    setFormAddress(party.address);
    setFormRoute(party.route);
    setPartyDropdownOpen(false);
    setPartySearch("");
  }

  function addColor(color: Color) {
    const key = `${color.category}::${color.subCategory}::${color.name}`;
    setSelectedColors((prev) => {
      const idx = prev.findIndex((c) => colorKey(c) === key);
      if (idx >= 0) {
        return prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        colour: color.name,
        hex: color.hex,
        category: color.category,
        subCategory: color.subCategory,
        quantity: 1,
        currentStock: color.currentStock,
      }];
    });
  }

  function getQtyForColor(color: Color): number {
    const key = `${color.category}::${color.subCategory}::${color.name}`;
    const found = selectedColors.find((c) => colorKey(c) === key);
    return found ? found.quantity : 0;
  }

  function updateQty(key: string, qty: number) {
    if (qty <= 0) {
      setSelectedColors((prev) => prev.filter((c) => colorKey(c) !== key));
      return;
    }
    setSelectedColors((prev) =>
      prev.map((c) => colorKey(c) === key ? { ...c, quantity: qty } : c)
    );
  }

  function removeColor(key: string) {
    setSelectedColors((prev) => prev.filter((c) => colorKey(c) !== key));
  }

  async function saveOrder(type: "Running" | "Complete"): Promise<string | null> {
    if (!formParty.trim() || !formDate || saving) return null;
    setSaving(true);

    try {
      const items = selectedColors.map((c) => ({
        category: c.category,
        material: c.subCategory,
        color: c.colour,
        orderedQty: c.quantity,
        deliveredQty: type === "Complete" ? c.quantity : 0,
      }));

      const grandTotalOrdered = items.reduce((s, i) => s + i.orderedQty, 0);
      const grandTotalDelivered = type === "Complete" ? grandTotalOrdered : 0;

      const ref = await addDoc(collection(db, "orders"), {
        partyName: formParty,
        partyAddress: formAddress,
        route: formRoute,
        orderDate: formDate,
        type,
        items,
        grandTotalOrdered,
        grandTotalDelivered,
        createdAt: new Date().toISOString(),
      });

      const batch = writeBatch(db);
      for (const sc of selectedColors) {
        const colorDoc = colors.find(
          (c) => c.name === sc.colour && c.category === sc.category && c.subCategory === sc.subCategory
        );
        if (colorDoc) {
          batch.update(doc(db, "colors", colorDoc.id), {
            currentStock: colorDoc.currentStock - sc.quantity,
          });
        }
      }
      await batch.commit();

      return ref.id;
    } catch (err) {
      console.error("Failed to create order:", err);
      setSaving(false);
      return null;
    }
  }

  async function handleHold() {
    const id = await saveOrder("Running");
    if (id) router.push("/running-orders");
  }

  function handleClear() {
    setSelectedColors([]);
  }

  async function handleBill() {
    const id = await saveOrder("Complete");
    if (id) router.push(`/order-bill/${id}`);
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl card-shadow p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <div className="relative" ref={partyRef}>
            <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Party Name *</label>
            <button
              onClick={() => setPartyDropdownOpen((v) => !v)}
              className={`w-full h-11 px-4 rounded-xl border-2 text-left text-[0.9rem] flex items-center justify-between transition-all ${formParty ? "border-blue-300 bg-blue-50/50 text-slate-800 font-medium" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}
            >
              <span className="truncate">{formParty || "Select party..."}</span>
              <Search className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.8} />
            </button>
            {partyDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border-2 border-slate-100 shadow-xl z-50 animate-[fadeIn_100ms_ease-out]">
                <div className="p-3 border-b border-slate-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" strokeWidth={1.8} />
                    <input
                      autoFocus
                      value={partySearch}
                      onChange={(e) => setPartySearch(e.target.value)}
                      placeholder="Search party..."
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border-0 text-[0.85rem] text-slate-700 placeholder:text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto py-2">
                  {filteredParties.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => selectParty(p)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors ${formParty === p.name ? "bg-blue-50" : ""}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-[0.65rem] font-bold text-blue-700 shrink-0">
                        {p.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.85rem] font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[0.72rem] text-slate-400 truncate">{p.route} — {p.address}</p>
                      </div>
                      {formParty === p.name && <Check className="w-4 h-4 text-blue-500 shrink-0" strokeWidth={2.5} />}
                    </button>
                  ))}
                  {filteredParties.length === 0 && (
                    <p className="px-4 py-6 text-center text-[0.85rem] text-slate-400">No parties found</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Route</label>
            <div className={`h-11 px-4 rounded-xl border-2 flex items-center text-[0.9rem] ${formRoute ? "border-blue-200 bg-blue-50/30 text-slate-800 font-medium" : "border-slate-200 bg-slate-50 text-slate-300"}`}>
              <MapPin className="w-4 h-4 mr-2 text-slate-300 shrink-0" strokeWidth={1.8} />
              {formRoute || "Auto-filled"}
            </div>
          </div>
          <div>
            <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Date *</label>
            <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 text-[0.9rem] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
          </div>
          <div>
            <label className="text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 block mb-2">Notes</label>
            <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes"
              className="w-full h-11 px-4 rounded-xl border-2 border-slate-200 text-[0.9rem] text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all" />
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="flex-1 bg-white rounded-2xl card-shadow overflow-hidden min-w-0 w-full">
          <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-slate-100">
            {categories.map((cat) => {
              const cs = getCatStyle(cat);
              const active = activeCat === cat;
              const catColors = summaryByCat[cat];
              const catQty = catColors ? catColors.reduce((s, c) => s + c.quantity, 0) : 0;
              return (
                <button
                  key={cat}
                  onClick={() => { setActiveCat(cat); setActiveSubCat(subCategories[0] ?? ""); }}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[0.88rem] font-semibold border-2 transition-all ${active ? `${cs.bg} ${cs.border} ${cs.text}` : "border-transparent text-slate-400 hover:bg-slate-50"}`}
                >
                  {cat}
                  {catQty > 0 && (
                    <span className={`min-w-6 h-6 px-1.5 rounded-full text-[0.7rem] font-bold flex items-center justify-center ${active ? `${cs.text} bg-white/70` : "bg-slate-100 text-slate-500"}`}>
                      {catQty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 max-h-[600px] overflow-y-auto space-y-6">
            {Array.from(colorsBySubCat.entries()).map(([subCat, subColors]) => (
              <div key={subCat}>
                <h3 className="text-[0.95rem] font-bold text-slate-700 mb-3">{subCat} :-</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
                  {subColors.map((color) => {
                    const qty = getQtyForColor(color);
                    const isLightHex = LIGHT_HEXES.has(color.hex);
                    return (
                      <div
                        key={color.id}
                        className={`rounded-xl overflow-hidden transition-all duration-150 ${
                          qty > 0
                            ? "shadow-md ring-2 ring-blue-400"
                            : "shadow-sm hover:shadow-md"
                        }`}
                      >
                        <button
                          onClick={() => addColor(color)}
                          className="w-full active:scale-95 transition-transform"
                        >
                          <div
                            className={`h-2.5 w-full ${isLightHex ? "border-b border-slate-200" : ""}`}
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="bg-slate-50/80 px-2 py-2.5 text-center">
                            <p className="text-[0.82rem] font-semibold text-blue-700 truncate">{color.name}</p>
                            <p className={`text-[0.95rem] font-bold tabular-nums mt-0.5 ${stockColor(color.currentStock)}`}>
                              {color.currentStock}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center bg-white border-t border-slate-100">
                          <button
                            onClick={() => updateQty(`${color.category}::${color.subCategory}::${color.name}`, qty - 1)}
                            className="flex items-center justify-center w-10 h-8 border-r border-slate-100 text-slate-500 hover:bg-slate-50 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="flex-1 text-center text-[0.84rem] font-bold tabular-nums text-slate-700">{qty}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-[400px] lg:shrink-0 lg:sticky lg:top-20">
          <div className="bg-white rounded-2xl card-shadow flex flex-col max-h-[calc(100vh-140px)]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
                <h4 className="text-[0.95rem] font-bold text-slate-800">Order Summary</h4>
              </div>
              {selectedColors.length > 0 && (
                <span className="text-[0.72rem] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {totalSelectedQty} qty
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedColors.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 px-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-[0.9rem] font-medium text-slate-500">No colors selected</p>
                  <p className="text-[0.74rem] text-slate-400 mt-1.5">Click colors on the left to add them</p>
                </div>
              ) : (
                <div>
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 py-2.5 pl-5 pr-2">Color</th>
                        <th className="text-center text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 py-2.5 px-2 w-14">Req.</th>
                        <th className="text-center text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 py-2.5 px-2 w-16">Stock</th>
                        <th className="text-center text-[0.68rem] font-semibold uppercase tracking-wider text-slate-400 py-2.5 pl-2 pr-5 w-28">Add</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => {
                        const catColors = summaryByCat[cat];
                        if (!catColors || catColors.length === 0) return null;
                        const cs = getCatStyle(cat);
                        const catTotalQty = catColors.reduce((s, c) => s + c.quantity, 0);
                        return (
                          <Fragment key={cat}>
                            <tr className={cs.lightBg}>
                              <td colSpan={4} className={`py-2 pl-5 pr-5 ${cs.text}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[0.76rem] font-bold">{cat}</span>
                                  <span className="text-[0.7rem] font-bold tabular-nums">{catTotalQty}</span>
                                </div>
                              </td>
                            </tr>
                            {catColors.map((c) => {
                              const key = colorKey(c);
                              const isLightHex = LIGHT_HEXES.has(c.hex);
                              return (
                                <tr key={key} className="border-b border-slate-50 group hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2 pl-5 pr-2">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-5 h-5 rounded shrink-0 ${isLightHex ? "border border-slate-200" : ""}`}
                                        style={{ backgroundColor: c.hex }}
                                      />
                                      <div className="min-w-0">
                                        <span className="text-[0.76rem] font-semibold text-slate-800 truncate block">{c.colour}</span>
                                        <span className="text-[0.58rem] text-slate-300">{c.subCategory}</span>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); removeColor(key); }}
                                        className="p-0.5 rounded text-slate-200 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                      >
                                        <X className="w-3 h-3" strokeWidth={2} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <span className="text-[0.78rem] font-bold tabular-nums text-slate-800">{c.quantity}</span>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <span className={`text-[0.74rem] font-bold tabular-nums ${stockColor(c.currentStock)}`}>{c.currentStock}</span>
                                  </td>
                                  <td className="py-2 pl-2 pr-5">
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); updateQty(key, c.quantity - 1); }}
                                        className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                      >
                                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                                      </button>
                                      <input
                                        type="number"
                                        value={c.quantity}
                                        onChange={(e) => updateQty(key, parseInt(e.target.value) || 0)}
                                        className="w-9 h-6 text-center rounded-md border border-slate-200 text-[0.74rem] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button
                                        onClick={(e) => { e.stopPropagation(); updateQty(key, c.quantity + 1); }}
                                        className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                                      >
                                        <Plus className="w-3 h-3" strokeWidth={2.5} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                      <tr className="bg-slate-800">
                        <td className="py-3 pl-5 pr-2">
                          <span className="text-[0.78rem] font-semibold text-white">Total</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-[0.82rem] font-bold tabular-nums text-white">{totalSelectedQty}</span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-[0.72rem] text-slate-400">{selectedColors.length} colors</span>
                        </td>
                        <td className="py-3 pl-2 pr-5 text-center">
                          <span className="text-[0.78rem] font-bold tabular-nums text-white">{totalSelectedQty}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleHold}
                  disabled={!formParty || !formDate || selectedColors.length === 0 || saving}
                  className="flex-1 h-10 rounded-xl border-2 border-sky-300 text-[0.84rem] font-medium text-sky-600 hover:bg-sky-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Hold"}
                </button>
                <button
                  onClick={handleClear}
                  disabled={selectedColors.length === 0}
                  className="flex-1 h-10 rounded-xl border-2 border-slate-200 text-[0.84rem] font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  onClick={handleBill}
                  disabled={!formParty || !formDate || selectedColors.length === 0 || saving}
                  className="flex-1 h-10 rounded-xl bg-blue-500 text-white text-[0.84rem] font-medium hover:bg-blue-600 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
