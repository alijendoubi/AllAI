'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { MobileNav } from '@/components/dashboard/MobileNav'
import { ThreadList } from '@/components/dashboard/ThreadList'
import { ThreadPanel } from '@/components/dashboard/ThreadPanel'
import type { Thread, DashboardView } from '@/types'

interface DashboardShellProps {
  initialView?: DashboardView
}

export function DashboardShell({ initialView = 'needs_reply' }: DashboardShellProps) {
  const [view] = useState<DashboardView>(initialView)
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [showPanel, setShowPanel] = useState(false)
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

  function handleSelect(thread: Thread) {
    setSelectedThread(thread)
    setShowPanel(true)
  }

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar counts={counts} />
        </div>

        {/* Thread list — full width on mobile, fixed width on desktop */}
        <div className={`flex-1 md:flex-none md:w-96 ${showPanel ? 'hidden md:flex' : 'flex'} flex-col`}>
          <ThreadList
            view={view}
            selectedId={selectedThread?.id ?? null}
            onSelect={handleSelect}
          />
        </div>

        {/* Thread panel — full width on mobile when open */}
        <div className={`flex-1 ${showPanel ? 'flex' : 'hidden md:flex'} flex-col`}>
          {showPanel && (
            <div className="md:hidden flex items-center px-4 py-3 border-b border-[#2A2A2A]">
              <button
                onClick={() => setShowPanel(false)}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                ← Back
              </button>
            </div>
          )}
          <ThreadPanel thread={selectedThread} />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </>
  )
}
