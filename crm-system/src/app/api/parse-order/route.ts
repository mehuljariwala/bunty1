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
  const { orderText, colorsByCategory } = body as {
    orderText: string;
    colorsByCategory?: Record<string, string[]>;
    colorNames?: string[];
  };

  if (!orderText) {
    return NextResponse.json(
      { error: "Order text is required" },
      { status: 400 },
    );
  }

  const groq = new Groq({ apiKey: GROQ_API_KEY });

  const colorsSection = colorsByCategory
    ? Object.entries(colorsByCategory)
        .map(([cat, names]) => `${cat}: ${names.join(", ")}`)
        .join("\n")
    : "";

  const prompt = `You are an order parser for a textile/lace business. Parse the following order text into structured JSON.

The order text has CATEGORIES (like "5 TAR", "3 TAR", "Yarn") as headers, followed by lines with a color name and quantity.

AVAILABLE COLORS PER CATEGORY:
${colorsSection}

RULES:
1. Normalize categories: "5 TAR"/"5TAR"/"5 tar" → "5 Tar", "3 TAR" → "3 Tar", "YARN" → "Yarn"
2. Match each color to the EXACT name from the available list for THAT category. Use fuzzy matching for typos/casing/hyphens (e.g., "N-BLUE" → "N Blue", "MAHENDI" → "Mahendi", "MAHROON" → "Maroon").
3. ONLY use color names from the available list above. If a color cannot be matched to any name in the list, use the original text as-is.
4. NEVER output duplicate entries — each color should appear at most ONCE per category. If the same color appears multiple times in the input, sum up the quantities.
5. Return ONLY valid JSON, no markdown, no code fences.

ORDER TEXT:
---
${orderText}
---

Return this exact JSON structure:
{"items":[{"category":"5 Tar","colorName":"Red","quantity":1}]}`;

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

    const deduped = new Map<string, { category: string; colorName: string; quantity: number }>();
    for (const item of parsed.items) {
      const key = `${item.category}::${item.colorName}`;
      const existing = deduped.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        deduped.set(key, { ...item });
      }
    }

    return NextResponse.json({ items: Array.from(deduped.values()) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
