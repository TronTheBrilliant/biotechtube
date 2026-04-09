// Article Engine — Hero Image Prompt Generation
// Style: grainy abstract digital art, deep shadows, editorial photography meets generative art

import type { ArticleType, ArticleContext, PlaceholderStyle } from './types'

const BASE_STYLE = `Heavy film grain texture. Deep shadows with light bleeding through edges. Abstract digital art, not photorealistic. Dark moody atmosphere. Shot on expired film look. Cinematic color grading. No text, no words, no letters, no numbers, no UI elements. 16:9 aspect ratio. Editorial magazine quality.`

const COLOR_PALETTES: Record<ArticleType, string> = {
  funding_deal: 'Dark teal and gold tones. Deep navy shadows with warm amber highlights breaking through.',
  clinical_trial: 'Cool clinical blues and whites. Sterile brightness cutting through dark shadows. Cyan accents.',
  market_analysis: 'Monochromatic blue-grey with sharp green data-glow accents. Bloomberg terminal aesthetic.',
  company_deep_dive: 'Rich deep purple and midnight blue. Warm amber spotlighting from below.',
  weekly_roundup: 'Warm earth tones — burnt orange, ochre, deep brown. Sunset energy.',
  breaking_news: 'High contrast black and red. Urgent. Stark white highlights piercing darkness.',
  science_essay: 'Ethereal cyan and emerald. Bioluminescent glow in deep ocean darkness.',
  innovation_spotlight: 'Electric violet and hot pink against pitch black. Neon lab glow.',
}

function getSubject(articleType: ArticleType, context?: ArticleContext): string {
  const sector = context?.fundingRound?.sector || context?.company?.categories?.[0] || null
  const indication = context?.pipeline?.[0]?.indication || null

  switch (articleType) {
    case 'funding_deal': {
      const subjects = [
        'Abstract geometric crystals growing from dark soil, suggesting value materializing from nothing',
        'Liquid gold flowing through a network of glass channels, viewed from above in darkness',
        'Stacked translucent cubes of varying sizes catching light, floating in void',
        'A single bright seed splitting open, roots and shoots rendered as circuit paths',
        'Concentric rings of light expanding outward from a dark center, like a radar pulse',
      ]
      let base = subjects[Math.floor(Math.random() * subjects.length)]
      if (sector) base += `. Subtle organic forms suggesting ${sector}.`
      return base
    }
    case 'clinical_trial': {
      const subjects = [
        'Macro shot of a single droplet hitting a still dark surface, creating perfect concentric ripples',
        'Abstract double helix unwinding into particles of light against black',
        'Grid of identical glass spheres, one glowing brighter than the rest',
        'Cross-section of something organic and geometric simultaneously — cells as architecture',
        'A precise beam of light cutting through dense fog, illuminating floating particles',
      ]
      let base = subjects[Math.floor(Math.random() * subjects.length)]
      if (indication) base += `. Evoking ${indication} biology.`
      return base
    }
    case 'market_analysis': {
      return [
        'Abstract topographic map with glowing contour lines, viewed from altitude. Terrain of data.',
        'Hundreds of thin vertical lines of varying height, like a city skyline made of light',
        'A dark ocean surface with bioluminescent data points creating constellation patterns below',
        'Overlapping transparent geometric planes at angles, creating a parallax depth illusion',
        'Abstract radar sweep revealing hidden structures in darkness, green phosphor glow',
      ][Math.floor(Math.random() * 5)]
    }
    case 'company_deep_dive': {
      let base = [
        'Architectural blueprint rendered in light against darkness — a building that is also a molecule',
        'Layers of translucent material stacked and offset, each revealing different internal structures',
        'A lone structure illuminated by a single dramatic spotlight from above, deep shadows radiating outward',
        'Abstract portrait — faceless silhouette made entirely of interconnected nodes and pathways',
        'An intricate clockwork mechanism visible through frosted glass, precision and complexity',
      ][Math.floor(Math.random() * 5)]
      if (sector) base += `. Elements suggesting ${sector} industry.`
      return base
    }
    case 'weekly_roundup':
      return [
        'Mosaic of different-colored glass fragments arranged on a dark lightbox, each piece a different story',
        'A circular timeline spiraling inward, each ring a different texture and tone',
        'Multiple overlapping newspaper-like shapes, abstracted into pure geometry and shadow',
        'A constellation map where each star is a different color, connected by faint lines',
        'Stacked transparent discs each containing a different abstract scene, viewed from the side',
      ][Math.floor(Math.random() * 5)]
    case 'breaking_news':
      return [
        'A single crack of white light splitting a dark surface in two, energy escaping from within',
        'Abstract lightning frozen in time, branching across a black sky in geometric patterns',
        'A shattered dark mirror, each fragment reflecting a different shade of red',
        'Shockwave ripple captured mid-expansion against matte black, like a stone hitting mercury',
        'A single bright point source casting long dramatic shadows across angular terrain',
      ][Math.floor(Math.random() * 5)]
    case 'science_essay': {
      let base = [
        'Macro biology meets cosmic scale — cellular structures that look like galaxies, or galaxies that look like cells',
        'Bioluminescent organisms in deep ocean darkness, their light forming abstract patterns',
        'A forest of translucent organic towers growing from a dark substrate, glowing from within',
        'The moment of a chemical reaction frozen in time — swirling liquids forming impossible structures',
        'Abstract neural pathways rendered as rivers of light flowing through a dark landscape',
      ][Math.floor(Math.random() * 5)]
      if (indication) base += `. Inspired by ${indication} science.`
      return base
    }
    case 'innovation_spotlight':
      return [
        'Multiple small glowing objects each wildly different in shape, floating in organized rows against void',
        'A laboratory shelf seen through frosted glass — shapes of beakers, devices, tools abstracted into pure light',
        'Collection of impossible objects — each one a different texture, material, and color — arranged with precision',
        'Abstract periodic table where each element is a tiny universe of different visual character',
        'A grid of small worlds, each square containing a different miniature environment glowing differently',
      ][Math.floor(Math.random() * 5)]
    default:
      return 'Abstract geometric forms emerging from darkness, rendered in cool blue light with heavy grain'
  }
}

