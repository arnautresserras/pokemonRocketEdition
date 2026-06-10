# PKMN_Rocket — Improvement Plan

## Context

PKMN_Rocket is a React SPA (Vite + TypeScript + Tailwind) that turns the Spanish
documentation in `docs/*.txt` into a searchable Pokédex-style reference for a
Pokémon ROM hack. A build-time parser (`scripts/generate.ts`) converts the docs
into `src/data/*.json`, which the app loads eagerly.

The app is already feature-rich and well-built: HashRouter (correct for the
GitHub Pages subpath `/pokemonRocketEdition/`), virtualized lists, strict
TypeScript, a clean CI/deploy workflow, and five sections (Pokédex, Moves &
Items, Guide, Types, Natures). This plan addresses the rough edges that surface
during real use and adds capabilities that matter to **players mid-playthrough**
— the primary audience, who use the app for quick lookups (where do I get X,
what's this trainer's team, what changed in this move).

The work is split into two phases:
1. **Bugfixes & improvements** to existing features (correctness, polish, data accuracy, infra).
2. **New features** that add net-new value, prioritized for in-playthrough use.

Verify findings before acting — line numbers below are from exploration and may
drift; re-confirm with the file open. Run `npm run parse` after any `docs/` or
parser change, since the app reads the generated JSON, not the raw text.

---

## Phase 1 — Bugfixes & Improvements

### 1.1 User-facing bugs & polish (highest priority — players hit these daily) ✅ Done

- **Broken-sprite fallback.** ✅ `PokemonRow` and `PokemonDetail` in
  [PokedexPage.tsx](src/pages/PokedexPage.tsx) now track a local `spriteError`
  state; on error, a `◉` placeholder is rendered instead of a blank box.
- **Empty state on filtered lists.** ✅ Shared `EmptyState` component added at
  [src/components/EmptyState.tsx](src/components/EmptyState.tsx) (icon + message +
  "Limpiar filtros" button). Rendered in PokedexPage, MovesPage (moves, MTs, items),
  and GuidePage (replaces the ad-hoc "Sin resultados" div).
- **Search debounce.** ✅ `useDebouncedValue` hook added at
  [src/utils/useDebounce.ts](src/utils/useDebounce.ts). Used in PokedexPage,
  MovesPage, and GuidePage — the input updates immediately, expensive filtering
  waits 150 ms.
- **Error boundary.** ✅ `ErrorBoundary` class component added at
  [src/components/ErrorBoundary.tsx](src/components/ErrorBoundary.tsx) and wraps
  `<App/>` in [main.tsx](src/main.tsx). Shows a friendly recovery screen with a
  "Reintentar" button.
- **Mobile: type chart overflow.** ✅ `TypesPage` defaults to the Calculator view
  on screens < 768 px; `ChartView` shows a "← Desliza →" hint on mobile.
- **Brittle category/region string matching.** ✅ `categoryLabel()` in
  [src/utils/items.ts](src/utils/items.ts) replaced with an explicit lookup map
  keyed on the exact strings the parser emits (verified against `items.json`).
  `mtRegionKey()` in [MovesPage.tsx](src/pages/MovesPage.tsx) replaced with a
  direct lookup map keyed on the exact `mt.region` values from `mts.json`.
  Tests in `utils.test.ts` updated accordingly.

### 1.2 Data accuracy (parser robustness — wrong data misleads players) ✅ Done

`scripts/generate.ts` parses free-form Spanish text with rigid regexes. Hardened
the fragile points and surface what fails instead of silently dropping it:

