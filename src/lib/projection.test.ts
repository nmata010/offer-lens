import { describe, expect, it } from "vitest"
import {
  annualPremiumsTotal,
  benefitSegmentsForOffer,
  benefitChartTotals,
  selectedPlan,
} from "./benefits"
import {
  annual401kMatch,
  componentsForYear,
  projectOffer,
} from "./projection"
import { SAMPLE_OFFERS } from "./sample"

const STRIPE = SAMPLE_OFFERS[0]
const LINEAR = SAMPLE_OFFERS[1]
const ZERO_OFFER = {
  ...STRIPE,
  cash: {
    base: 100000,
    signOn: 0,
    bonusPct: 0,
    cola: 0,
  },
  equity: {
    signOnRsus: 0,
    annualRefresher: 0,
    match401k: { matchPct: 0, upToSalaryPct: 0 },
  },
  benefits: {
    plans: [],
    selectedPlanId: null,
    dentalMonthlyPremium: 0,
    visionMonthlyPremium: 0,
    parentalLeave: null,
    ptoWeeks: 0,
    stipends: 0,
  },
}

describe("selectedPlan", () => {
  it("returns the explicitly selected plan when set", () => {
    const plan = selectedPlan(STRIPE)
    expect(plan?.id).toBe("stripe-silver-employee")
  })

  it("falls back to the first plan when selectedPlanId is null", () => {
    const offer = {
      ...STRIPE,
      benefits: { ...STRIPE.benefits, selectedPlanId: null },
    }
    const plan = selectedPlan(offer)
    expect(plan?.id).toBe(STRIPE.benefits.plans[0].id)
  })

  it("returns null when there are no plans", () => {
    const offer = {
      ...STRIPE,
      benefits: { ...STRIPE.benefits, plans: [], selectedPlanId: null },
    }
    expect(selectedPlan(offer)).toBeNull()
  })
})

describe("annual401kMatch", () => {
  it("multiplies match% × cap% × base", () => {
    // Stripe: base 195000, match 50%, up to 6% of salary.
    // = 195000 * 0.06 * 0.5 = 5850
    expect(annual401kMatch(STRIPE, 0)).toBeCloseTo(5850)
  })
})

describe("annualPremiumsTotal", () => {
  it("sums medical + dental + vision × 12 from selected plan and offer", () => {
    // Stripe Silver/Employee: medical 240, dental 30, vision 15 → (285) * 12 = 3420
    expect(annualPremiumsTotal(STRIPE)).toBe(3420)
  })
})

describe("benefitChartTotals", () => {
  it("computes positive (benefits gains) and absolute medical cost", () => {
    const { positive, costAbs } = benefitChartTotals(STRIPE)
    // positive includes 401k match (5850) + HSA (1500) + parental leave
    // + PTO + stipends. Just sanity-check shape.
    expect(positive).toBeGreaterThan(5850 + 1500)
    // costAbs = annual premiums + deductible + remaining OOP risk after deductible.
    // = 3420 + 1500 + (6000 - 1500) = 9420
    expect(costAbs).toBe(9420)
  })

  it("returns zero positives when no plan + no PTO + no stipends + no parental leave", () => {
    const offer = {
      ...LINEAR,
      benefits: {
        ...LINEAR.benefits,
        plans: [],
        selectedPlanId: null,
        parentalLeave: null,
        ptoWeeks: 0,
        stipends: 0,
        dentalMonthlyPremium: 0,
        visionMonthlyPremium: 0,
      },
      equity: {
        ...LINEAR.equity,
        match401k: { matchPct: 0, upToSalaryPct: 0 },
      },
    }
    const { positive, costAbs } = benefitChartTotals(offer)
    expect(positive).toBe(0)
    expect(costAbs).toBe(0)
  })
})

describe("benefitSegmentsForOffer", () => {
  it("includes medical, dental, and vision premiums in the premiums segment", () => {
    const segments = benefitSegmentsForOffer(STRIPE)
    const premiums = segments.costs.find(
      (segment) => segment.key === "premiums",
    )

    // Stripe Silver/Employee: (medical 240 + dental 30 + vision 15) * 12.
    expect(premiums?.value).toBe(3420)
  })

  it("models OOP max as remaining risk after the deductible", () => {
    const segments = benefitSegmentsForOffer(STRIPE)
    const oopMax = segments.costs.find((segment) => segment.key === "oopMax")

    // Stripe Silver/Employee: OOP max 6000 includes deductible 1500.
    expect(oopMax?.value).toBe(4500)
  })
})

