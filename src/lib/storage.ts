import type { Offer } from "./types"
import { SAMPLE_OFFERS } from "./sample"

const STORAGE_KEY = "offerlens:state"
const SCHEMA_VERSION = 10

export interface ViewConfig {
  showDirectComp: boolean
  showBenefits: boolean
}

export interface PersistedState {
  schemaVersion: number
  offers: Offer[]
  view: ViewConfig
}

interface RawPersisted {
  schemaVersion?: number
  offers?: Offer[]
  view?: Partial<ViewConfig>
}

export const DEFAULT_VIEW_CONFIG: ViewConfig = {
  showDirectComp: true,
  showBenefits: true,
}

export const DEFAULT_STATE: PersistedState = {
  schemaVersion: SCHEMA_VERSION,
  offers: SAMPLE_OFFERS,
  view: DEFAULT_VIEW_CONFIG,
}

export function loadState(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as RawPersisted
    return migrate(parsed)
  } catch {
    return DEFAULT_STATE
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }),
    )
  } catch {
    // quota or privacy mode — silently ignore
  }
}

export function resetState(): PersistedState {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
  }
  return DEFAULT_STATE
}

function migrate(raw: RawPersisted): PersistedState {
  // TODO: write real per-version migrations. Right now every schema bump
  // discards user data and reseeds with sample offers — which is OK while the
  // user base is small but will be hostile once people care about their data.
  if ((raw.schemaVersion ?? 1) < SCHEMA_VERSION) return DEFAULT_STATE
  const offers =
    Array.isArray(raw.offers) && raw.offers.length > 0
      ? raw.offers
      : SAMPLE_OFFERS
  return {
    schemaVersion: SCHEMA_VERSION,
    offers,
    view: normalizeViewConfig(raw.view),
  }
}

export function normalizeViewConfig(view?: Partial<ViewConfig>): ViewConfig {
  const normalized = {
    showDirectComp: view?.showDirectComp ?? DEFAULT_VIEW_CONFIG.showDirectComp,
    showBenefits: view?.showBenefits ?? DEFAULT_VIEW_CONFIG.showBenefits,
  }
  if (!normalized.showDirectComp && !normalized.showBenefits) {
    return DEFAULT_VIEW_CONFIG
  }
  return normalized
}
