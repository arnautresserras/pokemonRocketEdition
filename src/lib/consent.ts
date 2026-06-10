import { initAnalytics } from './analytics'
import { initSentry } from './sentry'

export const CONSENT_KEY = 'pkmn-rocket:consent'
export type Consent = 'granted' | 'denied'

/** Read the stored consent choice, or null if the user hasn't chosen yet. */
export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    const value = raw !== null ? (JSON.parse(raw) as unknown) : null
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

/** Initialize analytics + crash reporting. Safe to call multiple times (idempotent). */
export function initTracking() {
  initAnalytics()
  initSentry()
}
