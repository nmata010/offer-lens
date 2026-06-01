export type PaletteId = "sky" | "violet" | "emerald" | "amber"

export type CategoryKey = "cash" | "equity"

export interface CashInput {
  base: number
  signOn: number
  bonusPct: number       // 0-100, applied at 100% expected payout
  cola: number           // 0-100 expected annual raise
}

export interface Match401k {
  matchPct: number        // e.g. 50 → employer matches 50¢ on the dollar
  upToSalaryPct: number   // e.g. 6 → up to 6% of salary contributed
}

export interface EquityInput {
  signOnRsus: number
  annualRefresher: number
  match401k: Match401k
}

export type CoverageTier =
  | "employee"
  | "employeeSpouse"
  | "employeeChildren"
  | "family"

export const COVERAGE_TIER_LABELS: Record<CoverageTier, string> = {
  employee: "Employee",
  employeeSpouse: "Employee + Spouse",
  employeeChildren: "Employee + Children",
  family: "Family",
}

export interface BenefitPlan {
  id: string
  level: string             // e.g. "Bronze", "Silver", "Gold", "PPO"
  coverage: CoverageTier
  medicalMonthlyPremium: number
  medicalDeductible: number
  medicalOopMax: number
  hsaContribution: number   // employer-funded
}

export interface ParentalLeave {
  weeks: number
  ratePct: number   // % of base pay (e.g. 100 = full pay)
}

export interface BenefitsInput {
  plans: BenefitPlan[]
  selectedPlanId: string | null
  dentalMonthlyPremium: number  // offer-level, no tiers
  visionMonthlyPremium: number  // offer-level, no tiers
  parentalLeave: ParentalLeave | null
  ptoWeeks: number              // weeks of paid time off; value = (base/52) * weeks
  stipends: number              // offer-level employer stipends
}

export interface Offer {
  id: string
  company: string
  palette: PaletteId
  cash: CashInput
  equity: EquityInput
  benefits: BenefitsInput
}

export interface YearBreakdown {
  cash: number
  equity: number
}

export interface OfferProjection {
  offerId: string
  perYear: YearBreakdown[]
  categoryTotals: YearBreakdown
  total4y: number
}
