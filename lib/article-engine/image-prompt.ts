// Article Engine — Hero Image Prompt Generation
// Style: pure abstract, grainy, colorful, no recognizable objects

import type { ArticleType, ArticleContext, PlaceholderStyle } from './types'

const BASE_STYLE = `Extremely abstract. Unrecognizable forms. Pure color and texture. Heavy analog film grain throughout. Deep dramatic shadows. Vibrant saturated colors bleeding into each other. Looks like paint mixed with light. Cannot tell what it is. No objects, no molecules, no DNA, no buildings, no people, no charts, no text, no letters, no words, no numbers. Just beautiful abstract color and grain. Shot on expired Kodak film. 16:9.`

// Each type gets a different color mood — but the SUBJECT is always pure abstraction
const PROMPTS: Record<ArticleType, string[]> = {
  funding_deal: [
    'Liquid gold and deep teal ink swirling together in water. Thick analog grain. Dark edges fading to black.',
    'Warm amber light leaking through cracks in a dark indigo surface. Everything blurred and grainy.',
    'Overlapping sheets of translucent gold and emerald. Out of focus. Heavy grain. Moody darkness at edges.',
    'Streaks of copper and turquoise smeared across black. Like an abstract oil painting photographed on film.',
    'Deep navy darkness with veins of molten gold bleeding upward. Grainy. Atmospheric. Beautiful.',
  ],
  clinical_trial: [
    'Ice blue and white gradients dissolving into deep shadow. Crisp edges meeting soft fog. Heavy grain.',
    'Frozen cyan light trapped in dark glass. Abstract refractions. Everything slightly out of focus and grainy.',
    'Pale blue smoke rising through darkness. Caught in a beam of sterile white light. Film grain throughout.',
    'Shattered ice textures in electric blue against absolute black. Fragments catching light differently.',
    'Cool mint and slate blue watercolor washes bleeding into dark edges. Grainy expired film aesthetic.',
  ],
  market_analysis: [
    'Vertical streaks of blue-green light on black. Like rain on a dark window. Abstract and grainy.',
    'Layers of translucent grey and electric green stacked at angles. Moody. Film grain. Atmospheric.',
    'Dark charcoal surface with hairline cracks of bright green light bleeding through. Grainy texture.',
    'Horizontal bands of deep blue fading to emerald, separated by shadows. Abstract color field. Grain.',
    'Phosphorescent green glow diffusing through dark smoke. No shapes, just gradient and texture.',
  ],
  company_deep_dive: [
    'Deep purple and midnight blue pigments pooling together. Gold flecks scattered throughout. Heavy grain.',
    'Rich violet ink dropped into dark water. Swirling slowly. Shot on 35mm expired film. Warm amber edges.',
    'Layered sheets of plum and indigo light. Depth through transparency. Grainy and moody throughout.',
    'Dark amethyst surface catching warm light from one side. Deep shadow on the other. Film grain.',
    'Purple smoke and amber light mixing in a dark void. Impossible to tell what you are looking at.',
  ],
  weekly_roundup: [
    'Warm sunset palette — burnt orange, deep red, golden yellow — all mixed and bleeding together. Heavy grain.',
    'Abstract watercolor splash of ochre, coral, and amber against a dark umber background. Grainy and warm.',
    'Multiple warm colors layered and overlapping like stained glass photographed out of focus on film.',
    'Terracotta and gold pigments swirling in dark honey. Thick film grain. Warm and atmospheric.',
    'Horizontal gradient from deep red through orange to gold. Grainy. Like a sunset seen through dirty glass.',
  ],
  breaking_news: [
    'Violent slash of white and red light cutting through pitch black. High contrast. Explosive grain.',
    'Red and black collision. Like two liquids meeting. Sharp edge where they touch. Maximum grain.',
    'Flash of crimson light in total darkness. Motion blur. Streak of energy. Grainy and urgent.',
    'Dark surface shattering — bright red light escaping from within. Abstract and chaotic. Heavy grain.',
    'Hot red gradient dissolving into cold black. A boundary of pure energy. Expired film aesthetic.',
  ],
  science_essay: [
    'Deep ocean colors — bioluminescent teal and emerald swimming through absolute darkness. Grainy and ethereal.',
    'Cyan and green light diffusing through dark liquid. Looks alive. Heavy film grain. Dreamy and mysterious.',
    'Swirls of emerald and turquoise pigment in black water. Macro and abstract. Cannot identify. Beautiful grain.',
    'Organic-feeling shapes in teal and jade, all blurred and overlapping. Dark background. Analog grain.',
    'Electric green and deep sea blue gradients. Soft focus. Atmospheric. Like looking into deep water on film.',
  ],
  innovation_spotlight: [
    'Electric violet and hot magenta paint thrown against black. Splashes of neon color. Maximum grain.',
    'Pink and purple neon light bouncing off dark wet surfaces. Abstract reflections. Grainy and vivid.',
    'Magenta, violet, and electric blue inks colliding. Explosive color. Dark backdrop. Film grain throughout.',
    'Bright fuchsia gradient bleeding into deep indigo. Like aurora borealis shot on expired film.',
    'Vivid purple and pink smoke mixing in darkness. Neon edge glow. Cannot tell what it is. Heavy grain.',
  ],
}

/**
 * Generate a purely abstract, grainy, colorful image prompt.
 * No recognizable objects — just beautiful color, texture, and light.
 */
export function generateImagePrompt(articleType: ArticleType, imageTopic: string, context?: ArticleContext): string {
  const typePrompts = PROMPTS[articleType] || PROMPTS.funding_deal
  const subject = typePrompts[Math.floor(Math.random() * typePrompts.length)]
  return `${subject}\n\n${BASE_STYLE}`
}

// ── Placeholder styles (CSS-based fallback) ──

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
