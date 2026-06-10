import { useState, useEffect } from 'react'

// Spanish hackrom ability name → PokeAPI English slug
const ABILITY_SLUG_MAP: Record<string, string> = {
  'Adaptable': 'adaptability',
  'Refrigeración': 'refrigerate',
  'Aura Feérica': 'fairy-aura',
  'Espejomágico': 'magic-bounce',
  'Indefenso': 'defeatist',
  'Punk Rock': 'punk-rock',
  'Potencia Bruta': 'sheer-force',
  'Levitación': 'levitate',
  'Cabeza Roca': 'rock-head',
  'Roca Sólida': 'solid-rock',
  'Intimidación': 'intimidate',
  'Filtro': 'filter',
  'Potencia': 'huge-power',
  'Piel Celeste': 'aerilate',
  'Piel Feérica': 'pixilate',
  'Piel Eléctrica': 'galvanize',
  'Peluche': 'fluffy',
  'Armadura Frágil': 'weak-armor',
}

interface AbilityApiData {
  names: Array<{ name: string; language: { name: string } }>
  flavor_text_entries: Array<{ flavor_text: string; language: { name: string } }>
}

// Shared cache keyed by PokeAPI slug — avoids duplicate fetches regardless of input type
const cache = new Map<string, { displayName: string; description: string | null } | null>()

export interface AbilityInfo {
  displayName: string
  description: string | null
  loading: boolean
}

function extractInlineDescription(name: string): { clean: string; desc: string | null } {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (match) return { clean: match[1].trim(), desc: match[2].trim() }
  return { clean: name, desc: null }
}

function pickText(
  entries: Array<{ flavor_text: string; language: { name: string } }>,
): string | null {
  const esEntries = entries.filter(e => e.language.name === 'es')
  const enEntries = entries.filter(e => e.language.name === 'en')
  const es = esEntries[esEntries.length - 1]?.flavor_text
  const en = enEntries[enEntries.length - 1]?.flavor_text
  return (es ?? en ?? null)?.replace(/[\f\n]/g, ' ').replace(/\s+/g, ' ').trim() ?? null
}

function pickName(
  names: Array<{ name: string; language: { name: string } }>,
): string | null {
  return names.find(n => n.language.name === 'es')?.name ?? null
}

/**
 * @param input  Spanish hackrom name (nameIsSlug=false) or PokeAPI slug (nameIsSlug=true)
 * @param nameIsSlug  When true, `input` is treated as a PokeAPI slug and the Spanish
 *                    display name is resolved from the ability endpoint.
 */
export function useAbilityDescription(input: string, nameIsSlug = false): AbilityInfo {
  const { clean: hackromName, desc: inlineDesc } = extractInlineDescription(input)

  // Resolve the slug eagerly if possible
  const resolvedSlug = nameIsSlug ? input : (ABILITY_SLUG_MAP[hackromName] ?? null)

  const [state, setState] = useState<{ displayName: string; description: string | null }>(() => {
    if (inlineDesc) return { displayName: hackromName, description: inlineDesc }
    if (resolvedSlug && cache.has(resolvedSlug)) {
      const cached = cache.get(resolvedSlug)
      return {
        displayName: nameIsSlug ? (cached?.displayName ?? input) : hackromName,
        description: cached?.description ?? null,
      }
    }
    return { displayName: hackromName, description: null }
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (inlineDesc) return
    if (!resolvedSlug) return // unknown custom ability

    if (cache.has(resolvedSlug)) {
      const cached = cache.get(resolvedSlug)
      setState({
        displayName: nameIsSlug ? (cached?.displayName ?? input) : hackromName,
        description: cached?.description ?? null,
      })
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`https://pokeapi.co/api/v2/ability/${resolvedSlug}`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: AbilityApiData | null) => {
        if (cancelled) return
        if (!data) {
          cache.set(resolvedSlug, null)
          return
        }
        const description = pickText(data.flavor_text_entries)
        const apiSpanishName = pickName(data.names)
        cache.set(resolvedSlug, { displayName: apiSpanishName ?? resolvedSlug, description })
        setState({
          displayName: nameIsSlug ? (apiSpanishName ?? resolvedSlug) : hackromName,
          description,
        })
      })
      .catch(() => {
        if (!cancelled) cache.set(resolvedSlug, null)
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [resolvedSlug, hackromName, nameIsSlug, inlineDesc, input])

  return { ...state, loading }
}
