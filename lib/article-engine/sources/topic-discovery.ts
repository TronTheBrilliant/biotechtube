// Article Engine — Topic Discovery Engine
//
// Cross-references funding trends, pipeline activity, and PubMed papers
// to discover compelling essay and spotlight topics.

import { createServerClient } from '@/lib/supabase'
import { fetchPubMedPapers, type PubMedPaper } from './pubmed'

// ── Types ──

export interface TopicSuggestion {
  topic: string           // e.g., "CRISPR gene editing"
  angle: string           // e.g., "How CRISPR is moving from lab to clinic"
  relevanceScore: number  // 0-100
  sources: {
    fundingSignals: string[]    // companies/rounds related to this topic
    pipelineSignals: string[]   // drugs/indications in this area
    pubmedPapers: PubMedPaper[] // relevant papers
  }
}

// ── Biotech topic categories ──

const BIOTECH_TOPICS = [
  'CRISPR', 'mRNA', 'gene therapy', 'cell therapy', 'CAR-T',
  'antibody drug conjugates', 'AI drug discovery', 'synthetic biology',
  'peptide therapeutics', 'RNA therapeutics', 'microbiome',
  'precision medicine', 'immunotherapy', 'proteomics',
  'xenotransplantation', 'longevity', 'neurotechnology',
  'bioprinting', 'liquid biopsy', 'digital therapeutics',
]

// Map broad topics to PubMed-friendly queries
const PUBMED_QUERIES: Record<string, string> = {
  'CRISPR': '"CRISPR"[Title/Abstract] AND "review"[pt]',
  'mRNA': '"mRNA therapeutics"[Title/Abstract] AND "review"[pt]',
  'gene therapy': '"gene therapy"[MeSH] AND "review"[pt]',
  'cell therapy': '"cell therapy"[Title/Abstract] AND "review"[pt]',
  'CAR-T': '"chimeric antigen receptor"[Title/Abstract] AND "review"[pt]',
  'antibody drug conjugates': '"antibody drug conjugate"[Title/Abstract] AND "review"[pt]',
  'AI drug discovery': '"artificial intelligence"[Title/Abstract] AND "drug discovery"[Title/Abstract]',
  'synthetic biology': '"synthetic biology"[MeSH] AND "review"[pt]',
  'peptide therapeutics': '"peptide therapeutics"[Title/Abstract] AND "review"[pt]',
  'RNA therapeutics': '"RNA therapeutics"[Title/Abstract] AND "review"[pt]',
  'microbiome': '"microbiome"[MeSH] AND "therapeutics"[Title/Abstract] AND "review"[pt]',
  'precision medicine': '"precision medicine"[MeSH] AND "review"[pt]',
  'immunotherapy': '"immunotherapy"[MeSH] AND "review"[pt]',
  'proteomics': '"proteomics"[MeSH] AND "drug"[Title/Abstract] AND "review"[pt]',
  'xenotransplantation': '"xenotransplantation"[MeSH] AND "review"[pt]',
  'longevity': '"longevity"[Title/Abstract] AND "therapeutics"[Title/Abstract] AND "review"[pt]',
  'neurotechnology': '"brain computer interface"[Title/Abstract] OR "neurotechnology"[Title/Abstract]',
  'bioprinting': '"bioprinting"[Title/Abstract] AND "review"[pt]',
  'liquid biopsy': '"liquid biopsy"[Title/Abstract] AND "review"[pt]',
  'digital therapeutics': '"digital therapeutics"[Title/Abstract] AND "review"[pt]',
}

