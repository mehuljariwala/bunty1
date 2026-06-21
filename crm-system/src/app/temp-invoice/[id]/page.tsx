"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem } from "@/lib/types";
import { Printer, ArrowLeft, Loader2, Package, Handbag, Box } from "lucide-react";
import Link from "next/link";
import TempBillLayout from "@/components/TempBillLayout";
import PrintChallan from "@/components/PrintChallan";

function formatDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

interface GroupedItem {
  key: string;
  category: string;
  material: string;
  colors: string[];
  pcs: number;
}

interface RowState {
  grossWt: string;
  pcsWt: string;
  bag: string;
  bagWt: string;
  rate: string;
}

const COMPANY = {
  name: "JAY JALARAM JARI",
  address: "33, SHIV AASHISH SOC. B/H NAVJIVAN CAR SHOWROOM,UDHANA,SURAT,SURAT",
  mobile: "9998478787",
  gstin: "24AJXPJ9003A1ZD",
};

export default function TempInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyRates, setPartyRates] = useState<Record<string, Record<string, string>>>({});
  const [defaultRates, setDefaultRates] = useState<Record<string, Record<string, string>>>({});
  const [partyAddress, setPartyAddress] = useState({ en: "", gu: "", hi: "" });
  const [partyGstin, setPartyGstin] = useState("");

  // Bag modal state
  interface BagRow { bag: string; theli: string; cartoon: string }
  const [bagModalOpen, setBagModalOpen] = useState(false);
  const [bagRows, setBagRows] = useState<BagRow[]>([
    { bag: "", theli: "", cartoon: "" },
  ]);
  const bagFirstInputRef = React.useRef<HTMLInputElement>(null);

  const bagSummary = useMemo(() => {
    const filled = bagRows.filter((r) => parseInt(r.bag) || parseInt(r.theli) || parseInt(r.cartoon));
    if (filled.length === 0) return "";
    return filled.map((r) => {
      const parts: string[] = [];
      if (parseInt(r.bag)) parts.push(r.bag);
      if (parseInt(r.theli)) parts.push(r.theli);
      if (parseInt(r.cartoon)) parts.push(r.cartoon);
      return parts.join(" + ");
    }).join(", ");
  }, [bagRows]);

  // Challan form state
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [remark, setRemark] = useState("");
  const [transCh, setTransCh] = useState("0");
  const [addLess, setAddLess] = useState("0");
  const [transport, setTransport] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [lrDate, setLrDate] = useState("");
  const [parcelQty, setParcelQty] = useState("0");
  const [sgst, setSgst] = useState("0");
  const [cgst, setCgst] = useState("0");
  const [saving, setSaving] = useState(false);

  // Recent challans for this party
  interface RecentChallan {
    id: string;
    challan_date: string;
    challan_no: number;
    items: { category: string; material: string; pcs: number; netWt: number; rate: number; amount: number }[];
    net_amount: number;
  }
  const [recentChallans, setRecentChallans] = useState<RecentChallan[]>([]);

  async function fetchRecentChallans(partyName: string) {
    const { data } = await supabase
      .from("challans")
      .select("id, challan_date, challan_no, items, net_amount")
      .eq("party_name", partyName)
      .order("created_at", { ascending: false })
      .limit(5);
    if (data) setRecentChallans(data as RecentChallan[]);
  }

  useEffect(() => {
    async function load() {
      try {
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();
        if (fetchError || !data) {
          setError("Order not found");
          return;
        }
        const orderObj = {
          id: data.id,
          csvId: data.csv_id,
          partyName: data.party_name,
          partyAddress: data.party_address,
          partyAddressGu: data.party_address_gu || undefined,
          route: data.route,
          orderDate: data.order_date,
          type: data.type,
          items: data.items ?? [],
          grandTotalOrdered: data.grand_total_ordered,
          grandTotalDelivered: data.grand_total_delivered,
        } as Order;
        setOrder(orderObj);

        // Fetch party rates + default rates in parallel
        const [partyRes, defaultRes] = await Promise.all([
          supabase.from("parties").select("rates,address,address_gu,address_hi").eq("name", data.party_name).limit(1).single(),
          supabase.from("parties").select("rates").eq("name", "__DEFAULT_RATES__").limit(1).single(),
        ]);
        if (partyRes.data?.rates && typeof partyRes.data.rates === "object") {
          setPartyRates(partyRes.data.rates as Record<string, Record<string, string>>);
        }
        const pd = partyRes.data;
        setPartyAddress({
          en: String(pd?.address ?? "") || data.party_address || "",
          gu: String(pd?.address_gu ?? ""),
          hi: String(pd?.address_hi ?? ""),
        });
        if (defaultRes.data?.rates && typeof defaultRes.data.rates === "object") {
          setDefaultRates(defaultRes.data.rates as Record<string, Record<string, string>>);
        }

        // Fetch recent challans for this party
        fetchRecentChallans(data.party_name);
      } catch {
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Group items by category + material
  const groupedItems: GroupedItem[] = useMemo(() => {
    if (!order?.items) return [];
    const map = new Map<string, GroupedItem>();
    for (const item of order.items) {
      const key = `${item.category}||${item.material}`;
      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.pcs += item.deliveredQty;
        if (item.color && !existing.colors.includes(item.color)) {
          existing.colors.push(item.color);
        }
      } else {
        map.set(key, {
          key,
          category: item.category,
          material: item.material,
          colors: item.color ? [item.color] : [],
          pcs: item.deliveredQty,
        });
      }
    }
    return Array.from(map.values());
  }, [order]);

  // Lookup rate: party-specific first, then default rates as fallback
  function lookupRate(category: string, material: string): string {
    for (const rateSource of [partyRates, defaultRates]) {
      for (const catKey of Object.keys(rateSource)) {
        if (catKey === category || catKey.toLowerCase() === category.toLowerCase()) {
          const matRates = rateSource[catKey];
          if (!matRates) continue;
          for (const matKey of Object.keys(matRates)) {
            if (matKey === material || matKey.toLowerCase() === material.toLowerCase()) {
              if (matRates[matKey]) return matRates[matKey];
            }
          }
        }
      }
    }
    return "";
  }

  // Initialize row states when grouped items or party rates change
  useEffect(() => {
    if (groupedItems.length > 0) {
      setRowStates((prev) => {
        const next: Record<string, RowState> = {};
        for (const g of groupedItems) {
          const existingRate = prev[g.key]?.rate;
          const rateFromParty = lookupRate(g.category, g.material);
          next[g.key] = prev[g.key] || {
            grossWt: "",
            pcsWt: "0.070",
            bag: "",
            bagWt: "0.000",
            rate: rateFromParty,
          };
          // If rate was empty and we now have party rates, fill it
          if (!existingRate && rateFromParty) {
            next[g.key] = { ...next[g.key], rate: rateFromParty };
          }
        }
        return next;
      });
    }
  }, [groupedItems, partyRates, defaultRates]);

  // Calculations per row
  const rowCalcs = useMemo(() => {
    const calcs: Record<string, { totTrWt: number; netWt: number; amount: number }> = {};
    for (const g of groupedItems) {
      const rs = rowStates[g.key];
      if (!rs) {
        calcs[g.key] = { totTrWt: 0, netWt: 0, amount: 0 };
        continue;
      }
      const pcsWt = parseFloat(rs.pcsWt) || 0;
      const grossWt = parseFloat(rs.grossWt) || 0;
      const bag = parseFloat(rs.bag) || 0;
      const bagWt = parseFloat(rs.bagWt) || 0;
      const rate = parseFloat(rs.rate) || 0;
      const totTrWt = g.pcs * pcsWt;
      const netWt = grossWt - totTrWt - bag * bagWt;
      const amount = netWt * rate;
      calcs[g.key] = { totTrWt, netWt: netWt > 0 ? netWt : 0, amount: netWt > 0 ? amount : 0 };
    }
    return calcs;
  }, [groupedItems, rowStates]);

  // Totals
  const totals = useMemo(() => {
    let grossWt = 0,
      pcs = 0,
      totTrWt = 0,
      netWt = 0,
      amount = 0;
    for (const g of groupedItems) {
      const rs = rowStates[g.key];
      grossWt += parseFloat(rs?.grossWt || "0") || 0;
      pcs += g.pcs;
      totTrWt += rowCalcs[g.key]?.totTrWt || 0;
      netWt += rowCalcs[g.key]?.netWt || 0;
      amount += rowCalcs[g.key]?.amount || 0;
    }
    const transChVal = parseFloat(transCh) || 0;
    const addLessVal = parseFloat(addLess) || 0;
    const netAmt = amount + transChVal + addLessVal;
    return { grossWt, pcs, totTrWt, netWt, amount, netAmt };
  }, [groupedItems, rowStates, rowCalcs, transCh, addLess]);

  const updateRow = (key: string, field: keyof RowState, value: string) => {
    setRowStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  async function handlePrint() {
    if (!order || saving) return;
    setSaving(true);

    const challanItems = groupedItems.map((g) => {
      const rs = rowStates[g.key] || { grossWt: "", pcsWt: "0.070", bag: "", bagWt: "0.000", rate: "" };
      const calc = rowCalcs[g.key] || { totTrWt: 0, netWt: 0, amount: 0 };
      return {
        category: g.category, material: g.material, colors: g.colors, pcs: g.pcs,
        grossWt: parseFloat(rs.grossWt) || 0, pcsWt: parseFloat(rs.pcsWt) || 0,
        totTrWt: calc.totTrWt, bag: parseFloat(rs.bag) || 0, bagWt: parseFloat(rs.bagWt) || 0,
        netWt: calc.netWt, rate: parseFloat(rs.rate) || 0, amount: calc.amount,
      };
    });

    const { error: saveErr } = await supabase.from("challans").insert({
      order_id: order.id,
      challan_no: order.csvId,
      challan_date: order.orderDate,
      party_name: order.partyName,
      party_address: order.partyAddress,
      route: order.route,
      items: challanItems,
      total_gross_wt: totals.grossWt,
      total_pcs: totals.pcs,
      total_tr_wt: totals.totTrWt,
      total_net_wt: totals.netWt,
      total_amount: totals.amount,
      trans_ch: parseFloat(transCh) || 0,
      add_less: parseFloat(addLess) || 0,
      net_amount: totals.netAmt,
      transport, total_weight: totalWeight, lr_no: lrNo,
      lr_date: lrDate || null, parcel_qty: parseInt(parcelQty) || 0,
      sgst: parseFloat(sgst) || 0, cgst: parseFloat(cgst) || 0,
      bag_details: bagRows, bag_summary: bagSummary, remark,
    });

    setSaving(false);
    if (saveErr) {
      alert("Failed to save challan: " + saveErr.message);
      return;
    }

    fetchRecentChallans(order.partyName);
    window.print();
  }

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
        <p className="text-red-500">{error || "Order not found"}</p>
        <Link href="/running-orders" className="text-crm-primary underline">
          Back to Running Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-crm-bg p-4 print:p-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          href="/running-orders"
          className="flex items-center gap-2 text-crm-text hover:text-crm-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Running Orders</span>
        </Link>
        <button
          onClick={handlePrint}
                disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      {/* Split Layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Bill Layout */}
        <div className="lg:w-[30%] w-full lg:shrink-0">
          <div className="bg-crm-card border border-crm-border rounded-xl p-4 overflow-auto lg:sticky lg:top-4">
            <TempBillLayout
              order={order}
              weights={Object.fromEntries(
                groupedItems.map((g) => [g.key, rowStates[g.key]?.grossWt ?? ""])
              )}
              onWeightChange={(key, value) => updateRow(key, "grossWt", value)}
              bagSummary={bagSummary}
              bagRows={bagRows}
              onBagClick={() => setBagModalOpen(true)}
            />
          </div>

          {/* Sticker Card — Order No, Gujarati address, Party Name, Bag Details */}
          {bagRows.some((r) => parseInt(r.bag) || parseInt(r.theli) || parseInt(r.cartoon)) && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-crm-primary/30 bg-white p-8">
              {/* Order No — top left */}
              <div className="text-lg font-bold text-crm-text-muted mb-4">#{order.csvId}</div>

              {/* Gujarati address — big center */}
              {partyAddress.gu && (
                <p className="text-center text-4xl font-bold text-crm-text leading-snug mb-3">{partyAddress.gu}</p>
              )}

              {/* Party Name */}
              <p className="text-center text-xl font-semibold text-crm-text-muted mb-6">{order.partyName}</p>

              {/* Bag details — plain text like (1/2) or (1+1+1) */}
              <div className="flex items-center justify-center gap-2 text-3xl font-bold text-crm-text mb-6 flex-wrap">
                <span>(</span>
                {bagRows.filter((r) => parseInt(r.bag) || parseInt(r.theli) || parseInt(r.cartoon)).map((r, i, arr) => {
                  const b = parseInt(r.bag) || 0;
                  const t = parseInt(r.theli) || 0;
                  const c = parseInt(r.cartoon) || 0;
                  const items: React.ReactNode[] = [];
                  if (b) items.push(<span key="b" className="inline-flex items-center gap-1"><Package className="w-7 h-7" />{b}</span>);
                  if (t) items.push(<span key="t" className="inline-flex items-center gap-1"><Handbag className="w-7 h-7" />{t}</span>);
                  if (c) items.push(<span key="c" className="inline-flex items-center gap-1"><Box className="w-7 h-7" />{c}</span>);
                  return (
                    <span key={i} className="inline-flex items-center gap-1">
                      {items.map((item, j) => (
                        <span key={j} className="inline-flex items-center gap-1">
                          {j > 0 && <span className="mx-1">+</span>}
                          {item}
                        </span>
                      ))}
                      {i < arr.length - 1 && <span className="mx-2">/</span>}
                    </span>
                  );
                })}
                <span>)</span>
              </div>

              {/* Print Sticker Button */}
              <div className="flex justify-center">
                <button type="button" onClick={() => {
                  const stickerEl = document.getElementById("sticker-print");
                  if (!stickerEl) return;
                  const win = window.open("", "_blank");
                  if (!win) return;
                  win.document.write(`<html><head><title>Sticker</title><style>
                    body { margin: 0; padding: 20px; font-family: sans-serif; }
                    .sticker { text-align: center; padding: 24px; }
                    .order-no { text-align: left; font-size: 18px; font-weight: bold; color: #666; margin-bottom: 12px; }
                    .gu-addr { font-size: 36px; font-weight: bold; margin-bottom: 8px; }
                    .party { font-size: 20px; color: #666; margin-bottom: 16px; }
                    .bags { font-size: 28px; font-weight: bold; }
                  </style></head><body><div class="sticker">
                    <div class="order-no">#${order.csvId}</div>
                    <div class="gu-addr">${partyAddress.gu || ""}</div>
                    <div class="party">${order.partyName}</div>
                    <div class="bags">${(() => {
                      const filledRows = bagRows.filter((r: { bag: string; theli: string; cartoon: string }) => parseInt(r.bag) || parseInt(r.theli) || parseInt(r.cartoon));
                      if (!filledRows.length) return "";
                      return "(" + filledRows.map((r: { bag: string; theli: string; cartoon: string }) => {
                        const parts: string[] = [];
                        if (parseInt(r.bag)) parts.push("Bag:" + r.bag);
                        if (parseInt(r.theli)) parts.push("Theli:" + r.theli);
                        if (parseInt(r.cartoon)) parts.push("Crtn:" + r.cartoon);
                        return parts.join(" + ");
                      }).join(" / ") + ")";
                    })()}</div>
                  </div></body></html>`);
                  win.document.close();
                  win.print();
                }}
                  className="flex items-center gap-2 px-6 py-2.5 bg-crm-primary text-white text-sm font-bold rounded-lg hover:bg-crm-sidebar-active transition-colors">
                  <Printer className="w-4 h-4" />
                  Print Sticker
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Challan Form */}
        <div className="lg:flex-1 w-full print:hidden">
          <div className="bg-white border border-crm-border rounded-xl overflow-hidden">

            {/* Party address label */}
            <div className="text-center px-4 py-2 text-xs text-crm-text-muted bg-crm-bg/30">
              ({partyAddress.gu || partyAddress.hi || partyAddress.en || order.partyName})
            </div>

            {/* Company Header */}
            <div className="text-center border-t border-b border-crm-border px-4 py-3">
              <h1 className="text-xl font-bold tracking-wide text-crm-text">{COMPANY.name}</h1>
              <p className="text-[11px] text-crm-text-muted mt-0.5">{COMPANY.address}</p>
              <p className="text-xs text-crm-text-muted">Mobile : {COMPANY.mobile}</p>
            </div>

            {/* DELIVERY CHALLAN + GSTIN */}
            <div className="flex justify-between items-center px-5 py-2 border-b border-crm-border bg-crm-sidebar text-white text-sm font-bold">
              <span>DELIVERY CHALLAN</span>
              <span className="font-semibold">GSTIN: {COMPANY.gstin}</span>
            </div>

            {/* Party Details */}
            <div className="flex justify-between px-5 py-3 border-b border-crm-border text-[13px]">
              <div className="flex-1 space-y-0.5">
                <p><span className="font-bold text-crm-text-muted">M/S.:</span>&nbsp;&nbsp;{order.partyName}</p>
                <p><span className="font-bold text-crm-text-muted">ADD.:</span>&nbsp;&nbsp;{partyAddress.en || order.partyAddress}</p>
              </div>
              <div className="text-right whitespace-nowrap space-y-0.5">
                <p><span className="font-bold text-crm-text-muted">CHALLAN NO :</span>&nbsp;&nbsp;{order.csvId}</p>
                <p><span className="font-bold text-crm-text-muted">CHALLAN DATE :</span>&nbsp;&nbsp;{formatDate(order.orderDate)}</p>
              </div>
            </div>

            {/* Party GSTIN */}
            {partyGstin && (
              <div className="px-5 py-1.5 border-b border-crm-border text-[13px]">
                <span className="font-bold text-crm-text-muted">GSTIN :</span>&nbsp;&nbsp;{partyGstin}
              </div>
            )}

            {/* Items Table */}
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-crm-sidebar text-white">
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[5%] font-semibold">NO.</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-left w-[22%] font-semibold">ITEM NAME</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[6%] font-semibold">PCS</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[6%] font-semibold">ROLL</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[10%] font-extrabold bg-crm-sidebar-active">GRS WT.</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[8%] font-semibold">PCS WT</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[9%] font-semibold">TR WT</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[10%] font-semibold">NET WT</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-center w-[9%] font-extrabold bg-crm-sidebar-active">RATE</th>
                  <th className="border border-crm-sidebar-hover px-2 py-2 text-right w-[10%] font-semibold">AMT</th>
                </tr>
              </thead>
              <tbody>
                {groupedItems.map((g, idx) => {
                  const rs = rowStates[g.key] || { grossWt: "", pcsWt: "0.070", bag: "", bagWt: "0.000", rate: "" };
                  const calc = rowCalcs[g.key] || { totTrWt: 0, netWt: 0, amount: 0 };
                  return (
                    <tr key={g.key} className={idx % 2 === 0 ? "bg-white" : "bg-crm-bg/30"}>
                      <td className="border border-crm-border px-2 py-2 text-center text-crm-text-muted">{idx + 1}</td>
                      <td className="border border-crm-border px-2 py-2 whitespace-nowrap font-medium text-crm-text">{g.category} {g.material}</td>
                      <td className="border border-crm-border px-2 py-2 text-center font-semibold">{g.pcs}</td>
                      <td className="border border-crm-border px-2 py-2 text-center"></td>
                      <td className="border border-crm-border px-0 py-0 bg-crm-primary-muted/30">
                        <input type="text" value={rs.grossWt} onChange={(e) => updateRow(g.key, "grossWt", e.target.value)}
                          className="w-full px-2 py-2 text-[13px] text-center font-bold text-crm-primary bg-transparent focus:outline-none focus:bg-crm-primary-muted transition-colors" />
                      </td>
                      <td className="border border-crm-border px-0 py-0">
                        <input type="text" value={rs.pcsWt} onChange={(e) => updateRow(g.key, "pcsWt", e.target.value)}
                          className="w-full px-2 py-2 text-[13px] text-center bg-transparent focus:outline-none focus:bg-crm-primary-muted transition-colors" />
                      </td>
                      <td className="border border-crm-border px-2 py-2 text-center text-crm-text-muted">{calc.totTrWt.toFixed(3)}</td>
                      <td className="border border-crm-border px-2 py-2 text-center font-semibold">{calc.netWt.toFixed(3)}</td>
                      <td className="border border-crm-border px-0 py-0 bg-crm-primary-muted/30">
                        <input type="text" value={rs.rate} onChange={(e) => updateRow(g.key, "rate", e.target.value)}
                          className="w-full px-2 py-2 text-[13px] text-center font-bold text-crm-primary bg-transparent focus:outline-none focus:bg-crm-primary-muted transition-colors" />
                      </td>
                      <td className="border border-crm-border px-2 py-2 text-right font-bold">{calc.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {/* Single empty filler row */}
                <tr className="bg-white">
                  <td className="border border-crm-border px-2 py-2">&nbsp;</td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2"></td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-crm-bg/60 border-t-2 border-crm-text">
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2 font-bold text-crm-text">TOTAL:</td>
                  <td className="border border-crm-border px-2 py-2 text-center font-bold">{totals.pcs}</td>
                  <td className="border border-crm-border px-2 py-2 text-center font-bold">0</td>
                  <td className="border border-crm-border px-2 py-2 text-center font-bold text-crm-primary">{totals.grossWt.toFixed(3)}</td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2 text-center font-bold">{totals.totTrWt.toFixed(3)}</td>
                  <td className="border border-crm-border px-2 py-2 text-center font-bold">{totals.netWt.toFixed(3)}</td>
                  <td className="border border-crm-border px-2 py-2"></td>
                  <td className="border border-crm-border px-2 py-2 text-right font-bold text-crm-primary">{totals.amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Footer */}
            <div className="px-5 pt-3">
              <p className="text-right text-sm font-bold text-crm-text">FOR, {COMPANY.name}</p>
            </div>
            <div className="flex justify-between px-5 pt-8 pb-4 text-xs font-semibold text-crm-text-muted">
              <span>Recievers Sign:</span>
              <span>AUTHORISED SIGNATORY</span>
            </div>

            {/* ── Editable fields below the challan (screen only) ── */}
            <div className="border-t-2 border-crm-border px-5 py-4 space-y-3 bg-crm-bg/40">
              {/* Row 1: Avg GRS WT / PCS + TRANS. CH. */}
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                {(() => {
                  const avg = totals.pcs > 0 ? totals.grossWt / totals.pcs : 0;
                  const inRange = avg >= 1.0 && avg <= 1.3;
                  const bgColor = avg === 0 ? "" : inRange ? "bg-yellow-100" : "bg-red-100";
                  const textColor = avg === 0 ? "text-crm-primary" : inRange ? "text-yellow-700" : "text-red-700";
                  return (
                    <div className="flex items-center gap-3">
                      <label className="font-bold text-crm-text shrink-0">Avg GRS WT / PCS</label>
                      <div className={`flex-1 flex items-center gap-2 rounded-xl px-4 py-2.5 ${bgColor || "bg-white"} border border-crm-border`}>
                        <span className={`font-bold text-[15px] ${textColor}`}>{avg.toFixed(3)}</span>
                        <span className="text-crm-text-muted text-[11px]">({totals.grossWt.toFixed(3)} / {totals.pcs})</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3">
                  <label className="font-bold text-crm-text shrink-0">TRANS. CH.</label>
                  <input type="text" value={transCh} onChange={(e) => setTransCh(e.target.value)}
                    className="flex-1 border border-crm-border rounded-xl px-4 py-2.5 text-right text-crm-text font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary transition-all" />
                </div>
              </div>

              {/* Row 2: ADD/LESS + NET AMT. */}
              <div className="grid grid-cols-2 gap-4 text-[13px]">
                <div className="flex items-center gap-3">
                  <label className="font-bold text-crm-text shrink-0">ADD/LESS</label>
                  <input type="text" value={addLess} onChange={(e) => setAddLess(e.target.value)}
                    className="flex-1 border border-crm-border rounded-xl px-4 py-2.5 text-right text-crm-text font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary transition-all" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="font-bold text-crm-text shrink-0">NET AMT.</label>
                  <span className="font-bold text-[18px] text-crm-primary">{totals.netAmt.toFixed(2)}</span>
                </div>
              </div>

              {/* Row 3: REMARK full width */}
              <div className="flex items-center gap-3 text-[13px]">
                <label className="font-bold text-crm-text shrink-0">REMARK</label>
                <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
                  className="flex-1 border border-crm-border rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary transition-all" />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button onClick={handlePrint} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-crm-primary text-white text-sm font-bold rounded-lg hover:bg-crm-sidebar-active transition-colors">
                  <Printer className="w-4 h-4" />
                  {saving ? "Saving..." : "Print Challan"}
                </button>
                <Link href="/running-orders"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-crm-border text-crm-text text-sm font-bold rounded-lg hover:bg-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Link>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Print Challan (hidden on screen, shown on print) */}
      <PrintChallan
        companyName={COMPANY.name}
        companyAddress={COMPANY.address}
        companyMobile={COMPANY.mobile}
        companyGstin={COMPANY.gstin}
        partyName={order.partyName}
        partyAddress={partyAddress.en || order.partyAddress}
        partyLabel={partyAddress.gu || partyAddress.hi || partyAddress.en || order.partyName}
        partyGstin={partyGstin || undefined}
        challanNo={order.csvId}
        challanDate={order.orderDate}
        items={groupedItems.map((g) => {
          const rs = rowStates[g.key] || { grossWt: "", pcsWt: "0.070", bag: "", bagWt: "0.000", rate: "" };
          const calc = rowCalcs[g.key] || { totTrWt: 0, netWt: 0, amount: 0 };
          return {
            name: `${g.category} ${g.material}`.toUpperCase(),
            pcs: g.pcs,
            roll: 0,
            grossWt: parseFloat(rs.grossWt) || 0,
            pcsWt: parseFloat(rs.pcsWt) || 0,
            trWt: calc.totTrWt,
            netWt: calc.netWt,
            rate: parseFloat(rs.rate) || 0,
            amount: calc.amount,
          };
        })}
        totals={{
          pcs: totals.pcs,
          roll: 0,
          grossWt: totals.grossWt,
          trWt: totals.totTrWt,
          netWt: totals.netWt,
          amount: totals.amount,
        }}
      />

      {/* Bag Modal */}
      {bagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setBagModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-crm-text mb-5">Bag Details</h3>

            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-crm-primary text-white text-base">
                  <th className="px-4 py-3 rounded-tl-lg">#</th>
                  <th className="px-4 py-3">BAG</th>
                  <th className="px-4 py-3">Theli</th>
                  <th className="px-4 py-3">Cartoon</th>
                  <th className="px-4 py-3 rounded-tr-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {bagRows.map((row, i) => {
                  const b = parseInt(row.bag) || 0;
                  const t = parseInt(row.theli) || 0;
                  const c = parseInt(row.cartoon) || 0;
                  const parts: string[] = [];
                  if (b) parts.push(String(b));
                  if (t) parts.push(String(t));
                  if (c) parts.push(String(c));
                  const totalStr = parts.length > 0 ? parts.join(" + ") : "0";
                  return (
                    <tr key={i} className="border-b border-crm-border/50">
                      <td className="px-4 py-3 text-center text-crm-text-muted text-base font-medium">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <input
                          ref={i === 0 ? bagFirstInputRef : undefined}
                          autoFocus={i === 0}
                          type="number"
                          min="0"
                          value={row.bag}
                          onChange={(e) => {
                            const next = [...bagRows];
                            next[i] = { ...next[i], bag: e.target.value };
                            setBagRows(next);
                          }}
                          placeholder="0"
                          className="w-full h-11 px-3 rounded-lg border-2 border-crm-border text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={row.theli}
                          onChange={(e) => {
                            const next = [...bagRows];
                            next[i] = { ...next[i], theli: e.target.value };
                            setBagRows(next);
                          }}
                          placeholder="0"
                          className="w-full h-11 px-3 rounded-lg border-2 border-crm-border text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <input
                          type="number"
                          min="0"
                          value={row.cartoon}
                          onChange={(e) => {
                            const next = [...bagRows];
                            next[i] = { ...next[i], cartoon: e.target.value };
                            setBagRows(next);
                          }}
                          placeholder="0"
                          className="w-full h-11 px-3 rounded-lg border-2 border-crm-border text-center text-base font-medium focus:outline-none focus:ring-2 focus:ring-crm-primary/30 focus:border-crm-primary"
                        />
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-crm-primary text-base">{totalStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setBagModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-crm-primary text-white text-base font-semibold hover:bg-[#4845a2] transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setBagModalOpen(false)}
                className="flex-1 h-12 rounded-xl border border-crm-border text-crm-text-muted text-base font-semibold hover:bg-crm-bg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
