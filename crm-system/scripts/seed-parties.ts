import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gelxlxnfhefyxhikrhib.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw",
);

function buildEmptyRates(): Record<string, Record<string, string>> {
  const rates: Record<string, Record<string, string>> = {};
  for (const cat of ["3 TAR", "5 TAR", "Yarn"]) {
    rates[cat] = {};
    for (const mat of ["Celtionic", "Litchy", "Polyester", "Multy"]) {
      rates[cat][mat] = "";
    }
  }
  return rates;
}

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

async function seed() {
  const { count } = await supabase
    .from("parties")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Collection already has ${count} documents. Skipping seed.`);
    console.log("Delete the collection first if you want to re-seed.");
    process.exit(0);
  }

  const csvPath = resolve(__dirname, "../party_details.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  let count2 = 0;
  for (const row of rows) {
    const [csvId, name, address, route, userId, password, status] = row;
    if (!name) continue;

    const { error } = await supabase.from("parties").insert({
      csv_id: Number(csvId),
      name,
      address,
      route,
      user_id: userId,
      password,
      status: status || "Enable",
      rates: buildEmptyRates(),
    });
    if (error) throw error;
    count2++;
    console.log(`  Added: ${name}`);
  }

  console.log(`\nSeeded ${count2} parties to Supabase.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
