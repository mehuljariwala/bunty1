"use client";

import { Fragment, Suspense, useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, Loader2, Sparkles } from "lucide-react";
import AiOrderModal from "@/components/AiOrderModal";
import { supabase } from "@/lib/supabase";
import { usePartiesLiteQuery, useColorsQuery, useInvalidate } from "@/hooks/use-queries";
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

  const { data: parties = [], isLoading: partiesLoading } = usePartiesLiteQuery();
  const { data: colors = [] } = useColorsQuery();
  const invalidate = useInvalidate();
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
  const loading = partiesLoading;
  const [editOrderCsvId, setEditOrderCsvId] = useState<number | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);

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

  const PRESET_CATEGORIES = ["3 Tar Bullet", "5 Tar Bullet", "Yarn", "3 Tar Button", "5 Tar Button", "6 Tar Button"];

  const categories = useMemo(() => {
    const all = [...new Set([...PRESET_CATEGORIES, ...colors.map((c) => c.category)])];
    const order = PRESET_CATEGORIES;
    return all.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [colors]);

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
    const colorIndex = new Map<string, number>();
    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      const catColors = colors.filter((c) => c.category === categories[catIdx]);
      const subMap = new Map<string, Color[]>();
      for (const c of catColors) {
        const list = subMap.get(c.subCategory) ?? [];
        list.push(c);
        subMap.set(c.subCategory, list);
      }
      const ordered: Color[] = [];
      for (const sub of SUB_CAT_ORDER) {
        if (subMap.has(sub)) { ordered.push(...subMap.get(sub)!); subMap.delete(sub); }
      }
      for (const cols of subMap.values()) ordered.push(...cols);
      for (let i = 0; i < ordered.length; i++) {
        const c = ordered[i];
        colorIndex.set(`${c.category}::${c.subCategory}::${c.name}`, catIdx * 10000 + i);
      }
    }

    const map: Record<string, SelectedColor[]> = {};
    for (const c of selectedColors) {
      (map[c.category] ??= []).push(c);
    }
    for (const cat of Object.keys(map)) {
      map[cat].sort((a, b) => (colorIndex.get(colorKey(a)) ?? 0) - (colorIndex.get(colorKey(b)) ?? 0));
    }
    return map;
  }, [selectedColors, colors, categories]);

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
      const sortedColors: SelectedColor[] = [];
      for (const cat of categories) {
        const catColors = summaryByCat[cat] ?? [];
        sortedColors.push(...catColors);
      }
      const items = sortedColors.map((c) => ({
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

      const { data: lastOrder } = await supabase
        .from('orders')
        .select('csv_id')
        .order('csv_id', { ascending: false })
        .limit(1);
      const lastCsvId = lastOrder?.[0]?.csv_id ?? 0;
      const nextCsvId = lastCsvId + 1;

      const { data: newOrder } = await supabase
        .from('orders')
        .insert({
          csv_id: nextCsvId,
          party_name: selectedParty.name,
          party_address: selectedParty.address,
          ...(selectedParty.addressGu ? { party_address_gu: selectedParty.addressGu } : {}),
          route: selectedParty.route,
          order_date: new Date().toISOString().split("T")[0],
          type,
          items,
          grand_total_ordered: grandTotalOrdered,
          grand_total_delivered: grandTotalDelivered,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      // Batch all color stock updates in parallel
      const stockUpdates = selectedColors
        .map((sc) => {
          const colorDoc = colors.find(
            (c) => c.name === sc.colour && c.category === sc.category && c.subCategory === sc.subCategory,
          );
          if (!colorDoc) return null;
          return supabase
            .from('colors')
            .update({ current_stock: colorDoc.currentStock - sc.deliveredQty })
            .eq('id', colorDoc.id);
        })
        .filter(Boolean);
      await Promise.all(stockUpdates);
      invalidate.orders();
      invalidate.colors();

      return newOrder?.id ?? null;
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

  function handleAiApply(items: SelectedColor[]) {
    setSelectedColors((prev) => {
      const next = [...prev];
      for (const item of items) {
        const key = `${item.category}::${item.subCategory}::${item.colour}`;
        const idx = next.findIndex((c) => colorKey(c) === key);
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity, deliveredQty: next[idx].deliveredQty + item.deliveredQty };
        } else {
          next.push(item);
        }
      }
      return next;
    });
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
    <div className="flex flex-col flex-1 gap-2 sm:gap-3">
      {/* Top info bar */}
      <div className="bg-white rounded-xl border border-crm-border px-3 sm:px-4 py-2 sm:py-2.5 shrink-0">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[0.65rem] sm:text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-1.5 sm:px-2 py-0.5 shrink-0">
              Party
            </span>
            <span className="text-[0.75rem] sm:text-[0.82rem] font-bold text-crm-primary border border-crm-primary/30 rounded px-1.5 sm:px-2.5 py-0.5 bg-crm-primary-muted/50 truncate">
              {selectedParty?.name || "—"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 sm:ml-auto">
            <span className="text-[0.65rem] sm:text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-1.5 sm:px-2 py-0.5 shrink-0">
              ID
            </span>
            <span className="text-[0.75rem] sm:text-[0.82rem] font-bold text-crm-primary border border-crm-primary/30 rounded px-1.5 sm:px-2.5 py-0.5 bg-crm-primary-muted/50">
              #{editOrderCsvId ?? ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-[0.65rem] sm:text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-1.5 sm:px-2 py-0.5 shrink-0">
              Address
            </span>
            <span className="text-[0.75rem] sm:text-[0.82rem] font-semibold text-crm-text border border-crm-border rounded px-1.5 sm:px-2.5 py-0.5 truncate">
              {selectedParty?.address || "—"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[0.65rem] sm:text-[0.72rem] font-semibold uppercase tracking-wider text-crm-text-muted border border-crm-border rounded px-1.5 sm:px-2 py-0.5 shrink-0">
              Date
            </span>
            <span className="text-[0.75rem] sm:text-[0.82rem] font-semibold text-crm-text border border-crm-border rounded px-1.5 sm:px-2.5 py-0.5">
              {formDate}
            </span>
          </div>
          <button
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-crm-primary to-crm-sidebar text-white text-[0.75rem] sm:text-[0.8rem] font-semibold hover:opacity-90 active:opacity-80 transition-opacity shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            AI Order
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-2 sm:gap-3 flex-1 min-h-0">
        {/* Left: Color grid */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0 min-h-[40vh] lg:min-h-0">
          {/* Category tabs */}
          <div className="flex overflow-x-auto border-b border-crm-border shrink-0">
            {categories.map((cat) => {
              const active = activeCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-3 sm:px-6 py-2 sm:py-2.5 text-[0.75rem] sm:text-[0.82rem] font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
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
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-4 sm:space-y-5">
            {Array.from(colorsBySubCat.entries()).map(([subCat, subColors]) => (
              <div key={subCat}>
                <h3 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-crm-text mb-2">
                  {subCat} :-
                </h3>
                <div
                  className="grid gap-1.5 sm:gap-2"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
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
                            ? "border-gray-200 shadow-md"
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
                          <div className={`px-1.5 py-2 text-center ${qty > 0 ? "bg-[#d4ecf7]" : "bg-crm-card"}`}>
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
                        <div className="flex items-center border-t border-crm-border bg-white">
                          <button
                            onClick={() =>
                              updateQty(
                                `${color.category}::${color.subCategory}::${color.name}`,
                                qty - 1,
                              )
                            }
                            className="flex items-center justify-center w-8 sm:w-9 h-7 bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-crm-primary active:bg-gray-300 transition-colors"
                          >
                            <Minus className="w-3 h-3" strokeWidth={2.5} />
                          </button>
                          <span className="flex-1 text-center text-[0.75rem] sm:text-[0.8rem] font-bold tabular-nums text-crm-text">
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
        <div className="w-full lg:w-[360px] xl:w-[400px] lg:shrink-0 flex flex-col min-h-0 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl border border-crm-border flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3 sm:space-y-4">
              {categories.map((cat) => {
                const catColors = summaryByCat[cat] ?? [];
                const catTotal = catColors.reduce((s, c) => s + c.quantity, 0);
                const catDelivered = catColors.reduce(
                  (s, c) => s + c.deliveredQty,
                  0,
                );
                const CATEGORY_COLORS: Record<string, string> = { "3 Tar Bullet": "#f5956b", "5 Tar Bullet": "#5b5fc7", "Yarn": "#36b49f", "3 Tar Button": "#e8b838", "5 Tar Button": "#9b59b6", "6 Tar Button": "#3498db" };
                const headerBg = CATEGORY_COLORS[cat] ?? "#5b5fc7";
                return (
                  <div key={cat}>
                    <h4 className="text-[0.78rem] sm:text-[0.84rem] font-bold text-crm-text mb-1.5">
                      {cat} :-
                    </h4>
                    <table className="w-full border-collapse text-[0.65rem] sm:text-[0.68rem]">
                      <thead>
                        <tr
                          className="text-white"
                          style={{ backgroundColor: headerBg }}
                        >
                          <th className="font-semibold py-1 sm:py-1.5 px-1 sm:px-2 text-left w-5 sm:w-7">
                            #
                          </th>
                          <th className="font-semibold py-1 sm:py-1.5 px-1 sm:px-2 text-left">
                            Color
                          </th>
                          <th className="font-semibold py-1 sm:py-1.5 px-1 sm:px-2 text-center w-9 sm:w-12">
                            Stk
                          </th>
                          <th className="font-semibold py-1 sm:py-1.5 px-1 sm:px-2 text-center w-8 sm:w-12">
                            Req
                          </th>
                          <th className="font-semibold py-1 sm:py-1.5 px-1 sm:px-2 text-center w-10 sm:w-16">
                            Del
                          </th>
                          <th className="font-semibold py-1 sm:py-1.5 px-1 sm:px-2 text-center w-10 sm:w-12">
                            +/-
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {catColors.length === 0 ? (
                          <tr className="border-b border-crm-border/50">
                            <td
                              colSpan={6}
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
                                <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-[0.68rem] sm:text-[0.72rem] text-crm-text-muted">
                                  {i + 1}
                                </td>
                                <td className="py-1 sm:py-1.5 px-1 sm:px-2">
                                  <div className="flex items-center gap-1">
                                    <div
                                      className={`w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-sm shrink-0 ${LIGHT_HEXES.has(c.hex) ? "border border-crm-border" : ""}`}
                                      style={{ backgroundColor: c.hex }}
                                    />
                                    <span className="text-[0.68rem] sm:text-[0.74rem] font-medium text-crm-text truncate max-w-[60px] sm:max-w-none">
                                      {c.colour}
                                    </span>
                                  </div>
                                </td>
                                <td className={`py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[0.68rem] sm:text-[0.74rem] font-bold tabular-nums ${stockColor(c.currentStock - c.deliveredQty)}`}>
                                  {c.currentStock - c.deliveredQty}
                                </td>
                                <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[0.68rem] sm:text-[0.74rem] font-bold tabular-nums text-crm-text">
                                  {c.quantity}
                                </td>
                                <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[0.68rem] sm:text-[0.74rem] font-bold tabular-nums text-crm-text">
                                  {c.deliveredQty}
                                </td>
                                <td className="py-1 sm:py-1.5 px-1 sm:px-2">
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
                            colSpan={3}
                            className="py-1 sm:py-1.5 px-1 sm:px-2 text-[0.68rem] sm:text-[0.72rem] font-bold text-crm-text"
                          >
                            Total
                          </td>
                          <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[0.68rem] sm:text-[0.74rem] font-bold tabular-nums text-crm-text">
                            {catTotal || ""}
                          </td>
                          <td className="py-1 sm:py-1.5 px-1 sm:px-2 text-center text-[0.68rem] sm:text-[0.74rem] font-bold tabular-nums text-crm-text">
                            {catDelivered || ""}
                          </td>
                          <td className="py-1 sm:py-1.5 px-1 sm:px-2" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* Action buttons */}
            <div className="px-2 sm:px-4 py-2 sm:py-3 border-t border-crm-border shrink-0">
              <div className="flex justify-center gap-2 sm:gap-3">
                <button
                  onClick={handleHold}
                  disabled={
                    !selectedParty || selectedColors.length === 0 || saving
                  }
                  className="h-9 px-4 sm:px-6 rounded-lg bg-crm-primary text-white text-[0.78rem] sm:text-[0.82rem] font-semibold hover:bg-crm-sidebar-active active:bg-crm-sidebar-active transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none"
                >
                  {saving ? "..." : editOrderId ? "Update" : "Hold"}
                </button>
                <button
                  onClick={handleClear}
                  disabled={selectedColors.length === 0}
                  className="h-9 px-4 sm:px-6 rounded-lg bg-crm-accent text-white text-[0.78rem] sm:text-[0.82rem] font-semibold hover:bg-crm-accent/80 active:bg-crm-accent/80 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none"
                >
                  Clear
                </button>
                <button
                  onClick={handleBill}
                  disabled={
                    !selectedParty || selectedColors.length === 0 || saving
                  }
                  className="h-9 px-4 sm:px-6 rounded-lg bg-crm-sidebar text-white text-[0.78rem] sm:text-[0.82rem] font-semibold hover:bg-crm-sidebar-hover active:bg-crm-sidebar-hover transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex-1 sm:flex-none"
                >
                  {saving ? "..." : "Bill"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AiOrderModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        colors={colors}
        onApply={handleAiApply}
      />
    </div>
  );
}
