'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { ThreadList } from '@/components/dashboard/ThreadList'
import { ThreadPanel } from '@/components/dashboard/ThreadPanel'
import type { Thread, DashboardView } from '@/types'

interface DashboardShellProps {
  initialView?: DashboardView
}

export function DashboardShell({ initialView = 'needs_reply' }: DashboardShellProps) {
  const [view, setView] = useState<DashboardView>(initialView)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [counts, setCounts] = useState<{
    urgent: number
    needs_reply: number
    waiting: number
    follow_ups: number
  } | undefined>()

  useEffect(() => {
    fetch('/api/threads?counts=true&limit=1')
      .then((r) => r.json())
      .then((data) => {
        if (data.counts) setCounts(data.counts)
      })
      .catch(console.error)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      <Sidebar counts={counts} />
      <ThreadList
        view={view}
        selectedId={selectedThread?.id ?? null}
        onSelect={setSelectedThread}
      />
      <ThreadPanel thread={selectedThread} />
    </div>
  )
}
