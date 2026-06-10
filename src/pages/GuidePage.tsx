import { useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { RegionGuide, GuideSection, Battle, PokemonEncounter } from '../types'
import guideData from '../data/guide.json'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import { REGION_COLORS } from '../constants'
import { useDebouncedValue } from '../utils/useDebounce'
import { useLocalStorage } from '../utils/useLocalStorage'

const guide = guideData as RegionGuide[]

function battleKey(region: string, location: string, idx: number) {
  return `${region}::${location}::${idx}`
}

export default function GuidePage() {
  const { region: regionParam, section: sectionParam } = useParams<{
    region?: string
    section?: string
  }>()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 150)

  const [completedKeys, setCompletedKeys] = useLocalStorage<string[]>('guide:completed', [])
  const completedSet = useMemo(() => new Set(completedKeys), [completedKeys])

  // Derive active region and section from URL (fall back to defaults)
  const activeRegion = regionParam
    ? decodeURIComponent(regionParam)
    : (guide[0]?.region ?? '')
  const selectedSection = sectionParam ? decodeURIComponent(sectionParam) : null

  const currentGuide = guide.find(g => g.region === activeRegion)

  const filteredSections = useMemo(() => {
    if (!currentGuide) return []
    if (!debouncedSearch) return currentGuide.sections
    const q = debouncedSearch.toLowerCase()
    return currentGuide.sections.filter(
      s =>
        s.location.toLowerCase().includes(q) ||
        s.battles.some(
          b =>
            b.trainerName.toLowerCase().includes(q) ||
            b.pokemon.some(p => p.name.toLowerCase().includes(q)),
        ),
    )
  }, [currentGuide, debouncedSearch])

  const activeSectionData = currentGuide?.sections.find(
    s => s.location === selectedSection,
  )

  // Per-region progress
  const regionProgress = useMemo(
    () =>
      guide.map(g => {
        const total = g.sections.reduce((sum, s) => sum + s.battles.length, 0)
        const done = g.sections.reduce(
          (sum, s) =>
            sum +
            s.battles.filter((_, i) =>
              completedSet.has(battleKey(g.region, s.location, i)),
            ).length,
          0,
        )
        return { region: g.region, total, done }
      }),
    [completedSet],
  )

  function toggleBattle(key: string) {
    setCompletedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  function selectRegion(region: string) {
    navigate(`/guide/${encodeURIComponent(region)}`)
  }

  function selectSection(section: GuideSection | null) {
    if (section) {
      navigate(
        `/guide/${encodeURIComponent(activeRegion)}/${encodeURIComponent(section.location)}`,
      )
    } else {
      navigate(`/guide/${encodeURIComponent(activeRegion)}`)
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* List */}
      <div
        className={`flex-col border-white/10 md:w-80 md:shrink-0 md:flex md:border-r ${
          selectedSection ? 'hidden' : 'flex flex-1 border-r md:flex-none'
        }`}
      >
        <div className="p-4 border-b border-white/10 space-y-3">
          <h2 className="font-mono text-xs text-dex-red font-bold">GUÍA</h2>

          {/* Region tabs with progress bars */}
          <div className="flex flex-wrap gap-1">
            {guide.map(g => {
              const prog = regionProgress.find(p => p.region === g.region)
              const pct = prog && prog.total > 0 ? prog.done / prog.total : 0
              return (
                <button
                  key={g.region}
                  onClick={() => selectRegion(g.region)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold transition-colors flex flex-col items-center gap-0.5"
                  style={{
                    backgroundColor:
                      activeRegion === g.region
                        ? REGION_COLORS[g.region] ?? '#CC0000'
                        : 'rgba(255,255,255,0.1)',
                    color: activeRegion === g.region ? '#fff' : '#9ca3af',
                  }}
                >
                  <span>{g.region}</span>
                  {pct > 0 && (
                    <div className="w-full h-0.5 bg-white/20 rounded overflow-hidden">
                      <div
                        className="h-full bg-green-400 transition-all"
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Lugar, entrenador, Pokémon..."
          />
          <p className="text-[10px] text-gray-500">{filteredSections.length} secciones</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSections.length === 0 && (
            <EmptyState onClear={() => setSearch('')} />
          )}
          {filteredSections.map(section => {
            const done = section.battles.filter((_, i) =>
              completedSet.has(battleKey(activeRegion, section.location, i)),
            ).length
            const total = section.battles.length
            return (
              <button
                key={section.location}
                onClick={() => selectSection(section)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                  selectedSection === section.location
                    ? 'bg-dex-red/20 border-l-2 border-l-dex-red'
                    : 'hover:bg-white/5'
                }`}
              >
                <p className="text-sm font-bold text-white">{section.location}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-[10px] text-gray-500">
                    {total} combate{total !== 1 ? 's' : ''}
                  </p>
                  {done > 0 && (
                    <p className="text-[10px] text-green-400 font-bold">
                      {done}/{total} ✓
                    </p>
                  )}
                </div>
                {done > 0 && done < total && (
                  <div className="w-full h-0.5 bg-white/10 rounded overflow-hidden mt-1">
                    <div
                      className="h-full bg-green-400/60"
                      style={{ width: `${(done / total) * 100}%` }}
                    />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail */}
      <div
        className={`flex-1 overflow-y-auto ${selectedSection ? '' : 'hidden md:block'}`}
      >
        {activeSectionData ? (
          <>
            <button
              onClick={() => selectSection(null)}
              className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-white/10 text-dex-red font-bold text-sm w-full"
            >
              ← Volver
            </button>
            <SectionDetail
              section={activeSectionData}
              region={activeRegion}
              completedSet={completedSet}
              onToggleBattle={toggleBattle}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center space-y-2">
              <div className="text-6xl opacity-20">📖</div>
              <p className="font-mono text-xs">Selecciona una sección</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionDetail({
  section,
  region,
  completedSet,
  onToggleBattle,
}: {
  section: GuideSection
  region: string
  completedSet: Set<string>
  onToggleBattle: (key: string) => void
}) {
  const color = REGION_COLORS[region] ?? '#CC0000'
  const done = section.battles.filter((_, i) =>
    completedSet.has(battleKey(region, section.location, i)),
  ).length

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <span
          className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase"
          style={{ backgroundColor: color + '33', color }}
        >
          {region}
        </span>
        <div className="flex items-center gap-3 mt-2">
          <h2 className="text-2xl font-bold text-white flex-1">{section.location}</h2>
          {done > 0 && (
            <span className="text-sm text-green-400 font-bold">
              {done}/{section.battles.length} ✓
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {section.battles.length} combate{section.battles.length !== 1 ? 's' : ''}
        </p>
      </div>

      {section.battles.map((battle, i) => (
        <BattleCard
          key={i}
          battle={battle}
          regionColor={color}
          isCompleted={completedSet.has(battleKey(region, section.location, i))}
          onToggleCompleted={() =>
            onToggleBattle(battleKey(region, section.location, i))
          }
        />
      ))}
    </div>
  )
}

function BattleCard({
  battle,
  regionColor,
  isCompleted,
  onToggleCompleted,
}: {
  battle: Battle
  regionColor: string
  isCompleted: boolean
  onToggleCompleted: () => void
}) {
  return (
    <div
      className={`bg-dex-gray rounded-lg overflow-hidden border border-white/10 transition-opacity ${
        isCompleted ? 'opacity-60' : ''
      }`}
    >
      <div
        className="px-4 py-2.5 flex items-center gap-2 text-sm font-bold"
        style={{
          backgroundColor: regionColor + '22',
          borderBottom: '1px solid ' + regionColor + '33',
        }}
      >
        <span style={{ color: regionColor }}>VS</span>{' '}
        <span className="text-white flex-1">{battle.trainerName}</span>
        <button
          onClick={onToggleCompleted}
          className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors shrink-0 ${
            isCompleted
              ? 'bg-green-600/30 text-green-400'
              : 'bg-white/10 text-gray-500 hover:text-green-400 hover:bg-green-900/20'
          }`}
        >
          {isCompleted ? '✓ Hecho' : 'Marcar'}
        </button>
      </div>
      <div className="divide-y divide-white/5">
        {battle.pokemon.map((p, i) => (
          <PokemonEntry key={i} pokemon={p} />
        ))}
      </div>
    </div>
  )
}

function PokemonEntry({ pokemon }: { pokemon: PokemonEncounter }) {
  const pkmnSlug = encodeURIComponent(pokemon.name.toLowerCase())

  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          to={`/pokedex/${pkmnSlug}`}
          className="text-white font-bold text-sm hover:text-dex-red transition-colors"
        >
          {pokemon.name}
        </Link>
        <span className="text-xs text-gray-400">Nv. {pokemon.level}</span>
        {pokemon.item && pokemon.item !== 'No item' && (
          <Link
            to="/moves"
            state={{ selectItem: pokemon.item }}
            className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded hover:text-yellow-300 transition-colors"
          >
            {pokemon.item}
          </Link>
        )}
        {pokemon.nature && pokemon.nature !== '-' && (
          <span className="text-[10px] text-gray-500">Nat: {pokemon.nature}</span>
        )}
      </div>

      {pokemon.moves && pokemon.moves.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {pokemon.moves.map((m, i) => (
            <span
              key={i}
              className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded text-gray-300 capitalize"
            >
              {m}
            </span>
          ))}
        </div>
      )}

      {(pokemon.ivs || pokemon.evs) && (
        <div className="flex gap-3 text-[9px] text-gray-600">
          {pokemon.ivs && <span>IVs: {pokemon.ivs}</span>}
          {pokemon.evs && <span>EVs: {pokemon.evs}</span>}
        </div>
      )}
    </div>
  )
}
