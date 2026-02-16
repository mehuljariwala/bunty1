import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Order, OrderItem } from "./types";

const COLLECTION = "orders";

function docToOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    csvId: (data.csvId as number) ?? 0,
    partyName: (data.partyName as string) ?? "",
    partyAddress: (data.partyAddress as string) ?? "",
    route: (data.route as string) ?? "",
    orderDate: (data.orderDate as string) ?? "",
    type: (data.type as "Running" | "Complete") ?? "Complete",
    items: (data.items as OrderItem[]) ?? [],
    grandTotalOrdered: data.grandTotalOrdered as number | undefined,
    grandTotalDelivered: data.grandTotalDelivered as number | undefined,
  };
}

export function subscribeOrders(callback: (orders: Order[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy("csvId", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => docToOrder(d.id, d.data())));
  });
}
