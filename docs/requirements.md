# OfferLens Requirements

This document captures what OfferLens is supposed to do. It is written for a
future maintainer returning to the project after the context has gone cold.

## Product Goal

OfferLens helps compare job offers beyond base salary. It should make fuzzy
offer components easier to reason about: equity, 401(k), paid leave, PTO,
stipends, health-plan costs, and worst-case medical risk.

The app is a lightweight comparison aid, not a payroll calculator, financial
advisor, or benefits enrollment system.

## Target User

The primary user is someone comparing a small number of job offers for
themselves. The app should work well for one to four offers and remain usable
with more via horizontal scrolling.

The expected usage pattern is private and local: enter offer details, compare,
optionally create a share link, and revisit the same browser later.

## Core Requirements

### Offer Comparison

- The app must support multiple offers.
- Each offer must include company name, palette, direct cash inputs, equity
  inputs, benefit plans, PTO, paid parental leave, stipends, dental premium, and
  vision premium.
- The comparison page must show direct compensation and benefits side by side.
- Users must be able to add, edit, and remove offers.
- Users must be able to globally show or hide direct compensation cards and
  benefits cards.
- At least one card type must remain visible; users must not be able to hide
  every card type.

### Direct Compensation

- Direct compensation must include base salary, target bonus, sign-on bonus,
  sign-on equity, annual equity, annual raise, and 401(k) match inputs.
- First-year direct comp cards must show cash, equity, total first-year comp,
  four-year total, and comparison delta.
- The app should favor readable, explainable estimates over payroll-grade
  precision.

### Benefits Chart

- Benefits charts must be rendered per offer.
- Each chart title must identify the related offer, e.g. `Stripe benefits`.
- The benefits chart must use stacked bars with positive benefit value above
  zero and benefit costs below zero.
- Positive benefit segments must be ordered bottom-up as:
  1. 401(k) match
  2. HSA employer fund
  3. Annual stipends
  4. PTO
  5. Paid parental leave
- Positive groups must be represented in-chart with bracket annotations and
  totals:
  - Cash value: 401(k), HSA, stipends
  - Time value: PTO, parental leave
- Cost groups must be represented in-chart with bracket annotations and totals:
  - Expected cost: premiums, deductible
  - Max risk: remaining OOP risk after deductible
- Paid parental leave should appear visually conditional because not every user
  will realize that value.
- OOP max should appear visually conditional because it represents downside
  risk, not expected spend.
- Small adjacent segments must remain visually distinguishable.

### Benefit Cost Math

- Annual premiums must include medical, dental, and vision premiums.
- Medical premiums come from the selected medical plan.
- Dental and vision premiums are offer-level monthly inputs.
- The deductible segment must use the selected plan's medical deductible.
- The max-risk segment must be net of deductible:
  `medicalOopMax - medicalDeductible`, floored at zero.
- Benefit cost totals must not double-count deductible and OOP max.

### Health Plans

- Each offer may define multiple medical plans.
- Plans must include coverage tier, plan level, monthly medical premium,
  deductible, OOP max, and HSA employer funding.
- Users must be able to select coverage tier and plan level from the comparison
  view.
- Users must be able to paste/import tabular plan data into the edit sheet.

### Persistence And Sharing

- The app must run entirely in the browser.
- There must be no backend, accounts, or database.
- Offer state must be saved to `localStorage`.
- Share links must encode the comparison state into the URL hash.
- Share links must include global card visibility configuration.
- Bad share links should fail gracefully and fall back to saved/default state.
- Share links should be treated as sensitive because they contain compensation
  details.

### Layout And Responsiveness

- Desktop and tablet layouts should preserve side-by-side comparison.
- When there are too many offers to fit, the comparison area should scroll
  horizontally instead of compressing cards until chart labels collide.
- Very narrow screens may use vertically stacked offer sections.
- The benefits chart annotations should stay visually attached to the relevant
  bar and should not block hover tooltips.

### Accessibility

- Form fields must have usable labels.
- Chart plan selectors must include offer names in their accessible labels.
- Charts must include an accessible summary of the same values shown visually.
- Status/toast messages should be exposed with appropriate roles.

## Non-Goals

- No backend services.
- No authentication.
- No payroll-grade tax, vesting, or benefit modeling.
- No personalized financial advice.
- No analytics by default.
- No per-offer show/hide controls for card types; visibility is global.

## Known Simplifications

- Schema migrations currently reset saved data on version bumps instead of
  migrating old state.
- Share payload validation is intentionally light.
- Equity vesting assumptions are simplified.
- PTO and parental leave are salary-equivalent estimates, not guaranteed cash.
- Google Fonts are loaded from a third party unless fonts are self-hosted later.

## Release Expectations

Before release, the app should pass:

```bash
npm run lint
npm run build
npm test -- --run
```

The README screenshot should reflect the current UI if the benefits chart,
layout, or primary controls have changed.
