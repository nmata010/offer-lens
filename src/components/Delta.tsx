import { ArrowDown, ArrowUp } from "lucide-react"
import { fmt } from "@/lib/format"
import { cn } from "@/lib/utils"

interface DeltaProps {
  value: number
  size?: "sm" | "lg"
  className?: string
}

export function Delta({ value, size = "sm", className }: DeltaProps) {
  if (!value) return null
  const positive = value > 0
  const Icon = positive ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-medium tabular-nums",
        positive ? "text-emerald-600" : "text-rose-600",
        size === "lg" ? "text-sm" : "text-xs",
        className,
      )}
    >
      <Icon size={size === "lg" ? 14 : 12} strokeWidth={2.25} />
      {fmt(Math.abs(value))}
    </span>
  )
}
