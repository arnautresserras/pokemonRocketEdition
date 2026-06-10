import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Move, MoveVersion, MT, Item, ItemChange } from '../types'
import movesData from '../data/moves.json'
import mtsData from '../data/mts.json'
import itemsData from '../data/items.json'
import itemChangesData from '../data/itemChanges.json'
import SearchBar from '../components/SearchBar'
import TypeBadge from '../components/TypeBadge'
import { categoryLabel } from '../utils/items'

const moves = movesData as Move[]
const mts = mtsData as MT[]
const items = itemsData as Item[]
const itemChanges = itemChangesData as ItemChange[]


const UNIQUE_ITEM_CATS = ['todos', 'cambios', ...Array.from(new Set(items.map(i => i.category)))]

const MT_REGIONS = ['todos', 'T1', 'T2', 'T3', 'T4', 'T5'] as const
type MTRegion = (typeof MT_REGIONS)[number]
const MT_REGION_LABELS: Record<MTRegion, string> = {
  todos: 'Todos', T1: 'Kanto', T2: 'Archi7', T3: 'Johto', T4: 'DLC', T5: 'Hoenn',
}
const MT_REGION_COLORS: Record<MTRegion, string> = {
  todos: 'bg-gray-600', T1: 'bg-red-700', T2: 'bg-orange-700', T3: 'bg-blue-700',
  T4: 'bg-purple-700', T5: 'bg-green-700',
}

