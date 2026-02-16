import { initializeApp } from "firebase/app";
import { getFirestore, collection, writeBatch, doc, getDocs, query } from "firebase/firestore";

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

const SUB_ADMINS = [
  { csvId: 7, name: "anuj",      password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 6, name: "imran",     password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 5, name: "BHAGAT",    password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 4, name: "RADHE",     password: "1234",      email: "bantyjariwala@gmail.com" },
  { csvId: 3, name: "PAPPA",     password: "PAPPA",     email: "bantyjariwala@gmail.com" },
  { csvId: 2, name: "sub_admin", password: "sub_admin", email: "sub_admin@gmail.com" },
];

async function seed() {
  const col = collection(db, "subAdmins");
  const existing = await getDocs(query(col));
  if (existing.size > 0) {
    console.log(`Collection already has ${existing.size} docs. Clearing...`);
    const clearBatch = writeBatch(db);
    existing.docs.forEach((d) => clearBatch.delete(d.ref));
    await clearBatch.commit();
    console.log("Cleared.");
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString().split("T")[0];

  for (const admin of SUB_ADMINS) {
    const ref = doc(col);
    batch.set(ref, { ...admin, createdAt: now });
  }

  await batch.commit();
  console.log(`Seeded ${SUB_ADMINS.length} sub admins.`);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
