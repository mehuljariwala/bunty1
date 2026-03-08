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
import type { Party, RateValues } from "./types";

const COLLECTION = "parties";

let partiesCache: Party[] | null = null;
let partiesCachePromise: Promise<Party[]> | null = null;

function buildEmptyRates(categories: string[] = [], materials: string[] = []): RateValues {
  const rates: RateValues = {};
  for (const cat of categories) {
    rates[cat] = {};
    for (const mat of materials) {
      rates[cat][mat] = "";
    }
  }
  return rates;
}

function docToParty(id: string, data: Record<string, unknown>): Party {
  return {
    id,
    name: (data.name as string) ?? "",
    address: (data.address as string) ?? "",
    addressGu: (data.addressGu as string) ?? "",
    addressHi: (data.addressHi as string) ?? "",
    route: (data.route as string) ?? "",
    userId: (data.userId as string) ?? "",
    password: (data.password as string) ?? "",
    status: (data.status as "Enable" | "Disable") ?? "Enable",
    rates: (data.rates as RateValues) ?? buildEmptyRates(),
  };
}

export async function fetchParties(): Promise<Party[]> {
  const q = query(collection(db, COLLECTION), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToParty(d.id, d.data()));
}

export function fetchPartiesCached(): Promise<Party[]> {
  if (partiesCache) return Promise.resolve(partiesCache);
  if (partiesCachePromise) return partiesCachePromise;
  partiesCachePromise = fetchParties().then((data) => {
    partiesCache = data;
    partiesCachePromise = null;
    return data;
  });
  return partiesCachePromise;
}

export function invalidatePartiesCache(): void {
  partiesCache = null;
  partiesCachePromise = null;
}

export function subscribeParties(callback: (parties: Party[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy("name"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => docToParty(d.id, d.data())));
  });
}

export async function addParty(party: Omit<Party, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), party);
  invalidatePartiesCache();
  return ref.id;
}

export async function updateParty(id: string, data: Partial<Omit<Party, "id">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
  invalidatePartiesCache();
}

export async function deleteParty(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
  invalidatePartiesCache();
}
