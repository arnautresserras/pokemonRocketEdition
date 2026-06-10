import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import ConsentBanner from './components/ConsentBanner'
import { readConsent, initTracking } from './lib/consent'

// If the user already granted consent in a prior session, start tracking now.
if (readConsent() === 'granted') initTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <ConsentBanner />
    </ErrorBoundary>
  </StrictMode>,
)