// Essay angles per topic
const ESSAY_ANGLES: Record<string, string[]> = {
  'CRISPR': [
    'How CRISPR is moving from lab bench to patient bedside',
    'The next generation of gene editors beyond Cas9',
    'CRISPR and the ethics of editing the human germline',
  ],
  'mRNA': [
    'Beyond vaccines: the expanding universe of mRNA medicine',
    'Why mRNA is the new platform technology for drug development',
  ],
  'gene therapy': [
    'The gene therapy revolution: from rare diseases to common conditions',
    'Delivery vehicles: the unsung heroes of gene therapy',
  ],
  'cell therapy': [
    'Living drugs: how cell therapies are rewriting cancer treatment',
    'Allogeneic vs autologous: the cell therapy manufacturing challenge',
  ],
  'AI drug discovery': [
    'Can AI actually discover better drugs faster?',
    'The data problem at the heart of AI drug discovery',
  ],
  'antibody drug conjugates': [
    'ADCs 2.0: why antibody-drug conjugates are having a renaissance',
    'Precision payloads: the chemistry making ADCs more effective',
  ],
  'immunotherapy': [
    'The next frontier of cancer immunotherapy beyond checkpoint inhibitors',
    'Why immunotherapy works for some patients and not others',
  ],
  'longevity': [
    'The science of aging: from senolytics to reprogramming',
    'Longevity biotech goes mainstream: who is funding the anti-aging revolution',
  ],
}

// ── Discover essay topics ──

