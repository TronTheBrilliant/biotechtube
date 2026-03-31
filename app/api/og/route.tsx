import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'BiotechTube';
  const subtitle = searchParams.get('subtitle') || 'Global Biotech Intelligence';
  const type = searchParams.get('type') || 'default';
  const value = searchParams.get('value') || '';

  // Type-specific accent colors
  const accentColor = {
    company: '#0ea5e9',
    sector: '#8b5cf6',
    country: '#f59e0b',
    funding: '#10b981',
    product: '#ec4899',
    pipeline: '#14b8a6',
    events: '#f59e0b',
    default: '#14b8a6',
  }[type] || '#14b8a6';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 70px',
          background: 'linear-gradient(135deg, #0f2a1f 0%, #059669 50%, #145a47 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top: Logo / brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            🧬
          </div>
          <span
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            BiotechTube
          </span>
          {type !== 'default' && (
            <span
              style={{
                color: accentColor,
                fontSize: '14px',
                fontWeight: 600,
                background: 'rgba(255,255,255,0.1)',
                padding: '4px 12px',
                borderRadius: '20px',
                marginLeft: '8px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {type}
            </span>
          )}
        </div>

        {/* Center: Title + Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              color: '#ffffff',
              fontSize: title.length > 30 ? '52px' : '64px',
              fontWeight: 800,
              letterSpacing: '-2px',
              lineHeight: 1.1,
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.65)',
              fontSize: '26px',
              fontWeight: 500,
              letterSpacing: '-0.5px',
            }}
          >
            {subtitle}
          </div>
          {value && (
            <div
              style={{
                color: accentColor,
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '-1px',
                marginTop: '4px',
              }}
            >
              {value}
            </div>
          )}
        </div>

        {/* Bottom: URL */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '18px',
              fontWeight: 500,
            }}
          >
            biotechtube.io
          </span>
          <div
            style={{
              display: 'flex',
              gap: '6px',
            }}
          >
            {[accentColor, '#ffffff30', '#ffffff20'].map((c, i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: c,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
