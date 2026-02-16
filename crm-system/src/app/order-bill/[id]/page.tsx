"use client";

import React, { use, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order, OrderItem } from "@/lib/types";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface MaterialGroup {
  material: string;
  items: OrderItem[];
  totalOrdered: number;
  totalDelivered: number;
}

interface CategoryGroup {
  category: string;
  materials: MaterialGroup[];
  totalOrdered: number;
  totalDelivered: number;
}

function groupItems(items: OrderItem[]): CategoryGroup[] {
  const catMap = new Map<string, Map<string, OrderItem[]>>();
  for (const item of items) {
    if (!catMap.has(item.category)) catMap.set(item.category, new Map());
    const matMap = catMap.get(item.category)!;
    if (!matMap.has(item.material)) matMap.set(item.material, []);
    matMap.get(item.material)!.push(item);
  }
  return Array.from(catMap.entries()).map(([category, matMap]) => {
    const materials = Array.from(matMap.entries()).map(([material, items]) => ({
      material,
      items,
      totalOrdered: items.reduce((s, i) => s + i.orderedQty, 0),
      totalDelivered: items.reduce((s, i) => s + i.deliveredQty, 0),
    }));
    return {
      category,
      materials,
      totalOrdered: materials.reduce((s, m) => s + m.totalOrdered, 0),
      totalDelivered: materials.reduce((s, m) => s + m.totalDelivered, 0),
    };
  });
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function OrderBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "orders", id));
        if (!snap.exists()) { setError("Order not found"); return; }
        setOrder({ id: snap.id, ...snap.data() } as Order);
      } catch {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-sm font-medium text-gray-700">{error || "Order not found"}</p>
        <Link href="/running-orders" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
      </div>
    );
  }

  const groups = groupItems(order.items ?? []);
  const grandOrdered = order.grandTotalOrdered ?? groups.reduce((s, g) => s + g.totalOrdered, 0);
  const grandDelivered = order.grandTotalDelivered ?? groups.reduce((s, g) => s + g.totalDelivered, 0);

  return (
    <div className="max-w-md mx-auto py-6 px-4">
      <div className="bg-white border border-gray-200 rounded-lg font-mono text-[13px] leading-relaxed">

        <div className="text-center px-6 pt-6 pb-3">
          <h1 className="text-lg font-bold uppercase tracking-wide">{order.partyName}</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">{order.partyAddress}</p>
        </div>

        <div className="border-t border-dashed border-gray-300 mx-4" />

        <div className="flex justify-between px-6 py-2.5 text-[11px]">
          <span>Date: {formatDate(order.orderDate)}</span>
          <span>#{order.csvId ?? id.slice(0, 6)}</span>
        </div>

        <div className="border-t border-dashed border-gray-300 mx-4" />

        <div className="px-6 py-3 flex justify-between text-[11px] font-bold uppercase text-gray-500">
          <span>Item</span>
          <span>Ord → Del</span>
        </div>

        <div className="border-t border-gray-200 mx-4" />

        <div className="px-6 py-2 space-y-4">
          {groups.map((cat) => (
            <div key={cat.category}>
              <div className="text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 py-1">
                — {cat.category} —
              </div>

              {cat.materials.map((mat) => (
                <div key={`${cat.category}-${mat.material}`} className="mb-3 last:mb-0">
                  <div className="text-[12px] font-bold py-1">{mat.material}</div>

                  {mat.items.map((item, i) => (
                    <div key={`${item.color}-${i}`} className="flex justify-between py-0.5">
                      <span className="text-gray-700">{item.color}</span>
                      <span className="tabular-nums">
                        {item.orderedQty} → {item.deliveredQty}
                      </span>
                    </div>
                  ))}

                  <div className="flex justify-between pt-1 mt-1 border-t border-dotted border-gray-300 font-bold">
                    <span>Total</span>
                    <span className="tabular-nums">{mat.totalOrdered} → {mat.totalDelivered}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="border-t border-double border-gray-400 mx-4" />

        <div className="flex justify-between px-6 py-3 font-bold text-sm">
          <span>GRAND TOTAL</span>
          <span className="tabular-nums">{grandOrdered} → {grandDelivered}</span>
        </div>

        <div className="border-t border-dashed border-gray-300 mx-4" />

        <div className="text-center text-[10px] text-gray-400 py-3">
          Thank you
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print
        </button>
        <Link
          href="/running-orders"
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-gray-800 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>
      </div>
    </div>
  );
}
