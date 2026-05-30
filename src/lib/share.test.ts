import { describe, expect, it } from "vitest"
import { encodeShareUrl, tryDecodeShareHash } from "./share"
import { SAMPLE_OFFERS } from "./sample"
import type { PersistedState } from "./storage"

const STATE: PersistedState = {
  schemaVersion: 9,
  offers: SAMPLE_OFFERS,
}

describe("share URL roundtrip", () => {
  it("encodes and decodes a state losslessly", () => {
    // jsdom provides window.location with origin/pathname for encodeShareUrl.
    const url = encodeShareUrl(STATE)
    expect(url).toContain("#s=")
    const hash = "#s=" + url.split("#s=")[1]
    const decoded = tryDecodeShareHash(hash)
    expect(decoded).not.toBeNull()
    expect(decoded?.offers).toEqual(STATE.offers)
    expect(decoded?.schemaVersion).toBe(STATE.schemaVersion)
  })

  it("returns null for an empty hash", () => {
    expect(tryDecodeShareHash("")).toBeNull()
  })

  it("returns null for a hash without the prefix", () => {
    expect(tryDecodeShareHash("#other=foo")).toBeNull()
  })

  it("returns null for a corrupt payload", () => {
    expect(tryDecodeShareHash("#s=notvalidbase64!!!")).toBeNull()
  })

  it("returns null when the decoded payload is missing required fields", () => {
    // Encode a payload with only `v` set.
    const partial = btoa(JSON.stringify({ v: 9 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
    expect(tryDecodeShareHash(`#s=${partial}`)).toBeNull()
  })
})
