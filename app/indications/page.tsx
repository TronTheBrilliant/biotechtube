import { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@supabase/supabase-js";
import { getSupabase, slugify } from "@/lib/seo-utils";

export const dynamic = "force-dynamic";
export const revalidate = 86400;

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Browse by Indication — Drug Pipeline by Disease | BiotechTube",
  description:
    "Explore the clinical drug pipeline organized by indication and therapeutic area. Find competing products for every disease area from cancer to rare diseases.",
  keywords: [
    "drug indications",
    "clinical pipeline by disease",
    "therapeutic area drugs",
    "competing drugs",
    "oncology pipeline",
    "neurology pipeline",
  ],
};

/* ─── Therapeutic Area Mapping ─── */

const THERAPEUTIC_AREAS: {
  name: string;
  emoji: string;
  keywords: string[];
}[] = [
  {
    name: "Oncology",
    emoji: "🎯",
    keywords: [
      "cancer", "tumor", "tumour", "carcinoma", "leukemia", "leukaemia",
      "lymphoma", "melanoma", "myeloma", "sarcoma", "neoplasm", "glioblastoma",
      "glioma", "mesothelioma", "neuroblastoma", "blastoma", "oncology",
    ],
  },
  {
    name: "Neurology",
    emoji: "🧠",
    keywords: [
      "alzheimer", "parkinson", "epilepsy", "multiple sclerosis", "migraine",
      "neuropathy", "huntington", "als", "amyotrophic", "seizure", "stroke",
      "dementia", "schizophrenia", "bipolar", "depression", "anxiety",
      "neurodegenerative", "cns",
    ],
  },
  {
    name: "Cardiology",
    emoji: "❤️",
    keywords: [
      "heart", "cardiac", "cardiovascular", "atrial", "hypertension",
      "arrhythmia", "coronary", "myocardial", "angina", "thrombosis",
      "atherosclerosis", "hypercholesterolemia", "dyslipidemia",
    ],
  },
  {
    name: "Immunology",
    emoji: "🛡️",
    keywords: [
      "autoimmune", "rheumatoid", "lupus", "psoriasis", "crohn",
      "ulcerative colitis", "inflammatory bowel", "immunology", "atopic dermatitis",
      "eczema", "alopecia", "graft", "transplant rejection",
    ],
  },
  {
    name: "Infectious Disease",
    emoji: "🦠",
    keywords: [
      "hiv", "hepatitis", "influenza", "covid", "sars", "malaria",
      "tuberculosis", "bacterial", "fungal", "viral", "infection", "sepsis",
      "pneumonia", "mrsa", "antibiotic", "antimicrobial",
    ],
  },
  {
    name: "Endocrinology",
    emoji: "⚖️",
    keywords: [
      "diabetes", "obesity", "thyroid", "metabolic", "insulin", "glycemic",
      "hba1c", "hormonal", "adrenal", "cushing", "growth hormone",
    ],
  },
  {
    name: "Rare Diseases",
    emoji: "💎",
    keywords: [
      "rare disease", "orphan", "sma", "spinal muscular", "duchenne",
      "cystic fibrosis", "hemophilia", "fabry", "gaucher", "pompe",
      "huntington", "lysosomal", "alpha1-antitrypsin",
    ],
  },
  {
    name: "Respiratory",
    emoji: "🫁",
    keywords: [
      "asthma", "copd", "pulmonary", "respiratory", "lung fibrosis",
      "bronchitis", "emphysema", "interstitial lung",
    ],
  },
  {
    name: "Hematology",
    emoji: "🩸",
    keywords: [
      "anemia", "hemophilia", "thrombocytopenia", "sickle cell", "thalassemia",
      "myelodysplastic", "polycythemia", "blood disorder", "coagulation",
      "fibrinogen",
    ],
  },
  {
    name: "Ophthalmology",
    emoji: "👁️",
    keywords: [
      "macular degeneration", "glaucoma", "retinal", "ophthalmic", "eye",
      "uveitis", "diabetic retinopathy", "dry eye",
    ],
  },
  {
    name: "Gastroenterology",
    emoji: "🫶",
    keywords: [
      "liver", "hepatic", "cirrhosis", "nash", "nafld", "celiac",
      "gastric", "intestinal", "colorectal", "pancreatic", "gallbladder",
      "ibs", "gastroparesis",
    ],
  },
  {
    name: "Dermatology",
    emoji: "🧴",
    keywords: [
      "skin", "dermatitis", "psoriasis", "acne", "wound", "burn",
      "vitiligo", "hidradenitis", "pruritus", "urticaria",
    ],
  },
  {
    name: "Nephrology",
    emoji: "🫘",
    keywords: [
      "kidney", "renal", "nephropathy", "dialysis", "ckd", "glomerular",
      "nephrotic", "hepatorenal",
    ],
  },
  {
    name: "Musculoskeletal",
    emoji: "🦴",
    keywords: [
      "osteoporosis", "arthritis", "osteoarthritis", "bone", "joint",
      "musculoskeletal", "fibromyalgia", "gout", "spine",
    ],
  },
  {
    name: "Women's Health",
    emoji: "🌸",
    keywords: [
      "breast cancer", "ovarian", "endometriosis", "uterine", "cervical",
      "menopausal", "post-menopausal", "pcos",
    ],
  },
  {
    name: "Urology",
    emoji: "🔬",
    keywords: [
      "prostate", "bladder", "urinary", "renal cell", "erectile",
      "incontinence", "overactive bladder",
    ],
  },
];

