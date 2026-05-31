import { annual401kMatch } from "./projection"
import type { BenefitPlan, Offer } from "./types"

export type BenefitGainKey =
  | "match401k"
  | "hsa"
  | "parentalLeave"
  | "pto"
  | "stipends"

export type BenefitCostKey = "premiums" | "deductible" | "oopMax"

export interface BenefitSegment<K extends string = string> {
  key: K
  label: string
  value: number
}

export interface BenefitSegments {
  gains: BenefitSegment<BenefitGainKey>[]
  costs: BenefitSegment<BenefitCostKey>[]
  gainTotal: number
  costTotal: number
}

export const BENEFIT_GAIN_LABELS: Record<BenefitGainKey, string> = {
  match401k: "401(k) match",
  hsa: "HSA employer fund",
  parentalLeave: "Parental leave (paid)",
  pto: "PTO",
  stipends: "Annual stipends",
}

export const BENEFIT_COST_LABELS: Record<BenefitCostKey, string> = {
  premiums: "Medical + dental + vision premiums",
  deductible: "Deductible",
  oopMax: "OOP max",
}

export function selectedPlan(o: Offer): BenefitPlan | null {
  const { plans, selectedPlanId } = o.benefits
  if (!plans.length) return null
  return plans.find((p) => p.id === selectedPlanId) ?? plans[0]
}

export function annualPremiumsTotal(o: Offer): number {
  const p = selectedPlan(o)
  const medical = p ? p.medicalMonthlyPremium : 0
  return (
    (medical +
      o.benefits.dentalMonthlyPremium +
      o.benefits.visionMonthlyPremium) *
    12
  )
}

export function annualBenefitsCost(o: Offer): {
  premiums: number
  deductible: number
  oopMax: number
  total: number
} {
  const p = selectedPlan(o)
  const premiums = annualPremiumsTotal(o)
  const deductible = p?.medicalDeductible ?? 0
  const oopMax = netOopMaxAfterDeductible(p)
  return {
    premiums,
    deductible,
    oopMax,
    total: premiums + deductible + oopMax,
  }
}

export function benefitSegmentsForOffer(
  o: Offer,
  yearIdx = 0,
): BenefitSegments {
  const plan = selectedPlan(o)
  const parentalLeave = parentalLeaveValue(o, yearIdx)
  const pto = ptoValue(o)
  const premiums = annualPremiumsTotal(o)

  const gains: BenefitSegment<BenefitGainKey>[] = [
    {
      key: "match401k",
      label: BENEFIT_GAIN_LABELS.match401k,
      value: annual401kMatch(o, yearIdx),
    },
    {
      key: "hsa",
      label: BENEFIT_GAIN_LABELS.hsa,
      value: plan?.hsaContribution ?? 0,
    },
    {
      key: "stipends",
      label: BENEFIT_GAIN_LABELS.stipends,
      value: o.benefits.stipends ?? 0,
    },
    { key: "pto", label: BENEFIT_GAIN_LABELS.pto, value: pto },
    {
      key: "parentalLeave",
      label: BENEFIT_GAIN_LABELS.parentalLeave,
      value: parentalLeave,
    },
  ]

  const costs: BenefitSegment<BenefitCostKey>[] = [
    { key: "premiums", label: BENEFIT_COST_LABELS.premiums, value: premiums },
    {
      key: "deductible",
      label: BENEFIT_COST_LABELS.deductible,
      value: plan?.medicalDeductible ?? 0,
    },
    {
      key: "oopMax",
      label: BENEFIT_COST_LABELS.oopMax,
      value: netOopMaxAfterDeductible(plan),
    },
  ]

  return {
    gains,
    costs,
    gainTotal: sumSegments(gains),
    costTotal: sumSegments(costs),
  }
}

export function benefitChartTotals(o: Offer): {
  positive: number
  costAbs: number
} {
  const segments = benefitSegmentsForOffer(o, 0)
  return {
    positive: segments.gainTotal,
    costAbs: segments.costTotal,
  }
}

function parentalLeaveValue(o: Offer, yearIdx: number): number {
  const pl = o.benefits.parentalLeave
  if (yearIdx !== 0 || !pl) return 0
  return (o.cash.base / 52) * pl.weeks * (pl.ratePct / 100)
}

function ptoValue(o: Offer): number {
  return (o.cash.base / 52) * (o.benefits.ptoWeeks ?? 0)
}

function netOopMaxAfterDeductible(plan: BenefitPlan | null): number {
  if (!plan) return 0
  return Math.max(0, plan.medicalOopMax - plan.medicalDeductible)
}

function sumSegments(segments: BenefitSegment[]): number {
  return segments.reduce((sum, segment) => sum + segment.value, 0)
}
