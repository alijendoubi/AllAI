'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { ThreadCard } from '@/components/dashboard/ThreadCard'
import { ThreadPanel } from '@/components/dashboard/ThreadPanel'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { Thread } from '@/types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Thread[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Thread | null>(null)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.threads ?? [])
          setSearched(true)
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      <Sidebar />

      {/* Search pane */}
      <div className="flex flex-col w-96 border-r border-[#2A2A2A]">
        {/* Search input */}
        <div className="px-4 py-4 border-b border-[#2A2A2A]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search threads..."
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-md pl-9 pr-4 py-2 text-sm text-[#F5F5F5] placeholder:text-[#888] focus:outline-none focus:border-indigo-500"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888] animate-spin" />
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {!searched && !loading && (
            <div className="px-4 py-8 text-center text-[#888] text-sm">
              Type to search your threads
            </div>
          )}
          {searched && results.length === 0 && !loading && (
            <EmptyState
              title="No results"
              description={`No threads matched "${query}"`}
            />
          )}
          {results.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              isSelected={selected?.id === thread.id}
              onClick={() => setSelected(thread)}
            />
          ))}
        </div>
      </div>

      <ThreadPanel thread={selected} />
    </div>
  )
}
