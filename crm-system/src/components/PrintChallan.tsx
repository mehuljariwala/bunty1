"use client";

import React from "react";

interface PrintItem {
  name: string;
  pcs: number;
  roll: number;
  grossWt: number;
  pcsWt: number;
  trWt: number;
  netWt: number;
  rate: number;
  amount: number;
}

interface PrintChallanProps {
  companyName: string;
  companyAddress: string;
  companyMobile: string;
  companyGstin: string;
  partyName: string;
  partyAddress: string;
  partyLabel: string;
  partyGstin?: string;
  challanNo: number;
  challanDate: string;
  items: PrintItem[];
  totals: {
    pcs: number;
    roll: number;
    grossWt: number;
    trWt: number;
    netWt: number;
    amount: number;
  };
}

function formatDateShort(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yy = String(dt.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export default function PrintChallan({
  companyName,
  companyAddress,
  companyMobile,
  companyGstin,
  partyName,
  partyAddress,
  partyLabel,
  partyGstin,
  challanNo,
  challanDate,
  items,
  totals,
}: PrintChallanProps) {
  const TOTAL_ROWS = 25;
  const emptyRowCount = Math.max(0, TOTAL_ROWS - items.length);

  return (
    <div className="print-challan-root">
      <div className="challan-page">
        {/* Top: SELF + page number */}
        <div className="challan-top-bar" style={{ justifyContent: "center" }}>
          <span>({partyLabel})</span>
        </div>

        {/* Company Header */}
        <div className="challan-company-header">
          <h1 className="challan-company-name">{companyName}</h1>
          <p className="challan-company-address">{companyAddress}</p>
          <p className="challan-company-mobile">Mobile : {companyMobile}</p>
        </div>

        {/* Delivery Challan + GSTIN row */}
        <div className="challan-dc-row">
          <span className="challan-dc-label">DELIVERY CHALLAN</span>
          <span className="challan-dc-gstin">GSTIN: {companyGstin}</span>
        </div>

        {/* Party Details */}
        <div className="challan-party-section">
          <div className="challan-party-left">
            <p><strong>M/S.:</strong>&nbsp;&nbsp;&nbsp;{partyName}</p>
            <p><strong>ADD.:</strong>&nbsp;&nbsp;&nbsp;{partyAddress}</p>
          </div>
          <div className="challan-party-right">
            <p><strong>CHALLAN NO&nbsp;&nbsp;:</strong>&nbsp;&nbsp;&nbsp;{challanNo}</p>
            <p><strong>CHALLAN DATE :</strong>&nbsp;&nbsp;&nbsp;{formatDateShort(challanDate)}</p>
          </div>
        </div>

        {/* Party GSTIN */}
        {partyGstin && (
          <div className="challan-party-gstin">
            <strong>GSTIN :</strong>&nbsp;&nbsp;&nbsp;{partyGstin}
          </div>
        )}

        {/* Items Table */}
        <table className="challan-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>NO.</th>
              <th style={{ width: "22%" }}>ITEM NAME</th>
              <th style={{ width: "6%" }}>PCS</th>
              <th style={{ width: "6%" }}>ROLL</th>
              <th style={{ width: "10%" }}>GRS WT.</th>
              <th style={{ width: "8%" }}>PCS WT</th>
              <th style={{ width: "9%" }}>TR WT</th>
              <th style={{ width: "10%" }}>NET WT</th>
              <th style={{ width: "9%" }}>RATE</th>
              <th style={{ width: "10%" }}>AMT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="center">{idx + 1}</td>
                <td>{item.name}</td>
                <td className="center">{item.pcs}</td>
                <td className="center">{item.roll || ""}</td>
                <td className="center">{item.grossWt.toFixed(3)}</td>
                <td className="center">{item.pcsWt.toFixed(3)}</td>
                <td className="center">{item.trWt.toFixed(3)}</td>
                <td className="center">{item.netWt.toFixed(3)}</td>
                <td className="center">{item.rate.toFixed(1)}</td>
                <td className="right">{item.amount.toFixed(2)}</td>
              </tr>
            ))}
            {/* Empty filler rows */}
            {Array.from({ length: emptyRowCount }).map((_, idx) => (
              <tr key={`empty-${idx}`} className="empty-row">
                <td>&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td></td>
              <td><strong>TOTAL:</strong></td>
              <td className="center"><strong>{totals.pcs}</strong></td>
              <td className="center"><strong>{totals.roll}</strong></td>
              <td className="center"><strong>{totals.grossWt.toFixed(3)}</strong></td>
              <td></td>
              <td className="center"><strong>{totals.trWt.toFixed(3)}</strong></td>
              <td className="center"><strong>{totals.netWt.toFixed(3)}</strong></td>
              <td></td>
              <td className="right"><strong>{totals.amount.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div className="challan-footer">
          <p className="challan-for-company">FOR, {companyName}</p>
          <div className="challan-signatures">
            <span>Recievers Sign:</span>
            <span>AUTHORISED SIGNATORY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
