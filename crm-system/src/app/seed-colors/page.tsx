"use client";

import { useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Upload, CircleCheck, AlertTriangle, Trash2 } from "lucide-react";

interface SeedColor {
  name: string;
  code: string;
  hex: string;
  category: string;
  subCategory: string;
  minStock: number;
  maxStock: number;
  currentStock: number;
  runningColor: boolean;
  sortOrder: number;
  createdAt: string;
}

const CSV_DATA: Omit<SeedColor, "code" | "runningColor" | "sortOrder" | "createdAt">[] = [
  { name: "Red", hex: "#ff0000", category: "5 Tar", subCategory: "Celtionic", minStock: 30, maxStock: 75, currentStock: 15 },
  { name: "Red", hex: "#ff0000", category: "3 Tar", subCategory: "Celtionic", minStock: 30, maxStock: 75, currentStock: 45 },
  { name: "Red", hex: "#ff0000", category: "Yarn", subCategory: "Celtionic", minStock: 15, maxStock: 150, currentStock: 18 },
  { name: "Rani", hex: "#f716ec", category: "5 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 60, currentStock: 22 },
  { name: "Rani", hex: "#f716ec", category: "3 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 60, currentStock: 3 },
  { name: "Rani", hex: "#f716ec", category: "Yarn", subCategory: "Celtionic", minStock: 25, maxStock: 90, currentStock: -64 },
  { name: "R Blue", hex: "#4169e1", category: "5 Tar", subCategory: "Celtionic", minStock: 25, maxStock: 60, currentStock: 20 },
  { name: "R Blue", hex: "#4169e1", category: "3 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 60, currentStock: 15 },
  { name: "R Blue", hex: "#4169e1", category: "Yarn", subCategory: "Celtionic", minStock: 15, maxStock: 60, currentStock: -29 },
  { name: "Green", hex: "#008000", category: "5 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 30, currentStock: 40 },
  { name: "Green", hex: "#008000", category: "3 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 30, currentStock: 12 },
  { name: "Green", hex: "#008000", category: "Yarn", subCategory: "Celtionic", minStock: 15, maxStock: 45, currentStock: -97 },
  { name: "Orange", hex: "#ff8c00", category: "5 Tar", subCategory: "Celtionic", minStock: 30, maxStock: 100, currentStock: 12 },
  { name: "Orange", hex: "#ff8c00", category: "3 Tar", subCategory: "Celtionic", minStock: 30, maxStock: 100, currentStock: 32 },
  { name: "Orange", hex: "#ff8c00", category: "Yarn", subCategory: "Celtionic", minStock: 30, maxStock: 100, currentStock: -10 },
  { name: "Jambli", hex: "#511191", category: "5 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 12 },
  { name: "Jambli", hex: "#511191", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 13 },
  { name: "Jambli", hex: "#511191", category: "Yarn", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: -39 },
  { name: "Majenta", hex: "#d40078", category: "5 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 12 },
  { name: "Majenta", hex: "#d40078", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 20 },
  { name: "Majenta", hex: "#d40078", category: "Yarn", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: -47 },
  { name: "Firozi", hex: "#72b8b1", category: "5 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 11 },
  { name: "Firozi", hex: "#72b8b1", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 27 },
  { name: "Firozi", hex: "#72b8b1", category: "Yarn", subCategory: "Litchy", minStock: 15, maxStock: 45, currentStock: -7 },
  { name: "Rama", hex: "#009b77", category: "5 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 45, currentStock: 45 },
  { name: "Rama", hex: "#009b77", category: "3 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 45, currentStock: 7 },
  { name: "Rama", hex: "#009b77", category: "Yarn", subCategory: "Celtionic", minStock: 15, maxStock: 45, currentStock: -36 },
  { name: "Golden", hex: "#ffc400", category: "5 Tar", subCategory: "Celtionic", minStock: 20, maxStock: 45, currentStock: 22 },
  { name: "Golden", hex: "#ffc400", category: "3 Tar", subCategory: "Celtionic", minStock: 20, maxStock: 45, currentStock: 35 },
  { name: "Golden", hex: "#ffc400", category: "Yarn", subCategory: "Celtionic", minStock: 20, maxStock: 60, currentStock: -69 },
  { name: "Perot", hex: "#6cf205", category: "5 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 45, currentStock: 8 },
  { name: "Perot", hex: "#6cf205", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 45, currentStock: 11 },
  { name: "Perot", hex: "#6cf205", category: "Yarn", subCategory: "Litchy", minStock: 15, maxStock: 45, currentStock: -2 },
  { name: "Gajari", hex: "#fc4949", category: "5 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 45, currentStock: 31 },
  { name: "Gajari", hex: "#fc4949", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 45, currentStock: 34 },
  { name: "Gajari", hex: "#fc4949", category: "Yarn", subCategory: "Litchy", minStock: 15, maxStock: 45, currentStock: -82 },
  { name: "N Blue", hex: "#000080", category: "5 Tar", subCategory: "Celtionic", minStock: 20, maxStock: 45, currentStock: 61 },
  { name: "N Blue", hex: "#000080", category: "3 Tar", subCategory: "Celtionic", minStock: 20, maxStock: 45, currentStock: 7 },
  { name: "N Blue", hex: "#000080", category: "Yarn", subCategory: "Celtionic", minStock: 20, maxStock: 90, currentStock: -23 },
  { name: "Chiku", hex: "#e09758", category: "5 Tar", subCategory: "Celtionic", minStock: 30, maxStock: 120, currentStock: 22 },
  { name: "Chiku", hex: "#e09758", category: "3 Tar", subCategory: "Celtionic", minStock: 30, maxStock: 120, currentStock: 42 },
  { name: "Chiku", hex: "#e09758", category: "Yarn", subCategory: "Celtionic", minStock: 30, maxStock: 120, currentStock: -331 },
  { name: "C Green", hex: "#00ffff", category: "5 Tar", subCategory: "Celtionic", minStock: 15, maxStock: 30, currentStock: 8 },
  { name: "C Green", hex: "#00ffff", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 8 },
  { name: "C Green", hex: "#00ffff", category: "Yarn", subCategory: "Celtionic", minStock: 15, maxStock: 30, currentStock: -110 },
  { name: "Oninen", hex: "#894452", category: "5 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 45, currentStock: 8 },
  { name: "Oninen", hex: "#894452", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 150, currentStock: 12 },
  { name: "Oninen", hex: "#894452", category: "Yarn", subCategory: "Litchy", minStock: 10, maxStock: 30, currentStock: -132 },
  { name: "L Green", hex: "#3bad3b", category: "5 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 16 },
  { name: "L Green", hex: "#3bad3b", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 9 },
  { name: "L Green", hex: "#3bad3b", category: "Yarn", subCategory: "Celtionic", minStock: 10, maxStock: 45, currentStock: 28 },
  { name: "L Perot", hex: "#9ecc1f", category: "5 Tar", subCategory: "Celtionic", minStock: 3, maxStock: 15, currentStock: 8 },
  { name: "L Perot", hex: "#9ecc1f", category: "3 Tar", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: 5 },
  { name: "L Perot", hex: "#9ecc1f", category: "Yarn", subCategory: "Celtionic", minStock: 5, maxStock: 30, currentStock: -4 },
  { name: "Black", hex: "#000000", category: "5 Tar", subCategory: "Polyester", minStock: 30, maxStock: 90, currentStock: 35 },
  { name: "Black", hex: "#000000", category: "3 Tar", subCategory: "Polyester", minStock: 30, maxStock: 90, currentStock: 3 },
  { name: "Black", hex: "#000000", category: "Yarn", subCategory: "Polyester", minStock: 30, maxStock: 90, currentStock: -73 },
  { name: "Mahrron", hex: "#800000", category: "5 Tar", subCategory: "Polyester", minStock: 20, maxStock: 60, currentStock: 36 },
  { name: "Mahrron", hex: "#800000", category: "3 Tar", subCategory: "Polyester", minStock: 15, maxStock: 45, currentStock: 26 },
  { name: "Mahrron", hex: "#800000", category: "Yarn", subCategory: "Polyester", minStock: 30, maxStock: 90, currentStock: -73 },
  { name: "Gray", hex: "#808080", category: "5 Tar", subCategory: "Polyester", minStock: 15, maxStock: 45, currentStock: 30 },
  { name: "Gray", hex: "#808080", category: "3 Tar", subCategory: "Polyester", minStock: 15, maxStock: 45, currentStock: 19 },
  { name: "Gray", hex: "#808080", category: "Yarn", subCategory: "Polyester", minStock: 20, maxStock: 60, currentStock: -78 },
  { name: "B Cream", hex: "#fffdd0", category: "5 Tar", subCategory: "Polyester", minStock: 5, maxStock: 30, currentStock: 2 },
  { name: "B Cream", hex: "#fffdd0", category: "3 Tar", subCategory: "Polyester", minStock: 5, maxStock: 30, currentStock: 10 },
  { name: "B Cream", hex: "#fffdd0", category: "Yarn", subCategory: "Polyester", minStock: 15, maxStock: 45, currentStock: -49 },
  { name: "D Pink", hex: "#fc97a7", category: "5 Tar", subCategory: "Polyester", minStock: 15, maxStock: 30, currentStock: 22 },
  { name: "D Pink", hex: "#fc97a7", category: "3 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: 9 },
  { name: "D Pink", hex: "#fc97a7", category: "Yarn", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: -103 },
  { name: "Wine", hex: "#722f37", category: "5 Tar", subCategory: "Polyester", minStock: 15, maxStock: 30, currentStock: 15 },
  { name: "Wine", hex: "#722f37", category: "3 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: 24 },
  { name: "Wine", hex: "#722f37", category: "Yarn", subCategory: "Polyester", minStock: 15, maxStock: 30, currentStock: -56 },
  { name: "B Green", hex: "#0b4233", category: "5 Tar", subCategory: "Polyester", minStock: 15, maxStock: 30, currentStock: 39 },
  { name: "B Green", hex: "#0b4233", category: "3 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: 11 },
  { name: "B Green", hex: "#0b4233", category: "Yarn", subCategory: "Polyester", minStock: 15, maxStock: 45, currentStock: -115 },
  { name: "Cofee", hex: "#573d2b", category: "5 Tar", subCategory: "Polyester", minStock: 5, maxStock: 20, currentStock: 3 },
  { name: "Cofee", hex: "#573d2b", category: "3 Tar", subCategory: "Polyester", minStock: 5, maxStock: 20, currentStock: 13 },
  { name: "Cofee", hex: "#573d2b", category: "Yarn", subCategory: "Polyester", minStock: 10, maxStock: 45, currentStock: -10 },
  { name: "Pista", hex: "#93c572", category: "5 Tar", subCategory: "Polyester", minStock: 5, maxStock: 15, currentStock: 22 },
  { name: "Pista", hex: "#93c572", category: "3 Tar", subCategory: "Polyester", minStock: 5, maxStock: 15, currentStock: 4 },
  { name: "Pista", hex: "#93c572", category: "Yarn", subCategory: "Polyester", minStock: 5, maxStock: 20, currentStock: -63 },
  { name: "Pitch", hex: "#ffcba4", category: "5 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: 15 },
  { name: "Pitch", hex: "#ffcba4", category: "3 Tar", subCategory: "Polyester", minStock: 5, maxStock: 20, currentStock: 16 },
  { name: "Pitch", hex: "#ffcba4", category: "Yarn", subCategory: "Polyester", minStock: 5, maxStock: 20, currentStock: -88 },
  { name: "Mahendi", hex: "#026600", category: "5 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: 7 },
  { name: "Mahendi", hex: "#026600", category: "3 Tar", subCategory: "Polyester", minStock: 6, maxStock: 30, currentStock: 12 },
  { name: "Mahendi", hex: "#026600", category: "Yarn", subCategory: "Polyester", minStock: 6, maxStock: 30, currentStock: -55 },
  { name: "Sky", hex: "#71bce1", category: "5 Tar", subCategory: "Polyester", minStock: 6, maxStock: 15, currentStock: 5 },
  { name: "Sky", hex: "#71bce1", category: "3 Tar", subCategory: "Polyester", minStock: 6, maxStock: 15, currentStock: 5 },
  { name: "Sky", hex: "#71bce1", category: "Yarn", subCategory: "Polyester", minStock: 6, maxStock: 15, currentStock: -90 },
  { name: "Lovender", hex: "#afaffa", category: "5 Tar", subCategory: "Polyester", minStock: 5, maxStock: 15, currentStock: 18 },
  { name: "Lovender", hex: "#afaffa", category: "3 Tar", subCategory: "Polyester", minStock: 5, maxStock: 15, currentStock: 6 },
  { name: "Lovender", hex: "#afaffa", category: "Yarn", subCategory: "Polyester", minStock: 5, maxStock: 15, currentStock: -79 },
  { name: "Petrol", hex: "#002a2f", category: "5 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: 15 },
  { name: "Petrol", hex: "#002a2f", category: "3 Tar", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: -1 },
  { name: "Petrol", hex: "#002a2f", category: "Yarn", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: -72 },
  { name: "White", hex: "#ffffff", category: "5 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 36 },
  { name: "White", hex: "#ffffff", category: "3 Tar", subCategory: "Celtionic", minStock: 10, maxStock: 30, currentStock: 18 },
  { name: "White", hex: "#ffffff", category: "Yarn", subCategory: "Polyester", minStock: 10, maxStock: 30, currentStock: -51 },
  { name: "C Green(pl)", hex: "#68ffd1", category: "5 Tar", subCategory: "Polyester", minStock: 3, maxStock: 6, currentStock: 5 },
  { name: "C Green(pl)", hex: "#68ffd1", category: "3 Tar", subCategory: "Polyester", minStock: 3, maxStock: 6, currentStock: 1 },
  { name: "C Green(pl)", hex: "#68ffd1", category: "Yarn", subCategory: "Polyester", minStock: 3, maxStock: 6, currentStock: -4 },
  { name: "D Multy", hex: "#1a3be0", category: "5 Tar", subCategory: "Multy", minStock: 30, maxStock: 90, currentStock: 15 },
  { name: "D Multy", hex: "#1a3be0", category: "3 Tar", subCategory: "Multy", minStock: 30, maxStock: 90, currentStock: 24 },
  { name: "D Multy", hex: "#1a3be0", category: "Yarn", subCategory: "Multy", minStock: 20, maxStock: 90, currentStock: -19 },
  { name: "L Multy", hex: "#fff04d", category: "5 Tar", subCategory: "Multy", minStock: 30, maxStock: 90, currentStock: 44 },
  { name: "L Multy", hex: "#fff04d", category: "3 Tar", subCategory: "Multy", minStock: 20, maxStock: 90, currentStock: 84 },
  { name: "L Multy", hex: "#fff04d", category: "Yarn", subCategory: "Multy", minStock: 30, maxStock: 90, currentStock: -264 },
  { name: "AK Multy", hex: "#e65695", category: "5 Tar", subCategory: "Multy", minStock: 6, maxStock: 15, currentStock: 10 },
  { name: "AK Multy", hex: "#e65695", category: "3 Tar", subCategory: "Multy", minStock: 6, maxStock: 15, currentStock: 2 },
  { name: "AK Multy", hex: "#e65695", category: "Yarn", subCategory: "Multy", minStock: 12, maxStock: 15, currentStock: -9 },
  { name: "Rani Multy", hex: "#cc0058", category: "5 Tar", subCategory: "Rani multy", minStock: 15, maxStock: 30, currentStock: 8 },
  { name: "Rani Multy", hex: "#cc0058", category: "3 Tar", subCategory: "Rani multy", minStock: 15, maxStock: 30, currentStock: 0 },
  { name: "Rani Multy", hex: "#cc0058", category: "Yarn", subCategory: "Rani multy", minStock: 20, maxStock: 60, currentStock: -118 },
  { name: "LEMON", hex: "#fff700", category: "5 Tar", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: 0 },
  { name: "LEMON", hex: "#fff700", category: "3 Tar", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: 5 },
  { name: "LEMON", hex: "#fff700", category: "Yarn", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: -3 },
  { name: "L MAHENDI", hex: "#808000", category: "5 Tar", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: 3 },
  { name: "L MAHENDI", hex: "#808000", category: "3 Tar", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: 18 },
  { name: "L MAHENDI", hex: "#808000", category: "Yarn", subCategory: "Celtionic", minStock: 5, maxStock: 15, currentStock: 2 },
  { name: "Mustard", hex: "#e1ad01", category: "5 Tar", subCategory: "Polyester", minStock: 2, maxStock: 5, currentStock: 5 },
  { name: "Mustard", hex: "#e1ad01", category: "3 Tar", subCategory: "Polyester", minStock: 2, maxStock: 5, currentStock: 1 },
  { name: "Mustard", hex: "#e1ad01", category: "Yarn", subCategory: "Polyester", minStock: 2, maxStock: 5, currentStock: -9 },
  { name: "Rust", hex: "#7a2f14", category: "5 Tar", subCategory: "Polyester", minStock: 2, maxStock: 5, currentStock: 3 },
  { name: "Rust", hex: "#7a2f14", category: "3 Tar", subCategory: "Polyester", minStock: 2, maxStock: 5, currentStock: 2 },
  { name: "Rust", hex: "#7a2f14", category: "Yarn", subCategory: "Polyester", minStock: 2, maxStock: 5, currentStock: -8 },
  { name: "L Pink", hex: "#ffb6c1", category: "5 Tar", subCategory: "Polyester", minStock: 2, maxStock: 6, currentStock: 7 },
  { name: "L Pink", hex: "#ffb6c1", category: "3 Tar", subCategory: "Polyester", minStock: 2, maxStock: 6, currentStock: 0 },
  { name: "L Pink", hex: "#ffb6c1", category: "Yarn", subCategory: "Polyester", minStock: 2, maxStock: 6, currentStock: -3 },
  { name: "D peach", hex: "#de7e5d", category: "5 Tar", subCategory: "Polyester", minStock: 3, maxStock: 8, currentStock: 5 },
  { name: "D peach", hex: "#de7e5d", category: "3 Tar", subCategory: "Polyester", minStock: 3, maxStock: 8, currentStock: 6 },
  { name: "D peach", hex: "#de7e5d", category: "Yarn", subCategory: "Polyester", minStock: 3, maxStock: 8, currentStock: 11 },
  { name: "Limbudi", hex: "#f1f359", category: "5 Tar", subCategory: "Polyester", minStock: 3, maxStock: 6, currentStock: 0 },
  { name: "Limbudi", hex: "#f1f359", category: "3 Tar", subCategory: "Polyester", minStock: 3, maxStock: 6, currentStock: 1 },
  { name: "Limbudi", hex: "#f1f359", category: "Yarn", subCategory: "Polyester", minStock: 3, maxStock: 6, currentStock: -9 },
  { name: "Maha Rani", hex: "#d11010", category: "5 Tar", subCategory: "Celtionic", minStock: 3, maxStock: 6, currentStock: 8 },
  { name: "Maha Rani", hex: "#d11010", category: "3 Tar", subCategory: "Celtionic", minStock: 3, maxStock: 6, currentStock: 0 },
  { name: "Maha Rani", hex: "#d11010", category: "Yarn", subCategory: "Celtionic", minStock: 3, maxStock: 6, currentStock: -16 },
];

function buildSeedData(): SeedColor[] {
  const now = new Date().toISOString();
  return CSV_DATA.map((row, idx) => ({
    ...row,
    code: `${row.category.replace(/\s/g, "")}-${String(idx + 1).padStart(3, "0")}`,
    currentStock: row.currentStock,
    runningColor: false,
    sortOrder: idx,
    createdAt: now,
  }));
}

const TOTAL = CSV_DATA.length;
const CATEGORIES = [...new Set(CSV_DATA.map((c) => c.category))].sort();
const SUB_CATEGORIES = [...new Set(CSV_DATA.map((c) => c.subCategory))].sort();

export default function SeedColorsPage() {
  const [status, setStatus] = useState<"idle" | "checking" | "seeding" | "clearing" | "done" | "error">("idle");
  const [existingCount, setExistingCount] = useState(0);
  const [seededCount, setSeededCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  async function checkExisting() {
    const snap = await getDocs(query(collection(db, "colors")));
    return snap.size;
  }

  async function handleClearAndSeed() {
    try {
      setStatus("checking");
      const count = await checkExisting();
      setExistingCount(count);

      if (count > 0) {
        const confirmed = window.confirm(
          `There are ${count} colors in Firestore. Delete all and re-seed with ${TOTAL} colors from CSV?`
        );
        if (!confirmed) {
          setStatus("idle");
          return;
        }

        setStatus("clearing");
        const snap = await getDocs(query(collection(db, "colors")));
        const deleteBatch = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deleteBatch);
      }

      setStatus("seeding");
      setSeededCount(0);

      const seedData = buildSeedData();
      const colRef = collection(db, "colors");

      const BATCH_SIZE = 20;
      for (let i = 0; i < seedData.length; i += BATCH_SIZE) {
        const batch = seedData.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((color) => addDoc(colRef, color)));
        setSeededCount(Math.min(i + BATCH_SIZE, seedData.length));
      }

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  async function handleAddOnly() {
    try {
      setStatus("seeding");
      setSeededCount(0);

      const seedData = buildSeedData();
      const colRef = collection(db, "colors");

      const BATCH_SIZE = 20;
      for (let i = 0; i < seedData.length; i += BATCH_SIZE) {
        const batch = seedData.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((color) => addDoc(colRef, color)));
        setSeededCount(Math.min(i + BATCH_SIZE, seedData.length));
      }

      setStatus("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 space-y-6">
      <div className="bg-white rounded-2xl card-shadow p-8">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Seed Colors to Firestore</h1>
        <p className="text-[0.85rem] text-slate-500 mb-6">
          Load {TOTAL} colors from <code className="px-1.5 py-0.5 bg-slate-50 rounded text-[0.8rem]">colours_details.csv</code> into Firestore.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {CATEGORIES.map((cat) => {
            const count = CSV_DATA.filter((c) => c.category === cat).length;
            return (
              <div key={cat} className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[0.72rem] font-bold uppercase tracking-wider text-slate-400">{cat}</p>
                <p className="text-lg font-bold text-slate-800 mt-1">{count} colors</p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {SUB_CATEGORIES.map((sub) => (
            <span key={sub} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[0.72rem] font-medium rounded-full">
              {sub}
            </span>
          ))}
        </div>

        {status === "idle" && (
          <div className="space-y-3">
            <button
              onClick={handleClearAndSeed}
              className="w-full h-12 rounded-xl bg-blue-500 text-white text-[0.9rem] font-semibold hover:bg-blue-600 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.8} />
              Clear All & Seed {TOTAL} Colors
            </button>
            <button
              onClick={handleAddOnly}
              className="w-full h-10 rounded-xl border-2 border-slate-200 text-slate-600 text-[0.84rem] font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" strokeWidth={1.8} />
              Add {TOTAL} Colors (Keep Existing)
            </button>
          </div>
        )}

        {status === "checking" && (
          <div className="flex items-center justify-center gap-3 h-12 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.8} />
            <span className="text-[0.85rem] font-medium">Checking existing data...</span>
          </div>
        )}

        {status === "clearing" && (
          <div className="flex items-center justify-center gap-3 h-12 text-amber-600">
            <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.8} />
            <span className="text-[0.85rem] font-medium">Clearing {existingCount} existing colors...</span>
          </div>
        )}

        {status === "seeding" && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-3 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.8} />
              <span className="text-[0.85rem] font-medium">
                Seeding... {seededCount} / {TOTAL}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all duration-300"
                style={{ width: `${(seededCount / TOTAL) * 100}%` }}
              />
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="bg-blue-50 rounded-xl p-5 flex items-center gap-3">
            <CircleCheck className="w-6 h-6 text-blue-500 shrink-0" strokeWidth={1.8} />
            <div>
              <p className="text-[0.9rem] font-semibold text-blue-700">
                Successfully seeded {TOTAL} colors!
              </p>
              <p className="text-[0.78rem] text-blue-600 mt-0.5">
                Go to Stock Inventory or Color Master to see them.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-50 rounded-xl p-5 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" strokeWidth={1.8} />
            <div>
              <p className="text-[0.9rem] font-semibold text-red-700">Seeding failed</p>
              <p className="text-[0.78rem] text-red-600 mt-0.5">{errorMsg}</p>
              <button
                onClick={() => setStatus("idle")}
                className="mt-3 h-8 px-4 rounded-lg bg-red-100 text-red-700 text-[0.82rem] font-medium hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
