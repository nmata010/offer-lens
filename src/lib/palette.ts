import type { PaletteId } from "./types"

export interface Palette {
  id: PaletteId
  accent: string
  soft: string
  ring: string
  text700: string
  chartShades: [string, string, string, string]
  tw: {
    bg50: string
    text700: string
    border200: string
    dot: string
  }
}

// All Tailwind class strings are static literals so the JIT compiler can pick them up.
export const PALETTES: Record<PaletteId, Palette> = {
  sky: {
    id: "sky",
    accent: "#0ea5e9",
    soft: "#e0f2fe",
    ring: "#bae6fd",
    text700: "#0369a1",
    chartShades: ["#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"],
    tw: {
      bg50: "bg-sky-50",
      text700: "text-sky-700",
      border200: "border-sky-200",
      dot: "bg-sky-500",
    },
  },
  violet: {
    id: "violet",
    accent: "#8b5cf6",
    soft: "#ede9fe",
    ring: "#ddd6fe",
    text700: "#6d28d9",
    chartShades: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"],
    tw: {
      bg50: "bg-violet-50",
      text700: "text-violet-700",
      border200: "border-violet-200",
      dot: "bg-violet-500",
    },
  },
  emerald: {
    id: "emerald",
    accent: "#10b981",
    soft: "#d1fae5",
    ring: "#a7f3d0",
    text700: "#047857",
    chartShades: ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
    tw: {
      bg50: "bg-emerald-50",
      text700: "text-emerald-700",
      border200: "border-emerald-200",
      dot: "bg-emerald-500",
    },
  },
  amber: {
    id: "amber",
    accent: "#f59e0b",
    soft: "#fef3c7",
    ring: "#fde68a",
    text700: "#b45309",
    chartShades: ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a"],
    tw: {
      bg50: "bg-amber-50",
      text700: "text-amber-700",
      border200: "border-amber-200",
      dot: "bg-amber-500",
    },
  },
}

export const DEFAULT_PALETTE_ORDER: PaletteId[] = ["sky", "violet", "emerald", "amber"]

export function paletteFor(id: PaletteId): Palette {
  return PALETTES[id] ?? PALETTES.sky
}
