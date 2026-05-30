import type { BenefitPlan, CoverageTier } from "./types"

export function newPlan(): BenefitPlan {
  return {
    id: `plan-${Math.random().toString(36).slice(2, 9)}`,
    level: "New plan",
    coverage: "employee",
    medicalMonthlyPremium: 0,
    medicalDeductible: 0,
    medicalOopMax: 0,
    hsaContribution: 0,
  }
}

export function parseCoverage(s: string): CoverageTier | null {
  const n = s.toLowerCase().replace(/\s+/g, " ").trim()
  const norm = n.replace(/^emplloyee/, "employee")
  if (/^employee\s*\+\s*spouse$/.test(norm)) return "employeeSpouse"
  if (/^employee\s*\+\s*child(ren)?$/.test(norm)) return "employeeChildren"
  if (/family/.test(norm)) return "family"
  if (/^employee$/.test(norm)) return "employee"
  return null
}

export function parseNum(s: string): number {
  const n = parseFloat(s.replace(/[$,]/g, ""))
  return Number.isFinite(n) ? n : 0
}

export function parsePlansText(
  text: string,
): BenefitPlan[] | { error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return { error: "No data pasted." }

  // Skip a header row if present (e.g. "Type\tTier\tPremium...").
  let startIdx = 0
  const first = lines[0].toLowerCase()
  if (first.includes("type") && first.includes("tier")) startIdx = 1

  const plans: BenefitPlan[] = []
  for (let i = startIdx; i < lines.length; i++) {
    // Prefer tabs; fall back to runs of 2+ spaces.
    let cols = lines[i].split(/\t+/).map((c) => c.trim())
    if (cols.length < 6) cols = lines[i].split(/\s{2,}/).map((c) => c.trim())
    if (cols.length < 6) {
      return { error: `Row ${i + 1}: expected 6 columns, got ${cols.length}.` }
    }
    const [type, tier, premium, deductible, oopMax, hsa] = cols
    const coverage = parseCoverage(type)
    if (!coverage) {
      return { error: `Row ${i + 1}: unknown coverage type "${type}".` }
    }
    plans.push({
      id: `plan-${Math.random().toString(36).slice(2, 9)}`,
      level: tier,
      coverage,
      medicalMonthlyPremium: parseNum(premium),
      medicalDeductible: parseNum(deductible),
      medicalOopMax: parseNum(oopMax),
      hsaContribution: parseNum(hsa),
    })
  }
  if (!plans.length) return { error: "No data rows found." }
  return plans
}
