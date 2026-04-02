import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/db'
import { generateEmbedding } from '@/lib/ai'

export async function GET(request: NextRequest) {
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

  const query = request.nextUrl.searchParams.get('q')
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ threads: [] })
  }

  // Pass 1: Full-text search
  const fulltextResults = await supabaseAdmin
    .from('threads')
    .select('*')
    .eq('user_id', user.id)
    .textSearch(
      'subject',
      query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join(' | '),
      { type: 'websearch' }
    )
    .limit(15)

  const seenIds = new Set<string>()
  const threads = []

  for (const t of fulltextResults.data ?? []) {
    seenIds.add(t.id)
    threads.push(t)
  }

  // Pass 2: Semantic search via embeddings
  try {
    const embedding = await generateEmbedding(query)
    if (embedding) {
      const { data: semanticResults } = await supabaseAdmin.rpc(
        'search_threads_semantic',
        {
          query_embedding: embedding,
          user_id_param: user.id,
          match_count: 10,
        }
      )

      for (const t of semanticResults ?? []) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id)
          threads.push(t)
        }
      }
    }
  } catch {
    // Semantic search is optional — if it fails, return fulltext results
  }

  return NextResponse.json({ threads: threads.slice(0, 20) })
}
