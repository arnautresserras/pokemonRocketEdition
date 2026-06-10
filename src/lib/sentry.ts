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
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    // Low-traffic community app — sample every page load for useful perf data.
    tracesSampleRate: 1.0,
    // Don't replay routine sessions, but always capture the session that errored.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  })
  initialized = true
}

/** Report an exception to Sentry. No-ops until Sentry is initialized. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}
