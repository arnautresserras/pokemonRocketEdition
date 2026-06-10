import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'

/**
 * Fire a `page_view` event on every route change. Mounted once inside App.
 * Works around HashRouter, whose route changes Mixpanel's auto-pageview misses.
 */
export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    trackEvent('page_view', { path: location.pathname })
  }, [location.pathname])
}
