import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pokemon, Move, Item, RegionGuide } from '../types'
import pokemonData from '../data/pokemon.json'
import experimentsData from '../data/experiments.json'
import movesData from '../data/moves.json'
import itemsData from '../data/items.json'
import guideData from '../data/guide.json'

const allPokemon = [...(pokemonData as Pokemon[]), ...(experimentsData as Pokemon[])]
const allMoves = movesData as Move[]
const allItems = itemsData as Item[]
const allGuide = guideData as RegionGuide[]

type ResultType = 'pokemon' | 'move' | 'item' | 'trainer'
type SearchResult = {
  id: string
  type: ResultType
  label: string
  sublabel?: string
  to: string
  state?: unknown
}

const TYPE_ICON: Record<ResultType, string> = {
  pokemon: '◉',
  move: '💥',
  item: '🎒',
  trainer: '👤',
}
const TYPE_LABEL: Record<ResultType, string> = {
  pokemon: 'Pokémon',
  move: 'Movimiento',
  item: 'Objeto',
  trainer: 'Entrenador',
}

function buildResults(query: string): SearchResult[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  for (const p of allPokemon) {
    if (
      p.name.toLowerCase().includes(q) ||
      (p.dexNumber !== undefined && String(p.dexNumber).includes(q))
    ) {
      results.push({
        id: `pkmn-${p.name}`,
        type: 'pokemon',
        label: p.name,
        sublabel: p.dexNumber ? `#${String(p.dexNumber).padStart(3, '0')}` : p.category,
        to: `/pokedex/${encodeURIComponent(p.name.toLowerCase())}`,
      })
    }
  }

  for (const m of allMoves) {
    if (m.name.toLowerCase().includes(q)) {
      results.push({
        id: `move-${m.name}`,
        type: 'move',
        label: m.name,
        sublabel: m.hackrom.type,
        to: '/moves',
        state: { selectMove: m.name },
      })
    }
  }

  for (const item of allItems) {
    if (!item.isGroup && item.name.toLowerCase().includes(q)) {
      results.push({
        id: `item-${item.name}`,
        type: 'item',
        label: item.name,
        sublabel: item.category,
        to: '/moves',
        state: { selectItem: item.name },
      })
    }
  }

  const seenSections = new Set<string>()
  for (const region of allGuide) {
    for (const section of region.sections) {
      for (const battle of section.battles) {
        if (
          battle.trainerName.toLowerCase().includes(q) ||
          battle.pokemon.some(p => p.name.toLowerCase().includes(q))
        ) {
          const key = `${region.region}::${section.location}`
          if (!seenSections.has(key)) {
            seenSections.add(key)
            results.push({
              id: `trainer-${key}`,
              type: 'trainer',
              label: battle.trainerName.toLowerCase().includes(q)
                ? battle.trainerName
                : section.location,
              sublabel: `${region.region} › ${section.location}`,
              to: `/guide/${encodeURIComponent(region.region)}/${encodeURIComponent(section.location)}`,
            })
          }
          break
        }
      }
    }
  }

  return results.slice(0, 50)
}

export function openGlobalSearch() {
  document.dispatchEvent(new CustomEvent('open-global-search'))
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => buildResults(query), [query])

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const openSearch = useCallback(() => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [])

  const goTo = useCallback(
    (result: SearchResult) => {
      navigate(result.to, result.state ? { state: result.state } : undefined)
      close()
    },
    [navigate, close],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inInput =
        e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !inInput)) {
        e.preventDefault()
        openSearch()
      }
      if (e.key === 'Escape' && open) close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, openSearch, close])

  useEffect(() => {
    const handler = () => openSearch()
    document.addEventListener('open-global-search', handler)
    return () => document.removeEventListener('open-global-search', handler)
  }, [openSearch])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/70 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-lg bg-dex-gray rounded-xl shadow-2xl border border-white/10 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <span className="text-gray-500 shrink-0 text-base">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
            placeholder="Buscar Pokémon, movimientos, objetos, entrenadores..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-600 min-w-0"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex(i => Math.min(i + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex(i => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && results[activeIndex]) {
                goTo(results[activeIndex])
              } else if (e.key === 'Escape') {
                close()
              }
            }}
          />
          <kbd className="hidden sm:block text-[9px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query && results.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-600 text-center">
            Sin resultados para "{query}"
          </p>
        )}
        {!query && (
          <p className="px-4 py-3 text-[10px] text-gray-600 font-mono">
            Escribe para buscar en toda la app...
          </p>
        )}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((result, i) => (
              <button
                key={result.id}
                onClick={() => goTo(result)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-white/5 last:border-0 ${
                  i === activeIndex ? 'bg-dex-red/20' : 'hover:bg-white/5'
                }`}
              >
                <span className="w-5 text-center shrink-0 text-base">
                  {TYPE_ICON[result.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{result.label}</p>
                  {result.sublabel && (
                    <p className="text-[10px] text-gray-500 truncate">{result.sublabel}</p>
                  )}
                </div>
                <span className="text-[9px] text-gray-600 shrink-0">
                  {TYPE_LABEL[result.type]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-white/5 flex gap-4 text-[9px] text-gray-600 font-mono">
          <span>↑↓ navegar</span>
          <span>↵ ir</span>
          <span>esc cerrar</span>
          <span className="ml-auto opacity-50">Ctrl+K</span>
        </div>
      </div>
    </div>
  )
}
