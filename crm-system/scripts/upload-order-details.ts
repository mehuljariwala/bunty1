import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  doc,
  writeBatch,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const firebaseConfig = {};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BATCH_SIZE = 500;
const DELAY_MS = 300;

interface OrderItem {
  category: string;
  material: string;
  color: string;
  orderedQty: number;
  deliveredQty: number;
}

interface OrderDetail {
  csvId: number;
  items: OrderItem[];
  grandTotalOrdered: number;
  grandTotalDelivered: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upload(): Promise<void> {
  const jsonPath = resolve(__dirname, "../order_details.json");
  const data: Record<string, OrderDetail> = JSON.parse(
    readFileSync(jsonPath, "utf-8"),
  );
  const csvIds = Object.keys(data);
  console.log(`Loaded ${csvIds.length} order details from JSON.`);

  console.log("Fetching order docs from Firestore to map csvId -> docId...");
  const snapshot = await getDocs(query(collection(db, "orders")));

  const csvIdToDoc = new Map<number, string>();
  snapshot.forEach((d) => {
    const docData = d.data();
    csvIdToDoc.set(docData.csvId, d.id);
  });
  console.log(`Found ${csvIdToDoc.size} order docs in Firestore.`);

  let uploaded = 0;
  let skipped = 0;
  let totalItems = 0;
  let batchOps = 0;
  let batch = writeBatch(db);

  for (const csvIdStr of csvIds) {
    const csvId = Number(csvIdStr);
    const detail = data[csvIdStr];
    const orderDocId = csvIdToDoc.get(csvId);

    if (!orderDocId) {
      skipped++;
      continue;
    }

    const orderRef = doc(db, "orders", orderDocId);
    batch.update(orderRef, {
      items: detail.items,
      grandTotalOrdered: detail.grandTotalOrdered,
      grandTotalDelivered: detail.grandTotalDelivered,
    });
    batchOps++;
    totalItems += detail.items.length;
    uploaded++;

    if (batchOps >= BATCH_SIZE) {
      await batch.commit();
      console.log(
        `  Committed batch — ${uploaded} orders, ${totalItems} items so far`,
      );
      batch = writeBatch(db);
      batchOps = 0;
      await delay(DELAY_MS);
    }

    if (uploaded % 500 === 0) {
      console.log(
        `  Progress: ${uploaded}/${csvIds.length} orders (${totalItems} items, ${skipped} skipped)`,
      );
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    console.log(`  Committed final batch`);
  }

  console.log(
    `\nDone! Uploaded ${uploaded} orders with ${totalItems} embedded items. Skipped ${skipped}.`,
  );
  process.exit(0);
}

upload().catch((err) => {
  console.error("Upload failed:", err);
  process.exit(1);
});
