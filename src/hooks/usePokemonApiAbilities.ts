import { useState, useEffect } from 'react'

export interface ApiAbility {
  slug: string
  hidden: boolean
}

interface Result {
  abilities: ApiAbility[]
  loading: boolean
}

const cache = new Map<number, ApiAbility[]>()

export function usePokemonApiAbilities(dexNumber: number | undefined): Result {
  const [abilities, setAbilities] = useState<ApiAbility[]>(() =>
    dexNumber != null ? (cache.get(dexNumber) ?? []) : [],
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (dexNumber == null) return
    if (cache.has(dexNumber)) {
      setAbilities(cache.get(dexNumber)!)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`https://pokeapi.co/api/v2/pokemon/${dexNumber}`)
      .then(res => (res.ok ? res.json() : null))
      .then((data: { abilities: Array<{ ability: { name: string }; is_hidden: boolean }> } | null) => {
        if (cancelled) return
        const result: ApiAbility[] = (data?.abilities ?? []).map(a => ({
          slug: a.ability.name,
          hidden: a.is_hidden,
        }))
        cache.set(dexNumber, result)
        setAbilities(result)
      })
      .catch(() => {
        if (!cancelled) {
          cache.set(dexNumber, [])
          setAbilities([])
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [dexNumber])

  return { abilities, loading }
}
