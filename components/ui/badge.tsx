import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
        secondary:
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
        destructive:
          "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80",
        outline: "text-slate-950",
        // Status specific variants
        pending: "border-transparent bg-amber-100 text-amber-800",
        open: "border-transparent bg-emerald-100 text-emerald-800",
        approved: "border-transparent bg-blue-100 text-blue-800",
        assigned: "border-transparent bg-indigo-100 text-indigo-800",
        picked_up: "border-transparent bg-purple-100 text-purple-800",
        in_transit: "border-transparent bg-fuchsia-100 text-fuchsia-800",
        delivered: "border-transparent bg-emerald-100 text-emerald-800",
        completed: "border-transparent bg-slate-100 text-slate-800",
        cancelled: "border-transparent bg-slate-100 text-slate-600",
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
