# OfferLens Architecture

OfferLens is a browser-only job-offer comparison app. There is no backend:
offers are stored in `localStorage`, and sharing encodes the current app state
into the URL hash.

## Mental Model

The app has three layers:

- `src/lib/*`: domain logic and persistence. These files should be readable
  without knowing React.
- `src/components/*`: reusable UI pieces. Components should mostly receive
  already-shaped data and render it.
- `src/routes/ComparePage.tsx`: the page-level coordinator. It owns app state,
  persistence, sharing, and the main screen layout.

## State Flow

On first render, `ComparePage` chooses state in this order:

1. Decode `#s=...` from the URL, if present.
2. Load the last saved state from `localStorage`.
3. Fall back to sample offers.

After that, every state change is saved back to `localStorage`.

Share links are plaintext base64 JSON in the URL hash. The hash is useful
because it is not sent to the server, but the link still contains compensation
details. Treat a share link like a screenshot of the offers.

## Domain Files

- `src/lib/types.ts`: TypeScript shapes for offers, cash, equity, benefit
  plans, and projections.
- `src/lib/projection.ts`: direct compensation and equity projection math.
- `src/lib/benefits.ts`: benefit plan selection, premiums, benefit gain/cost
  segments, and totals used by charts.
- `src/lib/plansImport.ts`: parser for pasted health-plan tables.
- `src/lib/share.ts`: URL hash encoding/decoding.
- `src/lib/storage.ts`: `localStorage` load/save and schema version handling.
- `src/lib/sample.ts`: starter offers shown on first load.

## Product Math

The projection math is intentionally simple and explainable:

- Cash = base + target bonus + first-year sign-on cash.
- Base and bonus grow by the offer's annual raise percentage.
- Sign-on RSUs vest evenly across four years.
- Annual refreshers are modeled as four-year grants that begin vesting the year
  after each grant.
- 401(k) match is based on that year's salary after annual raise.
- Parental leave is counted once in year one as salary-equivalent value.
- PTO is counted as salary-equivalent weekly value.
- Worst-case medical cost is shown as annual premiums + deductible + remaining
  OOP risk after deductible.

These are estimates for comparison, not payroll-grade calculations.

## Intentional Simplifications

- There are no app-wide projection assumptions today. All values come directly
  from each offer.
- Schema migrations currently reset to sample data when the schema version
  changes. That is acceptable for beta, but unfriendly once real users rely on
  saved local data.
- Share payloads have light validation. For a small personal app this is fine,
  but a larger public app should normalize or reject malformed offer objects.

## How To Change The App Safely

When changing money or benefit behavior, start in `src/lib/projection.ts` or
`src/lib/benefits.ts`, then update the relevant tests. UI components should not
invent their own formulas.

When changing persistence or sharing, check both `src/lib/storage.ts` and
`src/lib/share.ts`; they represent two ways the same app state can enter the
page.
