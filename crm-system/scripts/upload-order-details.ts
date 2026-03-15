import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gelxlxnfhefyxhikrhib.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw",
);

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

  console.log("Fetching order docs from Supabase to map csv_id -> id...");
  const { data: orders, error: fetchError } = await supabase
    .from("orders")
    .select("id, csv_id");

  if (fetchError) throw fetchError;

  const csvIdToDoc = new Map<number, string>();
  for (const order of orders || []) {
    csvIdToDoc.set(order.csv_id, order.id);
  }
  console.log(`Found ${csvIdToDoc.size} order docs in Supabase.`);

  let uploaded = 0;
  let skipped = 0;
  let totalItems = 0;
  let batchOps = 0;

  for (const csvIdStr of csvIds) {
    const csvId = Number(csvIdStr);
    const detail = data[csvIdStr];
    const orderDocId = csvIdToDoc.get(csvId);

    if (!orderDocId) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("orders")
      .update({
        items: detail.items,
        grand_total_ordered: detail.grandTotalOrdered,
        grand_total_delivered: detail.grandTotalDelivered,
      })
      .eq("id", orderDocId);

    if (error) throw error;

    batchOps++;
    totalItems += detail.items.length;
    uploaded++;

    if (batchOps >= BATCH_SIZE) {
      console.log(
        `  Committed batch — ${uploaded} orders, ${totalItems} items so far`,
      );
      batchOps = 0;
      await delay(DELAY_MS);
    }

    if (uploaded % 500 === 0) {
      console.log(
        `  Progress: ${uploaded}/${csvIds.length} orders (${totalItems} items, ${skipped} skipped)`,
      );
    }
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
