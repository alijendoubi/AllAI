'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  MessageSquare,
  Clock,
  Bell,
  Inbox,
  Search,
  Settings,
  Mail,
} from 'lucide-react'
import { StatusBar } from './StatusBar'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number
}

interface SidebarProps {
  counts?: {
    urgent: number
    needs_reply: number
    waiting: number
    follow_ups: number
  }
}

export function Sidebar({ counts }: SidebarProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Today',
      icon: Mail,
      count: (counts?.urgent ?? 0) + (counts?.needs_reply ?? 0),
    },
    { href: '/urgent', label: 'Urgent', icon: AlertTriangle, count: counts?.urgent },
    {
      href: '/needs-reply',
      label: 'Needs Reply',
      icon: MessageSquare,
      count: counts?.needs_reply,
    },
    {
      href: '/waiting',
      label: 'Waiting on Others',
      icon: Clock,
      count: counts?.waiting,
    },
    {
      href: '/follow-ups',
      label: 'Follow-ups Due',
      icon: Bell,
      count: counts?.follow_ups,
    },
    { href: '/all', label: 'All Threads', icon: Inbox },
  ]

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] border-r border-[#2A2A2A] w-60">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2A2A2A]">
        <h1 className="text-[#F5F5F5] font-semibold text-base tracking-tight">
          InboxPilot
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-indigo-600/20 text-[#F5F5F5] border-l-2 border-indigo-500'
                  : 'text-[#888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A]'
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                {item.label}
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={cn(
                    'text-xs font-medium rounded-full px-1.5 py-0.5',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#2A2A2A] text-[#888]'
                  )}
                >
                  {item.count > 99 ? '99+' : item.count}
                </span>
              )}
            </Link>
          )
        })}

        {/* Search */}
        <Link
          href="/search"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors border-l-2',
            pathname === '/search'
              ? 'bg-indigo-600/20 text-[#F5F5F5] border-indigo-500'
              : 'text-[#888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] border-transparent'
          )}
        >
          <Search className="w-4 h-4" />
          Search
        </Link>
      </nav>

      {/* Bottom */}
      <div className="mt-auto">
        <StatusBar />
        <div className="px-2 py-2 border-t border-[#2A2A2A]">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors border-l-2',
              pathname === '/settings'
                ? 'bg-indigo-600/20 text-[#F5F5F5] border-indigo-500'
                : 'text-[#888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] border-transparent'
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
