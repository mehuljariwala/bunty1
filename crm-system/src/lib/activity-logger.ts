import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ActivityType =
  | "page_visit"
  | "session_start"
  | "stock_update"
  | "color_added"
  | "color_edited"
  | "color_deleted";

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  type: ActivityType;
  page?: string;
  pageName?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
  timestamp: Timestamp;
  date: string;
}

interface LogActivityParams {
  userId: string;
  userName: string;
  userEmail: string;
  type: ActivityType;
  page?: string;
  pageName?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
}

const COLLECTION = "activityLogs";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function logActivity(params: LogActivityParams): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...params,
    timestamp: serverTimestamp(),
    date: todayStr(),
  });
  return ref.id;
}

export async function logPageVisit(
  userId: string,
  userName: string,
  userEmail: string,
  page: string,
  pageName: string
): Promise<string> {
  return logActivity({
    userId,
    userName,
    userEmail,
    type: "page_visit",
    page,
    pageName,
  });
}

export async function updatePageDuration(
  docId: string,
  durationMs: number
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, docId), { durationMs });
}

export async function fetchActivityLogs(
  date: string,
  userId?: string
): Promise<ActivityLog[]> {
  const constraints = [
    where("date", "==", date),
    orderBy("timestamp", "desc"),
  ];

  if (userId) {
    constraints.unshift(where("userId", "==", userId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ActivityLog[];
}
