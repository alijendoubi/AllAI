import { Badge } from '@/components/ui/badge'

interface PriorityBadgeProps {
  label: 'urgent' | 'high' | 'medium' | 'low'
}

export function PriorityBadge({ label }: PriorityBadgeProps) {
  const variantMap = {
    urgent: 'urgent',
    high: 'high',
    medium: 'medium',
    low: 'low',
  } as const

  return (
    <Badge variant={variantMap[label]}>
      {label}
    </Badge>
  )
}
