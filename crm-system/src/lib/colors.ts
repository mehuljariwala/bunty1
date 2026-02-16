import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Color } from "./types";

const COLLECTION = "colors";

function docToColor(id: string, data: Record<string, unknown>): Color {
  return {
    id,
    name: (data.name as string) ?? "",
    code: (data.code as string) ?? "",
    hex: (data.hex as string) ?? "#000000",
    category: (data.category as string) ?? "",
    subCategory: (data.subCategory as string) ?? "",
    minStock: Number(data.minStock) || 0,
    maxStock: Number(data.maxStock) || 0,
    currentStock: Number(data.currentStock) || 0,
    runningColor: (data.runningColor as boolean) ?? false,
    sortOrder: Number(data.sortOrder) || 0,
    createdAt: (data.createdAt as string) ?? "",
  };
}

export function subscribeColors(callback: (colors: Color[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy("sortOrder"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => docToColor(d.id, d.data())));
  });
}

export async function fetchColors(): Promise<Color[]> {
  const q = query(collection(db, COLLECTION), orderBy("sortOrder"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToColor(d.id, d.data()));
}

export async function addColor(color: Omit<Color, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), color);
  return ref.id;
}

export async function updateColor(id: string, data: Partial<Omit<Color, "id">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteColor(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
