import { describe, it, expect } from 'vitest'
import pokemonData from '../data/pokemon.json'
import experimentsData from '../data/experiments.json'
import movesData from '../data/moves.json'
import itemsData from '../data/items.json'
import guideData from '../data/guide.json'
import type { Pokemon, Move, Item, RegionGuide } from '../types'

const pokemon = pokemonData as Pokemon[]
const experiments = experimentsData as Pokemon[]
const moves = movesData as Move[]
const items = itemsData as Item[]
const guide = guideData as RegionGuide[]

describe('parser: pokemon.json', () => {
  it('produces a non-empty array', () => {
    expect(pokemon.length).toBeGreaterThan(0)
  })
  it('every entry has a name', () => {
    expect(pokemon.every((p) => typeof p.name === 'string' && p.name.length > 0)).toBe(true)
  })
  it('every entry has a category', () => {
    const valid = new Set(['base', 'mega', 'prototype', 'primal'])
    expect(pokemon.every((p) => valid.has(p.category))).toBe(true)
  })
  it('majority of entries have types', () => {
    const withTypes = pokemon.filter((p) => p.types && p.types.length > 0).length
    expect(withTypes / pokemon.length).toBeGreaterThan(0.8)
  })
})

describe('parser: experiments.json', () => {
  it('produces a non-empty array', () => {
    expect(experiments.length).toBeGreaterThan(0)
  })
  it('all entries are prototypes or megas', () => {
    const valid = new Set(['prototype', 'mega', 'primal'])
    expect(experiments.every((p) => valid.has(p.category))).toBe(true)
  })
})

describe('parser: moves.json', () => {
  it('produces a non-empty array', () => {
    expect(moves.length).toBeGreaterThan(0)
  })
  it('every entry has a name and official/hackrom versions', () => {
    expect(
      moves.every(
        (m) =>
          typeof m.name === 'string' &&
          m.name.length > 0 &&
          m.official != null &&
          m.hackrom != null,
      ),
    ).toBe(true)
  })
})

describe('parser: items.json', () => {
  it('produces a non-empty array', () => {
    expect(items.length).toBeGreaterThan(0)
  })
  it('every entry has a name and category', () => {
    expect(
      items.every(
        (i) =>
          typeof i.name === 'string' &&
          i.name.length > 0 &&
          typeof i.category === 'string' &&
          i.category.length > 0,
      ),
    ).toBe(true)
  })
})

describe('parser: guide.json', () => {
  it('has exactly 5 regions', () => {
    expect(guide.length).toBe(5)
  })
  it('each region has a name and non-empty sections', () => {
    expect(guide.every((r) => typeof r.region === 'string' && r.sections.length > 0)).toBe(true)
  })
})