describe("zero-value offer", () => {
  it("projects only base salary when all optional comp is zero", () => {
    const projection = projectOffer(ZERO_OFFER)

    expect(projection.perYear).toEqual([
      { cash: 100000, equity: 0 },
      { cash: 100000, equity: 0 },
      { cash: 100000, equity: 0 },
      { cash: 100000, equity: 0 },
    ])
    expect(projection.categoryTotals).toEqual({ cash: 400000, equity: 0 })
    expect(projection.total4y).toBe(400000)
  })

  it("has no benefit gains or costs when benefits are empty", () => {
    expect(selectedPlan(ZERO_OFFER)).toBeNull()
    expect(annual401kMatch(ZERO_OFFER, 0)).toBe(0)
    expect(annualPremiumsTotal(ZERO_OFFER)).toBe(0)
    expect(benefitChartTotals(ZERO_OFFER)).toEqual({
      positive: 0,
      costAbs: 0,
    })
  })
})

describe("componentsForYear", () => {
  it("includes sign-on in Y1 only", () => {
    expect(componentsForYear(STRIPE, 0).signOn).toBe(50000)
    expect(componentsForYear(STRIPE, 1).signOn).toBe(0)
  })

  it("grows base by COLA each year", () => {
    const y0 = componentsForYear(STRIPE, 0).base
    const y1 = componentsForYear(STRIPE, 1).base
    expect(y1).toBeCloseTo(y0 * 1.03)
  })

  it("computes bonus as base × bonusPct each year", () => {
    // Stripe Y1: 195000 * 20% = 39000
    expect(componentsForYear(STRIPE, 0).bonus).toBeCloseTo(39000)
    // Stripe Y2: 195000 * 1.03 * 20% = 40170
    expect(componentsForYear(STRIPE, 1).bonus).toBeCloseTo(40170)
  })

  it("vests a sign-on RSU tranche every year for VEST_YEARS", () => {
    // Stripe signOnRsus 480000 / 4 = 120000 per year, Y1–Y4
    const tranche = 120000
    expect(componentsForYear(STRIPE, 0).signOnRsuVest).toBeCloseTo(tranche)
    expect(componentsForYear(STRIPE, 1).signOnRsuVest).toBeCloseTo(tranche)
    expect(componentsForYear(STRIPE, 2).signOnRsuVest).toBeCloseTo(tranche)
    expect(componentsForYear(STRIPE, 3).signOnRsuVest).toBeCloseTo(tranche)
  })

  it("accrues refresher vests on the documented schedule", () => {
    // Stripe annualRefresher 60000 / 4 = 15000 per tranche.
    // Year 1: no prior refreshers yet → 0
    // Year 2: one Y1 refresher contributed → 15000
    // Year 3: Y1 and Y2 refreshers → 30000
    // Year 4: Y1, Y2, Y3 refreshers → 45000
    expect(componentsForYear(STRIPE, 0).refresherVest).toBeCloseTo(0)
    expect(componentsForYear(STRIPE, 1).refresherVest).toBeCloseTo(15000)
    expect(componentsForYear(STRIPE, 2).refresherVest).toBeCloseTo(30000)
    expect(componentsForYear(STRIPE, 3).refresherVest).toBeCloseTo(45000)
  })

  it("applies COLA-grown base to the 401(k) match in later years", () => {
    // Y1 match: 195000 * 6% * 50% = 5850
    expect(componentsForYear(STRIPE, 0).match401k).toBeCloseTo(5850)
    // Y2: base grows 3% → 200850 * 6% * 50% = 6025.5
    expect(componentsForYear(STRIPE, 1).match401k).toBeCloseTo(6025.5)
  })
})

