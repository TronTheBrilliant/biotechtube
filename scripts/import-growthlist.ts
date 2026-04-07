/**
 * Import growthlist.co biotech startups (manually extracted data).
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local"), override: true });

import { createClient } from "@supabase/supabase-js";
import { CompanyMatcher, loadCompanies } from "./lib/company-matcher";
import { createCompanyRecord, batchEnrichNewCompanies, extractDomain } from "./lib/company-discovery";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const COMPANIES = [
  { name: "BreezeBio", website: "breezebio.com", country: "United States", funding: "$60M Series B" },
  { name: "Bon Vivant", website: "bonvivant-food.com", country: "France", funding: "$29M Series A" },
  { name: "CoRegen", website: "coregeninc.com", country: "United States", funding: "$13.5M Venture" },
  { name: "NAUTI", website: "nauti.one", country: "Netherlands", funding: "Pre-Seed" },
  { name: "Turbine", website: "turbine.ai", country: "Hungary", funding: "$25M Series B" },
  { name: "Centauri Therapeutics", website: "centauritherapeutics.com", country: "United Kingdom", funding: "$8.1M Series A" },
  { name: "Pairidex", website: "pairidex.com", country: "United States", funding: "Seed" },
  { name: "Abram Scientific", website: "abramscientific.com", country: "United States", funding: "$11.7M Series A" },
  { name: "Chromai", website: "chromai.com", country: "China", funding: "Venture" },
  { name: "D-Sight", website: "dsight.es", country: "Spain", funding: "$2.3M Seed" },
  { name: "PointFit Technology", website: "pointfittech.com", country: "Hong Kong", funding: "Seed" },
  { name: "SuperBrewed Food", website: "superbrewedfood.com", country: "United States", funding: "Venture" },
  { name: "Metagen Therapeutics", website: "metagentx.com", country: "Japan", funding: "$7.6M Series B" },
  { name: "Respiree", website: "respiree.com", country: "Singapore", funding: "Series A" },
  { name: "Tamarind Bio", website: "tamarind.bio", country: "United States", funding: "$13.6M Series A" },
  { name: "Syndex Bio", website: "syndex.bio", country: "United Kingdom", funding: "$15.5M Seed" },
  { name: "Jiasiteng Pharmaceuticals", website: "kingmedpharm.com", country: "China", funding: "Series B" },
  { name: "Cortical Labs", website: "corticallabs.com", country: "Singapore", funding: "Venture" },
  { name: "Antiverse", website: "antiverse.io", country: "United Kingdom", funding: "$9.3M Series A" },
  { name: "Plant Path", website: "plantpathco.com", country: "United States", funding: "$3.6M Venture" },
  { name: "CULTA", website: "culta.jp", country: "Japan", funding: "$4.5M Seed" },
  { name: "ParcelBio", website: "parcelbio.com", country: "United States", funding: "$13.2M Venture" },
  { name: "NexCure", website: "nexcure.com", country: "United States", funding: "$19M Series A" },
  { name: "Noxon", website: "noxon.io", country: "Germany", funding: "Seed" },
  { name: "Alithea Genomics", website: "alitheagenomics.com", country: "Switzerland", funding: "$3.8M Seed" },
  { name: "baCta", website: "bacta.life", country: "France", funding: "$8.2M Seed" },
  { name: "Wisdom Bioscience", website: "wisdombioscience.com", country: "United States", funding: "Seed" },
  { name: "Science", website: "science.xyz", country: "United States", funding: "$230M Series C" },
  { name: "Forward Pharma", website: "forward-pharm.com", country: "China", funding: "Series B" },
  { name: "Swarm Oncology", website: "swarmoncology.bio", country: "United Kingdom", funding: "$8.1M Seed" },
  { name: "Amatera", website: "amatera.bio", country: "France", funding: "$7M Seed" },
  { name: "Kadance", website: "kadance.com", country: "United States", funding: "Seed" },
  { name: "SynuCa Therapeutics", website: "synuca.com", country: "Denmark", funding: "$1.5M Seed" },
  { name: "Shellworks", website: "theshellworks.com", country: "United Kingdom", funding: "$15M Series A" },
  { name: "Immunofoco", website: "immunofoco.com", country: "China", funding: "$29M Venture" },
  { name: "OutPost Bio", website: "outpost.bio", country: "United Kingdom", funding: "$3.5M Pre-Seed" },
  { name: "Persevere Therapeutics", website: "perseveretherapeutics.com", country: "United States", funding: "$1.6M Seed" },
  { name: "Xsensio", website: "xsensio.com", country: "Switzerland", funding: "$7M Series A" },
  { name: "BioCaptiva", website: "biocaptiva.com", country: "United Kingdom", funding: "$2.1M Venture" },
  { name: "SignaCor", website: "signacor.co.uk", country: "United Kingdom", funding: "Seed" },
  { name: "VALANX Biotech", website: "valanx.bio", country: "Austria", funding: "$3.5M Venture" },
  { name: "Verdant Impact", website: "verdantimpact.com", country: "India", funding: "$3M Seed" },
  { name: "CSR Biotech", website: "csr-biotech.com", country: "China", funding: "Series B" },
  { name: "Spinogenix", website: "spinogenix.com", country: "United States", funding: "$10.6M Venture" },
  { name: "Switchpoint Bio", website: "switchpointbio.com", country: "United States", funding: "$5.3M Venture" },
  { name: "iCamumo", website: "icamunobio.com", country: "China", funding: "$14.4M Series A" },
  { name: "Metanovas Biotech", website: "metanovas.com", country: "United States", funding: "Series A" },
  { name: "Max BioPharma", website: "maxbiopharma.com", country: "United States", funding: "$13M Series A" },
  { name: "Living Models", website: "livingmodels.ai", country: "France", funding: "$7M Seed" },
  { name: "Ramona", website: "ramonaoptics.com", country: "United States", funding: "$26M Venture" },
  { name: "BioSolution Designs", website: "biodzn.com", country: "United States", funding: "Venture" },
  { name: "Cocuus", website: "cocuus.com", country: "Spain", funding: "Venture" },
  { name: "Krishi", website: "krishidiagnostics.com", country: "United States", funding: "$1.4M Venture" },
  { name: "Bochuang Biotechnology", website: "bioboch.com", country: "China", funding: "Seed" },
  { name: "Celloid", website: "celloid.co.kr", country: "South Korea", funding: "$6.1M Series A" },
  { name: "Diamens", website: "diamens.org", country: "Austria", funding: "Pre-Seed" },
  { name: "Connext", website: "connext.co.kr", country: "South Korea", funding: "$10M Series C" },
  { name: "iDEL Therapeutics", website: "idel-tx.com", country: "Germany", funding: "$10.4M Seed" },
  { name: "Nula Therapeutics", website: "nulatx.com", country: "United States", funding: "$7.4M Seed" },
  { name: "Numerion Labs", website: "numerionlabs.ai", country: "United States", funding: "$19.8M Series D" },
  { name: "Entourage AI", website: "entourageai.com", country: "United Kingdom", funding: "$5M Pre-Seed" },
  { name: "Congruence Therapeutics", website: "congruencetx.com", country: "Canada", funding: "$39.5M Venture" },
  { name: "Excalipoint Therapeutics", website: "excalipoint.com", country: "Hong Kong", funding: "$68.7M Seed" },
  { name: "Virdalis", website: "virdalis.com", country: "Singapore", funding: "Pre-Seed" },
  { name: "Elea & Lili", website: "elealili.com", country: null, funding: "$2.9M Seed" },
  { name: "Ruoyi Biotech", website: "asiflyerbio.com", country: "China", funding: "Series A" },
  { name: "Puyi Biotech", website: "polyseq.com", country: "China", funding: "$21.8M Series B" },
  { name: "Q-Lab", website: "q-lab.kr", country: "South Korea", funding: "Seed" },
  { name: "Surf Therapeutics", website: "surftherapeutics.com", country: "United States", funding: "$6M Seed" },
  { name: "Unnatural Products", website: "unnaturalproducts.com", country: "United States", funding: "$45M Series B" },
  { name: "Scinus Cell Expansion", website: "scinus.com", country: "Netherlands", funding: "$3.4M Venture" },
  { name: "MedicQuant", website: "medicquant.com", country: "Denmark", funding: "$3.4M Seed" },
  { name: "Tianhu Technology", website: "matwings.com", country: "China", funding: "$29M Series A" },
  { name: "Mestag Therapeutics", website: "mestagtherapeutics.com", country: "United Kingdom", funding: "$40M Venture" },
  { name: "Level Nine", website: "levelninelabs.com", country: "Germany", funding: "$4.6M Seed" },
  { name: "Ruten", website: "ruten-neuro.com", country: "Japan", funding: "$2M Seed" },
  { name: "Ternary Therapeutics", website: "ternarytx.co.uk", country: "United Kingdom", funding: "$4.8M Seed" },
  { name: "Kupando", website: "kupando.com", country: "Germany", funding: "$11.5M Series A" },
  { name: "Rubi Laboratories", website: "rubi.earth", country: "United States", funding: "$7.5M Venture" },
  { name: "LabInCube", website: "labincube.com", country: "South Korea", funding: "$9.8M Series B" },
  { name: "Tenza", website: "tenza.bio", country: "United States", funding: "Venture" },
  { name: "VST Bio", website: "vst-bio.com", country: "United States", funding: "$16.1M Series A" },
  { name: "GasGene", website: "gasgene.com.cn", country: "China", funding: "$14.5M Venture" },
  { name: "Halcyon Wellness", website: "byhalcyon.com", country: "United States", funding: "$8M Venture" },
  { name: "53Biologics", website: "53biologics.com", country: "Spain", funding: "Venture" },
  { name: "3X Genetics", website: "3xgenetics.com", country: "United States", funding: "$3.2M Seed" },
  { name: "AilsynBio", website: "ailsynbio.com", country: "Hong Kong", funding: "Seed" },
];

async function main() {
  console.log("=== Growthlist.co Import ===\n");

  const existing = await loadCompanies(supabase);
  const matcher = new CompanyMatcher(existing);
  const existingDomains = new Set<string>();
  for (const c of existing) {
    if (c.website) { const d = extractDomain(c.website); if (d) existingDomains.add(d); }
  }
  console.log(`Loaded ${existing.length} companies for dedup\n`);

  const newOnes: typeof COMPANIES[0][] = [];
  let matched = 0;

  for (const co of COMPANIES) {
    if (matcher.match(co.name)) { matched++; continue; }
    const domain = extractDomain(co.website);
    if (domain && existingDomains.has(domain)) { matched++; continue; }
    // Dedup within this batch
    if (newOnes.some(n => n.name.toLowerCase() === co.name.toLowerCase())) continue;
    newOnes.push(co);
  }

  console.log(`Already in DB: ${matched}`);
  console.log(`New companies: ${newOnes.length}\n`);

  const ids: string[] = [];
  for (const co of newOnes) {
    const id = await createCompanyRecord(supabase, {
      name: co.name,
      country: co.country,
      website: `https://${co.website}`,
      source: "growthlist",
      source_url: "https://growthlist.co/biotech-startups/",
    });
    if (id) { ids.push(id); console.log(`  ✓ ${co.name} (${co.country || "?"})`); }
  }

  console.log(`\nCreated: ${ids.length}`);

  if (ids.length > 0) {
    console.log(`\nEnriching ${ids.length} companies via DeepSeek...`);
    const enriched = await batchEnrichNewCompanies(supabase, ids);
    console.log(`Enriched: ${enriched}`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
