// Clerk handles its own auth routes automatically via the middleware.
// This file satisfies Next.js's requirement for a route handler at this path.
import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({ ok: true })
}

export function POST() {
  return NextResponse.json({ ok: true })
}
