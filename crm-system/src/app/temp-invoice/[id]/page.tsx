"use client";

import React, { use, useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem } from "@/lib/types";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import TempBillLayout from "@/components/TempBillLayout";

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

export default function TempInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyRates, setPartyRates] = useState<Record<string, Record<string, string>>>({});
  const [defaultRates, setDefaultRates] = useState<Record<string, Record<string, string>>>({});
  const [partyAddress, setPartyAddress] = useState({ en: "", gu: "", hi: "" });

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
        setPartyAddress({
          en: (partyRes.data?.address as string) || data.party_address || "",
          gu: (partyRes.data?.address_gu as string) || data.party_address_gu || "",
          hi: (partyRes.data?.address_hi as string) || "",
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
              onBagClick={() => setBagModalOpen(true)}
            />
          </div>
        </div>

        {/* Right: Challan Form */}
        <div className="lg:flex-1 w-full">
          <div className="bg-crm-card border border-crm-border rounded-xl p-4 print:border-2 print:border-black">
            {/* Challan Header */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-bold text-crm-text tracking-wider">CHALLAN</h1>
              {(partyAddress.gu || partyAddress.hi || partyAddress.en) && (
                <div className="mt-1.5 space-y-0.5">
                  {partyAddress.gu && (
                    <p className="text-sm font-semibold text-crm-text">{partyAddress.gu}</p>
                  )}
                  {partyAddress.hi && (
                    <p className="text-sm font-semibold text-crm-text">{partyAddress.hi}</p>
                  )}
                  {!partyAddress.gu && !partyAddress.hi && partyAddress.en && (
                    <p className="text-sm font-semibold text-crm-text">{partyAddress.en}</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <label className="font-semibold text-crm-text whitespace-nowrap">SALE BOOK:</label>
                <select className="flex-1 border border-crm-border rounded px-2 py-1 text-xs bg-white">
                  <option>TAX INVOICE GST</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-crm-text whitespace-nowrap">CHALLAN NO:</label>
                <input
                  type="text"
                  value={order.csvId}
                  readOnly
                  className="flex-1 border border-crm-border rounded px-2 py-1 text-xs bg-gray-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-crm-text whitespace-nowrap">CHALLAN DATE:</label>
                <input
                  type="text"
                  value={formatDate(order.orderDate)}
                  readOnly
                  className="flex-1 border border-crm-border rounded px-2 py-1 text-xs bg-gray-50"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="font-semibold text-crm-text whitespace-nowrap">PARTY NAME:</label>
                <input
                  type="text"
                  value={order.partyName}
                  readOnly
                  className="flex-1 border border-crm-border rounded px-2 py-1 text-xs bg-gray-50 truncate"
                />
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-xs border-collapse border border-crm-border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-crm-border px-1 py-1">Sr</th>
                    <th className="border border-crm-border px-1 py-1">Item Name</th>
                    <th className="border border-crm-border px-1 py-1">Color</th>
                    <th className="border border-crm-border px-1 py-1">Gross Wt</th>
                    <th className="border border-crm-border px-1 py-1">PCS</th>
                    <th className="border border-crm-border px-1 py-1">PCS Wt</th>
                    <th className="border border-crm-border px-1 py-1">Tot Tr Wt</th>
                    <th className="border border-crm-border px-1 py-1">Bag</th>
                    <th className="border border-crm-border px-1 py-1">Bag Wt</th>
                    <th className="border border-crm-border px-1 py-1">Net Wt</th>
                    <th className="border border-crm-border px-1 py-1">Rate</th>
                    <th className="border border-crm-border px-1 py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedItems.map((g, idx) => {
                    const rs = rowStates[g.key] || { grossWt: "", pcsWt: "0.070", bag: "", bagWt: "0.000", rate: "" };
                    const calc = rowCalcs[g.key] || { totTrWt: 0, netWt: 0, amount: 0 };
                    return (
                      <tr key={g.key} className="hover:bg-gray-50">
                        <td className="border border-crm-border px-1 py-1 text-center">{idx + 1}</td>
                        <td className="border border-crm-border px-1 py-1 whitespace-nowrap">
                          {g.category} {g.material}
                        </td>
                        <td className="border border-crm-border px-1 py-1 whitespace-nowrap">
                          {g.colors.join(", ")}
                        </td>
                        <td className="border border-crm-border px-1 py-0">
                          <input
                            type="text"
                            value={rs.grossWt}
                            onChange={(e) => updateRow(g.key, "grossWt", e.target.value)}
                            className="w-14 px-1 py-0.5 text-xs border-0 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-crm-primary rounded"
                          />
                        </td>
                        <td className="border border-crm-border px-1 py-1 text-center">{g.pcs}</td>
                        <td className="border border-crm-border px-1 py-0">
                          <input
                            type="text"
                            value={rs.pcsWt}
                            onChange={(e) => updateRow(g.key, "pcsWt", e.target.value)}
                            className="w-14 px-1 py-0.5 text-xs border-0 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-crm-primary rounded"
                          />
                        </td>
                        <td className="border border-crm-border px-1 py-1 text-center">
                          {calc.totTrWt.toFixed(3)}
                        </td>
                        <td className="border border-crm-border px-1 py-0">
                          <input
                            type="text"
                            value={rs.bag}
                            onChange={(e) => updateRow(g.key, "bag", e.target.value)}
                            className="w-10 px-1 py-0.5 text-xs border-0 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-crm-primary rounded"
                          />
                        </td>
                        <td className="border border-crm-border px-1 py-0">
                          <input
                            type="text"
                            value={rs.bagWt}
                            onChange={(e) => updateRow(g.key, "bagWt", e.target.value)}
                            className="w-14 px-1 py-0.5 text-xs border-0 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-crm-primary rounded"
                          />
                        </td>
                        <td className="border border-crm-border px-1 py-1 text-center">
                          {calc.netWt.toFixed(3)}
                        </td>
                        <td className="border border-crm-border px-1 py-0">
                          <input
                            type="text"
                            value={rs.rate}
                            onChange={(e) => updateRow(g.key, "rate", e.target.value)}
                            className="w-14 px-1 py-0.5 text-xs border-0 bg-transparent text-center focus:outline-none focus:ring-1 focus:ring-crm-primary rounded"
                          />
                        </td>
                        <td className="border border-crm-border px-1 py-1 text-right font-medium">
                          {calc.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals rows */}
                <tfoot>
                  <tr className="bg-gray-100 font-semibold">
                    <td className="border border-crm-border px-1 py-1" colSpan={3} />
                    <td className="border border-crm-border px-1 py-1 text-center">{totals.grossWt.toFixed(3)}</td>
                    <td className="border border-crm-border px-1 py-1 text-center">{totals.pcs}</td>
                    <td className="border border-crm-border px-1 py-1" />
                    <td className="border border-crm-border px-1 py-1 text-center">{totals.totTrWt.toFixed(3)}</td>
                    <td className="border border-crm-border px-1 py-1" colSpan={2} />
                    <td className="border border-crm-border px-1 py-1 text-center">{totals.netWt.toFixed(3)}</td>
                    <td className="border border-crm-border px-1 py-1" />
                    <td className="border border-crm-border px-1 py-1 text-right">{totals.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={11} className="border border-crm-border px-2 py-1 text-right text-xs font-semibold">TOTAL AMT.</td>
                    <td className="border border-crm-border px-2 py-1 text-right text-xs font-semibold">{totals.amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={11} className="border border-crm-border px-2 py-1 text-right text-xs font-semibold">TRANS. CH.</td>
                    <td className="border border-crm-border px-1 py-0">
                      <input type="text" value={transCh} onChange={(e) => setTransCh(e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border-0 bg-transparent text-right font-medium focus:outline-none focus:ring-1 focus:ring-crm-primary rounded" />
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={11} className="border border-crm-border px-2 py-1 text-right text-xs font-semibold">ADD/LESS</td>
                    <td className="border border-crm-border px-1 py-0">
                      <input type="text" value={addLess} onChange={(e) => setAddLess(e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border-0 bg-transparent text-right font-medium focus:outline-none focus:ring-1 focus:ring-crm-primary rounded" />
                    </td>
                  </tr>
                  <tr className="bg-green-800 text-white">
                    <td colSpan={11} className="border border-green-700 px-2 py-1.5 text-right text-xs font-bold">NET AMT.</td>
                    <td className="border border-green-700 px-2 py-1.5 text-right font-bold text-sm">{totals.netAmt.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Remark */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <label className="font-semibold text-crm-text">REMARK:</label>
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="flex-1 border border-crm-border rounded px-2 py-1 text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 print:hidden">
              <button
                onClick={handlePrint}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-crm-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
              >
                <Printer className="w-4 h-4" />
                {saving ? "Saving..." : "Print Challan"}
              </button>
              <Link
                href="/running-orders"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-crm-border text-crm-text rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Link>
            </div>
          {/* Recent Challans */}
          {recentChallans.length > 0 && (
            <div className="mt-4 bg-crm-card border border-crm-border rounded-xl p-4 print:hidden">
              <h3 className="text-sm font-bold text-crm-text mb-3">Previous Challans — {order.partyName}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse border border-crm-border">
                  <thead>
                    <tr className="bg-crm-primary text-white">
                      <th className="border border-crm-primary/50 px-2 py-1.5">Date</th>
                      <th className="border border-crm-primary/50 px-2 py-1.5">Challan No</th>
                      <th className="border border-crm-primary/50 px-2 py-1.5">Item Name</th>
                      <th className="border border-crm-primary/50 px-2 py-1.5">PCS</th>
                      <th className="border border-crm-primary/50 px-2 py-1.5">QTY (Wt)</th>
                      <th className="border border-crm-primary/50 px-2 py-1.5">Rate</th>
                      <th className="border border-crm-primary/50 px-2 py-1.5">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentChallans.flatMap((ch) =>
                      (ch.items || []).map((item, idx) => (
                        <tr key={`${ch.id}-${idx}`} className={idx === 0 ? "border-t-2 border-crm-border" : ""}>
                          <td className="border border-crm-border px-2 py-1 text-crm-primary font-medium">{idx === 0 ? formatDate(ch.challan_date) : ""}</td>
                          <td className="border border-crm-border px-2 py-1 text-center font-semibold">{idx === 0 ? ch.challan_no : ""}</td>
                          <td className="border border-crm-border px-2 py-1">{item.category} {item.material}</td>
                          <td className="border border-crm-border px-2 py-1 text-center tabular-nums">{item.pcs}</td>
                          <td className="border border-crm-border px-2 py-1 text-center tabular-nums">{item.netWt?.toFixed(3)}</td>
                          <td className="border border-crm-border px-2 py-1 text-center tabular-nums">{item.rate}</td>
                          <td className="border border-crm-border px-2 py-1 text-right tabular-nums font-medium">{item.amount?.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

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
