import 'dotenv/config'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Extract project ref from URL
const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]

async function runSQL(sql: string) {
  // Use the Supabase Management API to run SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  return response
}

async function main() {
  console.log('Running schema against Supabase...')
  console.log(`Project: ${projectRef}\n`)

  const schemaPath = resolve(__dirname, 'schema.sql')
  const sql = readFileSync(schemaPath, 'utf-8')

  // Split into individual statements and run each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    // Use raw postgres via the pg endpoint
    const cleanStmt = stmt.replace(/\n/g, ' ').slice(0, 80)
    console.log(`  Running: ${cleanStmt}...`)
  }

  // Actually, we'll just post the full SQL to the database
  // via the Supabase pg endpoint
  const pgUrl = `https://${projectRef}.supabase.co/pg/query`

  const response = await fetch(pgUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('Failed:', response.status, text)

    // Fallback: try individual statements
    console.log('\nTrying individual statements...\n')

    for (const stmt of statements) {
      const r = await fetch(pgUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt + ';' }),
      })
      const shortStmt = stmt.replace(/\n/g, ' ').slice(0, 60)
      if (r.ok) {
        console.log(`  ✅ ${shortStmt}...`)
      } else {
        const err = await r.text()
        console.log(`  ❌ ${shortStmt}... → ${err.slice(0, 100)}`)
      }
    }
  } else {
    console.log('\n✅ Schema created successfully!')
  }
}

main().catch(console.error)
