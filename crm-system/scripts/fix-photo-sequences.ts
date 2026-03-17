import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gelxlxnfhefyxhikrhib.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlbHhseG5maGVmeXhoaWtyaGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0ODU0MzcsImV4cCI6MjA4OTA2MTQzN30.OdCQ1YmMUT9rK52R-m05E-5Q2PAjI_xS1qZmV-zy4vw",
);

async function fixPhotoSequences() {
  // Fetch all photos ordered by captured_at ascending
  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, captured_at, sequence_number")
    .order("captured_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch photos:", error);
    return;
  }

  if (!photos || photos.length === 0) {
    console.log("No photos found.");
    return;
  }

  console.log(`Found ${photos.length} photos total.`);

  // Group photos by date (YYYY-MM-DD)
  const grouped = new Map<string, typeof photos>();
  for (const photo of photos) {
    const date = photo.captured_at.split("T")[0];
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(photo);
  }

  console.log(`Grouped into ${grouped.size} dates.\n`);

  let totalUpdated = 0;
  let latestDate = "";
  let latestCount = 0;

  for (const [date, datePhotos] of grouped) {
    // Photos are already sorted by captured_at ascending within each date
    console.log(`Date: ${date} — ${datePhotos.length} photos`);

    for (let i = 0; i < datePhotos.length; i++) {
      const photo = datePhotos[i];
      const correctSeq = i + 1;

      if (photo.sequence_number !== correctSeq) {
        const { error: updateError } = await supabase
          .from("photos")
          .update({ sequence_number: correctSeq })
          .eq("id", photo.id);

        if (updateError) {
          console.error(`  Failed to update photo ${photo.id}:`, updateError);
        } else {
          console.log(`  #${photo.id}: ${photo.sequence_number} → ${correctSeq}`);
          totalUpdated++;
        }
      }
    }

    // Track latest date for counter sync
    if (date > latestDate) {
      latestDate = date;
      latestCount = datePhotos.length;
    }
  }

  // Sync the seqCounter to match the latest date's photo count
  if (latestDate) {
    const { error: counterError } = await supabase
      .from("counters")
      .upsert({ id: "seqCounter", date: latestDate, counter: latestCount }, { onConflict: "id" });

    if (counterError) {
      console.error("\nFailed to sync seqCounter:", counterError);
    } else {
      console.log(`\nSynced seqCounter: date=${latestDate}, counter=${latestCount}`);
    }
  }

  console.log(`\nDone. Updated ${totalUpdated} photo(s).`);
}

fixPhotoSequences();
