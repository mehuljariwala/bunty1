import type { Order, OrderItem } from "@/lib/types";

interface CategoryGroup {
  category: string;
  materials: { material: string; items: OrderItem[]; totalOrdered: number; totalDelivered: number }[];
  totalOrdered: number;
  totalDelivered: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "3 Tar": "#f5956b",
  "5 Tar": "#5b5fc7",
  "Yarn": "#36b49f",
};

const SUB_CAT_ORDER = [
  "Celtionic",
  "Litchy",
  "Polyester",
  "Multy",
  "Rani multy",
];

function groupItems(items: OrderItem[]): CategoryGroup[] {
  const catMap = new Map<string, Map<string, OrderItem[]>>();
  for (const item of items) {
    if (!catMap.has(item.category)) catMap.set(item.category, new Map());
    const matMap = catMap.get(item.category)!;
    if (!matMap.has(item.material)) matMap.set(item.material, []);
    matMap.get(item.material)!.push(item);
  }
  return Array.from(catMap.entries()).map(([category, matMap]) => {
    // Sort sub-categories (materials) using SUB_CAT_ORDER
    const sortedEntries: [string, OrderItem[]][] = [];
    for (const sub of SUB_CAT_ORDER) {
      if (matMap.has(sub)) {
        sortedEntries.push([sub, matMap.get(sub)!]);
        matMap.delete(sub);
      }
    }
    for (const [sub, items] of matMap) {
      sortedEntries.push([sub, items]);
    }

    const materials = sortedEntries.map(([material, items]) => ({
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

function formatDateBill(d: string): string {
  const dt = new Date(d + "T00:00:00");
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

interface BillLayoutProps {
  order: Order;
  sequenceNumber?: number;
}

export default function BillLayout({ order, sequenceNumber }: BillLayoutProps) {
  const groups = groupItems(order.items ?? []);
  const grandOrdered = order.grandTotalOrdered ?? groups.reduce((s, g) => s + g.totalOrdered, 0);
  const grandDelivered = order.grandTotalDelivered ?? groups.reduce((s, g) => s + g.totalDelivered, 0);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#000", fontSize: "11px", fontWeight: 500, background: "#fff", width: "100%" }}>
      <style>{`
        @media print {
          .bill-cat-header {
            background: transparent !important;
            color: #000 !important;
            border-top: 1px dashed #000 !important;
            border-bottom: 1px dashed #000 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: "6px 8px 2px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700 }}>
              {order.partyName.toUpperCase()}
            </div>
            <div style={{ fontSize: "10px", marginTop: "1px" }}>
              {order.partyAddress}
            </div>
            {order.partyAddressGu && (
              <div style={{ fontSize: "10px" }}>
                {order.partyAddressGu}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {sequenceNumber != null && (
              <div style={{ fontSize: "20px", fontWeight: 800, lineHeight: 1 }}>
                {sequenceNumber}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px", fontSize: "10px" }}>
          <span><b>Date:</b> {formatDateBill(order.orderDate)}</span>
          <span><b>Order ID:</b> #{order.csvId}</span>
        </div>
        <div style={{ borderBottom: "1px solid #000", marginTop: "3px" }} />
      </div>

      {/* Category sections */}
      {groups.map((group) => (
        <div key={group.category} style={{ padding: "0 8px" }}>
          {/* Category header — colored on screen, plain on print */}
          <h3 className="bill-cat-header" style={{
            textAlign: "center",
            margin: "2px 0 1px",
            padding: "2px 0",
            fontSize: "12px",
            fontWeight: 700,
            color: CATEGORY_COLORS[group.category] ? "#fff" : "#000",
            background: CATEGORY_COLORS[group.category] ?? "transparent",
            borderRadius: CATEGORY_COLORS[group.category] ? "3px" : "0",
            borderTop: CATEGORY_COLORS[group.category] ? "none" : "1px dashed #000",
            borderBottom: CATEGORY_COLORS[group.category] ? "none" : "1px dashed #000",
          }}>
            {group.category}
          </h3>

          {/* Materials in 2-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0" }}>
            {group.materials.map((mat) => (
              <div key={mat.material} style={{ padding: "0 2px" }}>
                <h4 style={{ margin: "1px 0 0 4px", fontSize: "11px", fontWeight: 700 }}>{mat.material} :-</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <tbody>
                    {mat.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "0 3px", fontWeight: 500, lineHeight: "15px" }}>{item.color}</td>
                        <td style={{ padding: "0 3px", width: "40px", fontWeight: 600, lineHeight: "15px" }}>{item.orderedQty}&nbsp;-&gt;</td>
                        <td style={{ padding: "0 3px", fontWeight: 600, lineHeight: "15px" }}>{item.deliveredQty}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700 }}>
                      <td style={{ padding: "0 3px", borderTop: "1px solid #000", lineHeight: "15px" }}>Total</td>
                      <td style={{ padding: "0 3px", width: "40px", borderTop: "1px solid #000", lineHeight: "15px" }}>{mat.totalOrdered}&nbsp;-&gt;</td>
                      <td style={{ padding: "0 3px", borderTop: "1px solid #000", lineHeight: "15px" }}>{mat.totalDelivered}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: "3px 3px 1px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "3px", fontSize: "10px" }}>
                          <span>Wt:</span>
                          <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: "10px" }}>&nbsp;</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Category total */}
          <div style={{ textAlign: "center", fontWeight: 700, fontSize: "11px", padding: "1px 0", margin: "0 8px" }}>
            Grand Total&nbsp;&nbsp;{group.totalOrdered} -&gt; {group.totalDelivered}
          </div>
        </div>
      ))}

      {/* Overall grand total (when multiple categories) */}
      {groups.length > 1 && (
        <div style={{ textAlign: "center", fontWeight: 800, fontSize: "12px", padding: "2px 0", margin: "0 8px", borderTop: "2px solid #000", borderBottom: "2px solid #000" }}>
          GRAND TOTAL&nbsp;&nbsp;{grandOrdered} -&gt; {grandDelivered}
        </div>
      )}

    </div>
  );
}
