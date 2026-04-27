import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
  const start = Date.now()

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase
      .from('events')
      .select('id')
      .limit(1)

    const latency = Date.now() - start

    if (error) {
      return NextResponse.json({
        ok: false,
        db: 'down',
        latency
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      db: 'up',
      latency
    })

  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: 'unexpected'
    }, { status: 500 })
  }
}
