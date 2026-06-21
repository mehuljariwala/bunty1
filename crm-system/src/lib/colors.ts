import { supabase } from "./supabase";
import type { Color } from "./types";

export const CATEGORY_COLORS: Record<string, string> = {
  "3 Tar Bullet": "#f5956b",
  "5 Tar Bullet": "#5b5fc7",
  "Yarn": "#36b49f",
  "3 Tar Button": "#e8b838",
  "5 Tar Button": "#9b59b6",
  "6 Tar Button": "#3498db",
};

const TABLE = "colors";

/* ── snake_case DB row type ── */
interface ColorRow {
  id: string;
  name: string;
  code: string;
  hex: string;
  category: string;
  sub_category: string;
  min_stock: number;
  max_stock: number;
  current_stock: number;
  pcs_wt: number;
  running_color: boolean;
  sort_order: number;
  created_at: string;
}

/* ── mapping helpers ── */

function rowToColor(row: ColorRow): Color {
  return {
    id: row.id,
    name: row.name ?? "",
    code: row.code ?? "",
    hex: row.hex ?? "#000000",
    category: row.category ?? "",
    subCategory: row.sub_category ?? "",
    minStock: Number(row.min_stock) || 0,
    maxStock: Number(row.max_stock) || 0,
    currentStock: Number(row.current_stock) || 0,
    pcsWt: Number(row.pcs_wt) || 0.070,
    runningColor: row.running_color ?? false,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at ?? "",
  };
}

const camelToSnake: Record<string, string> = {
  subCategory: "sub_category",
  minStock: "min_stock",
  maxStock: "max_stock",
  currentStock: "current_stock",
  pcsWt: "pcs_wt",
  runningColor: "running_color",
  sortOrder: "sort_order",
  createdAt: "created_at",
};

function colorToRow(data: Partial<Omit<Color, "id">>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = camelToSnake[key] ?? key;
    row[snakeKey] = value;
  }
  return row;
}

/* ── public API ── */

export function subscribeColors(callback: (colors: Color[]) => void): () => void {
  // Initial fetch
  fetchColors().then(callback);

  // Realtime subscription – refetch full list on any change
  const channel = supabase
    .channel("colors-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      () => {
        fetchColors().then(callback);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function fetchColors(): Promise<Color[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order");

  if (error) throw error;
  return (data as ColorRow[]).map(rowToColor);
}

export async function addColor(color: Omit<Color, "id">): Promise<string> {
  const row = colorToRow(color);

  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function updateColor(id: string, data: Partial<Omit<Color, "id">>): Promise<void> {
  const row = colorToRow(data);

  const { error } = await supabase
    .from(TABLE)
    .update(row)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteColor(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) throw error;
}
