import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PhotoRecord } from "./types";

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      clean[key] = stripUndefined(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export async function savePhotoRecord(
  data: Omit<PhotoRecord, "id">,
): Promise<string> {
  const docRef = await addDoc(collection(db, "photos"), stripUndefined(data as unknown as Record<string, unknown>));
  return docRef.id;
}

export async function markPhotoComplete(photoId: string): Promise<void> {
  await updateDoc(doc(db, "photos", photoId), { status: "complete" });
}

export function subscribePhotos(
  callback: (photos: PhotoRecord[]) => void,
): () => void {
  const q = query(collection(db, "photos"), orderBy("capturedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PhotoRecord, "id">),
      })),
    );
  });
}
