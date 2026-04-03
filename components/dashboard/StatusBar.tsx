'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, Loader2 } from 'lucide-react'

interface SyncStatus {
  connected: boolean
  syncing: boolean
  completed: boolean
  email_address?: string
  thread_count?: number
  processed_count?: number
}

export function StatusBar() {
  const [status, setStatus] = useState<SyncStatus | null>(null)

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/sync/status')
        if (res.ok) {
          setStatus(await res.json())
        }
      } catch {
        // Ignore
      }
    }
    fetchStatus()
  }, [])

  if (!status || !status.connected) return null

  if (status.syncing) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#888] px-4 py-2 border-t border-[#2A2A2A]">
        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
        <span>Syncing inbox...</span>
        {(status.processed_count ?? 0) > 0 && (
          <span className="text-indigo-400">
            {status.processed_count} threads processed
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs text-[#888] px-4 py-2 border-t border-[#2A2A2A]">
      <CheckCircle className="w-3 h-3 text-emerald-500" />
      <span>{status.email_address}</span>
    </div>
  )
}
