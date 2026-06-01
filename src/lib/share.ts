import { normalizeViewConfig, type PersistedState } from "./storage"
import type { BenefitPlan, Offer, ParentalLeave } from "./types"

// URL-safe base64 of UTF-8 JSON, in the hash fragment so it never hits the server.
const LEGACY_HASH_PREFIX = "#s="
const HASH_PREFIX = "#v2="

type CompactCash = [number, number, number, number]
type CompactEquity = [number, number, number, number]
type CompactPlan = [
  BenefitPlan["id"],
  BenefitPlan["level"],
  BenefitPlan["coverage"],
  number,
  number,
  number,
  number,
]
type CompactParentalLeave = [number, number]
type CompactBenefits = [
  CompactPlan[],
  string | null,
  number,
  number,
  CompactParentalLeave | null,
  number,
  number,
]
type CompactOffer = [
  Offer["id"],
  Offer["company"],
  Offer["palette"],
  CompactCash,
  CompactEquity,
  CompactBenefits,
]

interface CompactPayload {
  v: number
  o: CompactOffer[]
  c: number
}

interface LegacyPayload {
  v?: number
  o?: PersistedState["offers"]
  c?: Partial<PersistedState["view"]>
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function fromBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeShareUrl(state: PersistedState): string {
  const payload: CompactPayload = {
    v: state.schemaVersion,
    o: state.offers.map(compactOffer),
    c: compactViewConfig(state),
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  const { origin, pathname } = window.location
  return `${origin}${pathname}${HASH_PREFIX}${encoded}`
}

export function tryDecodeShareHash(hash: string): PersistedState | null {
  if (!hash) return null
  try {
    if (hash.startsWith(HASH_PREFIX)) {
      const json = fromBase64Url(hash.slice(HASH_PREFIX.length))
      const parsed = JSON.parse(json) as CompactPayload
      if (!Array.isArray(parsed.o)) return null
      return {
        schemaVersion: parsed.v ?? 1,
        offers: parsed.o.map(expandOffer),
        view: expandViewConfig(parsed.c),
      }
    }

    if (!hash.startsWith(LEGACY_HASH_PREFIX)) return null
    const json = fromBase64Url(hash.slice(LEGACY_HASH_PREFIX.length))
    const parsed = JSON.parse(json) as LegacyPayload
    if (!parsed.o) return null
    return {
      schemaVersion: parsed.v ?? 1,
      offers: parsed.o,
      view: normalizeViewConfig(parsed.c),
    }
  } catch {
    return null
  }
}

function compactViewConfig(state: PersistedState): number {
  return (state.view.showDirectComp ? 1 : 0) | (state.view.showBenefits ? 2 : 0)
}

function expandViewConfig(bits?: number): PersistedState["view"] {
  if (typeof bits !== "number") return normalizeViewConfig()
  return normalizeViewConfig({
    showDirectComp: Boolean(bits & 1),
    showBenefits: Boolean(bits & 2),
  })
}

function compactOffer(o: Offer): CompactOffer {
  return [
    o.id,
    o.company,
    o.palette,
    [o.cash.base, o.cash.signOn, o.cash.bonusPct, o.cash.cola],
    [
      o.equity.signOnRsus,
      o.equity.annualRefresher,
      o.equity.match401k.matchPct,
      o.equity.match401k.upToSalaryPct,
    ],
    [
      o.benefits.plans.map(compactPlan),
      o.benefits.selectedPlanId,
      o.benefits.dentalMonthlyPremium,
      o.benefits.visionMonthlyPremium,
      compactParentalLeave(o.benefits.parentalLeave),
      o.benefits.ptoWeeks,
      o.benefits.stipends,
    ],
  ]
}

function compactPlan(p: BenefitPlan): CompactPlan {
  return [
    p.id,
    p.level,
    p.coverage,
    p.medicalMonthlyPremium,
    p.medicalDeductible,
    p.medicalOopMax,
    p.hsaContribution,
  ]
}

function compactParentalLeave(
  parentalLeave: ParentalLeave | null,
): CompactParentalLeave | null {
  return parentalLeave
    ? [parentalLeave.weeks, parentalLeave.ratePct]
    : parentalLeave
}

function expandOffer(o: CompactOffer): Offer {
  const [id, company, palette, cash, equity, benefits] = o
  const [base, signOn, bonusPct, cola] = cash
  const [signOnRsus, annualRefresher, matchPct, upToSalaryPct] = equity
  const [
    plans,
    selectedPlanId,
    dentalMonthlyPremium,
    visionMonthlyPremium,
    parentalLeave,
    ptoWeeks,
    stipends,
  ] = benefits

  return {
    id,
    company,
    palette,
    cash: {
      base,
      signOn,
      bonusPct,
      cola,
    },
    equity: {
      signOnRsus,
      annualRefresher,
      match401k: {
        matchPct,
        upToSalaryPct,
      },
    },
    benefits: {
      plans: plans.map(expandPlan),
      selectedPlanId,
      dentalMonthlyPremium,
      visionMonthlyPremium,
      parentalLeave: expandParentalLeave(parentalLeave),
      ptoWeeks,
      stipends,
    },
  }
}

function expandPlan(p: CompactPlan): BenefitPlan {
  const [
    id,
    level,
    coverage,
    medicalMonthlyPremium,
    medicalDeductible,
    medicalOopMax,
    hsaContribution,
  ] = p
  return {
    id,
    level,
    coverage,
    medicalMonthlyPremium,
    medicalDeductible,
    medicalOopMax,
    hsaContribution,
  }
}

function expandParentalLeave(
  parentalLeave: CompactParentalLeave | null,
): ParentalLeave | null {
  return parentalLeave
    ? { weeks: parentalLeave[0], ratePct: parentalLeave[1] }
    : parentalLeave
}
