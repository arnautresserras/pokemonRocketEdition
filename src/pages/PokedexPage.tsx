import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Pokemon, Stats } from '../types'
import pokemonData from '../data/pokemon.json'
import experimentsData from '../data/experiments.json'
import SearchBar from '../components/SearchBar'
import TypeBadge from '../components/TypeBadge'
import StatBar from '../components/StatBar'
import EmptyState from '../components/EmptyState'
import { getTypeColor } from '../utils/types'
import { getEffectiveTotal } from '../utils/pokemon'
import { TOTAL_MAX, STAT_MAX } from '../constants'
import { useDebouncedValue } from '../utils/useDebounce'
import { useLocalStorage } from '../utils/useLocalStorage'
import { useAbilityDescription } from '../hooks/useAbilityDescription'
import { usePokemonApiAbilities } from '../hooks/usePokemonApiAbilities'

const allPokemon = [
  ...(pokemonData as Pokemon[]),
  ...(experimentsData as Pokemon[]),
]

const pokemonByName = new Map<string, Pokemon>(
  allPokemon.map(p => [p.name.toLowerCase(), p]),
)

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Sort longest-first so multi-word names match before shorter sub-names
const pokemonNamesRegex = new RegExp(
  `(${allPokemon
    .map(p => p.name.toLowerCase())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join('|')})`,
  'gi',
)

const CATEGORIES = ['todos', 'favoritos', 'base', 'mega', 'prototype', 'primal'] as const
type Category = (typeof CATEGORIES)[number]

const CAT_LABELS: Record<Category, string> = {
  todos: 'Todos',
  favoritos: '⭐ Favs',
  base: 'Base',
  mega: 'Mega',
  prototype: 'Prototipo',
  primal: 'Primigenio',
}

type SortOrder = 'default' | 'total-desc' | 'total-asc'

const ALL_TYPES = Array.from(
  new Set(allPokemon.flatMap(p => p.types ?? []))
).sort()

const POKEAPI_SPRITES =
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

function getSpriteUrl(pokemon: Pick<Pokemon, 'name' | 'dexNumber' | 'spriteId'>): string {
  const id = pokemon.spriteId ?? pokemon.dexNumber
  if (id) return `${POKEAPI_SPRITES}/${id}.png`
  const slug = pokemon.name.toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-')
  return `https://img.pokemondb.net/sprites/ruby-sapphire/normal/${slug}.png`
}