- **Header/label matching now tolerant.** ✅ Ability regex changed from
  `/Habilidades?:/` (which silently missed the singular `Habilidad:` form) to
  `/Habilidad(?:es)?:/`. Location parser now handles both the standard
  `NAME - NUM - desc` format and the malformed `NAME NUM - desc` variant
  (fixed MACHAMP #68, which lacked the first dash). Digits allowed in Pokémon
  names (fixed PORYGON2 #233, previously dropped entirely).
- **Stop silent fallbacks.** ✅ `parseWarnings` collector added; prints a summary
  at the end of `npm run parse` with any unmatched lines. Stats entries with no
  dex-number resolution also emit a warning. `abilities` init changed from `[]`
  to `undefined` so "no data" is now distinguishable from "empty list".
- **Data gaps closed.** ✅ All 26 previously dex-numberless entries resolved:
  - **Name normalization** (`normalizeName()`: underscore→dash, lowercase) fixed
    PORYGON-Z/PORYGON_Z mismatch.
  - **`LOCATION_NAME_ALIASES`** fixed the HONCHCROW/HONCHKROW spelling split.
  - **`FORM_DEX_NUMBERS`** supplies dex numbers for regional forms/variants absent
    from the location file (WEEZING-GALAR=110, DARMANITAN forms=555,
    LYCANROC forms=745, VIKABOLT=738).
  - **`CANONICAL_REGIONAL_API_SLUGS`** maps form names to the correct PokéAPI
    endpoint so type enrichment returns form-specific types (e.g.
    WEEZING-GALAR → Veneno/Hada, not Veneno from the base form).
  - **Duplicate dedup** updated to use normalized names, preventing phantom
    entries when location-file and stats-file spellings differ.
  - Result after `npm run parse`: 0 Pokémon with no dex number (non-mega),
    0 Pokémon with no types, 112 `abilities: []` → `abilities: undefined`
    (correctly signals "not documented" rather than "empty").
  - Also added: PORYGON2 (#233) was completely absent; now parsed correctly.
- **`MoveVersion.powerValue`.** ✅ Added `powerValue: number | null` to
  [MoveVersion](src/types/index.ts#L25-L31): parsed numeric power for sorting/
  calculations, `null` for non-numeric strings like "KO en un golpe". Raw `power`
  string kept for display.

### 1.3 Code quality & infra (maintainability) ✅ Done

- **Add ESLint + Prettier.** ✅ `eslint.config.js` (flat config: typescript-eslint +
  react-hooks) and `.prettierrc` added. `npm run lint` and `npm run format` scripts live
  in `package.json`. `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`,
  `prettier`, `eslint-config-prettier` installed as devDependencies.
- **Add Vitest + smoke tests.** ✅ `vitest.config.ts` added (jsdom + globals). 28 tests
  across three files: `src/__tests__/parser.test.ts` (parser output shape), 
  `src/__tests__/utils.test.ts` (`getTypeColor`, `getEffectiveTotal`, `categoryLabel`),
  `src/__tests__/pages.test.tsx` (render smoke test for all 5 pages). `npm run test`
  script added.
- **Centralize duplicated constants.** ✅ `src/constants/index.ts` now exports
  `REGION_COLORS`, `STAT_MAX = 255`, `TOTAL_MAX = 800`. `GuidePage` imports
  `REGION_COLORS` from there; `PokedexPage` and `StatBar` use `STAT_MAX`/`TOTAL_MAX`.
- **Extract oversized components.** Skipped as incidental — deferred to Phase 1.1/1.2
  edits where the components will be touched anyway.
- **Confirm `better-sqlite3`/`sharp` stay out of the browser bundle.** ✅ Grep of
  `src/**` confirmed zero imports. Bundle stays clean.

---

## Phase 2 — New Features (prioritized for players mid-playthrough)

### Tier 1 — Directly speeds up playthrough lookups

1. **Favorites / "mi equipo" pins.** Let players star Pokémon, moves, and items;
   persist to `localStorage` and surface a "Favoritos" filter. Lets a player pin
   their current team and the items they're hunting. Add a small `useLocalStorage`
   hook and a star toggle on rows/detail headers.
2. **Guide progress tracker.** In [GuidePage.tsx](src/pages/GuidePage.tsx), add a
   per-battle "completado" checkbox persisted to `localStorage`, plus a per-region
   progress bar (`x/y combates`). This is the single biggest win for someone
   playing through — they can see where they are.
3. **Deep-linkable detail + cross-links.** Make Pokémon/move/item/trainer detail
   addressable via the hash route (e.g. `#/pokedex/charizard`) so lookups are
   shareable and survive refresh. Then cross-link: a Pokémon's evolution/location
   text and a trainer's Pokémon link straight to the relevant Pokédex entry; item
   names in guide battles link to the item entry.
4. **Global search (⌘K / "/").** One overlay that searches across Pokémon, moves,
   items, and trainers and jumps to the right page+detail. Mid-playthrough users
   often don't know which tab a thing lives in. Reuse the existing per-page filter
   logic behind a single index.

### Tier 2 — High value, more build effort

5. **"¿Quién aprende este movimiento?" reverse lookup.** From a move, list the
   Pokémon that can learn it. Requires the parser to emit a movepool relation
   (likely derivable from the guide sets + MT data already parsed); ship the data
   plumbing first, then the UI.
6. **Compare mode (side-by-side).** Select 2 Pokémon and compare official/hackrom
   stats, types, abilities. Builds on the existing `StatBar` dual-bar component.
7. **Team type-coverage analyzer.** Given a pinned team (feature #1), show
   combined weaknesses/resistances using the existing Gen-3 chart data in
   [TypesPage.tsx](src/pages/TypesPage.tsx). Pull the chart into a shared
   `src/utils/typeChart.ts` so both pages use it.

### Tier 3 — Nice-to-have

8. **PWA / offline support.** A service worker + manifest makes the reference
   usable offline (handy while playing on a handheld near a phone) and speeds
   repeat visits. Data is static and already bundled, so caching is straightforward.
9. **Light/dark theme toggle.** App is hardcoded dark; a light theme + persisted
   preference is low-risk given the Tailwind `dex` palette is already centralized.
10. **Export team / guide section** as text/markdown for sharing.

---

## Suggested sequencing

1. ~~Phase 1.3 infra first (ESLint/Prettier, Vitest, ErrorBoundary) — cheap, makes
   everything after it safer.~~ **✅ Done** (ErrorBoundary is a Phase 1.1 item)
2. ~~Phase 1.1 user-facing fixes — fastest visible wins.~~ **✅ Done**
3. Phase 1.2 parser/data accuracy — confirm with a regenerated dataset.
4. Phase 2 Tier 1, then Tier 2/3 as appetite allows. Features #1–#4 share a
   `useLocalStorage` hook and the deep-link routing groundwork, so build that
   foundation once.

## Verification

- **Build & types:** `npm run build` (runs `tsc -b && vite build`) must pass clean.
- **Lint/format:** `npm run lint` (new) passes; Prettier check is clean.
- **Tests:** `npm run test` (new Vitest) — parser-output and util tests green;
  page smoke tests render without throwing.
- **Data pipeline:** `npm run parse` regenerates `src/data/*.json`; confirm the
  new parse-warning summary, and spot-check that previously-missing entries
  (PORYGON-Z, VIKABOLT) now have `types`/`dexNumber`, and that the empty-`abilities`
  count dropped.
- **Manual / `/run` the app (`npm run dev`):**
  - Filter the Pokédex to an empty result → friendly empty state with "clear".
  - Force a sprite 404 (e.g. a mega) → placeholder shows, no blank box.
  - Toggle a favorite and a guide "completado" → persists across reload.
  - Deep link (`#/pokedex/<name>`) → opens the right detail on refresh.
  - Global search jumps to items/moves/trainers from any page.
  - Type chart usable on a narrow viewport.
- **Deploy:** push to `master`; confirm the GitHub Pages action builds and the
  subpath `/pokemonRocketEdition/` still routes correctly under HashRouter.
