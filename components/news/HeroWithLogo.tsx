'use client'

import ArticlePlaceholder from '@/components/news/ArticlePlaceholder'
import type { PlaceholderStyle } from '@/lib/article-engine/types'

interface HeroWithLogoProps {
  imageUrl?: string | null
  placeholderStyle?: PlaceholderStyle | null
  headline: string
  companyLogo?: string | null
  companyName?: string | null
  className?: string
  style?: React.CSSProperties
}

export default function HeroWithLogo({
  imageUrl,
  placeholderStyle,
  headline,
  companyLogo,
  companyName,
  className = '',
  style,
}: HeroWithLogoProps) {
  const showCard = !!(companyLogo || companyName)

  const defaultStyle: PlaceholderStyle = {
    pattern: 'bars',
    accentColor: '#059669',
    icon: 'chart',
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Hero image or placeholder */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={headline}
          className="w-full h-full object-cover"
        />
      ) : (
        <ArticlePlaceholder
          style={placeholderStyle || defaultStyle}
          headline={headline}
          className="w-full h-full"
        />
      )}

      {/* Company logo overlay card */}
      {showCard && (
        <div
          className="absolute flex items-center justify-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(38%, 180px)',
            minWidth: 56,
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            borderRadius: 12,
            padding: 'clamp(12px, 3%, 24px) clamp(16px, 4%, 32px)',
          }}
        >
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName || ''}
              style={{
                maxHeight: 48,
                maxWidth: 160,
                objectFit: 'contain',
              }}
            />
          ) : companyName ? (
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 'clamp(32px, 6vw, 48px)',
                height: 'clamp(32px, 6vw, 48px)',
                background: 'var(--color-accent, #059669)',
                color: 'white',
                fontSize: 'clamp(14px, 3vw, 22px)',
                fontWeight: 700,
              }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
