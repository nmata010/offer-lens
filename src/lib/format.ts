export function fmt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  const abs = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`
  return `${sign}$${Math.round(abs).toLocaleString()}`
}

export function fmtExact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—"
  return `$${Math.round(n).toLocaleString()}`
}

export function fmtDelta(n: number): string {
  if (!n) return fmt(0)
  return (n > 0 ? "+" : "") + fmt(n)
}

export function fmtPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`
}
