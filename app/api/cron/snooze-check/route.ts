import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/db'

export async function GET() {
  // Wake snoozed threads whose snooze period has expired
  const { data, error } = await supabaseAdmin
    .from('threads')
    .update({
      status: 'open',
      snoozed_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'snoozed')
    .lte('snoozed_until', new Date().toISOString())
    .select('id')

  if (error) {
    console.error('Snooze check error:', error)
    return NextResponse.json({ ok: false, error: error.message })
  }

  return NextResponse.json({ ok: true, woken: data?.length ?? 0 })
}
