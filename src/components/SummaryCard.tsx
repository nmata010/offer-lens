import { MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CompanyAvatar } from "@/components/CompanyAvatar"
import { fmt } from "@/lib/format"
import { getInitials } from "@/lib/initials"
import { paletteFor } from "@/lib/palette"
import type { CategoryKey, Offer, OfferProjection } from "@/lib/types"

interface SummaryCardProps {
  offer: Offer
  projection: OfferProjection
  bestY1PerCategory: Record<CategoryKey, number>
  isOverallWinner: boolean
  comparisonName?: string
  comparisonY1Total?: number
  onEdit?: () => void
}

export function SummaryCard({
  offer,
  projection,
  isOverallWinner,
  comparisonName,
  comparisonY1Total,
  onEdit,
}: SummaryCardProps) {
  const palette = paletteFor(offer.palette)
  const y1 = projection.perYear[0]
  const y1Total = y1.cash + y1.equity
  const y1Delta =
    comparisonY1Total !== undefined ? y1Total - comparisonY1Total : 0
  const fourYearTc =
    projection.categoryTotals.cash + projection.categoryTotals.equity

  return (
    <Card
      className="p-5 relative overflow-hidden gap-0"
      style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: palette.accent }}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyAvatar
            initials={getInitials(offer.company)}
            color={palette.accent}
            size={36}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 truncate">
              {offer.company}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
              {fmt(offer.cash.base)} base
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit ${offer.company} offer`}
        >
          <MoreHorizontal size={16} />
        </Button>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            Y1 total comp
          </div>
          <div
            className="text-3xl font-semibold tabular-nums text-slate-900 mt-0.5"
            style={{ letterSpacing: "-0.02em" }}
          >
            {fmt(y1Total)}
          </div>
        </div>
        {comparisonName && y1Delta !== 0 && (
          <Badge
            className={
              isOverallWinner
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shrink-0"
                : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-100 shrink-0"
            }
          >
            {isOverallWinner ? "↑" : "↓"} {fmt(Math.abs(y1Delta))}
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-4 text-xs tabular-nums text-slate-500">
        <span>
          Cash{" "}
          <span className="text-slate-900 font-medium">
            {fmt(y1.cash)}
          </span>
        </span>
        <span>
          Equity{" "}
          <span className="text-slate-900 font-medium">
            {fmt(y1.equity)}
          </span>
        </span>
        <span className="ml-auto">
          4-yr{" "}
          <span className="text-slate-900 font-medium">
            {fmt(fourYearTc)}
          </span>
        </span>
      </div>
    </Card>
  )
}
