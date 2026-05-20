import { useState } from 'react'

type Stat = 'ataque' | 'defensa' | 'atesp' | 'defesp' | 'velocidad'
type View = 'lista' | 'tabla'

const STATS: Stat[] = ['ataque', 'defensa', 'atesp', 'defesp', 'velocidad']

const STAT_LABEL: Record<Stat, string> = {
  ataque:    'Ataque',
  defensa:   'Defensa',
  atesp:     'At. Esp.',
  defesp:    'Def. Esp.',
  velocidad: 'Velocidad',
}

const STAT_SHORT: Record<Stat, string> = {
  ataque:    'Atq.',
  defensa:   'Def.',
  atesp:     'At.E.',
  defesp:    'Df.E.',
  velocidad: 'Vel.',
}

const STAT_COLOR: Record<Stat, { pill: string; text: string; bg: string }> = {
  ataque:    { pill: 'bg-orange-400/20 text-orange-400 border border-orange-400/30', text: 'text-orange-400', bg: 'bg-orange-400/10' },
  defensa:   { pill: 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  atesp:     { pill: 'bg-blue-400/20 text-blue-400 border border-blue-400/30',       text: 'text-blue-400',   bg: 'bg-blue-400/10' },
  defesp:    { pill: 'bg-green-400/20 text-green-400 border border-green-400/30',    text: 'text-green-400',  bg: 'bg-green-400/10' },
  velocidad: { pill: 'bg-pink-400/20 text-pink-400 border border-pink-400/30',       text: 'text-pink-400',   bg: 'bg-pink-400/10' },
}

interface Nature {
  name: string
  eng: string
  boost: Stat | null
  reduce: Stat | null
}

const NATURES: Nature[] = [
  { name: 'Recia',     eng: 'Hardy',    boost: null,        reduce: null },
  { name: 'Dócil',     eng: 'Docile',   boost: null,        reduce: null },
  { name: 'Tímida',    eng: 'Bashful',  boost: null,        reduce: null },
  { name: 'Rara',      eng: 'Quirky',   boost: null,        reduce: null },
  { name: 'Seria',     eng: 'Serious',  boost: null,        reduce: null },
  { name: 'Huraña',    eng: 'Lonely',   boost: 'ataque',    reduce: 'defensa' },
  { name: 'Audaz',     eng: 'Brave',    boost: 'ataque',    reduce: 'velocidad' },
  { name: 'Firme',     eng: 'Adamant',  boost: 'ataque',    reduce: 'atesp' },
  { name: 'Pícara',    eng: 'Naughty',  boost: 'ataque',    reduce: 'defesp' },
  { name: 'Osada',     eng: 'Bold',     boost: 'defensa',   reduce: 'ataque' },
  { name: 'Plácida',   eng: 'Relaxed',  boost: 'defensa',   reduce: 'velocidad' },
  { name: 'Agitada',   eng: 'Impish',   boost: 'defensa',   reduce: 'atesp' },
  { name: 'Floja',     eng: 'Lax',      boost: 'defensa',   reduce: 'defesp' },
  { name: 'Modesta',   eng: 'Modest',   boost: 'atesp',     reduce: 'ataque' },
  { name: 'Afable',    eng: 'Mild',     boost: 'atesp',     reduce: 'defensa' },
  { name: 'Tranquila', eng: 'Quiet',    boost: 'atesp',     reduce: 'velocidad' },
  { name: 'Alocada',   eng: 'Rash',     boost: 'atesp',     reduce: 'defesp' },
  { name: 'Serena',    eng: 'Calm',     boost: 'defesp',    reduce: 'ataque' },
  { name: 'Amable',    eng: 'Gentle',   boost: 'defesp',    reduce: 'defensa' },
  { name: 'Grosera',   eng: 'Sassy',    boost: 'defesp',    reduce: 'velocidad' },
  { name: 'Cauta',     eng: 'Careful',  boost: 'defesp',    reduce: 'atesp' },
  { name: 'Miedosa',   eng: 'Timid',    boost: 'velocidad', reduce: 'ataque' },
  { name: 'Activa',    eng: 'Hasty',    boost: 'velocidad', reduce: 'defensa' },
  { name: 'Alegre',    eng: 'Jolly',    boost: 'velocidad', reduce: 'atesp' },
  { name: 'Ingenua',   eng: 'Naive',    boost: 'velocidad', reduce: 'defesp' },
]

// Neutral nature placed on each diagonal cell (boost stat = reduce stat conceptually)
const GRID_NEUTRAL: Record<Stat, string> = {
  ataque:    'Recia',
  defensa:   'Dócil',
  atesp:     'Tímida',
  defesp:    'Rara',
  velocidad: 'Seria',
}

function StatBadge({ stat, type }: { stat: Stat; type: 'boost' | 'reduce' }) {
  const c = STAT_COLOR[stat]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${c.pill}`}>
      {type === 'boost' ? '▲' : '▼'} {STAT_SHORT[stat]}
    </span>
  )
}

function ListView({ filter }: { filter: Stat | null }) {
  const filtered = [...NATURES]
    .filter(n => !filter || n.boost === filter || n.reduce === filter)
    .sort((a, b) => {
      if (a.boost === null && b.boost !== null) return 1
      if (a.boost !== null && b.boost === null) return -1
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-1">
        {filtered.map(n => (
          <div
            key={n.eng}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
              n.boost === null ? 'bg-white/[0.03]' : 'bg-white/5'
            }`}
          >
            <div className="flex-1 min-w-0">
              <span className="font-mono text-xs text-white font-bold">{n.name}</span>
              <span className="font-mono text-[9px] text-gray-500 ml-2">{n.eng}</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              {n.boost
                ? <StatBadge stat={n.boost} type="boost" />
                : <span className="font-mono text-[9px] text-gray-600 px-1">sin efecto</span>
              }
              {n.reduce && <StatBadge stat={n.reduce} type="reduce" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GridView() {
  return (
    <div className="flex-1 overflow-auto p-4">
      <p className="font-mono text-[10px] text-gray-500 mb-4">
        Filas = stat aumentado (+10%) · Columnas = stat reducido (−10%)
      </p>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2 w-16" />
              {STATS.map(col => (
                <th
                  key={col}
                  className={`p-2 text-[9px] font-mono font-bold text-center w-[100px] ${STAT_COLOR[col].text}`}
                >
                  ▼ {STAT_LABEL[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STATS.map(row => (
              <tr key={row}>
                <td className={`p-2 text-[9px] font-mono font-bold text-right pr-3 ${STAT_COLOR[row].text}`}>
                  ▲ {STAT_LABEL[row]}
                </td>
                {STATS.map(col => {
                  if (row === col) {
                    return (
                      <td key={col} className="p-1.5">
                        <div className="bg-white/5 border border-white/10 rounded px-2 py-2 text-center w-[88px]">
                          <div className="font-mono text-[10px] text-gray-400">{GRID_NEUTRAL[row]}</div>
                          <div className="font-mono text-[8px] text-gray-600 mt-0.5">neutro</div>
                        </div>
                      </td>
                    )
                  }
                  const nature = NATURES.find(n => n.boost === row && n.reduce === col)!
                  return (
                    <td key={col} className="p-1.5">
                      <div className={`rounded px-2 py-2 text-center w-[88px] ${STAT_COLOR[row].bg}`}>
                        <div className={`font-mono text-[10px] font-bold ${STAT_COLOR[row].text}`}>
                          {nature.name}
                        </div>
                        <div className="font-mono text-[8px] text-gray-500 mt-0.5">{nature.eng}</div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function NaturesPage() {
  const [view, setView] = useState<View>('lista')
  const [filter, setFilter] = useState<Stat | null>(null)

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10 shrink-0 space-y-3">
        <h2 className="font-mono text-xs text-dex-red font-bold">NATURALEZAS</h2>
        <div className="flex gap-1">
          {(['lista', 'tabla'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                view === v ? 'bg-dex-red text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {v === 'lista' ? 'Lista' : 'Tabla 5×5'}
            </button>
          ))}
        </div>
        {view === 'lista' && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilter(null)}
              className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold transition-colors ${
                filter === null
                  ? 'bg-white/20 text-white'
                  : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              Todas
            </button>
            {STATS.map(s => (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? null : s)}
                className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold transition-colors border ${
                  filter === s
                    ? STAT_COLOR[s].pill
                    : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {STAT_LABEL[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'lista' ? <ListView filter={filter} /> : <GridView />}
    </div>
  )
}
