'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { DraftReply } from './DraftReply'
import { PriorityBadge } from './PriorityBadge'
import { SnoozePicker } from './SnoozePicker'
import { formatRelativeTime } from '@/lib/utils'
import {
  CheckCheck,
  Bell,
  Star,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
} from 'lucide-react'
import type { Thread, ThreadWithDetails } from '@/types'

interface ThreadPanelProps {
  thread: Thread | null
}

export function ThreadPanel({ thread: selectedThread }: ThreadPanelProps) {
  const [thread, setThread] = useState<ThreadWithDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(true)
  const [messagesExpanded, setMessagesExpanded] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showSnoozePicker, setShowSnoozePicker] = useState(false)
  const snoozeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedThread) {
      setThread(null)
      return
    }
    setLoading(true)
    fetch(`/api/threads/${selectedThread.id}`)
      .then((r) => r.json())
      .then((data) => setThread(data.thread ?? null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedThread?.id])

  async function handleAction(action: 'resolve') {
    if (!thread) return
    setActionLoading(action)
    try {
      if (action === 'resolve') {
        await fetch(`/api/threads/${thread.id}/resolve`, { method: 'POST' })
        setThread((t) => t ? { ...t, status: 'resolved' } : null)
      }
    } catch (err) {
      console.error('Action failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (!selectedThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0F0F0F]">
        <p className="text-[#888] text-sm">Select a thread to view details</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 bg-[#0F0F0F] p-6 space-y-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="space-y-2 mt-6">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    )
  }

  if (!thread) return null

  const draftSuggestion = thread.action_suggestions?.[0] ?? null

  return (
    <ScrollArea className="flex-1 bg-[#0F0F0F]">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-[#F5F5F5] font-semibold text-lg leading-snug">
              {thread.subject ?? '(no subject)'}
            </h2>
            <PriorityBadge label={thread.priority_label} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#888] mb-4">
            {thread.participant_emails.slice(0, 3).map((e) => (
              <span key={e} className="bg-[#1A1A1A] px-2 py-0.5 rounded">{e}</span>
            ))}
            {thread.participant_emails.length > 3 && (
              <span className="text-[#888]">+{thread.participant_emails.length - 3} more</span>
            )}
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('resolve')}
              disabled={!!actionLoading || thread.status === 'resolved'}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
              Resolve
            </Button>
            <div ref={snoozeRef} className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSnoozePicker((v) => !v)}
                disabled={thread.status === 'snoozed'}
              >
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                Snooze
              </Button>
              {showSnoozePicker && (
                <SnoozePicker
                  threadId={thread.id}
                  onClose={() => setShowSnoozePicker(false)}
                  onSnoozed={() => {
                    setShowSnoozePicker(false)
                    setThread((t) => t ? { ...t, status: 'snoozed' } : null)
                  }}
                />
              )}
            </div>
            <Button variant="outline" size="sm">
              <Star className="w-3.5 h-3.5 mr-1.5" />
              VIP
            </Button>
          </div>
        </div>

        {/* AI Summary */}
        {thread.ai_summary && (
          <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
              onClick={() => setSummaryExpanded(!summaryExpanded)}
            >
              <span className="flex items-center gap-2">
                <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wide">AI Summary</span>
              </span>
              {summaryExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#888]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#888]" />
              )}
            </button>
            {summaryExpanded && (
              <div className="px-4 pb-4 space-y-3">
                <p className="text-[#F5F5F5] text-sm leading-relaxed">
                  {thread.ai_summary.summary_text}
                </p>
                {thread.ai_summary.key_points && thread.ai_summary.key_points.length > 0 && (
                  <ul className="space-y-1">
                    {thread.ai_summary.key_points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                )}
                {thread.ai_summary.unresolved && (
                  <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-400/10 rounded px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {thread.ai_summary.unresolved}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="border border-[#2A2A2A] rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors"
            onClick={() => setMessagesExpanded(!messagesExpanded)}
          >
            <span>
              {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
            </span>
            {messagesExpanded ? (
              <ChevronUp className="w-4 h-4 text-[#888]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#888]" />
            )}
          </button>
          {messagesExpanded && (
            <div className="divide-y divide-[#2A2A2A]">
              {thread.messages.map((msg) => (
                <div key={msg.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-[#F5F5F5]">
                      {msg.from_name ?? msg.from_email}
                    </span>
                    <span className="text-xs text-[#888]">
                      {formatRelativeTime(msg.sent_at)}
                    </span>
                  </div>
                  <p className="text-sm text-[#888] leading-relaxed whitespace-pre-wrap">
                    {(msg.body_text ?? '').substring(0, 800)}
                    {(msg.body_text ?? '').length > 800 && '...'}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!messagesExpanded && thread.messages.length > 0 && (
            <div className="px-4 py-3 border-t border-[#2A2A2A]">
              <div className="text-sm text-[#888]">
                <span className="font-medium text-[#F5F5F5]">
                  {thread.messages[thread.messages.length - 1]?.from_name ??
                    thread.messages[thread.messages.length - 1]?.from_email}
                </span>{' '}
                {(thread.messages[thread.messages.length - 1]?.body_text ?? '').substring(0, 150)}
              </div>
            </div>
          )}
        </div>

        {/* Draft Reply */}
        {thread.needs_reply && (
          <DraftReply
            thread={thread}
            suggestion={draftSuggestion}
            onDismiss={() => setThread((t) => t ? { ...t, action_suggestions: [] } : null)}
            onRefresh={() => {
              fetch(`/api/threads/${thread.id}`)
                .then((r) => r.json())
                .then((data) => setThread(data.thread ?? null))
                .catch(console.error)
            }}
          />
        )}

        {/* Follow-ups */}
        {thread.follow_ups && thread.follow_ups.length > 0 && (
          <div className="border border-[#2A2A2A] rounded-lg p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[#888] mb-3">
              Follow-ups
            </h4>
            <div className="space-y-2">
              {thread.follow_ups.map((fu) => (
                <div
                  key={fu.id}
                  className="flex items-start gap-2 text-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[#F5F5F5]">{fu.detected_text ?? fu.type}</div>
                    {fu.due_at && (
                      <div className="text-xs text-[#888]">
                        Due {formatRelativeTime(fu.due_at)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
