import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('availability') // change if needed
      .select('id')
      .limit(1)

    if (error) {
      console.error('Keep-alive error:', error.message)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
