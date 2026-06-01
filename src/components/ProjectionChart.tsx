import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ReactElement } from "react"
import { Card } from "@/components/ui/card"
import { fmt } from "@/lib/format"
import {
  BENEFIT_COST_LABELS,
  BENEFIT_GAIN_LABELS,
  benefitSegmentsForOffer,
  type BenefitCostKey,
  type BenefitGainKey,
  selectedPlan,
} from "@/lib/benefits"
import { COVERAGE_TIER_LABELS, type Offer } from "@/lib/types"

type ChartKey = BenefitGainKey | BenefitCostKey

const CHART_COLORS: Record<ChartKey, string> = {
  match401k: "#16a34a",
  hsa: "#2563eb",
  parentalLeave: "#ec4899",
  pto: "#6366f1",
  stipends: "#eab308",
  premiums: "#ef4444",
  deductible: "#f97316",
  oopMax: "#b91c1c",
}

interface ProjectionChartProps {
  offers: Offer[]
  onSelectPlan?: (offerId: string, planId: string) => void
  // When rendering multiple charts side-by-side, pass shared maxes so the
  // Y-axis ranges match across cards. Both are positive numbers in raw dollars.
  sharedPositiveMax?: number
  sharedCostMaxAbs?: number
}

function yearChartKey(yearIdx: number, k: ChartKey) {
  return `y${yearIdx}__${k}`
}

