import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gelxlxnfhefyxhikrhib.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw",
);

const ROUTES = [
  { name: "BHATAR", code: "RT-001" },
  { name: "SONAL", code: "RT-002" },
  { name: "LIMBAYAT", code: "RT-003" },
];

async function seed(): Promise<void> {
  const { count } = await supabase
    .from("routes")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Routes already exist (${count}). Skipping.`);
    process.exit(0);
  }

  for (const r of ROUTES) {
    const { error } = await supabase.from("routes").insert({
      name: r.name,
      code: r.code,
      area: "",
      description: "",
      active: true,
      parties: 0,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    console.log(`  Added route: ${r.name}`);
  }

  console.log(`\nSeeded ${ROUTES.length} routes to Supabase.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
