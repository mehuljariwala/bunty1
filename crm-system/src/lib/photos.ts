import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import type { PhotoRecord } from "./types";

export async function uploadOrderPhoto(
  file: Blob,
  orderId: string,
  seq: number,
): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  const path = `photos/${today}/${orderId}-seq${seq}.png`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: "image/png" });
  return getDownloadURL(storageRef);
}

export async function savePhotoRecord(
  data: Omit<PhotoRecord, "id">,
): Promise<string> {
  const docRef = await addDoc(collection(db, "photos"), data);
  return docRef.id;
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
