'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Loader2 } from 'lucide-react'

export default function DeleteAccountPage() {
  const router = useRouter()
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (res.ok) {
        router.push('/?deleted=true')
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete account.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Card className="border-red-900/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              This action is permanent and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#888]">
              Deleting your account will permanently remove:
            </p>
            <ul className="text-sm text-[#888] space-y-1 list-disc list-inside">
              <li>Your profile and preferences</li>
              <li>All synced email threads and messages</li>
              <li>All AI summaries, labels, and drafts</li>
              <li>Your connected Gmail account credentials</li>
            </ul>

            <div className="flex items-start gap-3 pt-2">
              <input
                id="confirm"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <label htmlFor="confirm" className="text-sm text-[#F5F5F5] cursor-pointer">
                I understand this is permanent and want to delete my account
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!confirmed || loading}
                onClick={handleDelete}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Delete my account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
