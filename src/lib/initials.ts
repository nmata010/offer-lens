export function getInitials(name: string): string {
  const trimmed = (name ?? "").trim()
  if (!trimmed) return "?"
  const words = trimmed.split(/\s+/)
  if (words.length === 1) {
    return words[0].slice(0, 2).replace(/^./, (c) => c.toUpperCase())
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}
