import { Company } from '@/lib/types'

const SITE_URL = 'https://www.biotechtube.com'

export function CompanyJsonLd({ company }: { company: Company }) {
  const logoUrl = company.logoUrl || (company.website
    ? `https://img.logo.dev/${new URL(company.website).hostname}?token=pk_FNHUWoZORpiR_7j_vzFnmQ`
    : undefined)

  // Organization schema — this is what makes Google show rich results
  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company.name,
    url: company.website || `${SITE_URL}/company/${company.slug}`,
    ...(logoUrl && { logo: logoUrl }),
    ...(company.description && { description: company.description }),
    ...(company.founded && { foundingDate: String(company.founded) }),
    ...(company.city && company.country && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: company.city,
        addressCountry: company.country,
      },
    }),
    ...(company.ticker && {
      tickerSymbol: company.ticker,
    }),
    ...(company.employees && {
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: company.employees,
      },
    }),
    ...(company.focus.length > 0 && {
      knowsAbout: company.focus,
    }),
  }

  // BreadcrumbList — helps Google understand site hierarchy
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Companies',
        item: `${SITE_URL}/companies`,
      },
      ...(company.country ? [{
        '@type': 'ListItem',
        position: 3,
        name: company.country,
        item: `${SITE_URL}/companies/${company.country.toLowerCase().replace(/\s+/g, '-')}`,
      }] : []),
      {
        '@type': 'ListItem',
        position: company.country ? 4 : 3,
        name: company.name,
        item: `${SITE_URL}/company/${company.slug}`,
      },
    ],
  }

  // WebPage schema — tells Google this is a profile page about the company
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${company.name} — Biotech Company Profile`,
    url: `${SITE_URL}/company/${company.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'BiotechTube',
      url: SITE_URL,
    },
    about: {
      '@type': 'Organization',
      name: company.name,
    },
    ...(company.description && { description: company.description }),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
    </>
  )
}
