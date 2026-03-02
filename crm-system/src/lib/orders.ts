import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  runTransaction,
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
    partyAddressGu: (data.partyAddressGu as string) || undefined,
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

export async function markOrderComplete(orderId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, orderId), { type: "Complete" });
}

export async function getOrder(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, COLLECTION, orderId));
  if (!snap.exists()) return null;
  return docToOrder(snap.id, snap.data());
}

export async function getNextSeqNumber(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const ref = doc(db, "counters", "seqCounter");
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { date?: string; counter?: number } | undefined;
    let next = 1;
    if (data && data.date === today) {
      next = (data.counter ?? 0) + 1;
    }
    tx.set(ref, { date: today, counter: next });
    return next;
  });
}

export function subscribeSeqCounter(callback: (counter: number, date: string) => void): () => void {
  const ref = doc(db, "counters", "seqCounter");
  return onSnapshot(ref, (snap) => {
    const data = snap.data() as { date?: string; counter?: number } | undefined;
    const today = new Date().toISOString().split("T")[0];
    if (data && data.date === today) {
      callback(data.counter ?? 0, data.date);
    } else {
      callback(0, today);
    }
  }, () => {
    callback(0, new Date().toISOString().split("T")[0]);
  });
}

export async function updateOrder(
  orderId: string,
  data: {
    items: OrderItem[];
    grandTotalOrdered: number;
    grandTotalDelivered: number;
    type: "Running" | "Complete";
  },
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, orderId), data);
}
