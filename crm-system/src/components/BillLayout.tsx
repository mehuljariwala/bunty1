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
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#000", fontSize: "13.5px", fontWeight: 500, background: "#fff", width: "100%" }}>
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
      <div style={{ padding: "10px 10px 0", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: "20px", fontWeight: 500, color: "#1460bd" }}>
              {order.partyName.toUpperCase()}
            </div>
            <div style={{ fontSize: "12.5px", marginTop: "1px", fontWeight: 700 }}>
              {order.partyAddress}
            </div>
            {order.partyAddressGu && (
              <div style={{ fontSize: "12.5px" }}>
                {order.partyAddressGu}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            {sequenceNumber != null && (
              <div style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1 }}>
                {sequenceNumber}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "5px", fontSize: "12.5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#1460bd", fontWeight: 500 }}>Date :-</span>
            <span>{formatDateBill(order.orderDate)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ color: "#1460bd", fontWeight: 500 }}>Order ID :-</span>
            <span># {order.csvId}</span>
          </div>
        </div>
      </div>

      {/* Category sections */}
      {groups.map((group) => (
        <div key={group.category} style={{ padding: "0 10px" }}>
          {/* Category header — colored on screen, plain on print */}
          <h3 className="bill-cat-header" style={{
            textAlign: "center",
            margin: "0",
            padding: "1px 0",
            fontSize: "15px",
            fontWeight: 700,
            color: CATEGORY_COLORS[group.category] ? "#fff" : "#000",
            background: CATEGORY_COLORS[group.category] ?? "transparent",
            borderRadius: CATEGORY_COLORS[group.category] ? "3px" : "0",
            borderTop: "1px dashed #000",
            borderBottom: "1px dashed #000",
            borderLeft: "none",
            borderRight: "none",
          }}>
            {group.category}
          </h3>

          {/* Materials in 2-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0" }}>
            {group.materials.map((mat) => (
              <div key={mat.material} style={{ padding: "0 2px" }}>
                <h4 style={{ margin: "0 0 0 4px", fontSize: "15px", fontWeight: 700 }}>{mat.material} :-</h4>
                <table style={{ borderCollapse: "collapse", fontSize: "13.5px", marginBottom: "5px" }}>
                  <tbody>
                    {mat.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "0 4px", fontWeight: 500, lineHeight: "18px" }}>{item.color}</td>
                        <td style={{ padding: "0 4px", width: "48px", fontWeight: 500, lineHeight: "18px", whiteSpace: "nowrap" }}>{item.orderedQty}&nbsp; -&gt;</td>
                        <td style={{ padding: "0 4px", fontWeight: 500, lineHeight: "18px" }}>{item.deliveredQty}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 600, border: "1px solid #000" }}>
                      <td style={{ padding: "0 4px", borderTop: "1px solid #000", lineHeight: "18px" }}>TOTAL</td>
                      <td style={{ padding: "0 4px", width: "48px", borderTop: "1px solid #000", lineHeight: "18px", whiteSpace: "nowrap" }}>{mat.totalOrdered}&nbsp; -&gt;</td>
                      <td style={{ padding: "0 4px", borderTop: "1px solid #000", lineHeight: "18px" }}>{mat.totalDelivered}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: "3px 3px 1px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "3px", fontSize: "11px", border: "1px solid #000", padding: "4px 5px", minHeight: "22px" }}>
                          <span>Wt:</span>
                          <span style={{ flex: 1, minHeight: "14px" }}>&nbsp;</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Category total */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13.5px", padding: "2px 0", margin: "0 15px", borderTop: "0px solid transparent" }}>
            <span>GRAND TOTAL</span>
            <div style={{ fontWeight: 600 }}>
              {group.totalOrdered} <span>-&gt;</span> <span>{group.totalDelivered}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Overall grand total (when multiple categories) */}
      {groups.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "14px", padding: "3px 0", margin: "0 10px", borderTop: "2px solid #000", borderBottom: "2px solid #000" }}>
          <span>GRAND TOTAL</span>
          <div>
            {grandOrdered} <span>-&gt;</span> <span>{grandDelivered}</span>
          </div>
        </div>
      )}

      {/* BAG box */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontSize: "13px", fontWeight: 600, padding: "5px 10px", margin: "4px 10px 0" }}>
        <span>BAG (&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</span>
      </div>

    </div>
  );
}
