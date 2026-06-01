import {
  useState,
  type ReactNode,
} from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { paletteFor } from "@/lib/palette"
import { newPlan, parsePlansText } from "@/lib/plansImport"
import {
  COVERAGE_TIER_LABELS,
  type BenefitPlan,
  type CoverageTier,
  type Offer,
} from "@/lib/types"

const COVERAGE_TIERS: CoverageTier[] = [
  "employee",
  "employeeSpouse",
  "employeeChildren",
  "family",
]

interface EditOffersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offers: Offer[]
  initialTab?: string
  onSave: (offers: Offer[]) => void
  onRemove?: (offerId: string) => void
}

export function EditOffersSheet({
  open,
  onOpenChange,
  offers,
  initialTab,
  onSave,
  onRemove,
}: EditOffersSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col gap-0 p-0">
        {/* The inner contents remount each time the sheet opens, so its
            local draft/tab state can be initialized fresh via useState
            (no setState-in-effect needed to sync prop changes). */}
        {open && (
          <SheetBody
            offers={offers}
            initialTab={initialTab}
            onSave={onSave}
            onRemove={onRemove}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface SheetBodyProps {
  offers: Offer[]
  initialTab?: string
  onSave: (offers: Offer[]) => void
  onRemove?: (offerId: string) => void
  onClose: () => void
}

function SheetBody({
  offers,
  initialTab,
  onSave,
  onRemove,
  onClose,
}: SheetBodyProps) {
  const [draft, setDraft] = useState<Offer[]>(offers)
  const [tab, setTab] = useState<string>(initialTab ?? offers[0]?.id ?? "")

  const updateOffer = (id: string, patch: (prev: Offer) => Offer) => {
    setDraft((curr) => curr.map((o) => (o.id === id ? patch(o) : o)))
  }

  return (
    <>
      <SheetHeader className="p-4 pr-10 sm:p-6 sm:pb-4 border-b border-slate-200">
        <SheetTitle>Edit offers</SheetTitle>
        <SheetDescription>
          All numbers feed the projection. Changes save when you hit Save.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4 max-w-full justify-start overflow-x-auto">
            {draft.map((o) => (
              <TabsTrigger key={o.id} value={o.id} className="shrink-0">
                <span
                  className="w-2 h-2 rounded-sm mr-2"
                  style={{ background: paletteFor(o.palette).accent }}
                />
                {o.company || "Untitled"}
              </TabsTrigger>
            ))}
          </TabsList>
          {draft.map((offer) => (
            <TabsContent key={offer.id} value={offer.id} className="space-y-6">
              <OfferForm
                offer={offer}
                onChange={(patch) => updateOffer(offer.id, patch)}
                onRemove={onRemove ? () => onRemove(offer.id) : undefined}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <SheetFooter className="border-t border-slate-200 p-4 grid grid-cols-2 sm:flex sm:flex-row sm:justify-end gap-2">
        <SheetClose asChild>
          <Button variant="outline">Cancel</Button>
        </SheetClose>
        <Button
          onClick={() => {
            onSave(draft)
            onClose()
          }}
        >
          Save changes
        </Button>
      </SheetFooter>
    </>
  )
}

interface OfferFormProps {
  offer: Offer
  onChange: (patch: (prev: Offer) => Offer) => void
  onRemove?: () => void
}

function OfferForm({ offer, onChange, onRemove }: OfferFormProps) {
  const setCompany = (value: string) =>
    onChange((prev) => ({ ...prev, company: value }))

  const setCash = <K extends keyof Offer["cash"]>(
    key: K,
    value: Offer["cash"][K],
  ) => onChange((prev) => ({ ...prev, cash: { ...prev.cash, [key]: value } }))

  const setEquityField = <K extends keyof Offer["equity"]>(
    key: K,
    value: Offer["equity"][K],
  ) =>
    onChange((prev) => ({ ...prev, equity: { ...prev.equity, [key]: value } }))

  const setMatch = <K extends keyof Offer["equity"]["match401k"]>(
    key: K,
    value: Offer["equity"]["match401k"][K],
  ) =>
    onChange((prev) => ({
      ...prev,
      equity: {
        ...prev.equity,
        match401k: { ...prev.equity.match401k, [key]: value },
      },
    }))

  const setBenefitsField = <
    K extends keyof Pick<
      Offer["benefits"],
      "stipends" | "dentalMonthlyPremium" | "visionMonthlyPremium" | "ptoWeeks"
    >,
  >(
    key: K,
    value: number,
  ) =>
    onChange((prev) => ({
      ...prev,
      benefits: { ...prev.benefits, [key]: value },
    }))

  const setParentalLeave = (pl: Offer["benefits"]["parentalLeave"]) =>
    onChange((prev) => ({
      ...prev,
      benefits: { ...prev.benefits, parentalLeave: pl },
    }))

  const updatePlan = (planId: string, patch: Partial<BenefitPlan>) =>
    onChange((prev) => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        plans: prev.benefits.plans.map((p) =>
          p.id === planId ? { ...p, ...patch } : p,
        ),
      },
    }))

  const addPlan = () =>
    onChange((prev) => {
      const plan = newPlan()
      return {
        ...prev,
        benefits: {
          ...prev.benefits,
          plans: [...prev.benefits.plans, plan],
          selectedPlanId: prev.benefits.selectedPlanId ?? plan.id,
        },
      }
    })

  const removePlan = (planId: string) =>
    onChange((prev) => {
      const plans = prev.benefits.plans.filter((p) => p.id !== planId)
      const selected =
        prev.benefits.selectedPlanId === planId
          ? plans[0]?.id ?? null
          : prev.benefits.selectedPlanId
      return {
        ...prev,
        benefits: {
          ...prev.benefits,
          plans,
          selectedPlanId: selected,
        },
      }
    })

  const replacePlans = (plans: BenefitPlan[]) =>
    onChange((prev) => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        plans,
        selectedPlanId: plans[0]?.id ?? null,
      },
    }))

  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importError, setImportError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <FieldGroup title="Company">
        <Field label="Company">
          <Input
            value={offer.company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <Separator />

      <FieldGroup title="Direct Comp">
        <NumField label="Base salary ($)" value={offer.cash.base} onChange={(v) => setCash("base", v)} />
        <NumField label="Sign-on bonus ($)" value={offer.cash.signOn} onChange={(v) => setCash("signOn", v)} />
        <NumField label="Annual bonus target (%)" value={offer.cash.bonusPct} onChange={(v) => setCash("bonusPct", clamp(v, 0, 100))} />
        <NumField label="Annual raise (%)" value={offer.cash.cola} onChange={(v) => setCash("cola", clamp(v, 0, 100))} />
        <NumField label="Sign-on equity ($ total)" value={offer.equity.signOnRsus} onChange={(v) => setEquityField("signOnRsus", v)} />
        <NumField label="Annual equity ($)" value={offer.equity.annualRefresher} onChange={(v) => setEquityField("annualRefresher", v)} />
      </FieldGroup>

      <Separator />

      <FieldGroup title="Indirect Comp">
        <Subhead>401(k) match</Subhead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField
            label="Match (%)"
            value={offer.equity.match401k.matchPct}
            onChange={(v) => setMatch("matchPct", clamp(v, 0, 300))}
          />
          <NumField
            label="Up to (% of salary)"
            value={offer.equity.match401k.upToSalaryPct}
            onChange={(v) => setMatch("upToSalaryPct", clamp(v, 0, 100))}
          />
        </div>
        <Subhead>Paid parental leave</Subhead>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField
            label="Weeks"
            value={offer.benefits.parentalLeave?.weeks ?? 0}
            onChange={(v) => {
              const weeks = clamp(v, 0, 104)
              if (weeks <= 0) return setParentalLeave(null)
              setParentalLeave({
                weeks,
                ratePct: offer.benefits.parentalLeave?.ratePct ?? 100,
              })
            }}
          />
          <NumField
            label="Rate (% of base)"
            value={offer.benefits.parentalLeave?.ratePct ?? 0}
            onChange={(v) => {
              const ratePct = clamp(v, 0, 100)
              if (!offer.benefits.parentalLeave) return
              setParentalLeave({
                weeks: offer.benefits.parentalLeave.weeks,
                ratePct,
              })
            }}
          />
        </div>
        <Subhead>Paid time off</Subhead>
        <NumField
          label="PTO weeks"
          value={offer.benefits.ptoWeeks}
          onChange={(v) => setBenefitsField("ptoWeeks", clamp(v, 0, 52))}
        />
        <Subhead>Annual cash stipends</Subhead>
        <NumField
          label="Stipends ($/yr)"
          value={offer.benefits.stipends}
          onChange={(v) => setBenefitsField("stipends", v)}
        />
      </FieldGroup>

      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">
            Benefits — Plans
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImportOpen((v) => !v)
                setImportError(null)
              }}
            >
              {importOpen ? "Cancel import" : "Import plans…"}
            </Button>
            <Button variant="outline" size="sm" onClick={addPlan}>
              <Plus size={14} />
              Add plan
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Add each combination of plan level (Bronze/Silver/Gold/etc.) and
          coverage tier (Employee, Family, etc.) you're considering. You'll pick
          which one to chart from the comparison view.
        </p>
        {importOpen && (
          <div className="mb-4 rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
            <Label htmlFor="plans-import-textarea" className="text-xs text-slate-600 leading-snug">
              Paste tab-separated rows with columns:{" "}
              <span className="font-mono">
                Type · Tier · Premium · Deductible · OOP Maximum · HSA Funding
              </span>
              . A header row is optional.
            </Label>
            <textarea
              id="plans-import-textarea"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`Employee\tGold\t0\t0\t3000\t0\nEmployee\tSilver\t0\t750\t8850\t0\n…`}
              rows={6}
              aria-describedby={importError ? "plans-import-error" : undefined}
              className="w-full text-xs font-mono rounded-md border border-slate-200 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            {importError && (
              <p
                id="plans-import-error"
                role="alert"
                className="text-xs text-rose-600"
              >
                {importError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const result = parsePlansText(importText)
                  if ("error" in result) {
                    setImportError(result.error)
                    return
                  }
                  replacePlans(result)
                  setImportText("")
                  setImportError(null)
                  setImportOpen(false)
                }}
              >
                Replace plans
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          {offer.benefits.plans.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              No plans yet. Click "Add plan" to enter one.
            </p>
          ) : (
            offer.benefits.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onChange={(patch) => updatePlan(plan.id, patch)}
                onRemove={() => removePlan(plan.id)}
                canRemove={offer.benefits.plans.length > 1}
              />
            ))
          )}
        </div>
      </div>

      <FieldGroup title="Benefits — Dental & Vision">
        <NumField
          label="Dental premium ($/mo)"
          value={offer.benefits.dentalMonthlyPremium}
          onChange={(v) => setBenefitsField("dentalMonthlyPremium", v)}
        />
        <NumField
          label="Vision premium ($/mo)"
          value={offer.benefits.visionMonthlyPremium}
          onChange={(v) => setBenefitsField("visionMonthlyPremium", v)}
        />
      </FieldGroup>

      {onRemove && (
        <>
          <Separator />
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onRemove}>
              <Trash2 size={14} />
              Remove this offer
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function Subhead({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-medium text-slate-700">
      {children}
    </div>
  )
}

function FieldGroup({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-3">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Label className="flex flex-col items-stretch gap-1.5 text-xs font-medium text-slate-600">
      <span>{label}</span>
      {children}
    </Label>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="numeric"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const n = Number(e.target.value)
          onChange(Number.isFinite(n) ? n : 0)
        }}
        className="tabular-nums"
      />
    </Field>
  )
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function PlanCard({
  plan,
  onChange,
  onRemove,
  canRemove,
}: {
  plan: BenefitPlan
  onChange: (patch: Partial<BenefitPlan>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <Field label="Plan level">
          <Input
            value={plan.level}
            placeholder="Bronze / Silver / Gold"
            onChange={(e) => onChange({ level: e.target.value })}
          />
        </Field>
        <Field label="Coverage tier">
          <select
            value={plan.coverage}
            onChange={(e) =>
              onChange({ coverage: e.target.value as CoverageTier })
            }
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {COVERAGE_TIERS.map((c) => (
              <option key={c} value={c}>
                {COVERAGE_TIER_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        {canRemove && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRemove}
            aria-label="Remove plan"
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <NumField
          label="Medical premium ($/mo)"
          value={plan.medicalMonthlyPremium}
          onChange={(v) => onChange({ medicalMonthlyPremium: v })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField
            label="Annual deductible ($)"
            value={plan.medicalDeductible}
            onChange={(v) => onChange({ medicalDeductible: v })}
          />
          <NumField
            label="OOP max ($)"
            value={plan.medicalOopMax}
            onChange={(v) => onChange({ medicalOopMax: v })}
          />
        </div>
        <NumField
          label="HSA employer contribution ($/yr)"
          value={plan.hsaContribution}
          onChange={(v) => onChange({ hsaContribution: v })}
        />
      </div>
    </div>
  )
}
