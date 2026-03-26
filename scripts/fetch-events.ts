import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE env vars");
  process.exit(1);
}
if (!DEEPSEEK_API_KEY) {
  console.error("Missing DEEPSEEK_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function createTable() {
  console.log("Creating biotech_events table via execute_sql RPC...");
  const sql = `
    CREATE TABLE IF NOT EXISTS biotech_events (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      name text NOT NULL,
      start_date date NOT NULL,
      end_date date,
      city text,
      country text,
      country_flag text,
      type text DEFAULT 'Conference',
      description text,
      url text,
      source text DEFAULT 'deepseek',
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE biotech_events ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'biotech_events' AND policyname = 'Public read events'
      ) THEN
        EXECUTE 'CREATE POLICY "Public read events" ON biotech_events FOR SELECT USING (true)';
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_events_date ON biotech_events(start_date);
  `;
  const { error } = await supabase.rpc("execute_sql", { query: sql });
  if (error) {
    console.warn("execute_sql RPC might not exist, trying REST insert approach...");
    console.warn("Error:", error.message);
    // Table might already exist - try inserting anyway
  } else {
    console.log("Table created/verified.\n");
  }
}

interface EventData {
  name: string;
  start_date: string;
  end_date: string;
  city: string;
  country: string;
  country_flag: string;
  type: string;
  description: string;
  url: string;
}

async function fetchEventsFromDeepSeek(): Promise<EventData[]> {
  console.log("Asking DeepSeek for biotech events...");

  const prompt = `List all major biotech, pharmaceutical, and life science events/conferences happening in 2026 and early 2027. Include:
- Major conferences (BIO International Convention, ASCO, ESMO, JPMorgan Healthcare Conference, BIO Europe, AACR, AHA, ASH, etc.)
- Regional biotech events (Nordic Life Science, BioJapan, BioKorea, ChinaBio, etc.)
- Investor conferences (JPMorgan Healthcare, Cowen Health Care, Piper Sandler, Jefferies, etc.)
- Medical meetings (AAN, EHA, EASL, AAD, AASLD, AAAAI, ACC, ADA, EULAR, ISTH, WPC, etc.)
- BIO Europe Spring and Fall
- Biotech Showcase
- DIA Annual Meeting
- ASGCT Annual Meeting
- World Vaccine Congress
- CPHI Worldwide
- Rare Disease events (NORD, World Orphan Drug Congress)

Aim for 45-50 events total.

For dates, use your best knowledge of when these events typically occur. Many annual conferences happen around the same time each year.

Format as a JSON array with fields: name, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), city, country, country_flag (emoji), type (one of: "Conference", "Investor Meeting", "Medical Meeting", "FDA Date"), description (1 sentence max 100 chars), url (official website if known, otherwise empty string)

IMPORTANT: Return ONLY valid JSON array, no markdown, no explanation.`;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are a biotech industry expert. Return only valid JSON with no markdown formatting.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content.trim();

  // Strip markdown fences if present
  let jsonStr = content;
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const events: EventData[] = JSON.parse(jsonStr);
  console.log(`Got ${events.length} events from DeepSeek.\n`);
  return events;
}

async function insertEvents(events: EventData[]) {
  // Clear existing events first
  console.log("Clearing existing deepseek events...");
  const { error: delErr } = await supabase
    .from("biotech_events")
    .delete()
    .eq("source", "deepseek");
  if (delErr) {
    console.warn("Delete error (table might not exist yet):", delErr.message);
  }

  console.log(`Inserting ${events.length} events...`);

  // Insert in batches of 20
  const batchSize = 20;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize).map((e) => ({
      name: e.name,
      start_date: e.start_date,
      end_date: e.end_date || null,
      city: e.city || null,
      country: e.country || null,
      country_flag: e.country_flag || null,
      type: e.type || "Conference",
      description: e.description || null,
      url: e.url || null,
      source: "deepseek",
    }));

    const { error } = await supabase.from("biotech_events").insert(batch);
    if (error) {
      console.error(`Insert batch error at ${i}:`, error.message);
      throw error;
    }
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1}`);
  }

  console.log("Events inserted successfully!\n");
}

async function main() {
  // Try to create table
  await createTable();

  // Fetch events from DeepSeek
  const events = await fetchEventsFromDeepSeek();

  // Validate dates
  const valid = events.filter((e) => {
    if (!e.start_date || !/^\d{4}-\d{2}-\d{2}$/.test(e.start_date)) {
      console.warn(`Skipping ${e.name}: invalid start_date ${e.start_date}`);
      return false;
    }
    return true;
  });

  console.log(`${valid.length} events have valid dates.`);
  await insertEvents(valid);

  // Verify count
  const { data, error } = await supabase
    .from("biotech_events")
    .select("id", { count: "exact", head: true });
  console.log("Total events in DB:", data);
  console.log("Done!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
