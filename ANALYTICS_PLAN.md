# Analytics, Feature Usage & Crash Detection — Implementation Plan

> Plan for instrumenting the PKMN_Rocket web app (React 18 SPA, Vite 6, HashRouter,
> TypeScript, static deployment) ahead of sharing it with the Pokémon Team Rocket
> Edition community.

## Chosen tools (all free tiers)

| Need | Tool | Why |
|---|---|---|
| Crash / error detection | **Sentry** | Gold standard. Free tier (5k errors/mo), first-class React + Vite SDK, source maps, release tracking. |
| Product analytics + feature usage + event tracking | **Mixpanel** | Free tier (1M events/mo), custom events, funnels, retention, 10k session replays/mo. No project-count limit. EU residency available (GDPR-friendly). |

> **Why not PostHog?** PostHog's free tier caps you at **1 project**, which is already
> in use for a separate product. Mixpanel bills on event volume rather than project
> count, so a fresh project for this app is free.

**Consent model:** opt-in consent banner — tracking only initializes after the user accepts (GDPR-friendly for EU community members).

**Assets already in the repo we reuse:**
- `src/utils/useLocalStorage.ts` — stores the consent choice.
- `src/components/ErrorBoundary.tsx` — its `componentDidCatch` is the hook point for Sentry.

---

## Phase 1 — Account signup & creation *(owner: you)*

### Sentry (crash detection)
1. Sign up at https://sentry.io (free Developer plan).
2. Create a new project → platform **React**.
3. Copy the **DSN** (e.g. `https://abc123@o456.ingest.sentry.io/789`).
4. *(Optional, for readable stack traces)* Settings → Auth Tokens → create a token with
   `project:releases` scope; note your **org slug** + **project slug** for source-map upload.

### Mixpanel (analytics + feature usage)
1. Sign up at https://mixpanel.com — when creating the project, choose **EU data
   residency** (best for GDPR / EU community).
2. Project Settings → copy the **Project Token**.
3. Note the EU API host: `https://api-eu.mixpanel.com` (use `https://api.mixpanel.com`
   for US residency).

> These values are build-time **public** keys — safe to ship in a client bundle.

---

## Phase 2 — Add the tools to the project

```bash
npm install @sentry/react mixpanel-browser
npm install -D @types/mixpanel-browser
```

Environment setup (Vite only exposes `VITE_`-prefixed vars to the client):
- Create `.env.local` (real values) and ensure it is in `.gitignore`.
- Create `.env.example` (committed, placeholders):
  ```
  VITE_SENTRY_DSN=
  VITE_MIXPANEL_TOKEN=
  VITE_MIXPANEL_HOST=https://api-eu.mixpanel.com
  ```
- Add `ImportMetaEnv` type definitions to `src/vite-env.d.ts`.

> **Deployment note:** this is a static build — env vars are baked in at `npm run build`
> time, so they must be set in the host's build environment (Netlify / Vercel /
> GitHub Actions), not just locally.

---

## Phase 3 — Code: init, consent, tracking

1. **Consent gate** — `src/components/ConsentBanner.tsx`
   - Dismissible banner styled to match the `dex` theme.
   - Stores choice via existing `useLocalStorage` hook (`pkmn-rocket:consent` = `granted | denied`).
   - Tracking initializes **only** after "Accept".

2. **Analytics module** — `src/lib/analytics.ts`
   - `initAnalytics()` → `mixpanel.init(token, { api_host, track_pageview: false, persistence: 'localStorage' })`.
     Auto-pageviews disabled because `HashRouter` route changes aren't reliably captured — fired manually instead.
   - `trackEvent(name, props?)` → wrapper around `mixpanel.track`; no-ops if consent not granted.
   - `optOut()` / `optIn()` helpers (`mixpanel.opt_out_tracking()` / `opt_in_tracking()`) wired to the banner.

3. **Sentry module** — `src/lib/sentry.ts`
   - `initSentry()` → `Sentry.init({ dsn, integrations: [browserTracingIntegration()], tracesSampleRate: 0.1, environment: import.meta.env.MODE })`.
   - Called only after consent and only if a DSN is present (so local dev without keys stays quiet).

4. **Wire into `src/main.tsx`**
   - On load, read stored consent; if granted, `initAnalytics()` + `initSentry()`.
   - Render `<ConsentBanner />`.

5. **Page-view tracking** — `src/hooks/usePageTracking.ts`
   - Uses `useLocation()` to fire `mixpanel.track('page_view', { path })` on every route change (works around HashRouter).
   - Mounted once inside `App`.

6. **Crash reporting into the existing ErrorBoundary**
   - In `componentDidCatch`, add `Sentry.captureException(error, { extra: info })` alongside the existing `console.error`. Keeps the custom fallback UI.

7. **Feature-usage events** (all consent-gated automatically):

   | Event | Where |
   |---|---|
   | `pokemon_viewed` (with species) | `src/pages/PokedexPage.tsx` on detail open |
   | `global_search` (with query length) | `src/components/GlobalSearch.tsx` |
   | `guide_section_viewed` (region, section) | `src/pages/GuidePage.tsx` |
   | `move_diff_viewed` | `src/pages/MovesPage.tsx` |
   | `nav_clicked` (destination) | `src/components/Sidebar.tsx` / MobileNav |

---

## Phase 4 — Test that collection works

1. **Local dev:** `npm run dev`, accept consent, open Network tab → confirm requests to
   `api-eu.mixpanel.com` and `ingest.sentry.io`. Pass `{ debug: true }` to `mixpanel.init`
   to log events to the console.
2. **Mixpanel live view:** project → *Events* (live feed) → confirm `page_view` and custom
   events appear within seconds.
3. **Sentry test:** temporarily throw inside a component (or call `Sentry.captureMessage('test')`)
   → confirm the issue lands in Sentry → revert.
4. **Consent flow:** clear localStorage → "Decline" → confirm **zero** network calls to either
   service; "Accept" → confirm events resume.
5. **Existing tests:** stub `src/lib/analytics.ts` in `src/__tests__/setup.ts` so `npm test` stays
   green and no real events fire in CI.
6. **Production build:** `npm run build && npm run preview` with env vars set → verify events still
   flow (catches missing build-time env vars).

---

## Sequencing notes

- Phases 2–3 can be implemented immediately; code references env vars by name and stays dormant
  (no-op) until the real keys from Phase 1 are present.
- This lets account signup (Phase 1) proceed in parallel with implementation.
