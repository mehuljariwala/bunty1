import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gelxlxnfhefyxhikrhib.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw",
);

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const BATCH_SIZE = 500;

async function seed() {
  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Collection already has ${count} documents. Skipping seed.`);
    console.log("Delete the collection first if you want to re-seed.");
    process.exit(0);
  }

  const csvPath = resolve(__dirname, "../party_orders.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  let totalCount = 0;
  let batch: Record<string, unknown>[] = [];

  for (const row of rows) {
    const [csvId, partyName, partyAddress, route, orderDate, type] = row;
    if (!partyName) continue;

    batch.push({
      csv_id: Number(csvId),
      party_name: partyName,
      party_address: partyAddress,
      route,
      order_date: orderDate,
      type,
    });

    totalCount++;

    if (batch.length === BATCH_SIZE) {
      const { error } = await supabase.from("orders").insert(batch);
      if (error) throw error;
      console.log(`  Committed batch — ${totalCount} docs so far`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    const { error } = await supabase.from("orders").insert(batch);
    if (error) throw error;
    console.log(`  Committed final batch — ${totalCount} docs total`);
  }

  console.log(`\nSeeded ${totalCount} orders to Supabase.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