export async function discoverEssayTopics(): Promise<TopicSuggestion[]> {
  const supabase = createServerClient()
  const topicScores = new Map<string, { fundingScore: number; pipelineScore: number; signals: { funding: string[]; pipeline: string[] } }>()

  // Initialize all topics
  for (const topic of BIOTECH_TOPICS) {
    topicScores.set(topic, { fundingScore: 0, pipelineScore: 0, signals: { funding: [], pipeline: [] } })
  }

  // 1. Score by recent funding rounds (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90)

  const { data: recentFunding } = await supabase
    .from('funding_rounds')
    .select('company_name, sector, amount_usd, round_type')
    .gte('announced_date', ninetyDaysAgo.toISOString().slice(0, 10))
    .order('amount_usd', { ascending: false })
    .limit(100)

  if (recentFunding) {
    for (const round of recentFunding) {
      const sectorLower = (round.sector || '').toLowerCase()
      const companyName = round.company_name || ''
      for (const topic of BIOTECH_TOPICS) {
        if (sectorLower.includes(topic.toLowerCase()) || topic.toLowerCase().split(' ').some(w => sectorLower.includes(w))) {
          const entry = topicScores.get(topic)!
          entry.fundingScore += Math.min((round.amount_usd || 0) / 10_000_000, 50) // Cap at 50 per round
          entry.signals.funding.push(`${companyName} (${round.round_type}: $${((round.amount_usd || 0) / 1e6).toFixed(0)}M)`)
        }
      }
    }
  }

  // 2. Score by pipeline activity (company categories)
  const { data: companies } = await supabase
    .from('companies')
    .select('name, categories, valuation')
    .not('categories', 'is', null)
    .order('valuation', { ascending: false })
    .limit(200)

  if (companies) {
    for (const company of companies) {
      if (!company.categories || !Array.isArray(company.categories)) continue
      for (const topic of BIOTECH_TOPICS) {
        const topicLower = topic.toLowerCase()
        const match = company.categories.some((cat: string) =>
          cat.toLowerCase().includes(topicLower) || topicLower.split(' ').some(w => cat.toLowerCase().includes(w))
        )
        if (match) {
          const entry = topicScores.get(topic)!
          entry.pipelineScore += 2
          if (entry.signals.pipeline.length < 5) {
            entry.signals.pipeline.push(company.name)
          }
        }
      }
    }
  }

  // 3. Filter out topics that already have a recent science_essay
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const { data: recentEssays } = await (supabase.from as any)('articles')
    .select('metadata')
    .eq('type', 'science_essay')
    .gte('published_at', thirtyDaysAgo.toISOString())
    .limit(20)

  const recentTopics = new Set<string>()
  if (recentEssays) {
    for (const article of recentEssays) {
      if (article.metadata?.topic) {
        recentTopics.add(article.metadata.topic.toLowerCase())
      }
    }
  }

  // 4. Rank topics and build suggestions
  const ranked = Array.from(topicScores.entries())
    .filter(([topic]) => !recentTopics.has(topic.toLowerCase()))
    .map(([topic, scores]) => ({
      topic,
      totalScore: scores.fundingScore + scores.pipelineScore,
      scores,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5)

  // 5. Fetch PubMed papers for top 3 and build suggestions
  const suggestions: TopicSuggestion[] = []

  for (const item of ranked.slice(0, 3)) {
    const query = PUBMED_QUERIES[item.topic] || `"${item.topic}"[Title/Abstract] AND "review"[pt]`
    let papers: PubMedPaper[] = []
    try {
      papers = await fetchPubMedPapers(query, 5)
      await new Promise((r) => setTimeout(r, 400)) // rate limit
    } catch {
      // PubMed fetch failure is non-fatal
    }

    const angles = ESSAY_ANGLES[item.topic] || [`The state of ${item.topic} in biotech today`]
    const angle = angles[Math.floor(Math.random() * angles.length)]

    const relevanceScore = Math.min(Math.round(item.totalScore), 100)

    suggestions.push({
      topic: item.topic,
      angle,
      relevanceScore,
      sources: {
        fundingSignals: item.scores.signals.funding.slice(0, 5),
        pipelineSignals: item.scores.signals.pipeline.slice(0, 5),
        pubmedPapers: papers,
      },
    })
  }

  return suggestions
}

// ── Discover spotlight topics ──

export async function discoverSpotlightTopics(): Promise<TopicSuggestion[]> {
  const supabase = createServerClient()

  // 1. Find diverse, high-signal innovations by cross-referencing pipelines and funding
  const { data: topCompanies } = await supabase
    .from('companies')
    .select('id, name, slug, categories, valuation')
    .not('categories', 'is', null)
    .gt('valuation', 100_000_000)
    .order('valuation', { ascending: false })
    .limit(100)

  // 2. Group companies by their primary category/topic area
  const themeGroups = new Map<string, Array<{ name: string; valuation: number | null; categories: string[] }>>()

  for (const company of topCompanies || []) {
    if (!company.categories || !Array.isArray(company.categories)) continue
    for (const topic of BIOTECH_TOPICS) {
      const match = company.categories.some((cat: string) =>
        cat.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().split(' ').some(w => cat.toLowerCase().includes(w))
      )
      if (match) {
        if (!themeGroups.has(topic)) themeGroups.set(topic, [])
        themeGroups.get(topic)!.push({ name: company.name, valuation: company.valuation, categories: company.categories })
        break // Only assign each company to first matching topic
      }
    }
  }

  // 3. Rank themes by number of companies and total valuation
  const themes = Array.from(themeGroups.entries())
    .map(([topic, companies]) => ({
      topic,
      companyCount: companies.length,
      totalValuation: companies.reduce((sum, c) => sum + (c.valuation || 0), 0),
      topCompanies: companies.slice(0, 3),
    }))
    .sort((a, b) => b.companyCount * 10 + b.totalValuation / 1e9 - (a.companyCount * 10 + a.totalValuation / 1e9))

  // 4. Build spotlight suggestions (pick 3 diverse themes)
  const spotlightAngles = [
    'Most Funded Technologies',
    'Breakthrough Therapies to Watch',
    'Innovations Reshaping Drug Development',
  ]

  const suggestions: TopicSuggestion[] = []
  const usedTopics = new Set<string>()

  for (const theme of themes) {
    if (usedTopics.has(theme.topic)) continue
    if (suggestions.length >= 3) break

    const query = PUBMED_QUERIES[theme.topic] || `"${theme.topic}"[Title/Abstract] AND "review"[pt]`
    let papers: PubMedPaper[] = []
    try {
      papers = await fetchPubMedPapers(query, 3)
      await new Promise((r) => setTimeout(r, 400))
    } catch {
      // Non-fatal
    }

    const angle = spotlightAngles[suggestions.length] || `${theme.topic}: What to Watch`
    const relevanceScore = Math.min(theme.companyCount * 15 + Math.round(theme.totalValuation / 1e9), 100)

    suggestions.push({
      topic: theme.topic,
      angle,
      relevanceScore,
      sources: {
        fundingSignals: theme.topCompanies.map(c => c.name),
        pipelineSignals: theme.topCompanies.flatMap(c => c.categories).slice(0, 5),
        pubmedPapers: papers,
      },
    })

    usedTopics.add(theme.topic)
  }

  return suggestions
}
