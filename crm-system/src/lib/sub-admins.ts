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
import type { SubAdmin } from "./types";

const COLLECTION = "subAdmins";

function docToSubAdmin(id: string, data: Record<string, unknown>): SubAdmin {
  return {
    id,
    csvId: Number(data.csvId) || 0,
    name: (data.name as string) ?? "",
    password: (data.password as string) ?? "",
    email: (data.email as string) ?? "",
    createdAt: (data.createdAt as string) ?? "",
  };
}

export function subscribeSubAdmins(callback: (admins: SubAdmin[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy("csvId", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => docToSubAdmin(d.id, d.data())));
  });
}

export async function addSubAdmin(data: Omit<SubAdmin, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), data);
  return ref.id;
}

export async function updateSubAdmin(id: string, data: Partial<Omit<SubAdmin, "id">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteSubAdmin(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getNextCsvId(): Promise<number> {
  const q = query(collection(db, COLLECTION));
  const snap = await getDocs(q);
  let max = 0;
  snap.docs.forEach((d) => {
    const n = Number(d.data().csvId) || 0;
    if (n > max) max = n;
  });
  return max + 1;
}
