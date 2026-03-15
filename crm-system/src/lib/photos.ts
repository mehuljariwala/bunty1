import { supabase } from "./supabase";
import type { PhotoRecord } from "./types";

/* ------------------------------------------------------------------ */
/*  Row <-> PhotoRecord mapping                                       */
/* ------------------------------------------------------------------ */

interface PhotoRow {
  id: string;
  order_id: string;
  order_csv_id: number;
  party_name: string;
  route: string;
  order_date: string;
  sequence_number: number;
  order_snapshot: unknown;
  captured_at: string;
  status: string;
}

function rowToPhoto(row: PhotoRow): PhotoRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    orderCsvId: row.order_csv_id,
    partyName: row.party_name,
    route: row.route,
    orderDate: row.order_date,
    sequenceNumber: row.sequence_number,
    orderSnapshot: row.order_snapshot as PhotoRecord["orderSnapshot"],
    capturedAt: row.captured_at,
    status: row.status as PhotoRecord["status"],
  };
}

function photoToRow(
  photo: Omit<PhotoRecord, "id">,
): Omit<PhotoRow, "id"> {
  return {
    order_id: photo.orderId,
    order_csv_id: photo.orderCsvId as number,
    party_name: photo.partyName,
    route: photo.route,
    order_date: photo.orderDate,
    sequence_number: photo.sequenceNumber,
    order_snapshot: photo.orderSnapshot as unknown,
    captured_at: photo.capturedAt,
    status: photo.status ?? "pending",
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      clean[key] = stripUndefined(val as Record<string, unknown>);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function savePhotoRecord(
  data: Omit<PhotoRecord, "id">,
): Promise<string> {
  const row = stripUndefined(
    photoToRow(data) as unknown as Record<string, unknown>,
  );

  const { data: inserted, error } = await supabase
    .from("photos")
    .insert(row)
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id;
}

export async function markPhotoComplete(photoId: string): Promise<void> {
  const { error } = await supabase
    .from("photos")
    .update({ status: "complete" })
    .eq("id", photoId);

  if (error) throw error;
}

export function subscribePhotos(
  callback: (photos: PhotoRecord[]) => void,
): () => void {
  // Initial fetch
  const fetchAll = async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("captured_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch photos:", error);
      return;
    }

    callback((data as PhotoRow[]).map(rowToPhoto));
  };

  fetchAll();

  // Realtime subscription — refetch on every change
  const channel = supabase
    .channel("photos-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "photos" },
      () => {
        fetchAll();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
