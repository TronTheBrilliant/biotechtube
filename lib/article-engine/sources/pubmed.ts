// Article Engine — PubMed Integration
//
// Fetches recent biotech review papers from NCBI PubMed using E-utilities.
// Free API, no key needed at <3 requests/sec.

import { createServerClient } from '@/lib/supabase'

export interface PubMedPaper {
  pmid: string
  title: string
  abstract: string | null
  authors: string[]
  journal: string | null
  published_date: string | null
  doi: string | null
  mesh_terms: string[]
  keywords: string[]
}

// ── Fetch papers from PubMed ──

export async function fetchPubMedPapers(query: string, maxResults: number = 10): Promise<PubMedPaper[]> {
  // Step 1: Search for IDs
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query + ' AND review[pt]')}&retmax=${maxResults}&sort=relevance&retmode=json`

  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) {
    console.error(`PubMed search failed: ${searchRes.status}`)
    return []
  }

  const searchData = await searchRes.json()
  const ids: string[] = searchData?.esearchresult?.idlist || []

  if (ids.length === 0) return []

  // Rate limit: wait 400ms between requests
  await new Promise((r) => setTimeout(r, 400))

  // Step 2: Fetch details as XML
  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`

  const fetchRes = await fetch(fetchUrl)
  if (!fetchRes.ok) {
    console.error(`PubMed fetch failed: ${fetchRes.status}`)
    return []
  }

  const xml = await fetchRes.text()

  // Step 3: Parse XML into paper objects
  return parsePubMedXml(xml)
}

// ── Simple XML parser (no library needed) ──

