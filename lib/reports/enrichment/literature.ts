// biotechtube/lib/reports/enrichment/literature.ts
// Fetch last-90d PubMed + bioRxiv papers + sentiment-tag via V4-Flash.
// MCP isn't available at Vercel runtime so we go direct REST.

import OpenAI from "openai";

const FETCH_TIMEOUT_MS = 15000;
const withTimeout = () => AbortSignal.timeout(FETCH_TIMEOUT_MS);

export interface LiteratureResult {
  pubmed: { id: string; title: string; abstract: string; sentiment: "pos" | "neu" | "neg" }[];
  biorxiv: { doi: string; title: string; abstract: string; sentiment: "pos" | "neu" | "neg" }[];
  fetched_at: string;
}

export async function fetchLiterature(mechanism: string | null): Promise<LiteratureResult> {
  const empty: LiteratureResult = { pubmed: [], biorxiv: [], fetched_at: new Date().toISOString() };
  if (!mechanism || !mechanism.trim()) return empty;

  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [pubmed, biorxiv] = await Promise.all([
    fetchPubmed(mechanism, since90d).catch(() => []),
    fetchBiorxiv(mechanism, since90d).catch(() => []),
  ]);

  const tagged = await tagSentiments([
    ...pubmed.map(p => ({ id: p.id, title: p.title, abstract: p.abstract })),
    ...biorxiv.map(p => ({ id: p.doi, title: p.title, abstract: p.abstract })),
  ]).catch(() => [] as { id: string; sentiment: "pos" | "neu" | "neg" }[]);
  const taggedById = new Map(tagged.map(t => [t.id, t.sentiment]));

  return {
    pubmed: pubmed.map(p => ({ ...p, sentiment: taggedById.get(p.id) ?? "neu" as const })),
    biorxiv: biorxiv.map(p => ({ ...p, sentiment: taggedById.get(p.doi) ?? "neu" as const })),
    fetched_at: new Date().toISOString(),
  };
}

async function fetchPubmed(query: string, since: Date) {
  const sinceStr = since.toISOString().slice(0, 10).replace(/-/g, "/");
  const term = encodeURIComponent(`${query} AND ("${sinceStr}"[PDAT] : "3000"[PDAT])`);
  const apiKey = process.env.PUBMED_API_KEY ? `&api_key=${process.env.PUBMED_API_KEY}` : "";

  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&retmax=10&retmode=json${apiKey}`,
    { signal: withTimeout() },
  );
  if (!searchRes.ok) return [];
  const search = await searchRes.json() as any;
  const ids: string[] = search.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  const fetchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=xml${apiKey}`,
    { signal: withTimeout() },
  );
  if (!fetchRes.ok) return [];
  const xml = await fetchRes.text();
  return parsePubmedXml(xml).slice(0, 10);
}

function parsePubmedXml(xml: string): { id: string; title: string; abstract: string }[] {
  // Crude regex parsing — sufficient for our volume. Concat all <AbstractText> blocks
  // (PubMed structured abstracts split into multiple labeled <AbstractText> nodes).
  const articles: { id: string; title: string; abstract: string }[] = [];
  const re = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const id = (block.match(/<PMID[^>]*>(\d+)<\/PMID>/) ?? [])[1] ?? "";
    const title = stripTags((block.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) ?? [])[1] ?? "");
    const abstractMatches = Array.from(block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g));
    const abstract = abstractMatches.map(m => stripTags(m[1])).join(" ");
    if (id) articles.push({ id, title, abstract: abstract.slice(0, 1500) });
  }
  return articles;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function fetchBiorxiv(query: string, since: Date) {
  const interval = `${since.toISOString().slice(0, 10)}/${new Date().toISOString().slice(0, 10)}`;
  const res = await fetch(`https://api.biorxiv.org/details/biorxiv/${interval}/0/json`, { signal: withTimeout() }).catch(() => null);
  if (!res || !res.ok) return [];
  const data = await res.json() as any;
  const papers: any[] = data.collection ?? [];
  const lc = query.toLowerCase();
  return papers
    .filter(p => `${p.title} ${p.abstract}`.toLowerCase().includes(lc))
    .slice(0, 10)
    .map(p => ({
      doi: p.doi as string,
      title: (p.title as string).trim(),
      abstract: ((p.abstract as string) ?? "").slice(0, 1500),
    }));
}

interface SentimentInput { id: string; title: string; abstract: string; }
interface SentimentOutput { id: string; sentiment: "pos" | "neu" | "neg" }

async function tagSentiments(papers: SentimentInput[]): Promise<SentimentOutput[]> {
  if (papers.length === 0) return [];
  const ds = new OpenAI({ baseURL: "https://api.deepseek.com", apiKey: process.env.DEEPSEEK_API_KEY! });

  const list = papers.map(p => `id=${p.id}\ntitle=${p.title}\nabstract=${p.abstract.slice(0, 600)}`).join("\n---\n");
  const completion = await ds.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: 'You tag biomedical paper sentiment toward a target mechanism: "pos" (supportive evidence), "neg" (challenges/safety/efficacy concerns), or "neu" (neutral/incidental). Return ONLY a JSON object with key "results": {"results":[{"id":"...","sentiment":"pos|neu|neg"}, ...]}' },
      { role: "user", content: list },
    ],
    response_format: { type: "json_object" },
    temperature: 0.0,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.results ?? parsed.tags ?? []);
  } catch {
    return [];
  }
}
