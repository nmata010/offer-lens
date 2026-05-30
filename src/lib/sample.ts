import type { Offer } from "./types"

export const SAMPLE_OFFERS: Offer[] = [
  {
    id: "stripe",
    company: "Stripe",
    palette: "sky",
    cash: {
      base: 195000,
      signOn: 50000,
      bonusPct: 20,
      cola: 3,
    },
    equity: {
      signOnRsus: 480000,
      annualRefresher: 60000,
      match401k: {
        matchPct: 50,
        upToSalaryPct: 6,
      },
    },
    benefits: {
      plans: [
        {
          id: "stripe-silver-employee",
          level: "Silver",
          coverage: "employee",
          medicalMonthlyPremium: 240,
          medicalDeductible: 1500,
          medicalOopMax: 6000,
          hsaContribution: 1500,
        },
        {
          id: "stripe-gold-family",
          level: "Gold",
          coverage: "family",
          medicalMonthlyPremium: 720,
          medicalDeductible: 1000,
          medicalOopMax: 9000,
          hsaContribution: 3000,
        },
      ],
      selectedPlanId: "stripe-silver-employee",
      dentalMonthlyPremium: 30,
      visionMonthlyPremium: 15,
      parentalLeave: { weeks: 16, ratePct: 100 },
      ptoWeeks: 4,
      stipends: 2400,
    },
  },
  {
    id: "linear",
    company: "Linear",
    palette: "violet",
    cash: {
      base: 175000,
      signOn: 30000,
      bonusPct: 15,
      cola: 4,
    },
    equity: {
      signOnRsus: 600000,
      annualRefresher: 80000,
      match401k: {
        matchPct: 100,
        upToSalaryPct: 4,
      },
    },
    benefits: {
      plans: [
        {
          id: "linear-ppo-employee",
          level: "PPO",
          coverage: "employee",
          medicalMonthlyPremium: 165,
          medicalDeductible: 2500,
          medicalOopMax: 8500,
          hsaContribution: 0,
        },
      ],
      selectedPlanId: "linear-ppo-employee",
      dentalMonthlyPremium: 20,
      visionMonthlyPremium: 10,
      parentalLeave: { weeks: 12, ratePct: 100 },
      ptoWeeks: 3,
      stipends: 3600,
    },
  },
]
