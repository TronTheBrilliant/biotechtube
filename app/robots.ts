import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/login', '/signup', '/forgot-password', '/claim/'],
      },
    ],
    sitemap: 'https://www.biotechtube.com/sitemap.xml',
  }
}
