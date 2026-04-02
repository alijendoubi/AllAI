'use client'

import { useEffect, useState } from 'react'
import { ThreadCard } from './ThreadCard'
import { EmptyState } from './EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Thread, DashboardView } from '@/types'

interface ThreadListProps {
  view: DashboardView
  selectedId: string | null
  onSelect: (thread: Thread) => void
}

const VIEW_LABELS: Record<DashboardView, { title: string; empty: { title: string; desc: string } }> = {
  urgent: {
    title: 'Urgent',
    empty: { title: 'No urgent threads', desc: 'You\'re all caught up on high-priority emails.' },
  },
  needs_reply: {
    title: 'Needs Reply',
    empty: { title: 'Inbox zero on replies', desc: 'No threads are waiting for your response.' },
  },
  waiting: {
    title: 'Waiting on Others',
    empty: { title: 'Nothing waiting', desc: 'No threads are awaiting a reply from others.' },
  },
  follow_ups: {
    title: 'Follow-ups Due',
    empty: { title: 'No follow-ups due', desc: 'No follow-up actions are due today.' },
  },
  all: {
    title: 'All Threads',
    empty: { title: 'No threads yet', desc: 'Connect Gmail to start syncing your inbox.' },
  },
}

export function ThreadList({ view, selectedId, onSelect }: ThreadListProps) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/threads?view=${view}`)
      .then((r) => r.json())
      .then((data) => {
        setThreads(data.threads ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [view])

  const meta = VIEW_LABELS[view]

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] border-r border-[#2A2A2A] w-96">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#2A2A2A]">
        <h2 className="text-[#F5F5F5] font-semibold">{meta.title}</h2>
        {!loading && (
          <p className="text-[#888] text-xs mt-0.5">
            {threads.length} thread{threads.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 border-b border-[#2A2A2A]">
                <div className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : threads.length === 0 ? (
          <EmptyState title={meta.empty.title} description={meta.empty.desc} />
        ) : (
          threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isSelected={selectedId === thread.id}
              onClick={() => onSelect(thread)}
            />
          ))
        )}
      </ScrollArea>
    </div>
  )
}
