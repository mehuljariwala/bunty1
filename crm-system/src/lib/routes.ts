import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { RouteDoc } from "./types";

const COLLECTION = "routes";

function docToRoute(id: string, data: Record<string, unknown>): RouteDoc {
  return {
    id,
    name: (data.name as string) ?? "",
    code: (data.code as string) ?? "",
    area: (data.area as string) ?? "",
    description: (data.description as string) ?? "",
    active: (data.active as boolean) ?? true,
    parties: Number(data.parties) || 0,
    createdAt: (data.createdAt as string) ?? "",
  };
}

export function subscribeRoutes(callback: (routes: RouteDoc[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => docToRoute(d.id, d.data())));
  });
}

export async function addRoute(route: Omit<RouteDoc, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), route);
  return ref.id;
}

export async function updateRoute(id: string, data: Partial<Omit<RouteDoc, "id">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteRoute(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
