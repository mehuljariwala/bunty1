import { supabase } from "./supabase";

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
  timestamp: string;
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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function logActivity(params: LogActivityParams): Promise<string> {
  const { data, error } = await supabase
    .from("activity_logs")
    .insert({
      user_id: params.userId,
      user_name: params.userName,
      user_email: params.userEmail,
      type: params.type,
      page: params.page,
      page_name: params.pageName,
      duration_ms: params.durationMs,
      details: params.details,
      date: todayStr(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
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
  const { error } = await supabase
    .from("activity_logs")
    .update({ duration_ms: durationMs })
    .eq("id", docId);

  if (error) throw error;
}

export async function fetchActivityLogs(
  date: string,
  userId?: string
): Promise<ActivityLog[]> {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .eq("date", date)
    .order("timestamp", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    type: row.type as ActivityType,
    page: row.page ?? undefined,
    pageName: row.page_name ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    details: row.details ?? undefined,
    timestamp: row.timestamp,
    date: row.date,
  }));
}
