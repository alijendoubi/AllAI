export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] px-8 py-16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5] mb-4">Privacy Policy</h1>
      <p className="text-[#888] mb-4">Last updated: April 2025</p>
      <div className="space-y-4 text-[#888] text-sm leading-relaxed">
        <p>
          InboxPilot connects to your Gmail account with read-only access to help you triage and
          respond to emails more efficiently. We never send, delete, or modify emails on your behalf
          without your explicit action.
        </p>
        <h2 className="text-[#F5F5F5] font-semibold text-base mt-6">Data we access</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Email metadata (subject, sender, recipient, date)</li>
          <li>Email body content for AI analysis</li>
          <li>Gmail labels</li>
        </ul>
        <h2 className="text-[#F5F5F5] font-semibold text-base mt-6">Data storage</h2>
        <p>
          Email content is stored encrypted in our database and used solely to provide the
          InboxPilot service. We do not sell or share your data with third parties except as
          necessary to operate the service (OpenAI for AI analysis, Supabase for storage).
        </p>
        <h2 className="text-[#F5F5F5] font-semibold text-base mt-6">Data deletion</h2>
        <p>
          You can delete your account and all associated data at any time from the Settings page.
        </p>
        <h2 className="text-[#F5F5F5] font-semibold text-base mt-6">Contact</h2>
        <p>For privacy inquiries, contact privacy@inboxpilot.com</p>
      </div>
    </div>
  )
}
