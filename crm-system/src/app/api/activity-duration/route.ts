import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const docId = request.nextUrl.searchParams.get("docId");
  if (!docId) {
    return NextResponse.json({ error: "Missing docId" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const durationMs = Number(body.durationMs);
    if (!durationMs || durationMs < 0) {
      return NextResponse.json({ error: "Invalid durationMs" }, { status: 400 });
    }

    const { error } = await supabase
      .from('activity_logs')
      .update({ duration_ms: durationMs })
      .eq('id', docId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
