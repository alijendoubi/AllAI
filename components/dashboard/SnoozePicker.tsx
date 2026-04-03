'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, X } from 'lucide-react'

interface SnoozePickerProps {
  threadId: string
  onClose: () => void
  onSnoozed: () => void
}

const PRESETS = [
  { label: 'Tomorrow morning', value: 'tomorrow' },
  { label: 'In 3 days', value: '3days' },
  { label: 'Next week', value: '1week' },
] as const

export function SnoozePicker({ threadId, onClose, onSnoozed }: SnoozePickerProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [customDate, setCustomDate] = useState('')

  async function snooze(duration: string, custom?: string) {
    setLoading(duration)
    try {
      await fetch(`/api/threads/${threadId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration, customDate: custom }),
      })
      onSnoozed()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg shadow-xl p-2">
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <span className="text-xs font-semibold text-[#888] uppercase tracking-wide flex items-center gap-1.5">
          <Bell className="w-3 h-3" /> Snooze until
        </span>
        <button onClick={onClose} className="text-[#888] hover:text-[#F5F5F5]">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => snooze(p.value)}
          disabled={loading !== null}
          className="w-full text-left px-3 py-2 text-sm text-[#F5F5F5] hover:bg-[#2A2A2A] rounded-md transition-colors disabled:opacity-50"
        >
          {loading === p.value ? 'Snoozing...' : p.label}
        </button>
      ))}

      <div className="border-t border-[#2A2A2A] mt-1 pt-2 px-1">
        <p className="text-xs text-[#888] mb-1.5 px-2">Custom date</p>
        <div className="flex gap-1.5">
          <Input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="flex-1 h-8 text-xs"
            min={new Date().toISOString().split('T')[0]}
          />
          <Button
            size="sm"
            className="h-8 px-2"
            disabled={!customDate || loading !== null}
            onClick={() => snooze('custom', customDate)}
          >
            Set
          </Button>
        </div>
      </div>
    </div>
  )
}