function mtRegionKey(region: string): MTRegion {
  const m = region.match(/\(T(\d+):/)
  if (!m) return 'todos'
  return `T${m[1]}` as MTRegion
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MovesPage() {
  const [tab, setTab] = useState<'moves' | 'items'>('moves')
  const [moveFilter, setMoveFilter] = useState<'cambios' | 'mt'>('cambios')
  const [mtRegion, setMtRegion] = useState<MTRegion>('todos')
  const [itemFilter, setItemFilter] = useState('todos')
  const [search, setSearch] = useState('')
  const [selectedMove, setSelectedMove] = useState<Move | null>(null)
  const [selectedMT, setSelectedMT] = useState<MT | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [selectedChange, setSelectedChange] = useState<ItemChange | null>(null)

  const switchTab = (t: 'moves' | 'items') => {
    setTab(t)
    setSearch('')
    setSelectedMove(null)
    setSelectedMT(null)
    setSelectedItem(null)
    setSelectedChange(null)
  }

  const handleSetMoveFilter = useCallback(
    (f: 'cambios' | 'mt') => { setMoveFilter(f); setSelectedMove(null); setSelectedMT(null); setSearch('') },
    [],
  )
  const handleSetMtRegion = useCallback(
    (r: MTRegion) => { setMtRegion(r); setSelectedMT(null) },
    [],
  )
  const handleSetItemFilter = useCallback(
    (f: string) => { setItemFilter(f); setSelectedItem(null); setSelectedChange(null); setSearch('') },
    [],
  )

  const hasSelection =
    tab === 'moves' ? !!(selectedMove || selectedMT) : !!(selectedItem || selectedChange)

  // Filtered moves
  const filteredMoves = useMemo(
    () =>
      moves.filter(
        m =>
          !search ||
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.official.type.toLowerCase().includes(search.toLowerCase()) ||
          m.hackrom.type.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  )

  // Filtered MTs
  const filteredMTs = useMemo(
    () =>
      mts.filter(mt => {
        const matchSearch =
          !search ||
          mt.name.toLowerCase().includes(search.toLowerCase()) ||
          mt.number.toLowerCase().includes(search.toLowerCase())
        const matchRegion = mtRegion === 'todos' || mtRegionKey(mt.region) === mtRegion
        return matchSearch && matchRegion
      }),
    [search, mtRegion],
  )

  // Filtered items
  const filteredItems = useMemo(() => {
    if (itemFilter === 'cambios') {
      return itemChanges.filter(
        c => !search || c.name.toLowerCase().includes(search.toLowerCase()),
      )
    }
    return items.filter(item => {
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase())
      const matchCat = itemFilter === 'todos' || item.category === itemFilter
      return matchSearch && matchCat
    })
  }, [search, itemFilter])

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-white/10">
        {(['moves', 'items'] as const).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 py-2.5 font-mono text-[11px] font-bold transition-colors ${
              tab === t
                ? 'text-dex-red border-b-2 border-dex-red'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t === 'moves' ? 'MOVIMIENTOS' : 'OBJETOS'}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Left: list */}
        <div
          className={`flex-col border-white/10 md:w-80 md:shrink-0 md:flex md:border-r ${
            hasSelection ? 'hidden' : 'flex flex-1 border-r md:flex-none'
          }`}
        >
          {tab === 'moves' ? (
            <MovesListPanel
              moveFilter={moveFilter}
              setMoveFilter={handleSetMoveFilter}
              mtRegion={mtRegion}
              setMtRegion={handleSetMtRegion}
              search={search}
              setSearch={setSearch}
              filteredMoves={filteredMoves}
              filteredMTs={filteredMTs}
              selectedMove={selectedMove}
              selectedMT={selectedMT}
              onSelectMove={setSelectedMove}
              onSelectMT={setSelectedMT}
            />
          ) : (
            <ItemsListPanel
              itemFilter={itemFilter}
              setItemFilter={handleSetItemFilter}
              search={search}
              setSearch={setSearch}
              filteredItems={filteredItems}
              selectedItem={selectedItem}
              selectedChange={selectedChange}
              onSelectItem={setSelectedItem}
              onSelectChange={setSelectedChange}
            />
          )}
        </div>

        {/* Right: detail */}
        <div className={`flex-1 overflow-y-auto ${hasSelection ? '' : 'hidden md:block'}`}>
          {tab === 'moves' ? (
            selectedMove ? (
              <>
                <BackButton onClick={() => setSelectedMove(null)} />
                <MoveDetail move={selectedMove} />
              </>
            ) : selectedMT ? (
              <>
                <BackButton onClick={() => setSelectedMT(null)} />
                <MTDetail mt={selectedMT} />
              </>
            ) : (
              <EmptyDetail icon="⚡" label="Selecciona un movimiento" />
            )
          ) : selectedItem ? (
            <>
              <BackButton onClick={() => setSelectedItem(null)} />
              <ItemDetail item={selectedItem} />
            </>
          ) : selectedChange ? (
            <>
              <BackButton onClick={() => setSelectedChange(null)} />
              <ItemChangeDetail change={selectedChange} />
            </>
          ) : (
            <EmptyDetail icon="🎒" label="Selecciona un objeto" />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Moves list panel ───────────────────────────────────────────────────────────

function MovesListPanel({
  moveFilter, setMoveFilter, mtRegion, setMtRegion,
  search, setSearch, filteredMoves, filteredMTs,
  selectedMove, selectedMT, onSelectMove, onSelectMT,
}: {
  moveFilter: 'cambios' | 'mt'
  setMoveFilter: (f: 'cambios' | 'mt') => void
  mtRegion: MTRegion
  setMtRegion: (r: MTRegion) => void
  search: string
  setSearch: (s: string) => void
  filteredMoves: Move[]
  filteredMTs: MT[]
  selectedMove: Move | null
  selectedMT: MT | null
  onSelectMove: (m: Move) => void
  onSelectMT: (mt: MT) => void
}) {
  const count = moveFilter === 'cambios' ? filteredMoves.length : filteredMTs.length
  const label = moveFilter === 'cambios' ? 'movimientos modificados' : 'MTs'

  const mtListRef = useRef<HTMLDivElement>(null)
  const mtVirtualizer = useVirtualizer({
    count: filteredMTs.length,
    getScrollElement: () => mtListRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10 space-y-3">
        <h2 className="font-mono text-xs text-dex-red font-bold">MOVIMIENTOS</h2>
        <div className="flex gap-1">
          {(['cambios', 'mt'] as const).map(f => (
            <button
              key={f}
              onClick={() => setMoveFilter(f)}
              className={`px-2.5 py-1 rounded text-[10px] font-bold transition-colors ${
                moveFilter === f ? 'bg-dex-red text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {f === 'cambios' ? 'Cambios' : 'MT'}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar..." />
        {moveFilter === 'mt' && (
          <div className="flex flex-wrap gap-1">
            {MT_REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setMtRegion(r)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  mtRegion === r ? 'bg-dex-red text-white' : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
              >
                {MT_REGION_LABELS[r]}
              </button>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-500">{count} {label}</p>
      </div>
      <div ref={mtListRef} className="flex-1 overflow-y-auto">
        {moveFilter === 'cambios'
          ? filteredMoves.map(m => (
              <MoveRow
                key={m.name}
                move={m}
                isSelected={selectedMove?.name === m.name}
                onClick={() => onSelectMove(m)}
              />
            ))
          : (
            <div style={{ height: mtVirtualizer.getTotalSize(), position: 'relative' }}>
              {mtVirtualizer.getVirtualItems().map(row => (
                <div
                  key={row.index}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}
                >
                  <MTRow
                    mt={filteredMTs[row.index]}
                    isSelected={selectedMT?.number === filteredMTs[row.index].number}
                    onClick={() => onSelectMT(filteredMTs[row.index])}
                  />
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Items list panel ───────────────────────────────────────────────────────────

function ItemsListPanel({
  itemFilter, setItemFilter, search, setSearch, filteredItems,
  selectedItem, selectedChange, onSelectItem, onSelectChange,
}: {
  itemFilter: string
  setItemFilter: (f: string) => void
  search: string
  setSearch: (s: string) => void
  filteredItems: Item[] | ItemChange[]
  selectedItem: Item | null
  selectedChange: ItemChange | null
  onSelectItem: (i: Item) => void
  onSelectChange: (c: ItemChange) => void
}) {
  const isChangesView = itemFilter === 'cambios'
  const count = filteredItems.length
  const label = isChangesView ? 'cambios' : 'objetos'

  const listRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 56,
    overscan: 5,
  })

  useEffect(() => {
    listRef.current?.scrollTo(0, 0)
  }, [itemFilter])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10 space-y-3">
        <h2 className="font-mono text-xs text-dex-red font-bold">OBJETOS</h2>
        <div className="flex flex-wrap gap-1">
          {UNIQUE_ITEM_CATS.map(cat => (
            <button
              key={cat}
              onClick={() => setItemFilter(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                itemFilter === cat
                  ? 'bg-dex-red text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar..." />
        <p className="text-[10px] text-gray-500">{count} {label}</p>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(row => {
            const idx = row.index
            return (
              <div
                key={idx}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start}px)` }}
              >
                {isChangesView
                  ? <ItemChangeRow
                      change={(filteredItems as ItemChange[])[idx]}
                      isSelected={selectedChange?.name === (filteredItems as ItemChange[])[idx].name}
                      onClick={() => onSelectChange((filteredItems as ItemChange[])[idx])}
                    />
                  : <ItemRow
                      item={(filteredItems as Item[])[idx]}
                      isSelected={selectedItem?.name === (filteredItems as Item[])[idx].name}
                      onClick={() => onSelectItem((filteredItems as Item[])[idx])}
                    />
                }
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Row components ─────────────────────────────────────────────────────────────

function MoveRow({ move, isSelected, onClick }: { move: Move; isSelected: boolean; onClick: () => void }) {
  const typeChanged = move.official.type !== move.hackrom.type
  const powerChanged = move.official.power !== move.hackrom.power

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-white/5 transition-colors ${
        isSelected ? 'bg-dex-red/20 border-l-2 border-l-dex-red' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{move.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <TypeBadge type={move.hackrom.type} small />
          {typeChanged && (
            <span className="text-[9px] text-gray-500 line-through">
              <TypeBadge type={move.official.type} small />
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-bold tabular-nums ${powerChanged ? 'text-green-400' : 'text-gray-400'}`}>
          {move.hackrom.power || '—'}
        </p>
        <p className="text-[9px] text-gray-600">poder</p>
      </div>
    </button>
  )
}

function MTRow({ mt, isSelected, onClick }: { mt: MT; isSelected: boolean; onClick: () => void }) {
  const rk = mtRegionKey(mt.region)
  const color = MT_REGION_COLORS[rk] || 'bg-gray-600'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-white/5 transition-colors ${
        isSelected ? 'bg-dex-red/20 border-l-2 border-l-dex-red' : 'hover:bg-white/5'
      }`}
    >
      <span className={`${color} text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0`}>
        {mt.number}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{mt.name}</p>
        <p className="text-[10px] text-gray-500 truncate">{mt.location}</p>
      </div>
    </button>
  )
}

function ItemRow({ item, isSelected, onClick }: { item: Item; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-white/5 transition-colors ${
        isSelected ? 'bg-dex-red/20 border-l-2 border-l-dex-red' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{item.name}</p>
        <p className="text-[10px] text-gray-500 truncate">{item.description.split('\n')[0]}</p>
      </div>
    </button>
  )
}

function ItemChangeRow({
  change, isSelected, onClick,
}: { change: ItemChange; isSelected: boolean; onClick: () => void }) {
  const isPotenciador = change.section.includes('POTENCIADORES')

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-white/5 transition-colors ${
        isSelected ? 'bg-dex-red/20 border-l-2 border-l-dex-red' : 'hover:bg-white/5'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{change.name}</p>
        <p className="text-[10px] text-gray-500 truncate">{change.effect.split('\n')[0]}</p>
      </div>
      <span
        className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
          isPotenciador ? 'bg-yellow-700 text-yellow-100' : 'bg-blue-700 text-blue-100'
        }`}
      >
        {isPotenciador ? 'POT.' : 'EFECTO'}
      </span>
    </button>
  )
}

// ── Detail components ──────────────────────────────────────────────────────────

function MoveDetail({ move }: { move: Move }) {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-2">{move.name}</h2>
      <p className="font-mono text-[10px] text-gray-500 mb-6">Movimiento modificado en Hackrom</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <VersionCard label="Oficial" version={move.official} />
        <VersionCard label="Hackrom" version={move.hackrom} highlight />
      </div>

      <div className="mt-6 bg-dex-gray rounded-lg p-4 space-y-2">
        <h3 className="font-mono text-[10px] text-dex-red uppercase mb-3">Cambios</h3>
        <DiffRow label="Tipo" from={move.official.type} to={move.hackrom.type} isType />
        <DiffRow label="Potencia" from={move.official.power} to={move.hackrom.power} />
        <DiffRow label="Precisión" from={move.official.accuracy} to={move.hackrom.accuracy} />
        <DiffRow label="Ef. Secundario" from={move.official.effect} to={move.hackrom.effect} />
        <DiffRow label="PP" from={String(move.official.pp || '—')} to={String(move.hackrom.pp || '—')} />
      </div>
    </div>
  )
}

function MTDetail({ mt }: { mt: MT }) {
  const rk = mtRegionKey(mt.region)
  const color = MT_REGION_COLORS[rk] || 'bg-gray-600'

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-4">
        <span className={`${color} text-white font-mono font-bold px-2 py-1 rounded text-sm`}>
          {mt.number}
        </span>
        <h2 className="text-2xl font-bold text-white">{mt.name}</h2>
      </div>
      <div className="bg-dex-gray rounded-lg p-4 space-y-3">
        <div>
          <p className="font-mono text-[10px] text-gray-500 mb-1">Ubicación</p>
          <p className="text-sm text-white">{mt.location}</p>
        </div>
        {mt.region && (
          <div>
            <p className="font-mono text-[10px] text-gray-500 mb-1">Temporada</p>
            <p className="text-sm text-white">{mt.region.replace(/[()]/g, '')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ItemDetail({ item }: { item: Item }) {
  const lines = item.description.split('\n')

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-1">{item.name}</h2>
      <p className="font-mono text-[10px] text-gray-500 mb-6">{categoryLabel(item.category)}</p>

      <div className="bg-dex-gray rounded-lg p-4">
        <p className="font-mono text-[10px] text-dex-red uppercase mb-3">Obtención</p>
        {lines.map((line, i) => (
          <p key={i} className={`text-sm text-gray-300 leading-relaxed ${line.startsWith('-') ? 'mt-1 pl-3' : ''}`}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

function ItemChangeDetail({ change }: { change: ItemChange }) {
  const isPotenciador = change.section.includes('POTENCIADORES')
  const lines = change.effect.split('\n')

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-1">{change.name}</h2>
      <p className="font-mono text-[10px] text-gray-500 mb-6">
        {isPotenciador ? 'Objeto potenciador de PKMN' : 'Efecto competitivo modificado'}
      </p>

      <div className="bg-dex-gray rounded-lg p-4">
        <p className="font-mono text-[10px] text-dex-red uppercase mb-3">Efecto Hackrom</p>
        {lines.map((line, i) => (
          <p key={i} className={`text-sm text-gray-300 leading-relaxed ${line.startsWith('-') ? 'mt-1 pl-3' : ''}`}>
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-white/10 text-dex-red font-bold text-sm w-full"
    >
      ← Volver
    </button>
  )
}

function EmptyDetail({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-600">
      <div className="text-center space-y-2">
        <div className="text-6xl opacity-20">{icon}</div>
        <p className="font-mono text-xs">{label}</p>
      </div>
    </div>
  )
}

function VersionCard({ label, version, highlight }: { label: string; version: MoveVersion; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        highlight ? 'bg-dex-gray border-dex-red/40' : 'bg-dex-gray/50 border-white/5 opacity-70'
      }`}
    >
      <p className={`font-mono text-[10px] uppercase mb-3 ${highlight ? 'text-dex-red' : 'text-gray-500'}`}>
        {label}
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Tipo</span>
          <TypeBadge type={version.type} small />
        </div>
        <StatLine label="Potencia" value={version.power} />
        <StatLine label="Precisión" value={version.accuracy} />
        <StatLine label="PP" value={String(version.pp || '—')} />
        <div>
          <span className="text-gray-500 text-xs block mb-1">Efecto</span>
          <p className="text-xs text-gray-300 leading-relaxed">{version.effect || 'Ninguno'}</p>
        </div>
      </div>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-white font-bold text-xs">{value || '—'}</span>
    </div>
  )
}

function DiffRow({ label, from, to, isType }: { label: string; from: string; to: string; isType?: boolean }) {
  const changed = from !== to
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-gray-500 w-28 shrink-0">{label}</span>
      {changed ? (
        <div className="flex items-center gap-2 flex-wrap">
          {isType ? (
            <>
              <TypeBadge type={from} small />
              <span className="text-gray-600">→</span>
              <TypeBadge type={to} small />
            </>
          ) : (
            <>
              <span className="text-gray-500 line-through">{from || '—'}</span>
              <span className="text-gray-600">→</span>
              <span className="text-green-400 font-bold">{to || '—'}</span>
            </>
          )}
        </div>
      ) : (
        <span className="text-gray-400">{isType ? <TypeBadge type={from} small /> : from || '—'}</span>
      )}
    </div>
  )
}
