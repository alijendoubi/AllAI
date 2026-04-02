import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { updateThreadStatus } from '@/lib/db/queries/threads'
import { z } from 'zod'

const SnoozeBodySchema = z.object({
  duration: z.enum(['tomorrow', '3days', '1week', 'custom']),
  customDate: z.string().optional(),
})

function calculateSnoozedUntil(
  duration: 'tomorrow' | '3days' | '1week' | 'custom',
  customDate?: string
): Date {
  const now = new Date()
  switch (duration) {
    case 'tomorrow': {
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow
    }
    case '3days': {
      const d = new Date(now)
      d.setDate(d.getDate() + 3)
      d.setHours(9, 0, 0, 0)
      return d
    }
    case '1week': {
      const d = new Date(now)
      d.setDate(d.getDate() + 7)
      d.setHours(9, 0, 0, 0)
      return d
    }
    case 'custom': {
      if (!customDate) {
        throw new Error('customDate required for custom duration')
      }
      return new Date(customDate)
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SnoozeBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { duration, customDate } = parsed.data
  const snoozedUntil = calculateSnoozedUntil(duration, customDate)

  await updateThreadStatus(id, user.id, 'snoozed', snoozedUntil)

  await supabaseAdmin.from('audit_logs').insert({
    user_id: user.id,
    action: 'thread_snoozed',
    resource: 'threads',
    resource_id: id,
    metadata: { duration, snoozed_until: snoozedUntil.toISOString() },
  })

  return NextResponse.json({ ok: true, snoozed_until: snoozedUntil.toISOString() })
}
