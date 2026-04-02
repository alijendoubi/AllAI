'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle } from 'lucide-react'

interface SyncStatus {
  syncing: boolean
  completed: boolean
  thread_count: number
  processed_count: number
}

const STAGES = [
  { key: 'reading', label: 'Reading threads from Gmail' },
  { key: 'analyzing', label: 'Analyzing with AI' },
  { key: 'building', label: 'Building your dashboard' },
]

export function SyncProgress() {
  const router = useRouter()
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/status')
        if (res.ok) {
          const data = (await res.json()) as SyncStatus
          setStatus(data)

          if (data.thread_count > 0 && stage === 0) setStage(1)
          if (data.processed_count > 0 && stage < 2) setStage(2)

          if (data.completed) {
            clearInterval(interval)
            setTimeout(() => router.push('/'), 1500)
          }
        }
      } catch {
        // Ignore
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [router, stage])

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
        <h2 className="text-[#F5F5F5] font-semibold text-lg mb-2">
          Syncing your inbox&hellip;
        </h2>
        <p className="text-[#888] text-sm mb-8">This takes about 30-60 seconds</p>

        <div className="space-y-3">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3 text-sm">
              {i < stage ? (
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : i === stage ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#2A2A2A] flex-shrink-0" />
              )}
              <span className={i <= stage ? 'text-[#F5F5F5]' : 'text-[#888]'}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {status && status.processed_count > 0 && (
          <p className="mt-6 text-xs text-indigo-400">
            {status.processed_count} threads ready to view
          </p>
        )}
      </div>
    </div>
  )
}
