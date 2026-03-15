import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gelxlxnfhefyxhikrhib.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw",
);

const SUB_ADMINS = [
  { csvId: 7, name: "anuj",      password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 6, name: "imran",     password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 5, name: "BHAGAT",    password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 4, name: "RADHE",     password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 3, name: "PAPPA",     password: "PAPPA",     email: "bantyjariwala@gmail.com" },
  { csvId: 2, name: "sub_admin", password: "sub_admin", email: "sub_admin@gmail.com" },
];

async function seed() {
  const { count } = await supabase
    .from("sub_admins")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Collection already has ${count} docs. Clearing...`);
    const { error: deleteError } = await supabase
      .from("sub_admins")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) throw deleteError;
    console.log("Cleared.");
  }

  const now = new Date().toISOString().split("T")[0];

  const { error } = await supabase.from("sub_admins").insert(
    SUB_ADMINS.map((a) => ({
      csv_id: a.csvId,
      name: a.name,
      password: a.password,
      email: a.email,
      created_at: now,
    })),
  );
  if (error) throw error;

  console.log(`Seeded ${SUB_ADMINS.length} sub admins.`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
