import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 px-8 text-center">
      <Inbox className="w-12 h-12 text-[#2A2A2A] mb-4" />
      <h3 className="text-[#F5F5F5] font-medium mb-1">{title}</h3>
      <p className="text-[#888] text-sm max-w-xs">{description}</p>
    </div>
  )
}
