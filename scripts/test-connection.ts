import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.from('companies').select('count').limit(1)
  if (error && error.message.includes('does not exist')) {
    console.log('✅ Connection works! Tables not created yet.')
  } else if (error) {
    console.log('Error:', error.message)
  } else {
    console.log('✅ Connection works! Table exists.', data)
  }
}

main().catch(console.error)
