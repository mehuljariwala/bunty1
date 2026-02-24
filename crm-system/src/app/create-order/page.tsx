"use client";

import { Fragment, Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, Loader2 } from "lucide-react";
import { collection, addDoc, doc, writeBatch, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { subscribeParties } from "@/lib/parties";
import { subscribeColors } from "@/lib/colors";
import { getOrder, updateOrder } from "@/lib/orders";
import type { Party, Color } from "@/lib/types";

interface SelectedColor {
  colour: string;
  hex: string;
  category: string;
  subCategory: string;
  quantity: number;
  deliveredQty: number;
  currentStock: number;
}

const LIGHT_HEXES = new Set([
  "#ffffff",
  "#fffdd0",
  "#fff700",
  "#f1f359",
  "#fff04d",
  "#ffb6c1",
  "#68ffd1",
  "#00ffff",
  "#9ecc1f",
  "#6cf205",
  "#fc97a7",
  "#afaffa",
  "#ffc400",
  "#ffcba4",
  "#93c572",
  "#71bce1",
]);

const SUB_CAT_ORDER = [
  "Celtionic",
  "Litchy",
  "Polyester",
  "Multy",
  "Rani multy",
];

function colorKey(c: SelectedColor): string {
  return `${c.category}::${c.subCategory}::${c.colour}`;
}

function stockColor(stock: number): string {
  if (stock < 0) return "text-red-500";
  if (stock === 0) return "text-crm-text-muted";
  if (stock <= 10) return "text-amber-500";
  return "text-crm-text";
}

export default function CreateOrderPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2
            className="w-8 h-8 text-crm-primary animate-spin"
            strokeWidth={1.8}
          />
        </div>
      }
    >
      <CreateOrderPage />
    </Suspense>
  );
}

function CreateOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partyIdFromUrl = searchParams.get("partyId");
  const editOrderId = searchParams.get("edit");

  const [parties, setParties] = useState<Party[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [formDate, setFormDate] = useState(
    new Date()
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-"),
  );
  const [activeCat, setActiveCat] = useState("");
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editOrderCsvId, setEditOrderCsvId] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeParties((loaded) => {
      setParties(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = subscribeColors(setColors);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!partyIdFromUrl || parties.length === 0 || selectedParty) return;
    const match = parties.find((p) => p.id === partyIdFromUrl);
    if (match) setSelectedParty(match);
  }, [partyIdFromUrl, parties]);

  useEffect(() => {
    if (!editOrderId || parties.length === 0 || colors.length === 0) return;
    getOrder(editOrderId).then((order) => {
      if (!order) return;
      setEditOrderCsvId(order.csvId);
      const party = parties.find((p) => p.name === order.partyName);
      if (party) setSelectedParty(party);
      const d = new Date(order.orderDate + "T00:00:00");
      setFormDate(
        d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-"),
      );
      if (order.items && order.items.length > 0) {
        const prefilled: SelectedColor[] = order.items.map((item) => {
          const colorDoc = colors.find(
            (c) => c.name === item.color && c.category === item.category && c.subCategory === item.material,
          );
          return {
            colour: item.color,
            hex: colorDoc?.hex ?? "#ccc",
            category: item.category,
            subCategory: item.material,
            quantity: item.orderedQty,
            deliveredQty: item.deliveredQty,
            currentStock: colorDoc?.currentStock ?? 0,
          };
        });
        setSelectedColors(prefilled);
      }
    });
  }, [editOrderId, parties, colors]);

  useEffect(() => {
    const raw = sessionStorage.getItem("ai-order-prefill");
    if (!raw) return;
    sessionStorage.removeItem("ai-order-prefill");
    try {
      const items = JSON.parse(raw) as SelectedColor[];
      if (Array.isArray(items) && items.length > 0) {
        setSelectedColors(items);
      }
    } catch { /* ignore */ }
  }, []);

  const categories = useMemo(
    () => [...new Set(colors.map((c) => c.category))],
    [colors],
  );

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(activeCat)) {
      setActiveCat(categories[0]);
    }
  }, [categories]);

  const currentCatColors = useMemo(
    () => colors.filter((c) => c.category === activeCat),
    [colors, activeCat],
  );

  const colorsBySubCat = useMemo(() => {
    const map = new Map<string, Color[]>();
    for (const c of currentCatColors) {
      const list = map.get(c.subCategory) ?? [];
      list.push(c);
      map.set(c.subCategory, list);
    }
    const sorted = new Map<string, Color[]>();
    for (const sub of SUB_CAT_ORDER) {
      if (map.has(sub)) {
        sorted.set(sub, map.get(sub)!);
        map.delete(sub);
      }
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

  const totalSelectedQty = useMemo(
    () => selectedColors.reduce((s, c) => s + c.quantity, 0),
    [selectedColors],
  );

  function addColor(color: Color) {
    const key = `${color.category}::${color.subCategory}::${color.name}`;
    setSelectedColors((prev) => {
      const idx = prev.findIndex((c) => colorKey(c) === key);
      if (idx >= 0) {
        return prev.map((c, i) =>
          i === idx ? { ...c, quantity: c.quantity + 1, deliveredQty: c.deliveredQty + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          colour: color.name,
          hex: color.hex,
          category: color.category,
          subCategory: color.subCategory,
          quantity: 1,
          deliveredQty: 1,
          currentStock: color.currentStock,
        },
      ];
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
      prev.map((c) => (colorKey(c) === key ? { ...c, quantity: qty, deliveredQty: qty } : c)),
    );
  }

  function updateDeliveryQty(key: string, qty: number) {
    if (qty < 0) return;
    setSelectedColors((prev) =>
      prev.map((c) =>
        colorKey(c) === key ? { ...c, deliveredQty: qty } : c,
      ),
    );
  }

  async function saveOrder(
    type: "Running" | "Complete",
  ): Promise<string | null> {
    if (!selectedParty || saving) return null;
    setSaving(true);

    try {
      const items = selectedColors.map((c) => ({
        category: c.category,
        material: c.subCategory,
        color: c.colour,
        orderedQty: c.quantity,
        deliveredQty: type === "Complete" ? c.quantity : c.deliveredQty,
      }));

      const grandTotalOrdered = items.reduce((s, i) => s + i.orderedQty, 0);
      const grandTotalDelivered = items.reduce((s, i) => s + i.deliveredQty, 0);

      if (editOrderId) {
        await updateOrder(editOrderId, { items, grandTotalOrdered, grandTotalDelivered, type });
        return editOrderId;
      }

      const lastOrderSnap = await getDocs(
        query(collection(db, "orders"), orderBy("csvId", "desc"), limit(1)),
      );
      const lastCsvId = lastOrderSnap.empty ? 0 : (lastOrderSnap.docs[0].data().csvId as number) ?? 0;
      const nextCsvId = lastCsvId + 1;

      const ref = await addDoc(collection(db, "orders"), {
        csvId: nextCsvId,
        partyName: selectedParty.name,
        partyAddress: selectedParty.address,
        route: selectedParty.route,
        orderDate: new Date().toISOString().split("T")[0],
        type,
        items,
        grandTotalOrdered,
        grandTotalDelivered,
        createdAt: new Date().toISOString(),
      });

      const batch = writeBatch(db);
      for (const sc of selectedColors) {
        const colorDoc = colors.find(
          (c) =>
            c.name === sc.colour &&
            c.category === sc.category &&
            c.subCategory === sc.subCategory,
        );
        if (colorDoc) {
          batch.update(doc(db, "colors", colorDoc.id), {
            currentStock: colorDoc.currentStock - sc.deliveredQty,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className="w-8 h-8 text-crm-primary animate-spin"
            strokeWidth={1.8}
          />
          <p className="text-[0.85rem] text-crm-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-7rem)]">
      {/* Top info bar */}
      <div className="bg-crm-card rounded-xl card-shadow border border-crm-border px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-2 py-0.5">
            Party Name
          </span>
          <span className="text-[0.82rem] font-bold text-crm-primary border border-crm-primary/30 rounded px-2.5 py-0.5 bg-crm-primary-muted/50">
            {selectedParty?.name || "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-2 py-0.5">
            Address
          </span>
          <span className="text-[0.82rem] font-semibold text-crm-text border border-crm-border rounded px-2.5 py-0.5">
            {selectedParty?.address || "—"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-2 py-0.5">
            Order ID
          </span>
          <span className="text-[0.82rem] font-bold text-crm-primary border border-crm-primary/30 rounded px-2.5 py-0.5 bg-crm-primary-muted/50">
            #{editOrderCsvId ?? ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-2 py-0.5">
            Date
          </span>
          <span className="text-[0.82rem] font-semibold text-crm-text border border-crm-border rounded px-2.5 py-0.5">
            {formDate}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
        {/* Left: Color grid */}
        <div className="flex-1 bg-crm-card rounded-xl card-shadow border border-crm-border overflow-hidden flex flex-col min-w-0">
          {/* Category tabs */}
          <div className="flex border-b border-crm-border shrink-0">
            {categories.map((cat) => {
              const active = activeCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-6 py-2.5 text-[0.82rem] font-semibold uppercase tracking-wider transition-all ${
                    active
                      ? "text-crm-primary border-b-2 border-crm-primary"
                      : "text-crm-text-muted hover:text-crm-text"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Color cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {Array.from(colorsBySubCat.entries()).map(([subCat, subColors]) => (
              <div key={subCat}>
                <h3 className="text-[0.88rem] font-bold text-crm-text mb-2.5">
                  {subCat} :-
                </h3>
                <div
                  className="grid gap-2"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                  }}
                >
                  {subColors.map((color) => {
                    const qty = getQtyForColor(color);
                    const key = `${color.category}::${color.subCategory}::${color.name}`;
                    const delivered = selectedColors.find((c) => colorKey(c) === key)?.deliveredQty ?? 0;
                    const adjustedStock = color.currentStock - delivered;
                    const isLightHex = LIGHT_HEXES.has(color.hex);
                    return (
                      <div
                        key={color.id}
                        className={`rounded-lg overflow-hidden border transition-all ${
                          qty > 0
                            ? "border-crm-primary shadow-md ring-1 ring-crm-primary/30"
                            : "border-crm-border hover:shadow-sm"
                        }`}
                      >
                        <button
                          onClick={() => addColor(color)}
                          className="w-full active:scale-[0.97] transition-transform"
                        >
                          <div
                            className={`h-2 w-full ${isLightHex ? "border-b border-crm-border" : ""}`}
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="bg-crm-card px-1.5 py-2 text-center">
                            <p className="text-[0.78rem] font-semibold text-crm-primary truncate leading-tight">
                              {color.name}
                            </p>
                            <p
                              className={`text-[0.88rem] font-bold tabular-nums mt-0.5 ${stockColor(adjustedStock)}`}
                            >
                              {adjustedStock}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center border-t border-crm-border bg-crm-bg/30">
                          <button
                            onClick={() =>
                              updateQty(
                                `${color.category}::${color.subCategory}::${color.name}`,
                                qty - 1,
                              )
                            }
                            className="flex items-center justify-center w-9 h-7 text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted transition-colors"
                          >
                            <Minus className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                          <span className="flex-1 text-center text-[0.8rem] font-bold tabular-nums text-crm-text">
                            {qty}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Summary panel */}
        <div className="w-full lg:w-[360px] xl:w-[400px] lg:shrink-0 flex flex-col min-h-0 gap-3">
          <div className="bg-crm-card rounded-xl card-shadow border border-crm-border flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {categories.map((cat) => {
                const catColors = summaryByCat[cat] ?? [];
                const catTotal = catColors.reduce((s, c) => s + c.quantity, 0);
                const catDelivered = catColors.reduce(
                  (s, c) => s + c.deliveredQty,
                  0,
                );
                const CATEGORY_COLORS: Record<string, string> = { "3 Tar": "#f5956b", "5 Tar": "#5b5fc7", "Yarn": "#36b49f" };
                const headerBg = CATEGORY_COLORS[cat] ?? "#5b5fc7";
                return (
                  <div key={cat}>
                    <h4 className="text-[0.84rem] font-bold text-crm-text mb-1.5">
                      {cat} :-
                    </h4>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr
                          className="text-white"
                          style={{ backgroundColor: headerBg }}
                        >
                          <th className="text-[0.68rem] font-semibold py-1.5 px-2 text-left w-7">
                            #
                          </th>
                          <th className="text-[0.68rem] font-semibold py-1.5 px-2 text-left">
                            Color
                          </th>
                          <th className="text-[0.68rem] font-semibold py-1.5 px-2 text-center w-12">
                            Req.
                          </th>
                          <th className="text-[0.68rem] font-semibold py-1.5 px-2 text-center w-16">
                            Delivery
                          </th>
                          <th className="text-[0.68rem] font-semibold py-1.5 px-2 text-center w-12">
                            Add
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {catColors.length === 0 ? (
                          <tr className="border-b border-crm-border/50">
                            <td
                              colSpan={5}
                              className="py-2 px-2 text-center text-[0.72rem] text-crm-text-muted"
                            >
                              —
                            </td>
                          </tr>
                        ) : (
                          catColors.map((c, i) => {
                            const key = colorKey(c);
                            return (
                              <tr
                                key={key}
                                className="border-b border-crm-border/50 hover:bg-crm-bg/30 transition-colors"
                              >
                                <td className="py-1.5 px-2 text-[0.72rem] text-crm-text-muted">
                                  {i + 1}
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <div
                                      className={`w-3 h-3 rounded-sm shrink-0 ${LIGHT_HEXES.has(c.hex) ? "border border-crm-border" : ""}`}
                                      style={{ backgroundColor: c.hex }}
                                    />
                                    <span className="text-[0.74rem] font-medium text-crm-text truncate">
                                      {c.colour}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-1.5 px-2 text-center text-[0.74rem] font-bold tabular-nums text-crm-text">
                                  {c.quantity}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[0.74rem] font-bold tabular-nums text-crm-text">
                                  {c.deliveredQty}
                                </td>
                                <td className="py-1.5 px-2">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      onClick={() =>
                                        updateDeliveryQty(
                                          key,
                                          c.deliveredQty - 1,
                                        )
                                      }
                                      className="w-5 h-5 rounded bg-crm-bg flex items-center justify-center text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted transition-colors"
                                    >
                                      <Minus
                                        className="w-2.5 h-2.5"
                                        strokeWidth={2.5}
                                      />
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateDeliveryQty(
                                          key,
                                          c.deliveredQty + 1,
                                        )
                                      }
                                      className="w-5 h-5 rounded bg-crm-bg flex items-center justify-center text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted transition-colors"
                                    >
                                      <Plus
                                        className="w-2.5 h-2.5"
                                        strokeWidth={2.5}
                                      />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                        <tr className="bg-crm-bg/60">
                          <td
                            colSpan={2}
                            className="py-1.5 px-2 text-[0.72rem] font-bold text-crm-text"
                          >
                            Total
                          </td>
                          <td className="py-1.5 px-2 text-center text-[0.74rem] font-bold tabular-nums text-crm-text">
                            {catTotal || ""}
                          </td>
                          <td className="py-1.5 px-2 text-center text-[0.74rem] font-bold tabular-nums text-crm-text">
                            {catDelivered || ""}
                          </td>
                          <td className="py-1.5 px-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="px-4 py-3 border-t border-crm-border shrink-0">
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleHold}
                  disabled={
                    !selectedParty || selectedColors.length === 0 || saving
                  }
                  className="h-9 px-6 rounded-lg bg-crm-primary text-white text-[0.82rem] font-semibold hover:bg-crm-sidebar-active transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "..." : editOrderId ? "Update" : "Hold"}
                </button>
                <button
                  onClick={handleClear}
                  disabled={selectedColors.length === 0}
                  className="h-9 px-6 rounded-lg bg-crm-accent text-white text-[0.82rem] font-semibold hover:bg-crm-accent/80 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  onClick={handleBill}
                  disabled={
                    !selectedParty || selectedColors.length === 0 || saving
                  }
                  className="h-9 px-6 rounded-lg bg-crm-sidebar text-white text-[0.82rem] font-semibold hover:bg-crm-sidebar-hover transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "..." : "Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