function parsePubMedXml(xml: string): PubMedPaper[] {
  const papers: PubMedPaper[] = []

  // Split by PubmedArticle blocks
  const articleBlocks = xml.split('<PubmedArticle>')
  // Skip first element (before first article)
  for (let i = 1; i < articleBlocks.length; i++) {
    const block = articleBlocks[i]

    const pmid = extractTag(block, 'PMID')
    if (!pmid) continue

    const title = extractTag(block, 'ArticleTitle')
    if (!title) continue

    const abstract = extractAbstract(block)
    const authors = extractAuthors(block)
    const journal = extractTag(block, 'Title') // Journal title
    const published_date = extractPubDate(block)
    const doi = extractDoi(block)
    const mesh_terms = extractMeshTerms(block)
    const keywords = extractKeywords(block)

    papers.push({
      pmid,
      title,
      abstract,
      authors,
      journal,
      published_date,
      doi,
      mesh_terms,
      keywords,
    })
  }

  return papers
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`)
  const match = xml.match(regex)
  return match ? decodeXmlEntities(match[1].trim()) : null
}

function extractAbstract(block: string): string | null {
  // Abstract can have multiple AbstractText elements
  const abstractMatch = block.match(/<Abstract>([\s\S]*?)<\/Abstract>/)
  if (!abstractMatch) return null

  const abstractBlock = abstractMatch[1]
  const texts: string[] = []
  const regex = /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g
  let match
  while ((match = regex.exec(abstractBlock)) !== null) {
    texts.push(decodeXmlEntities(match[1].replace(/<[^>]+>/g, '').trim()))
  }

  return texts.length > 0 ? texts.join(' ') : null
}

function extractAuthors(block: string): string[] {
  const authors: string[] = []
  const authorListMatch = block.match(/<AuthorList[\s\S]*?>([\s\S]*?)<\/AuthorList>/)
  if (!authorListMatch) return authors

  const authorBlocks = authorListMatch[1].split('<Author')
  for (const ab of authorBlocks) {
    const lastName = extractTag(ab, 'LastName')
    const initials = extractTag(ab, 'Initials')
    if (lastName) {
      authors.push(initials ? `${lastName} ${initials}` : lastName)
    }
  }

  return authors.slice(0, 10) // Cap at 10 authors
}

function extractPubDate(block: string): string | null {
  // Try PubDate first, then ArticleDate
  const pubDateMatch = block.match(/<PubDate>([\s\S]*?)<\/PubDate>/)
  if (pubDateMatch) {
    const dateBlock = pubDateMatch[1]
    const year = extractTag(dateBlock, 'Year')
    const month = extractTag(dateBlock, 'Month')
    const day = extractTag(dateBlock, 'Day')

    if (year) {
      const monthNum = monthToNumber(month)
      return `${year}-${monthNum}-${day || '01'}`
    }
  }

  return null
}

function extractDoi(block: string): string | null {
  const doiMatch = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)
  return doiMatch ? doiMatch[1].trim() : null
}

function extractMeshTerms(block: string): string[] {
  const terms: string[] = []
  const meshMatch = block.match(/<MeshHeadingList>([\s\S]*?)<\/MeshHeadingList>/)
  if (!meshMatch) return terms

  const regex = /<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g
  let match
  while ((match = regex.exec(meshMatch[1])) !== null) {
    terms.push(decodeXmlEntities(match[1].trim()))
  }

  return terms
}

function extractKeywords(block: string): string[] {
  const keywords: string[] = []
  const kwListMatch = block.match(/<KeywordList[\s\S]*?>([\s\S]*?)<\/KeywordList>/)
  if (!kwListMatch) return keywords

  const regex = /<Keyword[^>]*>([^<]+)<\/Keyword>/g
  let match
  while ((match = regex.exec(kwListMatch[1])) !== null) {
    keywords.push(decodeXmlEntities(match[1].trim()))
  }

  return keywords
}

function monthToNumber(month: string | null): string {
  if (!month) return '01'
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  }
  // Handle numeric months
  if (/^\d+$/.test(month)) return month.padStart(2, '0')
  return months[month] || '01'
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

// ── Store papers in DB ──

export async function storePubMedPapers(papers: PubMedPaper[]): Promise<void> {
  if (papers.length === 0) return

  const supabase = createServerClient()

  for (const paper of papers) {
    await (supabase.from as any)('pubmed_papers')
      .upsert(
        {
          pmid: paper.pmid,
          title: paper.title,
          abstract: paper.abstract,
          authors: paper.authors,
          journal: paper.journal,
          published_date: paper.published_date,
          doi: paper.doi,
          mesh_terms: paper.mesh_terms,
          keywords: paper.keywords,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'pmid' }
      )
  }
}

// ── Get unused papers (not yet referenced in an article) ──

export async function getUnusedPapers(limit: number = 10): Promise<PubMedPaper[]> {
  const supabase = createServerClient()

  const { data } = await (supabase.from as any)('pubmed_papers')
    .select('pmid, title, abstract, authors, journal, published_date, doi, mesh_terms, keywords, relevance_score')
    .eq('used_in_article', false)
    .order('relevance_score', { ascending: false })
    .limit(limit)

  if (!data) return []

  return data.map((row: any) => ({
    pmid: row.pmid,
    title: row.title,
    abstract: row.abstract,
    authors: row.authors || [],
    journal: row.journal,
    published_date: row.published_date,
    doi: row.doi,
    mesh_terms: row.mesh_terms || [],
    keywords: row.keywords || [],
  }))
}

// ── Mark papers as used in an article ──

export async function markPapersUsed(pmids: string[]): Promise<void> {
  if (pmids.length === 0) return

  const supabase = createServerClient()

  await (supabase.from as any)('pubmed_papers')
    .update({ used_in_article: true, updated_at: new Date().toISOString() })
    .in('pmid', pmids)
}

// ── Discover trending biotech topics ──

export async function discoverTrendingTopics(): Promise<string[]> {
  const supabase = createServerClient()
  const topics = new Map<string, number>()

  // 1. Hot sectors from funding_rounds (most funded in last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const { data: recentFunding } = await supabase
    .from('funding_rounds')
    .select('sector, amount_usd')
    .gte('announced_date', thirtyDaysAgo.toISOString().slice(0, 10))
    .order('amount_usd', { ascending: false })
    .limit(50)

  if (recentFunding) {
    for (const round of recentFunding) {
      if (round.sector) {
        const sector = round.sector.toLowerCase()
        topics.set(sector, (topics.get(sector) || 0) + (round.amount_usd || 1))
      }
    }
  }

  // 2. Trending pipeline technologies from companies/categories
  const { data: companies } = await supabase
    .from('companies')
    .select('categories')
    .not('categories', 'is', null)
    .order('valuation', { ascending: false })
    .limit(100)

  if (companies) {
    for (const company of companies) {
      if (company.categories && Array.isArray(company.categories)) {
        for (const cat of company.categories) {
          const key = cat.toLowerCase()
          topics.set(key, (topics.get(key) || 0) + 1)
        }
      }
    }
  }

  // 3. Map DB sectors/categories to PubMed-friendly search terms
  const TOPIC_MAP: Record<string, string> = {
    'oncology': 'cancer immunotherapy',
    'gene therapy': 'CRISPR gene therapy',
    'cell therapy': 'cell therapy CAR-T',
    'neuroscience': 'neurodegenerative disease treatment',
    'rare disease': 'rare disease gene therapy',
    'immunology': 'immunotherapy biologics',
    'metabolic': 'GLP-1 metabolic disease',
    'ai': 'AI drug discovery',
    'artificial intelligence': 'AI drug discovery',
    'mrna': 'mRNA therapeutics',
    'antibody': 'antibody drug conjugate',
    'obesity': 'GLP-1 obesity',
    'diabetes': 'GLP-1 diabetes',
    'cardiovascular': 'cardiovascular biologics',
    'infectious disease': 'antiviral therapeutics',
  }

  // Sort by score and return top topics
  const sorted = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const result: string[] = []
  for (const [topic] of sorted) {
    // Use mapped term if available, otherwise use raw topic
    const mapped = Object.entries(TOPIC_MAP).find(([key]) => topic.includes(key))
    const searchTerm = mapped ? mapped[1] : topic
    if (!result.includes(searchTerm)) {
      result.push(searchTerm)
    }
    if (result.length >= 7) break
  }

  // Ensure we always have some defaults
  if (result.length < 3) {
    const defaults = ['CRISPR gene therapy', 'GLP-1 obesity', 'AI drug discovery', 'mRNA therapeutics', 'cell therapy CAR-T']
    for (const d of defaults) {
      if (!result.includes(d)) result.push(d)
      if (result.length >= 5) break
    }
  }

  return result
}
