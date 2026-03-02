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

export async function savePhotoRecord(
  data: Omit<PhotoRecord, "id">,
): Promise<string> {
  const docRef = await addDoc(collection(db, "photos"), data);
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
