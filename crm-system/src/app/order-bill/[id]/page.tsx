"use client";

import React, { use, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Order } from "@/lib/types";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import BillLayout from "@/components/BillLayout";

function formatDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
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

  function handlePrint() {
    if (!order) return;
    const originalTitle = document.title;
    document.title = `${order.partyName}_${formatDate(order.orderDate)}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 3000);
  }

  return (
    <>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .bill-print-area {
            position: absolute !important;
            top: 0; left: 0; right: 0;
            background: #fff;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          @page { margin: 0; }
        }
      `}</style>
      <div className="max-w-lg mx-auto py-6 px-4">
        <div className="bill-print-area bg-white rounded-xl border border-crm-border p-4">
          <BillLayout order={order} />
        </div>

        <div className="flex items-center gap-3 mt-4 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-crm-border text-[0.78rem] font-medium text-crm-text-muted hover:text-crm-primary hover:bg-crm-primary-muted transition-colors"
          >
            <Printer className="w-3.5 h-3.5" strokeWidth={1.8} />
            Print
          </button>
          <Link
            href="/running-orders"
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-crm-primary text-white text-[0.78rem] font-medium hover:bg-[#4845a2] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.8} />
            Back
          </Link>
        </div>
      </div>
    </>
  );
}
