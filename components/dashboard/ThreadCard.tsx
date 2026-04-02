'use client'

import { cn, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils'
import { PriorityBadge } from './PriorityBadge'
import { MessageSquare, Clock, Bell } from 'lucide-react'
import type { Thread } from '@/types'

interface ThreadCardProps {
  thread: Thread & { ai_summary?: { summary_text: string } | null }
  isSelected: boolean
  onClick: () => void
}

export function ThreadCard({ thread, isSelected, onClick }: ThreadCardProps) {
  const primaryEmail = thread.participant_emails.find(
    (e) => !thread.last_reply_by_me_at
  ) ?? thread.participant_emails[0] ?? 'unknown@example.com'

  const displayName = primaryEmail.split('@')[0]
  const initials = getInitials(null, primaryEmail)
  const avatarColor = getAvatarColor(primaryEmail)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-[#2A2A2A] transition-colors focus:outline-none',
        isSelected
          ? 'bg-[#1A1A1A] border-l-2 border-l-indigo-500 pl-3.5'
          : 'hover:bg-[#111] border-l-2 border-l-transparent'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 mt-0.5',
            avatarColor
          )}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          {/* Top row */}
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-[#F5F5F5] text-sm font-medium truncate">
              {displayName}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PriorityBadge label={thread.priority_label} />
              <span className="text-[#888] text-xs">
                {formatRelativeTime(thread.latest_message_at)}
              </span>
            </div>
          </div>

          {/* Subject */}
          <div className="text-[#F5F5F5] text-sm truncate mb-1">
            {thread.subject ?? '(no subject)'}
          </div>

          {/* Summary or snippet */}
          <div className="text-[#888] text-xs line-clamp-2">
            {thread.snippet ?? ''}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-1.5">
            {thread.needs_reply && (
              <span className="flex items-center gap-0.5 text-[10px] text-indigo-400">
                <MessageSquare className="w-3 h-3" />
                Reply needed
              </span>
            )}
            {thread.waiting_on === 'them' && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <Clock className="w-3 h-3" />
                Waiting
              </span>
            )}
            {thread.is_stale && (
              <span className="flex items-center gap-0.5 text-[10px] text-[#888]">
                <Bell className="w-3 h-3" />
                Stale
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
