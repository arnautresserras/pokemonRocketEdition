# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **documentation + web app repository** for a Pokémon ROM hack/fan game called "PKMN_Rocket". The `docs/` folder contains plain-text (`.txt`) and PDF documentation in Spanish. The root contains a React SPA (Vite + TypeScript + Tailwind) that exposes all game information as a searchable Pokédex-style interface.

## Web App Commands

```bash
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # production build (runs tsc then vite build)
npm run parse    # re-parse docs/ → src/data/*.json (run after editing any .txt file)
npm run preview  # preview production build locally
```

> Always run `npm run parse` after editing docs files — the app reads the generated JSON, not the raw .txt files.

## Web App Architecture

**Data pipeline:** `scripts/generate.ts` (Node/tsx) reads every `.txt` file in `docs/`, parses it into structured JSON, and writes to `src/data/`. The five generated files are:
- `pokemon.json` — 754 Pokémon with stat changes, locations, abilities, evolutions
- `experiments.json` — 23 prototype/mega special forms
- `moves.json` — 23 changed moves (official vs hackrom stats)
- `items.json` — 372 item entries with categories and locations
- `guide.json` — 77 guide sections across 5 regions (Kanto, Archi7, Johto, DLC, Hoenn)

**Front-end structure:**
```
src/
├── pages/
│   ├── PokedexPage.tsx    — searchable Pokémon list + stat comparison detail
│   ├── MovesPage.tsx      — move list + official vs hackrom diff view
│   └── GuidePage.tsx      — region selector + battle encounter cards
├── components/
│   ├── Sidebar.tsx        — navigation (Pokédex red theme)
│   ├── StatBar.tsx        — dual-bar official/hackrom stat comparison
│   ├── TypeBadge.tsx      — coloured type pill
│   └── SearchBar.tsx      — generic search input
├── utils/types.ts         — Pokémon type → hex colour map
└── types/index.ts         — shared TypeScript interfaces
```

**Routing:** React Router v6 with three routes: `/` (Pokédex), `/moves`, `/guide`.

**Styling:** Tailwind CSS with a custom `dex` colour palette defined in `tailwind.config.ts` (dex-red, dex-darkred, dex-black, dex-gray, dex-screen). Custom component classes (`dex-card`, `dex-btn`, `stat-bar-track`) live in `src/index.css`.

## Repository Structure

Documentation is split into two categories:

**Story & Progression (by region):**
- `docs/KANTO.txt`, `docs/JOHTO.txt`, `docs/HOENN.txt`, `docs/ARCHI7.txt` (Sevii Islands), `docs/DLC.txt` — narrative events and boss battles per region
- `docs/T1 - KANTO.txt` through `docs/T5 - HOENN.txt` — detailed per-route trainer/boss guides with full Pokémon sets (nature, IVs, EVs, moves, items, levels)

**Game Mechanics & Reference:**
- `docs/CAMBIOS en MOVIMIENTOS.txt` — move changes vs. official Pokémon games (labeled "Oficial" vs "Hackrom")
- `docs/CAMBIOS en STATS, TIPOS y HABILIDADES.txt` — Pokémon stat, type, and ability overrides
- `docs/EVOLUCIÓN TODOS PKMN.txt` — evolution conditions for all Pokémon in the hack
- `docs/OBTENCIÓN TODOS PKMN.txt` — where/how to obtain every Pokémon
- `docs/OBTENCIÓN OBJETOS.txt` — item locations and purchase prices
- `docs/Experimentos Rocket.txt` — "Prototype" enhanced forms (+100 base stats across all stats)
- `docs/Nuevas Megaevoluciones.txt` — custom mega-evolutions added by the hack
- `docs/Primigenios y Antiguos.txt` — primal and ancient form data
- `docs/Fuertes Vínculo.txt` — Strong Bond mechanic documentation
- `docs/QOLS.txt` — Quality of Life features: money farming, EXP farming, key mechanics
- `docs/Preguntas Frecuentes.txt` — FAQ covering progression order and common questions
- `docs/SECUNDARIAS TRE.pdf` — secondary/side quest reference

## Key Conventions in the Documentation

- Boss Pokémon entries follow the format: species, level, nature, IVs/EVs, held item, move list
- "Hackrom" labels indicate custom values that differ from official Pokémon games
- Prototype Pokémon (Experimentos Rocket) have a `[PROTOTIPO]` designation and +100 to every base stat
- Regional progression order: Kanto → Archi7 (Sevii Islands) → Johto → DLC → Hoenn
