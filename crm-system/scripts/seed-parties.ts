import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query } from "firebase/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

const firebaseConfig = {
  apiKey: "AIzaSyBUp2ODHF6k2pVaYY26jY4cyLCbou5kxXg",
  authDomain: "meet-hub-3c03e.firebaseapp.com",
  projectId: "meet-hub-3c03e",
  storageBucket: "meet-hub-3c03e.firebasestorage.app",
  messagingSenderId: "17836504239",
  appId: "1:17836504239:web:0145ed139dafe24462d05a",
  measurementId: "G-YNNNRP88PX",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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
  const existing = await getDocs(query(collection(db, "parties")));
  if (existing.size > 0) {
    console.log(`Collection already has ${existing.size} documents. Skipping seed.`);
    console.log("Delete the collection first if you want to re-seed.");
    process.exit(0);
  }

  const csvPath = resolve(__dirname, "../party_details.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  let count = 0;
  for (const row of rows) {
    const [csvId, name, address, route, userId, password, status] = row;
    if (!name) continue;

    await addDoc(collection(db, "parties"), {
      csvId: Number(csvId),
      name,
      address,
      route,
      userId,
      password,
      status: status || "Enable",
      rates: buildEmptyRates(),
    });
    count++;
    console.log(`  Added: ${name}`);
  }

  console.log(`\nSeeded ${count} parties to Firestore.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
