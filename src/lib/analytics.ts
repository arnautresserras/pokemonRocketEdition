import mixpanel from 'mixpanel-browser'

const TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN
const HOST = import.meta.env.VITE_MIXPANEL_HOST ?? 'https://api-eu.mixpanel.com'

let initialized = false

/**
 * Initialize Mixpanel. Called only after the user grants consent and only when
 * a token is configured — local dev without keys stays a no-op.
 *
 * Auto-pageviews are disabled because HashRouter route changes aren't reliably
 * captured by the SDK; we fire `page_view` manually via usePageTracking.
 */
export function initAnalytics() {
  if (initialized || !TOKEN) return
  mixpanel.init(TOKEN, {
    api_host: HOST,
    track_pageview: false,
    persistence: 'localStorage',
    debug: import.meta.env.DEV,
  })
  initialized = true
}

/** Track a custom event. No-ops until analytics is initialized (consent granted). */
export function trackEvent(name: string, props?: Record<string, unknown>) {
  if (!initialized) return
  mixpanel.track(name, props)
}

/** Stop tracking and drop the user's distinct id (wired to "Decline"). */
export function optOut() {
  if (!TOKEN) return
  if (initialized) mixpanel.opt_out_tracking()
}

/** Resume tracking after a prior opt-out (wired to "Accept"). */
export function optIn() {
  if (!initialized) return
  mixpanel.opt_in_tracking()
}
