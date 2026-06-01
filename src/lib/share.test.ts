import { describe, expect, it } from "vitest"
import { encodeShareUrl, tryDecodeShareHash } from "./share"
import { SAMPLE_OFFERS } from "./sample"
import type { PersistedState } from "./storage"

const STATE: PersistedState = {
  schemaVersion: 9,
  offers: SAMPLE_OFFERS,
  view: {
    showDirectComp: true,
    showBenefits: false,
  },
}

describe("share URL roundtrip", () => {
  it("encodes and decodes a state losslessly", () => {
    // jsdom provides window.location with origin/pathname for encodeShareUrl.
    const url = encodeShareUrl(STATE)
    expect(url).toContain("#v2=")
    const hash = "#v2=" + url.split("#v2=")[1]
    const decoded = tryDecodeShareHash(hash)
    expect(decoded).not.toBeNull()
    expect(decoded?.offers).toEqual(STATE.offers)
    expect(decoded?.schemaVersion).toBe(STATE.schemaVersion)
    expect(decoded?.view).toEqual(STATE.view)
  })

  it("uses a shorter v2 payload than the legacy full JSON payload", () => {
    const url = encodeShareUrl(STATE)
    const v2Payload = url.split("#v2=")[1]
    const legacyPayload = btoa(
      JSON.stringify({
        v: STATE.schemaVersion,
        o: STATE.offers,
        c: STATE.view,
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    expect(v2Payload.length).toBeLessThan(legacyPayload.length)
  })

  it("defaults missing view config to showing all cards", () => {
    const legacyPayload = btoa(JSON.stringify({ v: 9, o: SAMPLE_OFFERS }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    expect(tryDecodeShareHash(`#s=${legacyPayload}`)?.view).toEqual({
      showDirectComp: true,
      showBenefits: true,
    })
  })

  it("prevents shared state from hiding every card type", () => {
    const hiddenPayload = btoa(
      JSON.stringify({
        v: 9,
        o: SAMPLE_OFFERS,
        c: { showDirectComp: false, showBenefits: false },
      }),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")

    expect(tryDecodeShareHash(`#s=${hiddenPayload}`)?.view).toEqual({
      showDirectComp: true,
      showBenefits: true,
    })
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
