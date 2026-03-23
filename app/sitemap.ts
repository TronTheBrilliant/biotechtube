import { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabase'
import countriesData from '@/data/countries.json'

const SITE_URL = 'https://www.biotechtube.io'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()

  // Static pages with high priority
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/companies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/funding`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/pipeline`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/markets`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  // Country pages
  const countryPages: MetadataRoute.Sitemap = (countriesData as { slug: string }[]).map((c) => ({
    url: `${SITE_URL}/companies/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // All company pages — the SEO goldmine
  let companyPages: MetadataRoute.Sitemap = []
  if (supabase) {
    // Fetch all slugs + updated_at in batches (Supabase caps at 1000 per request)
    let allSlugs: { slug: string; updated_at: string }[] = []
    let offset = 0
    const batchSize = 1000

    while (true) {
      const { data } = await supabase
        .from('companies')
        .select('slug, updated_at')
        .order('slug')
        .range(offset, offset + batchSize - 1)

      if (!data || data.length === 0) break
      allSlugs = allSlugs.concat(data)
      if (data.length < batchSize) break
      offset += batchSize
    }

    companyPages = allSlugs.map((c) => ({
      url: `${SITE_URL}/company/${c.slug}`,
      lastModified: new Date(c.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  }

  return [...staticPages, ...countryPages, ...companyPages]
}
