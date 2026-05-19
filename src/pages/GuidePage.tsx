import { useState, useMemo } from 'react'
import type { RegionGuide, GuideSection, Battle, PokemonEncounter } from '../types'
import guideData from '../data/guide.json'
import SearchBar from '../components/SearchBar'

const guide = guideData as RegionGuide[]

const REGION_COLORS: Record<string, string> = {
  Kanto: '#CC0000',
  Archi7: '#0044CC',
  Johto: '#007700',
  DLC: '#7700BB',
  Hoenn: '#CC6600',
}

export default function GuidePage() {
  const [activeRegion, setActiveRegion] = useState(guide[0]?.region ?? '')
  const [search, setSearch] = useState('')
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  const currentGuide = guide.find(g => g.region === activeRegion)

  const filteredSections = useMemo(() => {
    if (!currentGuide) return []
    if (!search) return currentGuide.sections
    const q = search.toLowerCase()
    return currentGuide.sections.filter(
      s =>
        s.location.toLowerCase().includes(q) ||
        s.battles.some(
          b =>
            b.trainerName.toLowerCase().includes(q) ||
            b.pokemon.some(p => p.name.toLowerCase().includes(q)),
        ),
    )
  }, [currentGuide, search])

  const activeSectionData = currentGuide?.sections.find(s => s.location === selectedSection)

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

          {/* Region tabs */}
          <div className="flex flex-wrap gap-1">
            {guide.map(g => (
              <button
                key={g.region}
                onClick={() => {
                  setActiveRegion(g.region)
                  setSelectedSection(null)
                  setSearch('')
                }}
                className="px-2 py-0.5 rounded text-[10px] font-bold transition-colors"
                style={{
                  backgroundColor:
                    activeRegion === g.region
                      ? REGION_COLORS[g.region] ?? '#CC0000'
                      : 'rgba(255,255,255,0.1)',
                  color: activeRegion === g.region ? '#fff' : '#9ca3af',
                }}
              >
                {g.region}
              </button>
            ))}
          </div>

          <SearchBar value={search} onChange={setSearch} placeholder="Lugar, entrenador, Pokémon..." />
          <p className="text-[10px] text-gray-500">{filteredSections.length} secciones</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSections.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-600">
              <p className="font-mono text-xs">Sin resultados</p>
            </div>
          )}
          {filteredSections.map(section => (
            <button
              key={section.location}
              onClick={() => setSelectedSection(section.location)}
              className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                selectedSection === section.location
                  ? 'bg-dex-red/20 border-l-2 border-l-dex-red'
                  : 'hover:bg-white/5'
              }`}
            >
              <p className="text-sm font-bold text-white">{section.location}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {section.battles.length} combate{section.battles.length !== 1 ? 's' : ''}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className={`flex-1 overflow-y-auto ${selectedSection ? '' : 'hidden md:block'}`}>
        {activeSectionData ? (
          <>
            <button
              onClick={() => setSelectedSection(null)}
              className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-white/10 text-dex-red font-bold text-sm w-full"
            >
              ← Volver
            </button>
            <SectionDetail section={activeSectionData} region={activeRegion} />
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
}: {
  section: GuideSection
  region: string
}) {
  const color = REGION_COLORS[region] ?? '#CC0000'

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <span
          className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase"
          style={{ backgroundColor: color + '33', color }}
        >
          {region}
        </span>
        <h2 className="text-2xl font-bold text-white mt-2">{section.location}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {section.battles.length} combate{section.battles.length !== 1 ? 's' : ''}
        </p>
      </div>

      {section.battles.map((battle, i) => (
        <BattleCard key={i} battle={battle} regionColor={color} />
      ))}
    </div>
  )
}

function BattleCard({ battle, regionColor }: { battle: Battle; regionColor: string }) {
  return (
    <div className="bg-dex-gray rounded-lg overflow-hidden border border-white/10">
      <div
        className="px-4 py-2.5 text-sm font-bold"
        style={{ backgroundColor: regionColor + '22', borderBottom: '1px solid ' + regionColor + '33' }}
      >
        <span style={{ color: regionColor }}>VS</span>{' '}
        <span className="text-white">{battle.trainerName}</span>
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
  return (
    <div className="px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-sm">{pokemon.name}</span>
        <span className="text-xs text-gray-400">Nv. {pokemon.level}</span>
        {pokemon.item && pokemon.item !== 'No item' && (
          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
            {pokemon.item}
          </span>
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
