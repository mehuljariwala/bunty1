import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://vbinfotech.tech/2024/party_master/bill.php?order_id=";
const COOKIE = "PHPSESSID=j93v0jv37ddo77gja1orlreun8";
const CONCURRENT = 10;
const DELAY_MS = 200;
const OUTPUT_FILE = resolve(__dirname, "../order_details.json");

interface OrderItem {
  category: string;
  material: string;
  color: string;
  orderedQty: number;
  deliveredQty: number;
}

interface OrderDetail {
  csvId: number;
  items: OrderItem[];
  grandTotalOrdered: number;
  grandTotalDelivered: number;
}

function parseOrderItems(html: string): OrderItem[] {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, "");
  const items: OrderItem[] = [];
  let category = "";
  let material = "";
  const sectionRegex = /<h3[^>]*>(.*?)<\/h3>|<h4[^>]*>(.*?)<\/h4>|<tr(?:\s[^>]*)?>(?!.*?fw-bold)([\s\S]*?)<\/tr>/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(cleaned)) !== null) {
    if (match[1] !== undefined) {
      category = match[1].replace(/<[^>]*>/g, "").trim();
    } else if (match[2] !== undefined) {
      material = match[2]
        .replace(/<[^>]*>/g, "")
        .replace(/\s*:-?\s*$/, "")
        .trim();
    } else if (match[3] !== undefined) {
      if (/fw-bold|total-flex/i.test(match[0])) continue;

      const tds: string[] = [];
      let tdMatch: RegExpExecArray | null;
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      while ((tdMatch = tdRe.exec(match[3])) !== null) {
        tds.push(tdMatch[1].replace(/<[^>]*>/g, "").trim());
      }

      if (tds.length >= 3 && category && material) {
        const color = tds[0].trim();
        const orderedRaw = tds[1].replace(/&nbsp;/g, "").replace(/->/, "").trim();
        const deliveredRaw = tds[2].trim();
        const orderedQty = parseFloat(orderedRaw) || 0;
        const deliveredQty = parseFloat(deliveredRaw) || 0;

        if (color && color.toLowerCase() !== "color") {
          items.push({ category, material, color, orderedQty, deliveredQty });
        }
      }
    }
  }

  return items;
}

function parseGrandTotals(html: string): { grandTotalOrdered: number; grandTotalDelivered: number } {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, "");
  const totalMatch = /total-flex[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i.exec(cleaned);
  if (totalMatch) {
    return {
      grandTotalOrdered: parseFloat(totalMatch[1].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").replace(/->/, "").trim()) || 0,
      grandTotalDelivered: parseFloat(totalMatch[2].replace(/<[^>]*>/g, "").trim()) || 0,
    };
  }

  let totalOrdered = 0;
  let totalDelivered = 0;
  const fwBoldRows = /fw-bold[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m: RegExpExecArray | null;
  while ((m = fwBoldRows.exec(cleaned)) !== null) {
    const ordered = parseFloat(m[2].replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").replace(/->/, "").trim()) || 0;
    const delivered = parseFloat(m[3].replace(/<[^>]*>/g, "").trim()) || 0;
    totalOrdered += ordered;
    totalDelivered += delivered;
  }

  return { grandTotalOrdered: totalOrdered, grandTotalDelivered: totalDelivered };
}

async function fetchOrderPage(csvId: number): Promise<string> {
  const res = await fetch(`${BASE_URL}${csvId}`, {
    headers: {
      Cookie: COOKIE,
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Referer: "https://vbinfotech.tech/2024/party_master/manage_order.php",
    },
  });
  return res.text();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrape(): Promise<void> {
  const csvPath = resolve(__dirname, "../party_orders.csv");
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const allCsvIds = lines.slice(1).map((line) => {
    const comma = line.indexOf(",");
    return Number(line.slice(0, comma));
  }).filter((id) => id > 0);

  let results: Record<string, OrderDetail> = {};
  const alreadyDone = new Set<number>();

  if (existsSync(OUTPUT_FILE)) {
    results = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
    for (const key of Object.keys(results)) {
      alreadyDone.add(Number(key));
    }
    console.log(`Resuming — ${alreadyDone.size} orders already scraped.`);
  }

  const remaining = allCsvIds.filter((id) => !alreadyDone.has(id));
  console.log(`Total: ${allCsvIds.length}, Already done: ${alreadyDone.size}, Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log("All orders already scraped!");
    process.exit(0);
  }

  let processed = 0;
  let totalItems = alreadyDone.size > 0 ? Object.values(results).reduce((s, o) => s + o.items.length, 0) : 0;
  let errors = 0;

  for (let i = 0; i < remaining.length; i += CONCURRENT) {
    const batch = remaining.slice(i, i + CONCURRENT);

    const batchResults = await Promise.allSettled(
      batch.map(async (csvId) => {
        const html = await fetchOrderPage(csvId);
        const items = parseOrderItems(html);
        const totals = parseGrandTotals(html);
        return { csvId, items, ...totals };
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results[String(r.value.csvId)] = r.value;
        totalItems += r.value.items.length;
      } else {
        errors++;
        console.error(`  Error:`, r.reason?.message || r.reason);
      }
    }

    processed += batch.length;

    if (processed % 100 < CONCURRENT) {
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
      console.log(`  Progress: ${processed}/${remaining.length} (${totalItems} items, ${errors} errors) — saved to disk`);
    }

    if (i + CONCURRENT < remaining.length) {
      await delay(DELAY_MS);
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nDone! Scraped ${Object.keys(results).length} orders, ${totalItems} total items, ${errors} errors.`);
  console.log(`Saved to: ${OUTPUT_FILE}`);
  console.log(`\nRun 'npx tsx scripts/upload-order-details.ts' tomorrow to push to Firestore.`);
  process.exit(0);
}

scrape().catch((err) => {
  console.error("Scrape failed:", err);
  process.exit(1);
});