/**
 * Generate a smart, aesthetic hero image prompt.
 * Style: grainy abstract digital art, deep shadows, editorial magazine quality.
 */
export function generateImagePrompt(articleType: ArticleType, imageTopic: string, context?: ArticleContext): string {
  const subject = getSubject(articleType, context)
  const palette = COLOR_PALETTES[articleType]
  const topicHint = imageTopic ? `\nInspired by: ${imageTopic}.` : ''

  return `${subject}\n\n${palette}\n\n${BASE_STYLE}${topicHint}`
}

// ── Placeholder styles (for CSS-based fallback) ──

const PLACEHOLDER_STYLES: Record<ArticleType, PlaceholderStyle> = {
  funding_deal: { pattern: 'bars', accentColor: '#10B981', icon: 'trending-up' },
  clinical_trial: { pattern: 'hexgrid', accentColor: '#06B6D4', icon: 'flask-conical' },
  market_analysis: { pattern: 'grid', accentColor: '#3B82F6', icon: 'bar-chart-2' },
  company_deep_dive: { pattern: 'circles', accentColor: '#8B5CF6', icon: 'building-2' },
  weekly_roundup: { pattern: 'waves', accentColor: '#F59E0B', icon: 'newspaper' },
  breaking_news: { pattern: 'burst', accentColor: '#EF4444', icon: 'zap' },
  science_essay: { pattern: 'hexgrid', accentColor: '#0891b2', icon: 'microscope' },
  innovation_spotlight: { pattern: 'grid', accentColor: '#d946ef', icon: 'sparkles' },
}

export function getPlaceholderStyle(articleType: ArticleType): PlaceholderStyle {
  return PLACEHOLDER_STYLES[articleType] || PLACEHOLDER_STYLES.market_analysis
}
