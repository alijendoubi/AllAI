import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
      <SignIn />
    </div>
  )
}
