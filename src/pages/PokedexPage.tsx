import { useState, useMemo } from 'react'
import type { Pokemon, Stats } from '../types'
import pokemonData from '../data/pokemon.json'
import experimentsData from '../data/experiments.json'
import SearchBar from '../components/SearchBar'
import TypeBadge from '../components/TypeBadge'
import StatBar from '../components/StatBar'

const allPokemon = [
  ...(pokemonData as Pokemon[]),
  ...(experimentsData as Pokemon[]),
]

const CATEGORIES = ['todos', 'base', 'mega', 'prototype', 'primal'] as const
type Category = (typeof CATEGORIES)[number]

const CAT_LABELS: Record<Category, string> = {
  todos: 'Todos',
  base: 'Base',
  mega: 'Mega',
  prototype: 'Prototipo',
  primal: 'Primigenio',
}

export default function PokedexPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category>('todos')
  const [selected, setSelected] = useState<Pokemon | null>(null)

  const filtered = useMemo(() => {
    return allPokemon.filter(p => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.dexNumber !== undefined && String(p.dexNumber).includes(search))
      const matchCat = category === 'todos' || p.category === category
      return matchSearch && matchCat
    })
  }, [search, category])

  return (
    <div className="flex h-full">
      {/* List panel */}
      <div className="w-80 shrink-0 border-r border-white/10 flex flex-col">
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
          <p className="text-[10px] text-gray-500">{filtered.length} resultados</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map((pkmn, i) => (
            <PokemonRow
              key={`${pkmn.name}-${i}`}
              pokemon={pkmn}
              isSelected={selected?.name === pkmn.name}
              onClick={() => setSelected(pkmn)}
            />
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <PokemonDetail pokemon={selected} />
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

function PokemonRow({
  pokemon,
  isSelected,
  onClick,
}: {
  pokemon: Pokemon
  isSelected: boolean
  onClick: () => void
}) {
  const hasChanges = pokemon.officialStats && pokemon.hackromStats
  const totalDiff =
    hasChanges
      ? (pokemon.hackromStats!.total ?? 0) - (pokemon.officialStats!.total ?? 0)
      : 0

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-white/5 transition-colors ${
        isSelected ? 'bg-dex-red/20 border-l-2 border-l-dex-red' : 'hover:bg-white/5'
      }`}
    >
      {pokemon.dexNumber && (
        <span className="text-[10px] text-gray-600 w-8 tabular-nums shrink-0">
          #{String(pokemon.dexNumber).padStart(3, '0')}
        </span>
      )}
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
            totalDiff > 0 ? 'text-green-400' : totalDiff < 0 ? 'text-red-400' : 'text-gray-500'
          }`}
        >
          {totalDiff > 0 ? `+${totalDiff}` : totalDiff}
        </span>
      )}
    </button>
  )
}

function PokemonDetail({ pokemon }: { pokemon: Pokemon }) {
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
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            {pokemon.dexNumber && (
              <span className="text-gray-500 font-mono text-sm">
                #{String(pokemon.dexNumber).padStart(3, '0')}
              </span>
            )}
            <h2 className="text-2xl font-bold text-white">{pokemon.name}</h2>
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
                max={key === 'total' ? 800 : 255}
              />
            ))}
          </div>
        </section>
      )}

      {/* Abilities */}
      {pokemon.abilities && pokemon.abilities.length > 0 && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Habilidades</h3>
          <div className="flex flex-wrap gap-2">
            {pokemon.abilities.map(a => (
              <span
                key={a}
                className="px-3 py-1 bg-dex-gray rounded-full text-xs text-gray-300 border border-white/10"
              >
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Location */}
      {pokemon.location && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Dónde obtenerlo</h3>
          <div className="bg-dex-gray rounded-lg p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {pokemon.location}
          </div>
        </section>
      )}

      {/* Evolution */}
      {pokemon.evolutionMethod && (
        <section className="mb-6">
          <h3 className="font-mono text-[10px] text-dex-red mb-2 uppercase">Método de evolución</h3>
          <div className="bg-dex-gray rounded-lg p-4 text-sm text-gray-300">
            {pokemon.evolutionMethod}
          </div>
        </section>
      )}
    </div>
  )
}
