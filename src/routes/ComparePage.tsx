import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Plus, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditOffersSheet } from "@/components/EditOffersSheet"
import { ProjectionChart } from "@/components/ProjectionChart"
import { SummaryCard } from "@/components/SummaryCard"
import { Topbar } from "@/components/Topbar"
import { benefitChartTotals } from "@/lib/benefits"
import { DEFAULT_PALETTE_ORDER } from "@/lib/palette"
import { projectOffer } from "@/lib/projection"
import { encodeShareUrl, tryDecodeShareHash } from "@/lib/share"
import {
  DEFAULT_STATE,
  loadState,
  saveState,
  type PersistedState,
} from "@/lib/storage"
import type { CategoryKey, Offer, PaletteId } from "@/lib/types"

export default function ComparePage() {
  // Hydrate synchronously on first render: prefer URL hash, fall back to
  // localStorage, then to the default sample. This avoids a setState-in-effect
  // pattern and prevents a flash of default state on first paint.
  const [state, setState] = useState<PersistedState>(() => {
    if (typeof window === "undefined") return DEFAULT_STATE
    const fromHash = tryDecodeShareHash(window.location.hash)
    if (fromHash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      )
      return fromHash
    }
    return loadState()
  })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetInitialTab, setSheetInitialTab] = useState<string | undefined>(
    undefined,
  )
  const [viewMenuOpen, setViewMenuOpen] = useState(false)
  const viewMenuRef = useRef<HTMLDivElement | null>(null)
  // Initial toast: if the URL had a share hash but it failed to decode,
  // surface a one-time error so the user knows we silently fell back.
  const [toast, setToast] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    const hash = window.location.hash
    if (hash.startsWith("#s=") && !tryDecodeShareHash(hash)) {
      return "Couldn't load shared offers — showing your last saved data."
    }
    return null
  })

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!viewMenuOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node)) {
        setViewMenuOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [viewMenuOpen])

  const projections = useMemo(
    () => state.offers.map((o) => projectOffer(o)),
    [state.offers],
  )

  const benefitChartScale = useMemo(() => {
    const totals = state.offers.map((o) => benefitChartTotals(o))
    return {
      sharedPositiveMax: totals.reduce(
        (m, t) => Math.max(m, t.positive),
        0,
      ),
      sharedCostMaxAbs: totals.reduce(
        (m, t) => Math.max(m, t.costAbs),
        0,
      ),
    }
  }, [state.offers])

  const bestY1Total = useMemo(
    () =>
      projections.reduce((m, p) => {
        const y1 = p.perYear[0]
        return Math.max(m, y1.cash + y1.equity)
      }, Number.NEGATIVE_INFINITY),
    [projections],
  )

  // For each category, "best" Y1 = the highest (most positive) value across offers.
  const bestY1PerCategory = useMemo<Record<CategoryKey, number>>(() => {
    const init: Record<CategoryKey, number> = {
      cash: Number.NEGATIVE_INFINITY,
      equity: Number.NEGATIVE_INFINITY,
    }
    for (const p of projections) {
      const y1 = p.perYear[0]
      for (const k of ["cash", "equity"] as const) {
        init[k] = Math.max(init[k], y1[k])
      }
    }
    return init
  }, [projections])

  const openEditFor = useCallback((offerId?: string) => {
    setSheetInitialTab(offerId)
    setSheetOpen(true)
  }, [])

  const handleSaveOffers = useCallback((offers: Offer[]) => {
    setState((s) => ({ ...s, offers }))
  }, [])

  const handleRemoveOffer = useCallback((offerId: string) => {
    setState((s) => {
      if (s.offers.length <= 1) return s
      return { ...s, offers: s.offers.filter((o) => o.id !== offerId) }
    })
    setSheetOpen(false)
  }, [])

  const handleAddOffer = useCallback(() => {
    const usedPalettes = new Set<PaletteId>(state.offers.map((o) => o.palette))
    const nextPalette =
      DEFAULT_PALETTE_ORDER.find((p) => !usedPalettes.has(p)) ?? "amber"
    const newOffer: Offer = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `offer-${Date.now()}`,
      company: "New offer",
      palette: nextPalette,
      cash: {
        base: 150000,
        signOn: 0,
        bonusPct: 10,
        cola: 3,
      },
      equity: {
        signOnRsus: 200000,
        annualRefresher: 25000,
        match401k: { matchPct: 50, upToSalaryPct: 6 },
      },
      benefits: {
        plans: [
          {
            id: `plan-${Math.random().toString(36).slice(2, 9)}`,
            level: "Default",
            coverage: "employee",
            medicalMonthlyPremium: 200,
            medicalDeductible: 2000,
            medicalOopMax: 6000,
            hsaContribution: 0,
          },
        ],
        selectedPlanId: null,
        dentalMonthlyPremium: 25,
        visionMonthlyPremium: 10,
        parentalLeave: null,
        ptoWeeks: 0,
        stipends: 0,
      },
    }
    newOffer.benefits.selectedPlanId = newOffer.benefits.plans[0].id
    setState((s) => ({ ...s, offers: [...s.offers, newOffer] }))
    setSheetInitialTab(newOffer.id)
    setSheetOpen(true)
  }, [state.offers])

  const handleSetViewOption = useCallback(
    (key: "showDirectComp" | "showBenefits", value: boolean) => {
      setState((s) => {
        const nextView = { ...s.view, [key]: value }
        if (!nextView.showDirectComp && !nextView.showBenefits) return s
        return { ...s, view: nextView }
      })
    },
    [],
  )

  const handleShare = useCallback(async () => {
    const url = encodeShareUrl(state)
    try {
      await navigator.clipboard.writeText(url)
      setToast("Share link copied to clipboard")
    } catch {
      setToast("Could not copy — link in address bar")
      window.history.replaceState(null, "", url)
    }
  }, [state])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const title =
    state.offers.length >= 2
      ? `${state.offers[0].company} vs ${state.offers[1].company}${state.offers.length > 2 ? ` +${state.offers.length - 2}` : ""}`
      : state.offers[0]?.company ?? "Compare offers"
  const desktopCardMinWidth = 360
  const desktopGridGap = 20
  const desktopGridMinWidth =
    state.offers.length * desktopCardMinWidth +
    Math.max(state.offers.length - 1, 0) * desktopGridGap

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Topbar onShare={handleShare} onPrint={handlePrint} />

      <main className="px-4 py-5 md:px-8 md:py-8 max-w-[1280px] mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-5 md:mb-6">
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-semibold text-slate-900"
              style={{ letterSpacing: "-0.02em" }}
            >
              {title}
            </h1>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 sm:flex sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditFor(state.offers[0]?.id)}
            >
              Edit offers
            </Button>
            <div ref={viewMenuRef} className="relative">
              <Button
                variant="outline"
                size="icon-sm"
                type="button"
                aria-label="Choose visible cards"
                aria-expanded={viewMenuOpen}
                onClick={() => setViewMenuOpen((open) => !open)}
              >
                <Settings size={15} />
              </Button>
              {viewMenuOpen && (
                <div className="absolute right-0 top-9 z-40 w-52 rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg">
                  <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Show
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-slate-700 hover:bg-slate-50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
                    <input
                      type="checkbox"
                      checked={state.view.showDirectComp}
                      disabled={
                        state.view.showDirectComp && !state.view.showBenefits
                      }
                      onChange={(e) =>
                        handleSetViewOption("showDirectComp", e.target.checked)
                      }
                    />
                    Direct comp cards
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-slate-700 hover:bg-slate-50 has-disabled:cursor-not-allowed has-disabled:opacity-50">
                    <input
                      type="checkbox"
                      checked={state.view.showBenefits}
                      disabled={
                        state.view.showBenefits && !state.view.showDirectComp
                      }
                      onChange={(e) =>
                        handleSetViewOption("showBenefits", e.target.checked)
                      }
                    />
                    Benefits cards
                  </label>
                </div>
              )}
            </div>
            <Button size="sm" onClick={handleAddOffer}>
              <Plus size={14} />
              Add offer
            </Button>
          </div>
        </div>

        <div className="hidden min-[480px]:block overflow-x-auto pb-2">
          <div
            className="space-y-5"
            style={{
              minWidth: `max(100%, ${desktopGridMinWidth}px)`,
            }}
          >
            {state.view.showDirectComp && (
              <div
                className="grid gap-5"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(state.offers.length, 1)}, minmax(${desktopCardMinWidth}px, 1fr))`,
                }}
              >
                {state.offers.map((offer) => {
                  const projection = projections.find(
                    (p) => p.offerId === offer.id,
                  )
                  if (!projection) return null
                  const other = state.offers.find((o) => o.id !== offer.id)
                  const otherProj = other
                    ? projections.find((p) => p.offerId === other.id)
                    : undefined
                  const y1 = projection.perYear[0]
                  const y1Total = y1.cash + y1.equity
                  const otherY1Total = otherProj
                    ? otherProj.perYear[0].cash + otherProj.perYear[0].equity
                    : undefined
                  return (
                    <SummaryCard
                      key={offer.id}
                      offer={offer}
                      projection={projection}
                      bestY1PerCategory={bestY1PerCategory}
                      isOverallWinner={y1Total >= bestY1Total}
                      comparisonName={other?.company}
                      comparisonY1Total={otherY1Total}
                      onEdit={() => openEditFor(offer.id)}
                    />
                  )
                })}
              </div>
            )}

            {state.view.showBenefits && (
              <div
                className="grid gap-5"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(state.offers.length, 1)}, minmax(${desktopCardMinWidth}px, 1fr))`,
                }}
              >
                {state.offers.map((offer) => (
                  <ProjectionChart
                    key={offer.id}
                    offers={[offer]}
                    sharedPositiveMax={benefitChartScale.sharedPositiveMax}
                    sharedCostMaxAbs={benefitChartScale.sharedCostMaxAbs}
                    onSelectPlan={(offerId, planId) =>
                      setState((s) => ({
                        ...s,
                        offers: s.offers.map((o) =>
                          o.id === offerId
                            ? {
                                ...o,
                                benefits: {
                                  ...o.benefits,
                                  selectedPlanId: planId,
                                },
                              }
                            : o,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 min-[480px]:hidden">
          {state.offers.map((offer) => {
            const projection = projections.find((p) => p.offerId === offer.id)
            if (!projection) return null
            const other = state.offers.find((o) => o.id !== offer.id)
            const otherProj = other
              ? projections.find((p) => p.offerId === other.id)
              : undefined
            const y1 = projection.perYear[0]
            const y1Total = y1.cash + y1.equity
            const otherY1Total = otherProj
              ? otherProj.perYear[0].cash + otherProj.perYear[0].equity
              : undefined

            return (
              <section key={offer.id} className="space-y-3">
                {state.view.showDirectComp && (
                  <SummaryCard
                    offer={offer}
                    projection={projection}
                    bestY1PerCategory={bestY1PerCategory}
                    isOverallWinner={y1Total >= bestY1Total}
                    comparisonName={other?.company}
                    comparisonY1Total={otherY1Total}
                    onEdit={() => openEditFor(offer.id)}
                  />
                )}
                {state.view.showBenefits && (
                  <ProjectionChart
                    offers={[offer]}
                    sharedPositiveMax={benefitChartScale.sharedPositiveMax}
                    sharedCostMaxAbs={benefitChartScale.sharedCostMaxAbs}
                    onSelectPlan={(offerId, planId) =>
                      setState((s) => ({
                        ...s,
                        offers: s.offers.map((o) =>
                          o.id === offerId
                            ? {
                                ...o,
                                benefits: {
                                  ...o.benefits,
                                  selectedPlanId: planId,
                                },
                              }
                            : o,
                        ),
                      }))
                    }
                  />
                )}
              </section>
            )
          })}
        </div>

        <div className="mt-8 text-xs text-slate-400 text-center">
          Numbers are projections, not guarantees · saved in your browser
        </div>
      </main>

      <EditOffersSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        offers={state.offers}
        initialTab={sheetInitialTab}
        onSave={handleSaveOffers}
        onRemove={state.offers.length > 1 ? handleRemoveOffer : undefined}
      />

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  )
}
