interface StatBarProps {
  value: number
  max: number
  color: string
}

export function StatBar({ value, max, color }: StatBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
