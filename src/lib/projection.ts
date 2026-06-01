import type { Offer, OfferProjection, YearBreakdown } from "./types"

export const PROJECTION_YEARS = 4
export const VEST_YEARS = 4

function pow(base: number, exp: number) {
  return Math.pow(base, exp)
}

function baseForYear(o: Offer, yearIdx: number): number {
  return o.cash.base * pow(1 + o.cash.cola / 100, yearIdx)
}

function cashForYear(o: Offer, yearIdx: number): number {
  const base = baseForYear(o, yearIdx)
  const bonus = base * (o.cash.bonusPct / 100)
  const signOn = yearIdx === 0 ? o.cash.signOn : 0
  return base + bonus + signOn
}

export function annual401kMatch(o: Offer, yearIdx: number): number {
  const base = baseForYear(o, yearIdx)
  const { matchPct, upToSalaryPct } = o.equity.match401k
  return base * (upToSalaryPct / 100) * (matchPct / 100)
}

function equityForYear(o: Offer, yearIdx: number): number {
  const year = yearIdx + 1
  const signOnTranche = o.equity.signOnRsus / VEST_YEARS
  const refresherTranche = o.equity.annualRefresher / VEST_YEARS

  const signOnVest = year <= VEST_YEARS ? signOnTranche : 0

  let refresherVest = 0
  for (let k = 1; k < year; k++) {
    const yearsSinceGrant = year - k
    if (yearsSinceGrant >= 1 && yearsSinceGrant <= VEST_YEARS) {
      refresherVest += refresherTranche
    }
  }

  return signOnVest + refresherVest + annual401kMatch(o, yearIdx)
}

export function projectOffer(o: Offer): OfferProjection {
  const perYear: YearBreakdown[] = []
  for (let i = 0; i < PROJECTION_YEARS; i++) {
    perYear.push({
      cash: cashForYear(o, i),
      equity: equityForYear(o, i),
    })
  }
  const categoryTotals = perYear.reduce<YearBreakdown>(
    (acc, y) => ({
      cash: acc.cash + y.cash,
      equity: acc.equity + y.equity,
    }),
    { cash: 0, equity: 0 },
  )
  const total4y = categoryTotals.cash + categoryTotals.equity
  return { offerId: o.id, perYear, categoryTotals, total4y }
}

export function yearTotal(y: YearBreakdown): number {
  return y.cash + y.equity
}

export type ComponentKey =
  | "base"
  | "bonus"
  | "signOn"
  | "signOnRsuVest"
  | "refresherVest"
  | "match401k"

export type ComponentBreakdown = Record<ComponentKey, number>

export function componentsForYear(o: Offer, yearIdx: number): ComponentBreakdown {
  const year = yearIdx + 1
  const base = baseForYear(o, yearIdx)
  const bonus = base * (o.cash.bonusPct / 100)
  const signOn = yearIdx === 0 ? o.cash.signOn : 0

  const signOnTranche = o.equity.signOnRsus / VEST_YEARS
  const refresherTranche = o.equity.annualRefresher / VEST_YEARS
  const signOnRsuVest = year <= VEST_YEARS ? signOnTranche : 0

  let refresherVest = 0
  for (let k = 1; k < year; k++) {
    const yearsSinceGrant = year - k
    if (yearsSinceGrant >= 1 && yearsSinceGrant <= VEST_YEARS) {
      refresherVest += refresherTranche
    }
  }

  return {
    base,
    bonus,
    signOn,
    signOnRsuVest,
    refresherVest,
    match401k: annual401kMatch(o, yearIdx),
  }
}

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
  base: "Base",
  bonus: "Bonus",
  signOn: "Sign-on $",
  signOnRsuVest: "Sign-on RSU vest",
  refresherVest: "Refresher vest",
  match401k: "401(k) match",
}
