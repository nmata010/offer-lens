import { describe, expect, it } from "vitest"
import { parseCoverage, parseNum, parsePlansText } from "./plansImport"

describe("parseCoverage", () => {
  it("recognizes the four coverage tiers", () => {
    expect(parseCoverage("Employee")).toBe("employee")
    expect(parseCoverage("Employee + spouse")).toBe("employeeSpouse")
    expect(parseCoverage("Employee + children")).toBe("employeeChildren")
    expect(parseCoverage("Employee + Family")).toBe("family")
  })

  it("tolerates the 'Emplloyee' typo seen in real exports", () => {
    expect(parseCoverage("Emplloyee + Family")).toBe("family")
    expect(parseCoverage("Emplloyee + spouse")).toBe("employeeSpouse")
  })

  it("returns null for unknown input", () => {
    expect(parseCoverage("Domestic partner")).toBeNull()
    expect(parseCoverage("")).toBeNull()
  })
})

describe("parseNum", () => {
  it("strips $ and , and parses floats", () => {
    expect(parseNum("$1,234.56")).toBe(1234.56)
    expect(parseNum("0")).toBe(0)
    expect(parseNum("286.16")).toBe(286.16)
  })

  it("returns 0 for non-numeric input", () => {
    expect(parseNum("n/a")).toBe(0)
    expect(parseNum("")).toBe(0)
  })
})

describe("parsePlansText", () => {
  it("parses the documented tab-separated format with a header row", () => {
    const text = `Type\tTier\tPremium\tDeductible\tOOP Maximum\tHSA Funding
Employee\tGold\t0\t0\t3000\t0
Employee + spouse\tSilver\t230.85\t1500\t17700\t0
Emplloyee + Family\tBronze (HDHP)\t382.1\t3700\t7500\t1200`
    const result = parsePlansText(text)
    if ("error" in result) {
      throw new Error(`Expected plans, got error: ${result.error}`)
    }
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({
      level: "Gold",
      coverage: "employee",
      medicalMonthlyPremium: 0,
      medicalOopMax: 3000,
    })
    expect(result[1]).toMatchObject({
      level: "Silver",
      coverage: "employeeSpouse",
      medicalMonthlyPremium: 230.85,
      medicalDeductible: 1500,
      medicalOopMax: 17700,
    })
    expect(result[2]).toMatchObject({
      level: "Bronze (HDHP)",
      coverage: "family",
      hsaContribution: 1200,
    })
  })

  it("parses without a header row", () => {
    const text = `Employee\tGold\t0\t0\t3000\t0`
    const result = parsePlansText(text)
    if ("error" in result) {
      throw new Error(`Expected plans, got error: ${result.error}`)
    }
    expect(result).toHaveLength(1)
  })

  it("falls back to multi-space separators when no tabs are present", () => {
    const text = `Employee   Gold   0   0   3000   0`
    const result = parsePlansText(text)
    if ("error" in result) {
      throw new Error(`Expected plans, got error: ${result.error}`)
    }
    expect(result[0].coverage).toBe("employee")
  })

  it("returns an error for short rows", () => {
    const result = parsePlansText("Employee\tGold\t0")
    expect("error" in result).toBe(true)
  })

  it("returns an error for unknown coverage", () => {
    const result = parsePlansText("Domestic Partner\tGold\t0\t0\t3000\t0")
    expect("error" in result).toBe(true)
  })

  it("returns an error for empty input", () => {
    expect(parsePlansText("")).toEqual({ error: "No data pasted." })
  })

  it("assigns unique IDs to each parsed plan", () => {
    const text = `Employee\tGold\t0\t0\t3000\t0
Employee\tSilver\t0\t750\t8850\t0`
    const result = parsePlansText(text)
    if ("error" in result) throw new Error("Expected plans")
    expect(result[0].id).not.toBe(result[1].id)
  })
})
