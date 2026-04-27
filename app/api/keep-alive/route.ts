import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // lightweight ping (doesn't matter if it fails)
    await supabase.from('events').select('id').limit(1)

  } catch (err) {
    console.error('Keep-alive error:', err)
  }

  // ALWAYS return success
  return NextResponse.json({ ok: true })
}
