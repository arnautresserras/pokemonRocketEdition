import * as Sentry from '@sentry/react'

const DSN = import.meta.env.VITE_SENTRY_DSN

let initialized = false

/**
 * Initialize Sentry crash reporting. Called only after the user grants consent
 * and only when a DSN is configured — local dev without keys stays quiet.
 */
export function initSentry() {
  if (initialized || !DSN) return
  Sentry.init({
    dsn: DSN,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    environment: import.meta.env.MODE,
  })
  initialized = true
}

/** Report an exception to Sentry. No-ops until Sentry is initialized. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
