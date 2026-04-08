// Article Engine — Science Essay Context Gatherer

import { createServerClient } from '@/lib/supabase'
import { fetchPubMedPapers, storePubMedPapers, discoverTrendingTopics, type PubMedPaper } from './pubmed'
import type { ArticleContext, Source } from '../types'

export async function gatherScienceEssayContext(data: {
  topic?: string
  angle?: string
  pubmedPmids?: string[]
}): Promise<ArticleContext> {
  const supabase = createServerClient()

  // 1. Determine topic
  let topic = data.topic
  if (!topic) {
    const trending = await discoverTrendingTopics()
    topic = trending[0] || 'CRISPR gene therapy'
  }

  const angle = data.angle || `The state of ${topic} in biotech today`

  // 2. Fetch PubMed papers — use provided PMIDs or search by topic
  let papers: PubMedPaper[] = []
  if (data.pubmedPmids && data.pubmedPmids.length > 0) {
    // Fetch specific papers by PMID from our DB
    const { data: storedPapers } = await (supabase.from as any)('pubmed_papers')
      .select('pmid, title, abstract, authors, journal, published_date, doi, mesh_terms, keywords')
      .in('pmid', data.pubmedPmids)

    papers = (storedPapers || []).map((p: any) => ({
      pmid: p.pmid,
      title: p.title,
      abstract: p.abstract,
      authors: p.authors || [],
      journal: p.journal,
      published_date: p.published_date,
      doi: p.doi,
      mesh_terms: p.mesh_terms || [],
      keywords: p.keywords || [],
    }))
  }

  // If we don't have enough papers, fetch from PubMed API
  if (papers.length < 3) {
    const fetched = await fetchPubMedPapers(topic, 5)
    papers = [...papers, ...fetched].slice(0, 7)
  }

  // 3. Store them for future reference
  await storePubMedPapers(papers)

  // 4. Find related companies from DB matching the topic
  const { data: relatedCompanies } = await supabase
    .from('companies')
    .select('id, name, slug, description, categories, ticker, valuation, logo_url, website, country')
    .not('categories', 'is', null)
    .order('valuation', { ascending: false })
    .limit(100)

  // Filter companies whose categories overlap with the topic keywords
  const topicWords = topic.toLowerCase().split(/\s+/)
  const matchedCompanies = (relatedCompanies || []).filter((c) => {
    if (!c.categories || !Array.isArray(c.categories)) return false
    return c.categories.some((cat: string) =>
      topicWords.some((w) => cat.toLowerCase().includes(w) || w.includes(cat.toLowerCase()))
    )
  }).slice(0, 5)

  // 5. Get pipeline data for matched companies
  const pipelineData: Array<{
    product_name: string
    indication: string | null
    phase: string | null
    status: string | null
    company_name: string
  }> = []

  for (const company of matchedCompanies.slice(0, 3)) {
    const { data: report } = await (supabase.from as any)('company_reports')
      .select('pipeline_programs')
      .eq('report_slug', company.slug)
      .single()

    if (report?.pipeline_programs && Array.isArray(report.pipeline_programs)) {
      for (const p of report.pipeline_programs.slice(0, 3)) {
        pipelineData.push({
          product_name: p.name || p.product_name || 'Unknown',
          indication: p.indication || null,
          phase: p.phase || null,
          status: p.status || null,
          company_name: company.name,
        })
      }
    }
  }

  // 6. Build sources list
  const sources: Source[] = []
  for (const paper of papers) {
    sources.push({
      name: `${paper.title} (${paper.journal || 'PubMed'})`,
      url: `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`,
      date: paper.published_date || undefined,
    })
  }
  for (const company of matchedCompanies.slice(0, 3)) {
    if (company.website) {
      sources.push({ name: `${company.name}`, url: company.website })
    }
  }

  // 7. Build ArticleContext
  const primaryCompany = matchedCompanies[0] || null
  const context: ArticleContext = {
    company: primaryCompany || undefined,
    pipeline: pipelineData.length > 0
      ? pipelineData.map((p) => ({
          product_name: p.product_name,
          indication: p.indication,
          phase: p.phase,
          status: p.status,
        }))
      : undefined,
    sources,
    companyInDB: matchedCompanies.length > 0,
    companyHasFullProfile: !!(primaryCompany?.description && primaryCompany?.categories?.length),
    numbersVerifiedFromDB: true,
  }

  // Store extra data in metadata
  ;(context as any).metadata = {
    topic,
    angle,
    pubmed_papers: papers.map((p) => ({
      pmid: p.pmid,
      title: p.title,
      abstract: p.abstract?.slice(0, 500) || null,
      authors: p.authors.slice(0, 5),
      journal: p.journal,
      published_date: p.published_date,
      doi: p.doi,
      mesh_terms: p.mesh_terms,
      keywords: p.keywords || [],
    })),
    related_companies: matchedCompanies.map((c) => ({
      name: c.name,
      slug: c.slug,
      categories: c.categories,
      valuation: c.valuation,
    })),
    pipeline_data: pipelineData,
    sector_name: topic,
  }

  return context
}
