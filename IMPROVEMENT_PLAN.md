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

### 1.1 User-facing bugs & polish (highest priority — players hit these daily)

- **Broken-sprite fallback leaves empty boxes.** In
  [PokedexPage.tsx:233](src/pages/PokedexPage.tsx#L233) the `onError` handler
  hides the `<img>`, leaving a blank colored square with no label cue. Sprites
  load fine for most Pokémon via `dexNumber` ([line 40](src/pages/PokedexPage.tsx#L40)),
  but megas/prototypes/Gen-9 entries without `dexNumber`/`spriteId` fall back to
  a `pokemondb.net` slug ([line 43](src/pages/PokedexPage.tsx#L43)) that often
  404s. Fix: on error, swap to a neutral Poké-ball placeholder (or show the
  dex-number monogram) instead of `display:none`. Apply the same handling in the
  detail header.
- **No empty state on filtered lists.** When filters yield nothing, the Pokédex
  shows only "0 resultados" over a blank virtualized area
  ([PokedexPage.tsx:150-168](src/pages/PokedexPage.tsx#L150-L168)). MovesPage and
  the items tab have the same gap. Add a shared `EmptyState` component
  (icon + message + "limpiar filtros" button) and render it when the list is
  empty. GuidePage already shows "Sin resultados" — align it to the same component.
- **No search debounce.** [SearchBar.tsx](src/components/SearchBar.tsx) calls
  `onChange` on every keystroke, re-running the `useMemo` filter over ~1,100
  Pokémon each time. Add an internal debounce (~150ms) in SearchBar, or a
  `useDebouncedValue` hook in `src/utils/`, so typing stays smooth on mobile.
- **No error boundary.** A single malformed JSON entry blanks the whole app
  (`StrictMode` only, no boundary in [main.tsx](src/main.tsx)). Add an
  `ErrorBoundary` wrapping `<App/>` with a friendly recovery message.
- **Mobile: 18×18 type chart overflows.** [TypesPage.tsx](src/pages/TypesPage.tsx)
  `ChartView` forces horizontal scroll on phones with no affordance. Add a scroll
  hint/shadow and ensure the interactive Calculator (more phone-friendly) is the
  default view on small screens.
- **Brittle category/region string matching.** `categoryLabel()`
  ([MovesPage.tsx:18-36](src/pages/MovesPage.tsx#L18-L36)) and `mtRegionKey()`
  use `includes()` chains and regex on display strings; a doc wording change
  silently mislabels. Replace with explicit lookup maps keyed on the value the
  parser emits, with a safe fallback.

### 1.2 Data accuracy (parser robustness — wrong data misleads players)

`scripts/generate.ts` parses free-form Spanish text with rigid regexes. Harden
the fragile points and surface what fails instead of silently dropping it:

- **Make header/label matching tolerant.** Ability regex is case-sensitive
  ([~line 106](scripts/generate.ts#L106)); Pokémon-name and item/category
  headers require strict uppercase/format ([~lines 119, 294, 416](scripts/generate.ts#L119));
  move-block split assumes exactly `\n---\n` ([~line 26](scripts/generate.ts#L26)).
  Loosen whitespace/case handling and allow names with parentheses/numbers.
- **Stop silent fallbacks.** Experiment stat labels default unknown labels to
  `hackromStats` ([~lines 161-168](scripts/generate.ts#L161-L168)); guide/MT/item
  lines that don't match are dropped. Add a parse-warning collector that prints a
  summary ("N lines skipped in FILE") at the end of `npm run parse` so data loss
  is visible.
- **Fill the data gaps the agents found:** ~112 Pokémon with empty `abilities: []`,
  ~26 with no `types`/`dexNumber` (e.g. PORYGON-Z, VIKABOLT — likely a name-case
  mismatch in the `locationMap` lookup, [~line 815](scripts/generate.ts#L815)).
  Normalize names to a single canonical case before the join; let
  `enrichWithApiData()` backfill remaining types. Distinguish "absent" (`undefined`)
  from "empty" abilities so the UI can say "sin datos" vs hide the row.
- **Normalize `MoveVersion.power`.** It's typed `string`
  ([types/index.ts:25-31](src/types/index.ts#L25-L31)) but holds mixed values
  ("170", "KO en un golpe", "50% daño de retroceso"). Keep the raw string for
  display but add a parsed numeric/`null` companion so any future sorting/calc is
  safe; document the field.

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
2. Phase 1.1 user-facing fixes — fastest visible wins.
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
