'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Mail,
  Bell,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface SyncStatus {
  connected: boolean
  email_address?: string
  last_sync_at?: string
  thread_count?: number
}

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    fetch('/api/sync/status')
      .then((r) => r.json())
      .then(setSyncStatus)
      .catch(console.error)
  }, [])

  async function triggerSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' })
      if (res.ok) {
        setSyncMsg('Sync started — check back in a minute.')
      }
    } catch {
      setSyncMsg('Failed to start sync.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F0F]">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10 space-y-8">
          <div>
            <h1 className="text-xl font-semibold text-[#F5F5F5]">Settings</h1>
            <p className="text-[#888] text-sm mt-1">Manage your account and connected services</p>
          </div>

          {/* Gmail connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-4 h-4 text-indigo-400" />
                Gmail Connection
              </CardTitle>
              <CardDescription>
                Your connected Gmail account and sync status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncStatus?.connected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-sm text-[#F5F5F5] font-medium">{syncStatus.email_address}</p>
                      <p className="text-xs text-[#888]">
                        {syncStatus.thread_count ?? 0} threads synced
                        {syncStatus.last_sync_at && ` · Last synced ${new Date(syncStatus.last_sync_at).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={triggerSync}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Re-sync
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#888]">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">No Gmail account connected</span>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/api/oauth/gmail">Connect Gmail</Link>
                  </Button>
                </div>
              )}
              {syncMsg && (
                <p className="text-xs text-indigo-400">{syncMsg}</p>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4 text-indigo-400" />
                Daily Brief
              </CardTitle>
              <CardDescription>
                Receive a morning email summary of your top priorities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#888]">
                The daily brief is sent at 7am in your local timezone. Configure your timezone from your profile.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Danger zone */}
          <div>
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-4">Danger Zone</h2>
            <Card className="border-red-900/40">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F5F5F5]">Delete account</p>
                    <p className="text-xs text-[#888] mt-0.5">
                      Permanently delete your account and all synced data
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" asChild>
                    <Link href="/account/delete">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete account
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
