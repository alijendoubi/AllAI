'use client'

import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { initAnalytics, identify } from '@/lib/analytics'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (isLoaded && user) {
      identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      })
    }
  }, [isLoaded, user])

  return <>{children}</>
}
