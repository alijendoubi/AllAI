'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AlertTriangle, MessageSquare, Clock, Bell, Inbox, Search } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/urgent', icon: AlertTriangle, label: 'Urgent' },
  { href: '/needs-reply', icon: MessageSquare, label: 'Reply' },
  { href: '/waiting', icon: Clock, label: 'Waiting' },
  { href: '/follow-ups', icon: Bell, label: 'Follow-ups' },
  { href: '/all', icon: Inbox, label: 'All' },
  { href: '/search', icon: Search, label: 'Search' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-[#0F0F0F] border-t border-[#2A2A2A]">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 text-[10px] gap-1 transition-colors',
              isActive ? 'text-indigo-400' : 'text-[#888]'
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
