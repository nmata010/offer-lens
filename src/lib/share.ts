import type { PersistedState } from "./storage"

// URL-safe base64 of UTF-8 JSON, in the hash fragment so it never hits the server.
const HASH_PREFIX = "#s="

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
  const payload = {
    v: state.schemaVersion,
    o: state.offers,
  }
  const encoded = toBase64Url(JSON.stringify(payload))
  const { origin, pathname } = window.location
  return `${origin}${pathname}${HASH_PREFIX}${encoded}`
}

export function tryDecodeShareHash(hash: string): PersistedState | null {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null
  try {
    const json = fromBase64Url(hash.slice(HASH_PREFIX.length))
    const parsed = JSON.parse(json) as {
      v?: number
      o?: PersistedState["offers"]
    }
    if (!parsed.o) return null
    return {
      schemaVersion: parsed.v ?? 1,
      offers: parsed.o,
    }
  } catch {
    return null
  }
}