export function ProjectionChart({
  offers,
  onSelectPlan,
  sharedPositiveMax,
  sharedCostMaxAbs,
}: ProjectionChartProps) {
  const visibleYears = useMemo(() => [0], [])
  const chartTitle =
    offers.length === 1 ? `${offers[0].company} benefits` : "Benefits"

  const INCOME_SHARE = 0.7

  const {
    chartData,
    activePos,
    activeNeg,
    domainTop,
    domainBottom,
    incomeTicks,
    costTicks,
    costScale,
    groupAnnotations,
  } = useMemo(() => {
    type Raw = {
      offerId: string
      gains: Record<BenefitGainKey, number>
      costs: Record<BenefitCostKey, number>
    }
    const rawByYear: Raw[][] = []
    let activeGainKeys: BenefitGainKey[] = []
    let activeCostKeys: BenefitCostKey[] = []
    let max = 0
    let costMaxAbs = 0

    for (const y of visibleYears) {
      const perOffer: Raw[] = []
      for (const offer of offers) {
        const segments = benefitSegmentsForOffer(offer, y)
        activeGainKeys = segments.gains.map((segment) => segment.key)
        activeCostKeys = segments.costs.map((segment) => segment.key)
        const gains = Object.fromEntries(
          segments.gains.map((segment) => [
            segment.key,
            Math.round(segment.value),
          ]),
        ) as Record<BenefitGainKey, number>
        const costs = Object.fromEntries(
          segments.costs.map((segment) => [
            segment.key,
            Math.round(segment.value),
          ]),
        ) as Record<BenefitCostKey, number>

        perOffer.push({ offerId: offer.id, gains, costs })
        if (segments.gainTotal > max) max = segments.gainTotal
        if (segments.costTotal > costMaxAbs) costMaxAbs = segments.costTotal
      }
      rawByYear.push(perOffer)
    }

    const effMax = Math.max(max, sharedPositiveMax ?? 0)
    const effCostMaxAbs = Math.max(costMaxAbs, sharedCostMaxAbs ?? 0)
    const top = Math.ceil((effMax * 1.08) / 10000) * 10000 || 1
    const negSpan = (top * (1 - INCOME_SHARE)) / INCOME_SHARE
    const scale = effCostMaxAbs > 0 ? negSpan / effCostMaxAbs : 1

    // One row per offer; year-by-year segments live as dataKeys within each row.
    const rows = offers.map((offer, oi) => {
      const row: Record<string, number | string> = {
        offerId: offer.id,
        company: offer.company,
      }
      visibleYears.forEach((_, yi) => {
        const raw = rawByYear[yi][oi]
        if (!raw) return
        for (const k of activeGainKeys) row[yearChartKey(yi, k)] = raw.gains[k]
        // Negative values are scaled down so they fit into the lower
        // (1 - INCOME_SHARE) fraction of the chart. Tooltip / tick labels
        // unscale to show the real dollar amounts.
        for (const k of activeCostKeys)
          row[yearChartKey(yi, k)] = -raw.costs[k] * scale
      })
      return row
    })

    const incomeTicks = [0, top / 4, top / 2, (top * 3) / 4, top].map((v) => Math.round(v))
    // Cost ticks expressed in the *scaled* income-axis coordinate space.
    const costTickRealValues =
      effCostMaxAbs > 0 ? [effCostMaxAbs, effCostMaxAbs / 2] : []
    const costTicks = costTickRealValues.map((v) => Math.round(-v * scale))
    const firstOfferSegments = offers[0]
      ? benefitSegmentsForOffer(offers[0], visibleYears[0])
      : null
    const firstGains = Object.fromEntries(
      firstOfferSegments?.gains.map((segment) => [
        segment.key,
        Math.round(segment.value),
      ]) ?? [],
    ) as Partial<Record<BenefitGainKey, number>>
    const firstCosts = Object.fromEntries(
      firstOfferSegments?.costs.map((segment) => [
        segment.key,
        Math.round(segment.value),
      ]) ?? [],
    ) as Partial<Record<BenefitCostKey, number>>

    const cashValue =
      (firstGains.match401k ?? 0) +
      (firstGains.hsa ?? 0) +
      (firstGains.stipends ?? 0)
    const timeValue = (firstGains.pto ?? 0) + (firstGains.parentalLeave ?? 0)
    const expectedCost = (firstCosts.premiums ?? 0) + (firstCosts.deductible ?? 0)
    const maxRisk = firstCosts.oopMax ?? 0
    const annotations: BenefitGroupAnnotation[] =
      offers.length === 1
        ? [
            {
              key: "cashValue",
              label: "Cash value",
              total: cashValue,
              start: 0,
              end: cashValue,
            },
            {
              key: "timeValue",
              label: "Time value",
              total: timeValue,
              start: cashValue,
              end: cashValue + timeValue,
            },
            {
              key: "expectedCost",
              label: "Expected cost",
              total: expectedCost,
              start: 0,
              end: -expectedCost * scale,
            },
            {
              key: "maxRisk",
              label: "Max risk",
              total: maxRisk,
              start: -expectedCost * scale,
              end: -(expectedCost + maxRisk) * scale,
            },
          ].filter((annotation) => annotation.total > 0)
        : []

    return {
      chartData: rows,
      activePos: activeGainKeys,
      activeNeg: activeCostKeys,
      domainTop: top,
      domainBottom: -negSpan,
      incomeTicks,
      costTicks,
      costScale: scale,
      groupAnnotations: annotations,
    }
  }, [offers, visibleYears, sharedPositiveMax, sharedCostMaxAbs])

  return (
    <Card
      className="p-3 sm:p-4 gap-0"
      style={{ boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.04)" }}
    >
      <div className="flex items-center justify-between mb-2 gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          {chartTitle}
        </h2>
      </div>

      {/* Per-offer plan selectors — aligned to chart categories below.
          Left spacer matches YAxis width + chart's left margin. */}
      <div
        className="mb-1 grid gap-2 items-end"
        style={{
          gridTemplateColumns: `minmax(42px, 64px) repeat(${offers.length}, minmax(0, 1fr)) 8px`,
        }}
      >
        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 self-center">
          Plan
        </div>
        {offers.map((offer) => {
          const plans = offer.benefits.plans
          const current = selectedPlan(offer)
          const coverages = Array.from(new Set(plans.map((p) => p.coverage)))
          const levels = Array.from(new Set(plans.map((p) => p.level)))
          const pickPlan = (coverage: string, level: string) => {
            return (
              plans.find((p) => p.coverage === coverage && p.level === level) ??
              plans.find((p) => p.coverage === coverage) ??
              plans.find((p) => p.level === level) ??
              null
            )
          }
          return (
            <div
              key={offer.id}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-1 px-1"
            >
              <select
                value={current?.coverage ?? ""}
                disabled={!plans.length || !onSelectPlan}
                onChange={(e) => {
                  const next = pickPlan(e.target.value, current?.level ?? "")
                  if (next) onSelectPlan?.(offer.id, next.id)
                }}
                className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label={`Coverage tier for ${offer.company}`}
              >
                {coverages.length === 0 ? (
                  <option value="">—</option>
                ) : (
                  coverages.map((c) => (
                    <option key={c} value={c}>
                      {COVERAGE_TIER_LABELS[c]}
                    </option>
                  ))
                )}
              </select>
              <select
                value={current?.level ?? ""}
                disabled={!plans.length || !onSelectPlan}
                onChange={(e) => {
                  const next = pickPlan(
                    current?.coverage ?? "",
                    e.target.value,
                  )
                  if (next) onSelectPlan?.(offer.id, next.id)
                }}
                className="h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label={`Plan tier for ${offer.company}`}
              >
                {levels.length === 0 ? (
                  <option value="">—</option>
                ) : (
                  levels.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))
                )}
              </select>
            </div>
          )
        })}
        <div />
      </div>

      <div
        className="relative w-full h-64 sm:h-72"
        role="img"
        aria-label={`Benefits chart for ${offers.map((o) => o.company).join(", ")}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            accessibilityLayer={false}
            tabIndex={-1}
            data={chartData}
            stackOffset="sign"
            margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
            barCategoryGap="10%"
            barGap={2}
          >
            <defs>
              {/* Diagonal hatch pattern in OOP-max color; renders within the
                  bar's bounding box so the segment width matches its
                  siblings (no outer stroke). */}
              <pattern
                id="oopMaxPattern"
                patternUnits="userSpaceOnUse"
                width={8}
                height={8}
                patternTransform="rotate(45)"
              >
                <rect
                  width={8}
                  height={8}
                  fill={CHART_COLORS.oopMax}
                  fillOpacity={0.08}
                />
                <rect
                  width={1.5}
                  height={8}
                  fill={CHART_COLORS.oopMax}
                  fillOpacity={0.34}
                />
              </pattern>
              <pattern
                id="parentalLeavePattern"
                patternUnits="userSpaceOnUse"
                width={8}
                height={8}
                patternTransform="rotate(45)"
              >
                <rect
                  width={8}
                  height={8}
                  fill={CHART_COLORS.parentalLeave}
                  fillOpacity={0.08}
                />
                <rect
                  width={1.5}
                  height={8}
                  fill={CHART_COLORS.parentalLeave}
                  fillOpacity={0.34}
                />
              </pattern>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />
            <XAxis
              dataKey="company"
              tick={{ fontSize: 11, fontWeight: 600, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
              interval={0}
              height={20}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => {
                const n = Number(v)
                if (n === 0) return "$0"
                if (n > 0) return fmt(n)
                const real = costScale > 0 ? n / costScale : n
                return `−${fmt(Math.abs(real))}`
              }}
              domain={[domainBottom, domainTop]}
              ticks={[...costTicks, ...incomeTicks]}
              width={56}
            />
            <ReferenceLine y={0} stroke="#0f172a" strokeWidth={1.25} />
            <Tooltip
              shared={false}
              cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
              wrapperStyle={{ zIndex: 30 }}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
              formatter={(value, name) => {
                const num = typeof value === "number" ? value : Number(value)
                if (num === 0) return [null, null] as unknown as [string, string]
                if (num < 0 && costScale > 0) {
                  return [fmt(Math.abs(num / costScale)), String(name)]
                }
                return [fmt(num), String(name)]
              }}
              labelFormatter={() => ""}
            />
            {visibleYears.flatMap((_, yi) => {
              const bars: ReactElement[] = []
              // Positive segments for this year.
              activePos.forEach((k, i) => {
                const isParentalLeave = k === "parentalLeave"
                bars.push(
                  <Bar
                    key={yearChartKey(yi, k)}
                    dataKey={yearChartKey(yi, k)}
                    name={benefitSegmentLabel(k)}
                    stackId={`y${yi}`}
                    fill={
                      isParentalLeave
                        ? "url(#parentalLeavePattern)"
                        : CHART_COLORS[k]
                    }
                    stroke="#ffffff"
                    strokeWidth={1}
                    isAnimationActive={false}
                    barSize={28}
                    radius={
                      i === activePos.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                    }
                  />,
                )
              })
              // Negative segments for this year (cost axis, pre-scaled).
              activeNeg.forEach((k, i) => {
                const isOop = k === "oopMax"
                bars.push(
                  <Bar
                    key={yearChartKey(yi, k)}
                    dataKey={yearChartKey(yi, k)}
                    name={benefitSegmentLabel(k)}
                    stackId={`y${yi}`}
                    fill={isOop ? "url(#oopMaxPattern)" : CHART_COLORS[k]}
                    stroke="#ffffff"
                    strokeWidth={1}
                    isAnimationActive={false}
                    barSize={28}
                    radius={
                      i === activeNeg.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]
                    }
                  />,
                )
              })
              return bars
            })}
          </BarChart>
        </ResponsiveContainer>
        <BenefitGroupAnnotations
          annotations={groupAnnotations}
          domainTop={domainTop}
          domainBottom={domainBottom}
        />
      </div>

      {/* Screen-reader-only summary of the chart's data. */}
      <table className="sr-only">
        <caption>Benefits values per offer</caption>
        <thead>
          <tr>
            <th>Offer</th>
            <th>Segment</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {offers.flatMap((offer) => {
            const segments = benefitSegmentsForOffer(offer, 0)
            const rows: { label: string; value: number }[] = [
              ...segments.gains.map((segment) => ({
                label: segment.label,
                value: segment.value,
              })),
              ...segments.costs.map((segment) => ({
                label: segment.label,
                value: -segment.value,
              })),
            ]
            return rows.map((r, i) => (
              <tr key={`${offer.id}-${i}`}>
                <td>{offer.company}</td>
                <td>{r.label}</td>
                <td>{fmt(r.value)}</td>
              </tr>
            ))
          })}
        </tbody>
      </table>
    </Card>
  )
}

interface BenefitGroupAnnotation {
  key: string
  label: string
  total: number
  start: number
  end: number
}

function BenefitGroupAnnotations({
  annotations,
  domainTop,
  domainBottom,
}: {
  annotations: BenefitGroupAnnotation[]
  domainTop: number
  domainBottom: number
}) {
  if (!annotations.length) return null

  const domainSpan = domainTop - domainBottom
  const yToPct = (value: number) =>
    ((domainTop - value) / domainSpan) * 100
  const labels = avoidAnnotationOverlap(
    annotations.map((annotation) => {
      const top = Math.min(yToPct(annotation.start), yToPct(annotation.end))
      const bottom = Math.max(yToPct(annotation.start), yToPct(annotation.end))
      return {
        annotation,
        top,
        bottom,
        labelTop: (top + bottom) / 2,
      }
    }),
  )

  return (
    <div
      className="pointer-events-none absolute bottom-6 left-14 right-2 top-2"
      aria-hidden="true"
    >
      {labels.map(({ annotation, top, bottom, labelTop }) => {
        return (
          <div
            key={annotation.key}
            className="absolute"
            style={{
              left: "calc(50% + 22px)",
              top: `${top}%`,
              height: `${bottom - top}%`,
            }}
          >
            <div className="relative h-full min-h-4 w-2 border-y border-r border-slate-400/80" />
            <div
              className="absolute left-2 flex w-[104px] translate-x-1.5 -translate-y-1/2 items-baseline justify-between gap-1 rounded-sm bg-white/85 px-1 py-0.5 text-[9.5px] leading-none text-slate-600 shadow-[0_0_0_1px_rgb(226_232_240_/_0.8)]"
              style={{
                top: `${((labelTop - top) / (bottom - top)) * 100}%`,
              }}
            >
              <span className="font-semibold text-slate-700">
                {annotation.label}
              </span>
              <span>{fmt(annotation.total)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function avoidAnnotationOverlap<
  T extends { labelTop: number },
>(items: T[]): T[] {
  const minGap = 8
  const sorted = [...items].sort((a, b) => a.labelTop - b.labelTop)

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1]
    const current = sorted[i]
    if (current.labelTop - previous.labelTop < minGap) {
      current.labelTop = previous.labelTop + minGap
    }
  }

  const overflow = sorted[sorted.length - 1]?.labelTop - 96
  if (overflow > 0) {
    for (let i = sorted.length - 1; i >= 0; i -= 1) {
      sorted[i].labelTop -= overflow
    }
  }

  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    const next = sorted[i + 1]
    const current = sorted[i]
    if (next.labelTop - current.labelTop < minGap) {
      current.labelTop = next.labelTop - minGap
    }
  }

  for (const item of sorted) {
    item.labelTop = Math.max(4, Math.min(96, item.labelTop))
  }

  return sorted
}

function benefitSegmentLabel(key: ChartKey): string {
  return { ...BENEFIT_GAIN_LABELS, ...BENEFIT_COST_LABELS }[key]
}
