import { supabase } from "./supabase";
import type { SubAdmin } from "./types";

type SubAdminRow = {
  id: string;
  csv_id: number;
  name: string;
  password: string;
  email: string;
  allowed_pages: string[] | null;
  created_at: string;
};

function rowToSubAdmin(row: SubAdminRow): SubAdmin {
  return {
    id: row.id,
    csvId: row.csv_id,
    name: row.name,
    password: row.password,
    email: row.email,
    allowedPages: row.allowed_pages ?? undefined,
    createdAt: row.created_at,
  };
}

function subAdminToRow(
  data: Partial<Omit<SubAdmin, "id">>
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.csvId !== undefined) row.csv_id = data.csvId;
  if (data.name !== undefined) row.name = data.name;
  if (data.password !== undefined) row.password = data.password;
  if (data.email !== undefined) row.email = data.email;
  if (data.allowedPages !== undefined) row.allowed_pages = data.allowedPages;
  if (data.createdAt !== undefined) row.created_at = data.createdAt;
  return row;
}

async function fetchAllSubAdmins(): Promise<SubAdmin[]> {
  const { data, error } = await supabase
    .from("sub_admins")
    .select("*")
    .order("csv_id", { ascending: false });

  if (error) throw error;
  return (data as SubAdminRow[]).map(rowToSubAdmin);
}

export function subscribeSubAdmins(
  callback: (admins: SubAdmin[]) => void
): () => void {
  // Initial fetch
  fetchAllSubAdmins().then(callback);

  // Realtime subscription – refetch on any change
  const channel = supabase
    .channel("sub_admins_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sub_admins" },
      () => {
        fetchAllSubAdmins().then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function addSubAdmin(
  data: Omit<SubAdmin, "id">
): Promise<string> {
  const row = subAdminToRow(data);
  const { data: inserted, error } = await supabase
    .from("sub_admins")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id;
}

export async function updateSubAdmin(
  id: string,
  data: Partial<Omit<SubAdmin, "id">>
): Promise<void> {
  const row = subAdminToRow(data);
  const { error } = await supabase
    .from("sub_admins")
    .update(row)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteSubAdmin(id: string): Promise<void> {
  const { error } = await supabase
    .from("sub_admins")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getNextCsvId(): Promise<number> {
  const { data } = await supabase
    .from("sub_admins")
    .select("csv_id")
    .order("csv_id", { ascending: false })
    .limit(1);

  return (data?.[0]?.csv_id ?? 0) + 1;
}
