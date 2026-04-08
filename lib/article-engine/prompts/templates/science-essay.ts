// Article Engine — Science Essay Prompt Template

import type { ArticleContext } from '../../types'

export function buildScienceEssayPrompt(context: ArticleContext): string {
  const meta = (context as any).metadata || {}
  const parts: string[] = []

  parts.push(`## Topic: ${meta.topic || 'Biotech Science'}`)
  if (meta.angle) {
    parts.push(`## Angle: ${meta.angle}`)
  }

  // PubMed papers
  if (meta.pubmed_papers?.length) {
    parts.push(`\n## Research Papers (PubMed)`)
    for (const paper of meta.pubmed_papers) {
      parts.push(`\n### ${paper.title}`)
      parts.push(`- PMID: ${paper.pmid}`)
      parts.push(`- Journal: ${paper.journal || 'Unknown'}`)
      parts.push(`- Published: ${paper.published_date || 'Unknown'}`)
      if (paper.authors?.length) {
        parts.push(`- Authors: ${paper.authors.join(', ')}`)
      }
      if (paper.doi) {
        parts.push(`- DOI: ${paper.doi}`)
      }
      if (paper.mesh_terms?.length) {
        parts.push(`- MeSH Terms: ${paper.mesh_terms.join(', ')}`)
      }
      if (paper.abstract) {
        parts.push(`- Abstract: ${paper.abstract}`)
      }
    }
  }

  // Related companies
  if (meta.related_companies?.length) {
    parts.push(`\n## Companies Working in This Space`)
    for (const company of meta.related_companies) {
      parts.push(`- ${company.name} (${company.categories?.join(', ') || 'biotech'})${company.valuation ? ` — Valuation: $${(company.valuation / 1e9).toFixed(1)}B` : ''}`)
    }
  }

  // Pipeline data
  if (meta.pipeline_data?.length) {
    parts.push(`\n## Active Drug Pipelines`)
    for (const p of meta.pipeline_data) {
      parts.push(`- ${p.product_name} by ${p.company_name}: ${p.indication || 'Multiple indications'} (${p.phase || 'Preclinical'})`)
    }
  }

  // Company context
  if (context.company) {
    parts.push(`\n## Featured Company: ${context.company.name}`)
    if (context.company.description) {
      parts.push(`Description: ${context.company.description}`)
    }
  }

  // Sources
  if (context.sources.length) {
    parts.push(`\n## Available Sources`)
    for (const src of context.sources) {
      parts.push(`- ${src.name}: ${src.url}${src.date ? ` (${src.date})` : ''}`)
    }
  }

  parts.push(`\n## Writing Instructions`)
  parts.push(`Write a long-form science essay in the style of Wired or National Geographic about "${meta.topic || 'biotech science'}".`)
  if (meta.angle) {
    parts.push(`ANGLE / THESIS: ${meta.angle}`)
    parts.push(`Use this angle as the guiding thread of the essay. Return to it in the opening, the body, and the conclusion.`)
  }
  parts.push(``)
  parts.push(`STRUCTURE (8-12 substantial paragraphs, 800-1200 words):`)
  parts.push(`1. CINEMATIC OPENING — Start with a vivid, specific scene or moment. A researcher in a lab peering through a microscope. A patient receiving a groundbreaking treatment. A molecule doing something extraordinary at the nanoscale. Make the reader SEE it.`)
  parts.push(`2. THE SCIENCE — Explain the core science accessibly but without dumbing it down. Use analogies. What is actually happening at the molecular/cellular level? Why is this approach different from what came before?`)
  parts.push(`3. THE BREAKTHROUGH — What recent papers or data show this is a turning point? Reference the PubMed papers provided. Be specific about findings.`)
  parts.push(`4. REAL COMPANIES, REAL DRUGS — Connect to the actual companies and pipeline drugs from our database. Who is furthest along? What phase are they in? What does their data look like?`)
  parts.push(`5. WHAT COULD HAPPEN — Forward-looking section. If this works, what changes? For patients? For the industry? Paint the picture of what success looks like.`)
  parts.push(`6. THE CAVEATS — Honest about the risks and unknowns. What could go wrong? What questions remain unanswered?`)
  parts.push(`7. THOUGHT-PROVOKING CLOSER — End with something that lingers. A question. A juxtaposition. A moment of wonder.`)
  parts.push(``)
  parts.push(`REQUIREMENTS:`)
  parts.push(`- Cite PubMed papers as sources (include in the sources array)`)
  parts.push(`- Include 1-2 pull quotes (impactful statements worth highlighting)`)
  parts.push(`- Include 2-3 data callouts for striking statistics or numbers`)
  parts.push(`- Reference specific companies and drugs by name from the data provided`)
  parts.push(`- Write for an intelligent lay audience — no jargon without explanation`)
  parts.push(`- Make it feel like reading a feature article, not a textbook`)

  return parts.join('\n')
}
