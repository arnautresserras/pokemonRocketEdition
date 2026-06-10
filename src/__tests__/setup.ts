import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Stub analytics so tests never fire real Mixpanel/Sentry events in CI.
vi.mock('../lib/analytics', () => ({
  initAnalytics: vi.fn(),
  trackEvent: vi.fn(),
  optIn: vi.fn(),
  optOut: vi.fn(),
}))

vi.mock('../lib/sentry', () => ({
  initSentry: vi.fn(),
  captureException: vi.fn(),
}))
