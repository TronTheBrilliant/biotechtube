import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import countriesData from "@/data/countries.json";
import { getAllDrugs, getAllPeople, getAllInvestors, drugSlug, personSlug } from "@/lib/seo-utils";

const BASE_URL = "https://biotechtube.io";

interface CountryData {
  slug: string;
}

const countries = countriesData as CountryData[];

const THERAPEUTIC_AREAS = [
  "oncology", "immunotherapy", "immunology", "neuroscience", "rare-diseases",
  "cardiovascular", "infectious-diseases", "gene-therapy", "cell-therapy",
  "diabetes", "obesity", "diagnostics", "radiopharmaceuticals", "vaccines",
  "metabolic-diseases", "dermatology", "ophthalmology", "respiratory",
  "neurology", "drug-delivery", "hematology",
];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Next.js supports multiple sitemaps via generateSitemaps()
// For now we keep a single sitemap but with all entity types
// If we exceed 50,000 URLs, split using generateSitemaps()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabase();

  // Fetch all company slugs from Supabase (paginated)
  const companySlugs: string[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("companies")
      .select("slug")
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    companySlugs.push(...data.map((c: { slug: string }) => c.slug));
    offset += 1000;
    if (data.length < 1000) break;
  }

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/markets`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/top-companies`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/trending`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/funding`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/top-sectors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/countries`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/companies`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/pipelines`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/pipeline`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/therapeutic-areas`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/people`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/investors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // Company pages
  const companyPages: MetadataRoute.Sitemap = companySlugs.map((slug) => ({
    url: `${BASE_URL}/company/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Country pages
  const countryPages: MetadataRoute.Sitemap = countries.map((c) => ({
    url: `${BASE_URL}/countries/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Sector pages
  const { data: sectorRows } = await supabase
    .from("sectors")
    .select("slug");
  const sectorPages: MetadataRoute.Sitemap = (sectorRows || []).map((s: { slug: string }) => ({
    url: `${BASE_URL}/sectors/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Therapeutic area pages
  const areaPages: MetadataRoute.Sitemap = THERAPEUTIC_AREAS.map((slug) => ({
    url: `${BASE_URL}/therapeutic-areas/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Drug pages
  const allDrugs = await getAllDrugs();
  const seenDrugSlugs = new Set<string>();
  const drugPages: MetadataRoute.Sitemap = [];
  for (const d of allDrugs) {
    const slug = drugSlug(d.name);
    if (seenDrugSlugs.has(slug)) continue;
    seenDrugSlugs.add(slug);
    drugPages.push({
      url: `${BASE_URL}/drugs/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    });
  }

  // People pages
  const allPeople = await getAllPeople();
  const seenPeopleSlugs = new Set<string>();
  const peoplePages: MetadataRoute.Sitemap = [];
  for (const p of allPeople) {
    const slug = personSlug(p.name);
    if (seenPeopleSlugs.has(slug)) continue;
    seenPeopleSlugs.add(slug);
    peoplePages.push({
      url: `${BASE_URL}/people/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    });
  }

  // Investor pages (only those with 2+ companies)
  const allInvestors = await getAllInvestors();
  const investorPages: MetadataRoute.Sitemap = allInvestors
    .filter((inv) => inv.companies.length >= 2)
    .map((inv) => ({
      url: `${BASE_URL}/investors/${inv.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

  // Blog post pages
  const { data: blogRows } = await supabase
    .from("blog_posts")
    .select("slug, published_at")
    .eq("status", "published");
  const blogPages: MetadataRoute.Sitemap = (blogRows || []).map((b: { slug: string; published_at: string }) => ({
    url: `${BASE_URL}/blog/${b.slug}`,
    lastModified: new Date(b.published_at),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Featured product pages (curated watchlists + featured pipelines only — NOT all 54K)
  const productPages: MetadataRoute.Sitemap = [];
  const seenProductSlugs = new Set<string>();

  // Get pipeline IDs from curated watchlists
  const { data: cwItems } = await supabase
    .from("curated_watchlist_items")
    .select("pipeline_id");
  // Get pipeline IDs from featured pipelines
  const { data: fpItems } = await supabase
    .from("featured_pipelines")
    .select("pipeline_id");

  const featuredPipelineIds = [
    ...new Set([
      ...(cwItems || []).map((r: { pipeline_id: string }) => r.pipeline_id),
      ...(fpItems || []).map((r: { pipeline_id: string }) => r.pipeline_id),
    ]),
  ];

  // Fetch slugs for these pipeline IDs in batches
  for (let i = 0; i < featuredPipelineIds.length; i += 200) {
    const batch = featuredPipelineIds.slice(i, i + 200);
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("slug")
      .in("id", batch)
      .not("slug", "is", null);
    if (pipelines) {
      for (const p of pipelines) {
        if (p.slug && !seenProductSlugs.has(p.slug)) {
          seenProductSlugs.add(p.slug);
          productPages.push({
            url: `${BASE_URL}/product/${p.slug}`,
            lastModified: new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          });
        }
      }
    }
  }

  return [
    ...staticPages,
    ...companyPages,
    ...sectorPages,
    ...countryPages,
    ...areaPages,
    ...drugPages,
    ...peoplePages,
    ...investorPages,
    ...blogPages,
    ...productPages,
  ];
}
