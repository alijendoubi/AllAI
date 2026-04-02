import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Mail, Shield, Zap, Eye } from 'lucide-react'

export function ConnectGmail() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] mb-2">InboxPilot</h1>
          <p className="text-[#888] text-base">Never miss a client follow-up</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6">
          <h2 className="text-[#F5F5F5] font-semibold mb-4">
            Connect your Gmail to get started
          </h2>

          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-3 text-sm text-[#888]">
              <Zap className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <span>AI-powered priority sorting — see what actually matters first</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-[#888]">
              <Eye className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <span>Auto-detect threads needing a reply, follow-ups, and waiting-on items</span>
            </li>
            <li className="flex items-start gap-3 text-sm text-[#888]">
              <Shield className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
              <span>AI-drafted replies tailored to your writing style</span>
            </li>
          </ul>

          <Button asChild className="w-full" size="lg">
            <Link href="/api/oauth/gmail">
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-[#888]">
          <Shield className="w-3.5 h-3.5 inline mr-1" />
          Read-only access. We never send email without your explicit approval.
        </p>
      </div>
    </div>
  )
}
