import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-indigo-600 text-white",
        secondary: "border-transparent bg-[#2A2A2A] text-[#888]",
        destructive: "border-transparent bg-red-600 text-white",
        outline: "border-[#2A2A2A] text-[#888]",
        urgent: "border-transparent bg-red-900/50 text-red-400",
        high: "border-transparent bg-orange-900/50 text-orange-400",
        medium: "border-transparent bg-yellow-900/50 text-yellow-400",
        low: "border-transparent bg-[#2A2A2A] text-[#6B7280]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
