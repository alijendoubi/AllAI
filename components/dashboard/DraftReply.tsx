'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, ExternalLink, X, Loader2 } from 'lucide-react'
import type { Thread, ActionSuggestion } from '@/types'

interface DraftReplyProps {
  thread: Thread
  suggestion: ActionSuggestion | null
  onDismiss: () => void
  onRefresh: () => void
}

export function DraftReply({ thread, suggestion, onDismiss, onRefresh }: DraftReplyProps) {
  const [draft, setDraft] = useState(suggestion?.content ?? '')
  const [loading, setLoading] = useState(false)

  async function handleGenerateDraft() {
    setLoading(true)
    try {
      const res = await fetch(`/api/threads/${thread.id}/draft`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setDraft(data.draft?.draft ?? '')
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to generate draft:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build Gmail compose URL
  const primaryEmail = thread.participant_emails.find(
    (e) => !thread.last_reply_by_me_at
  ) ?? thread.participant_emails[0] ?? ''

  const subject = `Re: ${thread.subject ?? ''}`
  const gmailComposeUrl = `https://mail.google.com/mail/u/0/?view=cm&to=${encodeURIComponent(primaryEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`

  if (!suggestion && !loading) {
    return (
      <div className="border border-[#2A2A2A] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Draft Reply
          </div>
        </div>
        <Button
          onClick={handleGenerateDraft}
          variant="outline"
          size="sm"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate draft with AI
        </Button>
      </div>
    )
  }

  return (
    <div className="border border-indigo-500/30 rounded-lg p-4 bg-indigo-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[#F5F5F5]">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          Suggested reply
        </div>
        <button
          onClick={onDismiss}
          className="text-[#888] hover:text-[#F5F5F5] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        className="mb-3 text-sm"
        placeholder="Edit the draft before sending..."
      />

      <div className="flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <a href={gmailComposeUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Open in Gmail
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleGenerateDraft}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