function classifyIndication(indication: string): string {
  const lower = indication.toLowerCase();
  for (const area of THERAPEUTIC_AREAS) {
    for (const kw of area.keywords) {
      if (lower.includes(kw)) return area.name;
    }
  }
  return "Other";
}

export default async function IndicationsPage() {
  const supabase = getSupabase();

  // Get top indications with counts using a raw SQL aggregation for performance
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let indicationList: { indication: string; count: number }[] = [];

  // Use a fast aggregation query
  const { data: aggData, error } = await supabaseAdmin.rpc("execute_sql" as never, {
    query: "SELECT indication, COUNT(*) as count FROM pipelines WHERE indication IS NOT NULL AND indication NOT IN ('Healthy','Healthy Volunteers','Healthy Subjects','Healthy Participants','Healthy Volunteer') GROUP BY indication ORDER BY count DESC LIMIT 500"
  });

  if (aggData && Array.isArray(aggData)) {
    indicationList = aggData as { indication: string; count: number }[];
  }

  // Fallback if RPC doesn't exist: paginated approach
  if (indicationList.length === 0 || error) {
    const pageSize = 5000;
    const countMap = new Map<string, number>();
    let offset = 0;
    const skipList = ["Healthy", "Healthy Volunteers", "Healthy Subjects", "Healthy Participants", "Healthy Volunteer"];

    while (offset < 60000) {
      const { data: rawData } = await supabase
        .from("pipelines")
        .select("indication")
        .not("indication", "is", null)
        .range(offset, offset + pageSize - 1);

      if (!rawData || rawData.length === 0) break;

      for (const r of rawData) {
        if (!r.indication || skipList.includes(r.indication)) continue;
        countMap.set(r.indication, (countMap.get(r.indication) || 0) + 1);
      }
      offset += pageSize;
      if (rawData.length < pageSize) break;
    }

    indicationList = Array.from(countMap.entries())
      .map(([indication, count]) => ({ indication, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 500);
  }

  // Group by therapeutic area
  const areaMap = new Map<
    string,
    { name: string; emoji: string; indications: { indication: string; count: number; slug: string }[] }
  >();

  for (const ta of THERAPEUTIC_AREAS) {
    areaMap.set(ta.name, { name: ta.name, emoji: ta.emoji, indications: [] });
  }
  areaMap.set("Other", { name: "Other", emoji: "📋", indications: [] });

  for (const item of indicationList) {
    const area = classifyIndication(item.indication);
    const bucket = areaMap.get(area);
    if (bucket) {
      bucket.indications.push({
        indication: item.indication,
        count: item.count,
        slug: slugify(item.indication),
      });
    }
  }

  // Sort by total products descending, filter out empty
  const areas = Array.from(areaMap.values())
    .filter((a) => a.indications.length > 0)
    .sort((a, b) => {
      const sumA = a.indications.reduce((s, i) => s + i.count, 0);
      const sumB = b.indications.reduce((s, i) => s + i.count, 0);
      return sumB - sumA;
    });

  const totalProducts = indicationList.reduce((s, i) => s + i.count, 0);

  return (
    <div
      className="page-content"
      style={{ background: "var(--color-bg-primary)", minHeight: "100vh" }}
    >
      <Nav />
      <div className="max-w-5xl mx-auto px-5 py-6">
        {/* Breadcrumb */}
        <div
          className="flex items-center gap-1.5 text-[12px] mb-4"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span>/</span>
          <span style={{ color: "var(--color-text-secondary)" }}>
            Indications
          </span>
        </div>

        <h1
          className="text-[32px] font-bold tracking-tight mb-2"
          style={{ color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}
        >
          Browse by Indication
        </h1>
        <p
          className="text-[15px] mb-2"
          style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}
        >
          Explore the clinical drug pipeline organized by disease indication and
          therapeutic area. Find competing products, track trial progress, and
          compare development stages.
        </p>
        <p
          className="text-[13px] mb-8"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {totalProducts.toLocaleString()} products across{" "}
          {indicationList.length.toLocaleString()} indications
        </p>

        {/* Therapeutic Area Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {areas.map((area) => {
            const totalInArea = area.indications.reduce(
              (s, i) => s + i.count,
              0
            );
            const topIndications = area.indications.slice(0, 8);

            return (
              <div
                key={area.name}
                className="rounded-xl p-5"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border-subtle)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[24px]">{area.emoji}</span>
                  <div>
                    <h2
                      className="text-[16px] font-bold"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {area.name}
                    </h2>
                    <p
                      className="text-[12px]"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      {totalInArea.toLocaleString()} products &middot;{" "}
                      {area.indications.length} indications
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {topIndications.map((ind) => (
                    <Link
                      key={ind.slug}
                      href={`/indications/${ind.slug}`}
                      className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded-md hover:bg-[var(--color-bg-primary)] transition-colors"
                    >
                      <span
                        className="text-[13px] font-medium truncate mr-2"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {ind.indication}
                      </span>
                      <span
                        className="text-[11px] font-medium shrink-0 px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--color-bg-tertiary)",
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        {ind.count}
                      </span>
                    </Link>
                  ))}
                </div>

                {area.indications.length > 8 && (
                  <p
                    className="text-[12px] mt-2 pl-2"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    + {area.indications.length - 8} more indications
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
}
