import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured. Get a free key at console.groq.com" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const { orderText, colorNames } = body as {
    orderText: string;
    colorNames: string[];
  };

  if (!orderText) {
    return NextResponse.json(
      { error: "Order text is required" },
      { status: 400 },
    );
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY });

  const prompt = `You are an order parser for a textile/lace business. Parse the following order text and extract structured data.

The order text contains categories (like "5 TAR", "3 TAR", "5 Tar", "3 Tar", "Yarn") followed by color names and quantities.

Available color names in the system: ${JSON.stringify(colorNames)}

IMPORTANT: Match the color names from the order text to the closest available color name from the system. Use fuzzy matching - for example "N-BLUE" could match "N Blue" or "Navy Blue", "MAHENDI" could match "Mahendi" or "Mehndi", "MAHROON" could match "Maroon" or "Mahroon". Be flexible with casing, hyphens, spaces.

For category names, normalize them:
- "5 TAR" or "5TAR" or "5 tar" → "5 Tar"
- "3 TAR" or "3TAR" or "3 tar" → "3 Tar"
- "YARN" or "yarn" → "Yarn"

Parse this order text:
---
${orderText}
---

Return ONLY a valid JSON object with this exact structure (no markdown, no code fences):
{"items":[{"category":"5 Tar","colorName":"Red","quantity":1}]}

Each item should have:
- "category": The normalized category name
- "colorName": The matched color name from the available colors list (use EXACT name from the list if matched)
- "quantity": The number quantity

If a color name from the order text doesn't match any available color, still include it with the original name.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
      max_tokens: 4096,
    });

    const text = (completion.choices[0]?.message?.content ?? "").trim();
    const jsonStr = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(jsonStr) as {
      items: { category: string; colorName: string; quantity: number }[];
    };

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
