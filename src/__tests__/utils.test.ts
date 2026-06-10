import { describe, it, expect } from 'vitest'
import { getTypeColor } from '../utils/types'
import { getEffectiveTotal } from '../utils/pokemon'
import { categoryLabel } from '../utils/items'

describe('getTypeColor', () => {
  it('returns correct hex for Spanish type names', () => {
    expect(getTypeColor('fuego')).toBe('#F08030')
    expect(getTypeColor('agua')).toBe('#6890F0')
    expect(getTypeColor('planta')).toBe('#78C850')
  })
  it('returns correct hex for English type names', () => {
    expect(getTypeColor('fire')).toBe('#F08030')
    expect(getTypeColor('water')).toBe('#6890F0')
    expect(getTypeColor('normal')).toBe('#A8A878')
  })
  it('is case-insensitive', () => {
    expect(getTypeColor('FUEGO')).toBe('#F08030')
    expect(getTypeColor('Normal')).toBe('#A8A878')
  })
  it('returns fallback for unknown type', () => {
    expect(getTypeColor('unknown')).toBe('#777')
  })
})

describe('getEffectiveTotal', () => {
  it('prefers hackrom total when both are present', () => {
    expect(
      getEffectiveTotal({ hackromStats: { total: 600 }, officialStats: { total: 500 } }),
    ).toBe(600)
  })
  it('falls back to official total when hackrom is absent', () => {
    expect(getEffectiveTotal({ officialStats: { total: 500 } })).toBe(500)
  })
  it('returns 0 when both are absent', () => {
    expect(getEffectiveTotal({})).toBe(0)
  })
})

describe('categoryLabel', () => {
  it('handles sentinel values', () => {
    expect(categoryLabel('todos')).toBe('Todos')
    expect(categoryLabel('cambios')).toBe('Cambios')
  })
  it('maps known item category exact keys', () => {
    expect(categoryLabel('PIEDRAS EVOLUTIVAS')).toBe('Piedras Evol.')
    expect(categoryLabel('MEGAPIEDRAS NUEVAS')).toBe('Mega Nuevas')
    expect(categoryLabel('TODAS LAS MEGAPIEDRAS (OFICIALES)')).toBe('Megapiedras')
    expect(categoryLabel('BAYAS REDUCTORAS EVS')).toBe('Bayas EVs')
    expect(categoryLabel('GEMAS PKMN')).toBe('Gemas')
    expect(categoryLabel('CRISTALES Z')).toBe('Cristales Z')
  })
  it('falls back to the raw string for unknown categories', () => {
    expect(categoryLabel('UNKNOWN CATEGORY LONG')).toBe('UNKNOWN CATEGORY LONG')
    expect(categoryLabel('ONE')).toBe('ONE')
  })
})