export default function PokedexPage() {
  const { pokemonName: nameParam } = useParams<{ pokemonName?: string }>()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('todos')
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())

  const [favPokemon, setFavPokemon] = useLocalStorage<string[]>('fav:pokemon', [])
  const favSet = useMemo(() => new Set(favPokemon), [favPokemon])

  const toggleFav = useCallback(
    (name: string) => {
      setFavPokemon(prev =>
        prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name],
      )
    },
    [setFavPokemon],
  )

  const debouncedSearch = useDebouncedValue(search, 150)

  // Selected Pokémon is derived from the URL param
  const selected = useMemo(() => {
    if (!nameParam) return null
    const decoded = decodeURIComponent(nameParam).toLowerCase()
    return allPokemon.find(p => p.name.toLowerCase() === decoded) ?? null
  }, [nameParam])

  const setSelected = useCallback(
    (pokemon: Pokemon | null) => {
      if (pokemon) {
        navigate(`/pokedex/${encodeURIComponent(pokemon.name.toLowerCase())}`)
      } else {
        navigate('/pokedex')
      }
    },
    [navigate],
  )

  const clearFilters = useCallback(() => {
    setSearch('')
    setCategory('todos')
    setTypeFilter(new Set())
    setSortOrder('default')
  }, [])

  function toggleType(type: string) {
    setTypeFilter(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const filtered = useMemo(() => {
    const result = allPokemon.filter(p => {
      const matchSearch =
        !debouncedSearch ||
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.dexNumber !== undefined && String(p.dexNumber).includes(debouncedSearch))
      const matchCat =
        category === 'todos' ||
        (category === 'favoritos' ? favSet.has(p.name) : p.category === category)
      const matchType = typeFilter.size === 0 || p.types?.some(t => typeFilter.has(t))
      return matchSearch && matchCat && matchType
    })
    if (sortOrder === 'total-desc') {
      result.sort((a, b) => getEffectiveTotal(b) - getEffectiveTotal(a))
    } else if (sortOrder === 'total-asc') {
      result.sort((a, b) => getEffectiveTotal(a) - getEffectiveTotal(b))
    }
    return result
  }, [debouncedSearch, category, sortOrder, typeFilter, favSet])

  const listRef = useRef<HTMLDivElement>(null)
  const prevNameParam = useRef<string | undefined>()
  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  // Scroll to the selected Pokémon in the list only when the URL param changes
  useEffect(() => {
    if (nameParam === prevNameParam.current) return
    prevNameParam.current = nameParam
    if (!selected) return
    const idx = filtered.findIndex(p => p.name === selected.name)
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' })
  }, [nameParam, filtered, selected, virtualizer])

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* List panel */}
      <div
        className={`flex-col border-white/10 md:w-80 md:shrink-0 md:flex md:border-r ${
          selected ? 'hidden' : 'flex flex-1 border-r md:flex-none'
        }`}
      >
        <div className="p-4 border-b border-white/10 space-y-3">
          <h2 className="font-mono text-xs text-dex-red font-bold">POKÉDEX</h2>
          <SearchBar value={search} onChange={setSearch} placeholder="Nombre o número..." />
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  category === cat
                    ? 'bg-dex-red text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {CAT_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-600 mr-0.5">BST</span>
            {(['default', 'total-desc', 'total-asc'] as SortOrder[]).map(order => (
              <button
                key={order}
                onClick={() => setSortOrder(order)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  sortOrder === order
                    ? 'bg-dex-red text-white'
                    : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {order === 'default' ? '—' : order === 'total-desc' ? '↓' : '↑'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_TYPES.map(type => {
              const active = typeFilter.has(type)
              const color = getTypeColor(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-opacity"
                  style={{
                    backgroundColor: active ? color : `${color}33`,
                    color: active ? '#fff' : color,
                    textShadow: active ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                  }}
                >
                  {type}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-gray-500">{filtered.length} resultados</p>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map(row => (
                <div
                  key={row.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  <PokemonRow
                    pokemon={filtered[row.index]}
                    isSelected={selected?.name === filtered[row.index].name}
                    onClick={() => setSelected(filtered[row.index])}
                    isFav={favSet.has(filtered[row.index].name)}
                    onToggleFav={() => toggleFav(filtered[row.index].name)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className={`flex-1 overflow-y-auto ${selected ? '' : 'hidden md:block'}`}>
        {selected ? (
          <>
            <button
              onClick={() => setSelected(null)}
              className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-white/10 text-dex-red font-bold text-sm w-full"
            >
              ← Volver
            </button>
            <PokemonDetail
              pokemon={selected}
              isFav={favSet.has(selected.name)}
              onToggleFav={() => toggleFav(selected.name)}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center space-y-2">
              <div className="text-6xl opacity-20">◉</div>
              <p className="font-mono text-xs">Selecciona un Pokémon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AbilityBadge({ name, slug, hidden }: { name?: string; slug?: string; hidden?: boolean }) {
  const input = name ?? slug ?? ''
  const { displayName, description, loading } = useAbilityDescription(input, !name && !!slug)
  return (
    <div className="px-3 py-2 bg-dex-gray rounded-lg text-xs border border-white/10 min-w-[120px]">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-300 font-medium">{displayName}</span>
        {hidden && (
          <span className="text-[9px] text-gray-600 border border-white/10 rounded px-1 uppercase tracking-wide">
            oculta
          </span>
        )}
      </div>
      {loading && <div className="text-gray-600 mt-1 italic">cargando...</div>}
      {description && <div className="text-gray-500 mt-1 leading-relaxed">{description}</div>}
    </div>
  )
}

function AbilitiesSection({ pokemon }: { pokemon: Pokemon }) {
  const hasJsonAbilities = !!pokemon.abilities?.length
  const { abilities: apiAbilities, loading } = usePokemonApiAbilities(
    hasJsonAbilities ? undefined : pokemon.dexNumber,
  )

  if (hasJsonAbilities) {
    return (
      <section className="mb-6">
        <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Habilidades</h3>
        <div className="flex flex-wrap gap-2">
          {pokemon.abilities!.map(a => (
            <AbilityBadge key={a} name={a} />
          ))}
        </div>
      </section>
    )
  }

  if (!loading && apiAbilities.length === 0) return null

  return (
    <section className="mb-6">
      <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Habilidades</h3>
      {loading && apiAbilities.length === 0 ? (
        <div className="text-xs text-gray-600 italic">cargando...</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {apiAbilities.map(a => (
            <AbilityBadge key={a.slug} slug={a.slug} hidden={a.hidden} />
          ))}
        </div>
      )}
    </section>
  )
}

function PokemonRow({
  pokemon,
  isSelected,
  onClick,
  isFav,
  onToggleFav,
}: {
  pokemon: Pokemon
  isSelected: boolean
  onClick: () => void
  isFav: boolean
  onToggleFav: () => void
}) {
  const [spriteError, setSpriteError] = useState(false)
  const hasChanges = pokemon.officialStats && pokemon.hackromStats
  const totalDiff = hasChanges
    ? (pokemon.hackromStats!.total ?? 0) - (pokemon.officialStats!.total ?? 0)
    : 0

  return (
    <div className="flex items-center border-b border-white/5 h-[56px]">
      <button
        onClick={onClick}
        className={`flex-1 flex items-center gap-3 px-4 py-2.5 text-left min-w-0 transition-colors h-full ${
          isSelected ? 'bg-dex-red/20 border-l-4 border-l-dex-red' : 'hover:bg-white/5'
        }`}
      >
        {pokemon.dexNumber && (
          <span className="text-[10px] text-gray-600 w-8 tabular-nums shrink-0">
            #{String(pokemon.dexNumber).padStart(3, '0')}
          </span>
        )}
        <div
          className="w-10 h-10 rounded shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: pokemon.types?.[0]
              ? `${getTypeColor(pokemon.types[0])}33`
              : 'transparent',
          }}
        >
          {spriteError ? (
            <span className="text-gray-600 text-xl opacity-40">◉</span>
          ) : (
            <img
              src={getSpriteUrl(pokemon)}
              alt=""
              aria-hidden
              loading="lazy"
              className="w-10 h-10 object-contain pixelated"
              onError={() => setSpriteError(true)}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{pokemon.name}</p>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {pokemon.types?.map(t => <TypeBadge key={t} type={t} small />)}
            {pokemon.category !== 'base' && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold uppercase">
                {pokemon.category === 'prototype'
                  ? `P.Nv${pokemon.prototypeLevel ?? ''}`
                  : pokemon.category}
              </span>
            )}
          </div>
        </div>
        {hasChanges && (
          <span
            className={`text-[10px] font-bold shrink-0 ${
              totalDiff > 0
                ? 'text-green-400'
                : totalDiff < 0
                  ? 'text-red-400'
                  : 'text-gray-500'
            }`}
          >
            {totalDiff > 0 ? `+${totalDiff}` : totalDiff}
          </span>
        )}
      </button>
      <button
        onClick={onToggleFav}
        className="px-2 h-full shrink-0 transition-colors text-gray-600 hover:text-yellow-400 flex items-center"
        aria-label={isFav ? 'Quitar favorito' : 'Añadir a favoritos'}
        title={isFav ? 'Quitar favorito' : 'Añadir a favoritos'}
      >
        {isFav ? '⭐' : '☆'}
      </button>
    </div>
  )
}

function renderWithPokemonLinks(text: string, onNavigate: (name: string) => void) {
  const parts = text.split(pokemonNamesRegex)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      const target = pokemonByName.get(part.toLowerCase())
      if (target) {
        return (
          <button
            key={i}
            onClick={() => onNavigate(target.name)}
            className="text-dex-red hover:underline font-medium"
          >
            {part}
          </button>
        )
      }
    }
    return part
  })
}

function PokemonDetail({
  pokemon,
  isFav,
  onToggleFav,
}: {
  pokemon: Pokemon
  isFav: boolean
  onToggleFav: () => void
}) {
  const navigate = useNavigate()
  const [spriteError, setSpriteError] = useState(false)
  const stats: { key: keyof Stats; label: string }[] = [
    { key: 'hp', label: 'PS' },
    { key: 'attack', label: 'Ataque' },
    { key: 'defense', label: 'Defensa' },
    { key: 'spAttack', label: 'At.Esp' },
    { key: 'spDefense', label: 'Def.Esp' },
    { key: 'speed', label: 'Velocid' },
    { key: 'total', label: 'Total' },
  ]

  const hasStats = pokemon.officialStats || pokemon.hackromStats
  const hasChanges = pokemon.officialStats && pokemon.hackromStats

  return (
    <div className="p-6 max-w-2xl">
      {/* Header card */}
      <div className="bg-dex-gray rounded-lg mb-6 overflow-hidden border border-white/10">
        {/* Sprite screen */}
        <div
          className="flex items-center justify-center py-6 transition-colors"
          style={{
            backgroundColor: pokemon.types?.[0]
              ? `${getTypeColor(pokemon.types[0])}30`
              : '#0f1117',
          }}
        >
          {spriteError ? (
            <div className="w-32 h-32 flex items-center justify-center text-gray-600 opacity-30">
              <span className="text-7xl">◉</span>
            </div>
          ) : (
            <img
              src={getSpriteUrl(pokemon)}
              alt={pokemon.name}
              className="w-32 h-32 object-contain pixelated drop-shadow-lg"
              onError={() => setSpriteError(true)}
            />
          )}
        </div>
        {/* Info */}
        <div className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            {pokemon.dexNumber && (
              <span className="text-gray-500 font-mono text-sm">
                #{String(pokemon.dexNumber).padStart(3, '0')}
              </span>
            )}
            <h2 className="text-2xl font-bold text-white flex-1">{pokemon.name}</h2>
            <button
              onClick={onToggleFav}
              className="text-xl transition-colors text-gray-500 hover:text-yellow-400 shrink-0"
              aria-label={isFav ? 'Quitar favorito' : 'Añadir a favoritos'}
              title={isFav ? 'Quitar favorito' : 'Añadir a favoritos'}
            >
              {isFav ? '⭐' : '☆'}
            </button>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {pokemon.types?.map(t => <TypeBadge key={t} type={t} />)}
            {pokemon.category !== 'base' && (
              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold uppercase">
                {pokemon.category === 'prototype'
                  ? `Prototipo Nivel ${pokemon.prototypeLevel}`
                  : pokemon.category === 'mega'
                    ? 'Mega Evolución'
                    : 'Primigenio / Antiguo'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {hasStats && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-3 uppercase">Stats Base</h3>
          {hasChanges && (
            <div className="flex gap-4 text-[9px] mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded bg-gray-500" />
                <span className="text-gray-500">Oficial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded bg-blue-400" />
                <span className="text-gray-400">Hackrom</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded bg-green-400" />
                <span className="text-gray-400">Buff</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-2 rounded bg-red-400" />
                <span className="text-gray-400">Nerf</span>
              </div>
            </div>
          )}
          <div className="space-y-2 bg-dex-gray rounded-lg p-4">
            {stats.map(({ key, label }) => (
              <StatBar
                key={key}
                label={label}
                official={pokemon.officialStats?.[key]}
                hackrom={pokemon.hackromStats?.[key]}
                max={key === 'total' ? TOTAL_MAX : STAT_MAX}
              />
            ))}
          </div>
        </section>
      )}

      {/* Abilities */}
      <AbilitiesSection pokemon={pokemon} />

      {/* Megastone location */}
      {pokemon.category === 'mega' && pokemon.megastoneLocation && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Megapiedra</h3>
          <div className="bg-dex-gray rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
            {pokemon.megastoneLocation}
          </div>
        </section>
      )}

      {/* Location */}
      {pokemon.location && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Dónde obtenerlo</h3>
          <div className="bg-dex-gray rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
            {renderWithPokemonLinks(pokemon.location, name =>
              navigate(`/pokedex/${encodeURIComponent(name.toLowerCase())}`),
            )}
          </div>
        </section>
      )}

      {/* Evolution */}
      {pokemon.evolutionMethod && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">
            Método de evolución
          </h3>
          <div className="bg-dex-gray rounded-lg p-4 text-sm text-gray-300">
            {pokemon.evolutionMethod}
          </div>
        </section>
      )}
    </div>
  )
}