describe("benefitChartTotals — composed segments", () => {
  it("includes parental leave at base/52 × weeks × rate, attributed to Y1", () => {
    // benefitChartTotals reads Y1 only. Stripe: 195000/52 * 16 * 100% = 60000.
    // Isolate by zeroing everything else.
    const offer = {
      ...STRIPE,
      equity: { ...STRIPE.equity, match401k: { matchPct: 0, upToSalaryPct: 0 } },
      benefits: {
        ...STRIPE.benefits,
        ptoWeeks: 0,
        stipends: 0,
        plans: STRIPE.benefits.plans.map((p) => ({ ...p, hsaContribution: 0 })),
      },
    }
    expect(benefitChartTotals(offer).positive).toBeCloseTo(60000)
  })

  it("includes PTO at base/52 × weeks every year (sampled at Y1)", () => {
    // Stripe: 195000/52 * 4 = 15000
    const offer = {
      ...STRIPE,
      equity: { ...STRIPE.equity, match401k: { matchPct: 0, upToSalaryPct: 0 } },
      benefits: {
        ...STRIPE.benefits,
        parentalLeave: null,
        stipends: 0,
        plans: STRIPE.benefits.plans.map((p) => ({ ...p, hsaContribution: 0 })),
      },
    }
    expect(benefitChartTotals(offer).positive).toBeCloseTo(15000)
  })

  it("includes HSA from the currently selected plan", () => {
    // Stripe Silver/Employee plan: HSA = 1500. Gold/Family: HSA = 3000.
    const silver = {
      ...STRIPE,
      equity: { ...STRIPE.equity, match401k: { matchPct: 0, upToSalaryPct: 0 } },
      benefits: {
        ...STRIPE.benefits,
        parentalLeave: null,
        ptoWeeks: 0,
        stipends: 0,
      },
    }
    expect(benefitChartTotals(silver).positive).toBeCloseTo(1500)

    const gold = {
      ...silver,
      benefits: { ...silver.benefits, selectedPlanId: "stripe-gold-family" },
    }
    expect(benefitChartTotals(gold).positive).toBeCloseTo(3000)
  })

  it("includes annual stipends as a flat passthrough", () => {
    const offer = {
      ...STRIPE,
      equity: { ...STRIPE.equity, match401k: { matchPct: 0, upToSalaryPct: 0 } },
      benefits: {
        ...STRIPE.benefits,
        parentalLeave: null,
        ptoWeeks: 0,
        plans: STRIPE.benefits.plans.map((p) => ({ ...p, hsaContribution: 0 })),
      },
    }
    // Stripe stipends = 2400
    expect(benefitChartTotals(offer).positive).toBeCloseTo(2400)
  })

  it("sums all positive segments together for the unmodified Stripe sample", () => {
    // match (5850) + HSA (1500) + parental (60000) + PTO (15000) + stipends (2400)
    expect(benefitChartTotals(STRIPE).positive).toBeCloseTo(84750)
  })
})

describe("projectOffer", () => {
  it("returns a 4-year projection with non-negative totals", () => {
    const proj = projectOffer(STRIPE)
    expect(proj.perYear).toHaveLength(4)
    expect(proj.total4y).toBeGreaterThan(0)
    expect(proj.categoryTotals.cash + proj.categoryTotals.equity).toBe(
      proj.total4y,
    )
  })

  it("computes Y1 cash and equity from the documented formulas", () => {
    const [y1] = projectOffer(STRIPE).perYear
    // Cash Y1: base (195000) + bonus (39000) + sign-on (50000) = 284000
    expect(y1.cash).toBeCloseTo(284000)
    // Equity Y1: signOnVest (120000) + refresherVest (0) + match (5850) = 125850
    expect(y1.equity).toBeCloseTo(125850)
  })

  it("computes Y2 with COLA-grown cash and a fresh refresher tranche", () => {
    const [, y2] = projectOffer(STRIPE).perYear
    // Cash Y2: 195000*1.03 + 39000*1.03 + 0 = 200850 + 40170 = 241020
    expect(y2.cash).toBeCloseTo(241020)
    // Equity Y2: signOnVest (120000) + refresherVest (15000) + match (6025.5) = 141025.5
    expect(y2.equity).toBeCloseTo(141025.5)
  })
})
