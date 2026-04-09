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
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            boxShadow: '0 4px 32px rgba(0, 0, 0, 0.2)',
            borderRadius: 0,
            padding: 'clamp(18px, 5%, 36px)',
          }}
        >
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName || ''}
              style={{
                height: 'clamp(52px, 12vw, 88px)',
                width: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : companyName ? (
            <div
              className="flex items-center justify-center"
              style={{
                width: 'clamp(56px, 12vw, 88px)',
                height: 'clamp(56px, 12vw, 88px)',
                background: 'var(--color-accent, #059669)',
                color: 'white',
                fontSize: 'clamp(20px, 4vw, 32px)',
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
