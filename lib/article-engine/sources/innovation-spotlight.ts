// Article Engine — Innovation Spotlight Context Gatherer

import { createServerClient } from '@/lib/supabase'
import { fetchPubMedPapers, storePubMedPapers, discoverTrendingTopics } from './pubmed'
import type { ArticleContext, Source } from '../types'

export async function gatherInnovationSpotlightContext(data: {
  focus?: string
  theme?: string
  angle?: string
}): Promise<ArticleContext> {
  const supabase = createServerClient()

  // 1. Discover 5-7 hot topic areas
  const trendingTopics = await discoverTrendingTopics()
  const topics = trendingTopics.slice(0, 7)

  // 2. For each topic, find the most interesting company/pipeline entry
  const innovations: Array<{
    topic: string
    company: { id: string; name: string; slug: string; description: string | null; categories: string[] | null; valuation: number | null }
    pipeline: Array<{ product_name: string; indication: string | null; phase: string | null; status: string | null }> | null
    papers: Array<{ pmid: string; title: string; abstract: string | null; journal: string | null }>
  }> = []

  const sources: Source[] = []

  for (const topic of topics) {
    // Find companies matching this topic
    const topicWords = topic.toLowerCase().split(/\s+/)
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name, slug, description, categories, valuation')
      .not('categories', 'is', null)
      .order('valuation', { ascending: false })
      .limit(50)

    const matched = (companies || []).filter((c) => {
      if (!c.categories || !Array.isArray(c.categories)) return false
      return c.categories.some((cat: string) =>
        topicWords.some((w) => cat.toLowerCase().includes(w) || w.includes(cat.toLowerCase()))
      )
    })

    // Skip if no company match (we need real data)
    const company = matched[0]
    if (!company) continue

    // Check if we already have this company (avoid duplicates)
    if (innovations.some((i) => i.company.id === company.id)) continue

    // Get pipeline data
    let pipeline: Array<{ product_name: string; indication: string | null; phase: string | null; status: string | null }> | null = null
    const { data: report } = await (supabase.from as any)('company_reports')
      .select('pipeline_programs')
      .eq('report_slug', company.slug)
      .single()

    if (report?.pipeline_programs && Array.isArray(report.pipeline_programs)) {
      pipeline = report.pipeline_programs.slice(0, 2).map((p: any) => ({
        product_name: p.name || p.product_name || 'Unknown',
        indication: p.indication || null,
        phase: p.phase || null,
        status: p.status || null,
      }))
    }

    // Fetch 2-3 PubMed papers for backing
    const papers = await fetchPubMedPapers(topic, 3)
    await storePubMedPapers(papers)

    // Add papers to sources
    for (const paper of papers.slice(0, 2)) {
      sources.push({
        name: `${paper.title} (${paper.journal || 'PubMed'})`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`,
        date: paper.published_date || undefined,
      })
    }

    innovations.push({
      topic,
      company,
      pipeline,
      papers: papers.map((p) => ({
        pmid: p.pmid,
        title: p.title,
        abstract: p.abstract?.slice(0, 300) || null,
        journal: p.journal,
      })),
    })

    // Rate limit PubMed calls
    await new Promise((r) => setTimeout(r, 400))

    if (innovations.length >= 7) break
  }

  // Build ArticleContext
  const primaryCompany = innovations[0]?.company || null
  const allPipeline = innovations
    .filter((i) => i.pipeline)
    .flatMap((i) =>
      (i.pipeline || []).map((p) => ({
        product_name: p.product_name,
        indication: p.indication,
        phase: p.phase,
        status: p.status,
      }))
    )

  const context: ArticleContext = {
    company: primaryCompany
      ? {
          id: primaryCompany.id,
          name: primaryCompany.name,
          slug: primaryCompany.slug,
          description: primaryCompany.description,
          categories: primaryCompany.categories,
          ticker: null,
          valuation: primaryCompany.valuation,
          logo_url: null,
          website: null,
          country: null,
        }
      : undefined,
    pipeline: allPipeline.length > 0 ? allPipeline : undefined,
    sources,
    companyInDB: innovations.length > 0,
    companyHasFullProfile: false,
    numbersVerifiedFromDB: true,
  }

  ;(context as any).metadata = {
    focus: data.focus || data.theme || 'biotech innovation',
    theme: data.theme || null,
    angle: data.angle || null,
    innovations: innovations.map((i) => ({
      topic: i.topic,
      company_name: i.company.name,
      company_slug: i.company.slug,
      company_categories: i.company.categories,
      company_valuation: i.company.valuation,
      pipeline: i.pipeline,
      papers: i.papers,
    })),
    topic_count: innovations.length,
  }

  return context
}
