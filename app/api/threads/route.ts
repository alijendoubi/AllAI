import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { getThreadsForDashboard, getDashboardCounts } from '@/lib/db/queries/threads'
import { rateLimitUser } from '@/lib/rate-limit'
import type { DashboardView } from '@/types'

const VALID_VIEWS: DashboardView[] = ['urgent', 'needs_reply', 'waiting', 'follow_ups', 'all']

export async function GET(request: NextRequest) {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rl = rateLimitUser(clerkUserId, 'threads', { limit: 120, windowSeconds: 60 })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const searchParams = request.nextUrl.searchParams
  const viewParam = searchParams.get('view') ?? 'all'
  const view: DashboardView = VALID_VIEWS.includes(viewParam as DashboardView)
    ? (viewParam as DashboardView)
    : 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const includeCounts = searchParams.get('counts') === 'true'

  const [threads, counts] = await Promise.all([
    getThreadsForDashboard(user.id, view, limit, offset),
    includeCounts ? getDashboardCounts(user.id) : Promise.resolve(null),
  ])

  return NextResponse.json({ threads, counts })
}
