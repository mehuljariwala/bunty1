import {
  collection,
  addDoc,
  getDocs,
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

let routesCache: RouteDoc[] | null = null;
let routesCachePromise: Promise<RouteDoc[]> | null = null;

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

export async function fetchRoutes(): Promise<RouteDoc[]> {
  const q = query(collection(db, COLLECTION), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => docToRoute(d.id, d.data()));
}

export function fetchRoutesCached(): Promise<RouteDoc[]> {
  if (routesCache) return Promise.resolve(routesCache);
  if (routesCachePromise) return routesCachePromise;
  routesCachePromise = fetchRoutes().then((data) => {
    routesCache = data;
    routesCachePromise = null;
    return data;
  });
  return routesCachePromise;
}

export function invalidateRoutesCache(): void {
  routesCache = null;
  routesCachePromise = null;
}

export async function addRoute(route: Omit<RouteDoc, "id">): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), route);
  invalidateRoutesCache();
  return ref.id;
}

export async function updateRoute(id: string, data: Partial<Omit<RouteDoc, "id">>): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), data);
  invalidateRoutesCache();
}

export async function deleteRoute(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
  invalidateRoutesCache();
}
