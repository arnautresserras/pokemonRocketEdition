import { useState, useMemo } from 'react'
import type { Move, MoveVersion } from '../types'
import movesData from '../data/moves.json'
import SearchBar from '../components/SearchBar'
import TypeBadge from '../components/TypeBadge'

const moves = movesData as Move[]

export default function MovesPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Move | null>(null)

  const filtered = useMemo(
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

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-80 shrink-0 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10 space-y-3">
          <h2 className="font-mono text-xs text-dex-red font-bold">MOVIMIENTOS</h2>
          <SearchBar value={search} onChange={setSearch} placeholder="Nombre o tipo..." />
          <p className="text-[10px] text-gray-500">{filtered.length} movimientos modificados</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.map(move => (
            <MoveRow
              key={move.name}
              move={move}
              isSelected={selected?.name === move.name}
              onClick={() => setSelected(move)}
            />
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <MoveDetail move={selected} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600">
            <div className="text-center space-y-2">
              <div className="text-6xl opacity-20">⚡</div>
              <p className="font-mono text-xs">Selecciona un movimiento</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MoveRow({
  move,
  isSelected,
  onClick,
}: {
  move: Move
  isSelected: boolean
  onClick: () => void
}) {
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

function MoveDetail({ move }: { move: Move }) {
  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-white mb-2">{move.name}</h2>
      <p className="font-mono text-[10px] text-gray-500 mb-6">Movimiento modificado en Hackrom</p>

      <div className="grid grid-cols-2 gap-4">
        <VersionCard label="Oficial" version={move.official} />
        <VersionCard label="Hackrom" version={move.hackrom} highlight />
      </div>

      {/* Diff summary */}
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

function VersionCard({
  label,
  version,
  highlight,
}: {
  label: string
  version: MoveVersion
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        highlight
          ? 'bg-dex-gray border-dex-red/40'
          : 'bg-dex-gray/50 border-white/5 opacity-70'
      }`}
    >
      <p
        className={`font-mono text-[10px] uppercase mb-3 ${
          highlight ? 'text-dex-red' : 'text-gray-500'
        }`}
      >
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

function DiffRow({
  label,
  from,
  to,
  isType,
}: {
  label: string
  from: string
  to: string
  isType?: boolean
}) {
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
