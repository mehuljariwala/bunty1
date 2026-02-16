import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query } from "firebase/firestore";

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

const ROUTES = [
  { name: "BHATAR", code: "RT-001" },
  { name: "SONAL", code: "RT-002" },
  { name: "LIMBAYAT", code: "RT-003" },
];

async function seed(): Promise<void> {
  const existing = await getDocs(query(collection(db, "routes")));
  if (existing.size > 0) {
    console.log(`Routes already exist (${existing.size}). Skipping.`);
    process.exit(0);
  }

  for (const r of ROUTES) {
    await addDoc(collection(db, "routes"), {
      name: r.name,
      code: r.code,
      area: "",
      description: "",
      active: true,
      parties: 0,
      createdAt: new Date().toISOString(),
    });
    console.log(`  Added route: ${r.name}`);
  }

  console.log(`\nSeeded ${ROUTES.length} routes to Firestore.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
