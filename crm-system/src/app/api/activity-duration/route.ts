import { NextRequest, NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

    await updateDoc(doc(db, "activityLogs", docId), { durationMs });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
