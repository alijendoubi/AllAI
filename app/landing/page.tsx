import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Zap,
  Eye,
  Shield,
  Clock,
  Sparkles,
  CheckCircle,
  ArrowRight,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Zap,
    title: 'Priority triage, automatically',
    description:
      'AI scores every thread by urgency, sender importance, detected deadlines, and how long it\'s been waiting. Urgent items surface first — always.',
  },
  {
    icon: Eye,
    title: 'See only what needs you',
    description:
      'Separate views for threads needing a reply, items you\'re waiting on, and follow-ups due today. No more scanning hundreds of emails.',
  },
  {
    icon: Sparkles,
    title: 'Drafts in your voice',
    description:
      'AI reads your previous emails to match your tone, then drafts replies you can edit and send in one click. You stay in control.',
  },
  {
    icon: Clock,
    title: 'Never drop the ball again',
    description:
      'Auto-detects threads where someone hasn\'t replied in 3 days, promises you made, and deadlines mentioned in emails.',
  },
]

const SOCIAL_PROOF = [
  'I missed a €40k deal because I lost track of a follow-up. Never again.',
  'Cut my inbox time from 2 hours to 20 minutes. The priority view alone is worth it.',
  'The draft replies actually sound like me. I barely edit them.',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2A] max-w-6xl mx-auto">
        <span className="font-semibold text-lg tracking-tight">InboxPilot</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/sign-up">Get started free</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 rounded-full px-3 py-1 mb-6">
          <Sparkles className="w-3 h-3" />
          Powered by GPT-4o
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-6">
          Stop losing deals because<br className="hidden sm:block" /> you forgot to follow up
        </h1>
        <p className="text-lg text-[#888] max-w-2xl mx-auto mb-10 leading-relaxed">
          InboxPilot connects to your Gmail, uses AI to surface what actually matters, and drafts replies in your voice — so you spend less time managing email and more time closing.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" className="w-full sm:w-auto" asChild>
            <Link href="/api/oauth/gmail">
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail — it&apos;s free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-[#888] flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Read-only. Never sends without your approval.
          </p>
        </div>
      </section>

      {/* Social proof */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {SOCIAL_PROOF.map((quote, i) => (
            <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <p className="text-sm text-[#888] leading-relaxed">&ldquo;{quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-12">
          Everything you need to own your inbox
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6"
            >
              <div className="w-9 h-9 bg-indigo-600/20 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[#888] leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold mb-12">Up and running in 2 minutes</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Connect Gmail', desc: 'One click OAuth. Read-only access.' },
            { step: '2', title: 'AI processes your inbox', desc: 'Summaries, priorities, and drafts ready in 60 seconds.' },
            { step: '3', title: 'Inbox zero, actually', desc: 'Triage from your dashboard. Reply with one click.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex flex-col items-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm mb-4">
                {step}
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-[#888]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <div className="bg-indigo-600/10 border border-indigo-600/30 rounded-2xl p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to stop losing follow-ups?</h2>
          <p className="text-[#888] mb-6">Connect your Gmail and get your first AI-processed inbox in under a minute.</p>
          <Button size="lg" asChild>
            <Link href="/api/oauth/gmail">
              <Mail className="w-4 h-4 mr-2" />
              Connect Gmail — free
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A2A2A] py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#888]">
          <span>© {new Date().getFullYear()} InboxPilot</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[#F5F5F5]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#F5F5F5]">Terms</Link>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Read-only Gmail access
          </div>
        </div>
      </footer>
    </div>
  )
}
