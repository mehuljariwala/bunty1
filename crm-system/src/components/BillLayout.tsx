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
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#000", fontSize: "14px", fontWeight: 500, background: "#fff", width: "100%", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>

      {/* Header card */}
      <div style={{ textAlign: "center", padding: "10px 10px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "20px", fontWeight: 500, color: "#1460BD" }}>
              {order.partyName.toUpperCase()}
            </div>
            <div style={{ fontSize: "13px", color: "#000", fontWeight: 500, marginBottom: 0 }}>
              {order.partyAddress}
            </div>
            {order.partyAddressGu && (
              <div style={{ fontSize: "13px", color: "#000", fontWeight: 500, marginBottom: 0 }}>
                {order.partyAddressGu}
              </div>
            )}
          </div>
          {sequenceNumber != null && (
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a1a2e", background: "#f0f0f0", borderRadius: "6px", padding: "2px 16px", lineHeight: 1.2, boxShadow: "0 1px 3px rgba(0,0,0,0.12)", flexShrink: 0 }}>
              {sequenceNumber}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#1460BD", minWidth: "60px" }}>Date :-</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}>{formatDateBill(order.orderDate)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ fontSize: "14px", fontWeight: 500, color: "#1460BD", minWidth: "60px" }}>Order ID :-</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#000" }}> # {order.csvId}</span>
          </div>
        </div>
      </div>

      {/* Category sections */}
      {groups.map((group) => (
        <div key={group.category}>
          {/* Category header with dashed borders */}
          <h3 style={{
            textAlign: "center",
            margin: "0",
            padding: "4px 0",
            fontSize: "16px",
            fontWeight: 700,
            color: CATEGORY_COLORS[group.category] ? "#fff" : "#000",
            background: CATEGORY_COLORS[group.category] ?? "transparent",
            borderTop: CATEGORY_COLORS[group.category] ? "none" : "1px dashed #000",
            borderBottom: CATEGORY_COLORS[group.category] ? "none" : "1px dashed #000",
            borderRadius: CATEGORY_COLORS[group.category] ? "4px" : "0",
          }}>
            {group.category}
          </h3>

          {/* Materials in 2-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0" }}>
            {group.materials.map((mat) => (
              <div key={mat.material} style={{ padding: "0 4px" }}>
                <h4 style={{ margin: "0 0 0 10px", fontSize: "14px", fontWeight: 800, color: "#000" }}>{mat.material} :-</h4>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "#000" }}>
                  <tbody>
                    {mat.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: "1px 4px", fontWeight: 500 }}>{item.color}</td>
                        <td style={{ padding: "1px 4px", width: "48px", fontWeight: 600 }}>{item.orderedQty}&nbsp; -&gt;</td>
                        <td style={{ padding: "1px 4px", fontWeight: 600 }}>{item.deliveredQty}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700, border: "1px solid #000" }}>
                      <td style={{ padding: "1px 4px", borderTop: "1px solid #000" }}>TOTAL</td>
                      <td style={{ padding: "1px 4px", width: "48px", borderTop: "1px solid #000" }}>{mat.totalOrdered}&nbsp; -&gt;</td>
                      <td style={{ padding: "1px 4px", borderTop: "1px solid #000" }}>{mat.totalDelivered}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ padding: "6px 4px 2px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "4px", fontSize: "12px" }}>
                          <span>Weight:</span>
                          <span style={{ flex: 1, borderBottom: "1px solid #000", minHeight: "14px" }}>&nbsp;</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Category grand total */}
          <div style={{ padding: "0 15px", marginBottom: "5px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", color: "#000" }}>
              <tbody>
                <tr style={{ fontWeight: 800 }}>
                  <td style={{ textAlign: "center", display: "flex", justifyContent: "center", gap: "8px", borderTop: "0", fontSize: "14px" }}>
                    GRAND TOTAL
                    <span>{group.totalOrdered} <span style={{ margin: "0 2px" }}>-&gt;</span> {group.totalDelivered}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Overall grand total (when multiple categories) */}
      {groups.length > 1 && (
        <div style={{ padding: "0 15px", marginTop: "2px", marginBottom: "5px" }}>
          <div style={{ textAlign: "center", fontWeight: 800, fontSize: "14px", padding: "3px 0", borderTop: "2px solid #000", borderBottom: "2px solid #000" }}>
            GRAND TOTAL&nbsp;&nbsp;{grandOrdered} <span style={{ margin: "0 2px" }}>-&gt;</span> {grandDelivered}
          </div>
        </div>
      )}

    </div>
  );
}
