import { useState } from 'react'
import { getTypeColor } from '../utils/types'

const TYPES = [
  'normal', 'fuego', 'agua', 'electrico', 'planta', 'hielo',
  'lucha', 'veneno', 'tierra', 'volador', 'psiquico', 'bicho',
  'roca', 'fantasma', 'dragon', 'siniestro', 'acero', 'hada',
]

const TYPE_LABELS: Record<string, string> = {
  normal: 'Normal', fuego: 'Fuego', agua: 'Agua', electrico: 'Eléct.',
  planta: 'Planta', hielo: 'Hielo', lucha: 'Lucha', veneno: 'Veneno',
  tierra: 'Tierra', volador: 'Volad.', psiquico: 'Psíq.', bicho: 'Bicho',
  roca: 'Roca', fantasma: 'Fant.', dragon: 'Dragón', siniestro: 'Sinist.',
  acero: 'Acero', hada: 'Hada',
}

// Gen 3 type chart — only non-1× entries; Steel resists Ghost/Dark (pre-Gen4 rules)
const CHART_RAW: Array<[string, string, number]> = [
  ['normal',    'roca',      0.5], ['normal',    'acero',     0.5], ['normal',    'fantasma',  0  ],
  ['fuego',     'planta',    2  ], ['fuego',     'hielo',     2  ], ['fuego',     'bicho',     2  ], ['fuego',     'acero',     2  ],
  ['fuego',     'fuego',     0.5], ['fuego',     'agua',      0.5], ['fuego',     'roca',      0.5], ['fuego',     'dragon',    0.5],
  ['agua',      'fuego',     2  ], ['agua',      'tierra',    2  ], ['agua',      'roca',      2  ],
  ['agua',      'agua',      0.5], ['agua',      'planta',    0.5], ['agua',      'dragon',    0.5],
  ['electrico', 'agua',      2  ], ['electrico', 'volador',   2  ],
  ['electrico', 'electrico', 0.5], ['electrico', 'planta',    0.5], ['electrico', 'dragon',    0.5],
  ['electrico', 'tierra',    0  ],
  ['planta',    'agua',      2  ], ['planta',    'tierra',    2  ], ['planta',    'roca',      2  ],
  ['planta',    'fuego',     0.5], ['planta',    'planta',    0.5], ['planta',    'veneno',    0.5],
  ['planta',    'volador',   0.5], ['planta',    'bicho',     0.5], ['planta',    'dragon',    0.5], ['planta', 'acero', 0.5],
  ['hielo',     'planta',    2  ], ['hielo',     'tierra',    2  ], ['hielo',     'volador',   2  ], ['hielo',  'dragon', 2],
  ['hielo',     'fuego',     0.5], ['hielo',     'agua',      0.5], ['hielo',     'hielo',     0.5], ['hielo',  'acero', 0.5],
  ['lucha',     'normal',    2  ], ['lucha',     'hielo',     2  ], ['lucha',     'roca',      2  ],
  ['lucha',     'siniestro', 2  ], ['lucha',     'acero',     2  ],
  ['lucha',     'veneno',    0.5], ['lucha',     'volador',   0.5], ['lucha',     'psiquico',  0.5], ['lucha', 'bicho', 0.5],
  ['lucha',     'fantasma',  0  ],
  ['veneno',    'planta',    2  ],
  ['veneno',    'veneno',    0.5], ['veneno',    'tierra',    0.5], ['veneno',    'roca',      0.5], ['veneno', 'fantasma', 0.5],
  ['veneno',    'acero',     0  ],
  ['tierra',    'fuego',     2  ], ['tierra',    'electrico', 2  ], ['tierra',    'veneno',    2  ],
  ['tierra',    'roca',      2  ], ['tierra',    'acero',     2  ],
  ['tierra',    'planta',    0.5], ['tierra',    'bicho',     0.5],
  ['tierra',    'volador',   0  ],
  ['volador',   'planta',    2  ], ['volador',   'lucha',     2  ], ['volador',   'bicho',     2  ],
  ['volador',   'electrico', 0.5], ['volador',   'roca',      0.5], ['volador',   'acero',     0.5],
  ['psiquico',  'lucha',     2  ], ['psiquico',  'veneno',    2  ],
  ['psiquico',  'psiquico',  0.5], ['psiquico',  'acero',     0.5],
  ['psiquico',  'siniestro', 0  ],
  ['bicho',     'planta',    2  ], ['bicho',     'psiquico',  2  ], ['bicho',     'siniestro', 2  ],
  ['bicho',     'fuego',     0.5], ['bicho',     'lucha',     0.5], ['bicho',     'volador',   0.5],
  ['bicho',     'fantasma',  0.5], ['bicho',     'acero',     0.5],
  ['roca',      'fuego',     2  ], ['roca',      'hielo',     2  ], ['roca',      'volador',   2  ], ['roca', 'bicho', 2],
  ['roca',      'lucha',     0.5], ['roca',      'tierra',    0.5], ['roca',      'acero',     0.5],
  ['fantasma',  'psiquico',  2  ], ['fantasma',  'fantasma',  2  ],
  ['fantasma',  'siniestro', 0.5], ['fantasma',  'acero',     0.5],
  ['fantasma',  'normal',    0  ],
  ['dragon',    'dragon',    2  ],
  ['dragon',    'acero',     0.5],
  ['siniestro', 'psiquico',  2  ], ['siniestro', 'fantasma',  2  ],
  ['siniestro', 'lucha',     0.5], ['siniestro', 'siniestro', 0.5], ['siniestro', 'acero',     0.5],
  ['acero',     'hielo',     2  ], ['acero',     'roca',      2  ],
  ['acero',     'fuego',     0.5], ['acero',     'agua',      0.5], ['acero',     'electrico', 0.5], ['acero', 'acero', 0.5],
  // Fairy attacking
  ['hada',      'dragon',    2  ], ['hada',      'siniestro', 2  ], ['hada',      'lucha',     2  ],
  ['hada',      'fuego',     0.5], ['hada',      'veneno',    0.5], ['hada',      'acero',     0.5],
  // Other types attacking Fairy
  ['veneno',    'hada',      2  ], ['acero',     'hada',      2  ],
  ['lucha',     'hada',      0.5], ['bicho',     'hada',      0.5], ['siniestro', 'hada',      0.5],
  ['dragon',    'hada',      0  ],
]

const CHART: Record<string, Record<string, number>> = Object.fromEntries(TYPES.map(t => [t, {}]))
for (const [a, d, m] of CHART_RAW) CHART[a][d] = m

function eff(attacker: string, defender: string): number {
  return CHART[attacker]?.[defender] ?? 1
}

function dualEff(attacker: string, d1: string, d2: string | null): number {
  return eff(attacker, d1) * (d2 ? eff(attacker, d2) : 1)
}

const CELL_STYLE: Record<number, { bg: string; text: string; label: string }> = {
  0:   { bg: '#1a1a1a', text: '#555',   label: '✕'  },
  0.5: { bg: '#7f1d1d', text: '#fca5a5', label: '½' },
  1:   { bg: '#1f2937', text: '#4b5563', label: ''   },
  2:   { bg: '#14532d', text: '#86efac', label: '2'  },
  4:   { bg: '#065f46', text: '#6ee7b7', label: '4'  },
  0.25:{ bg: '#450a0a', text: '#fca5a5', label: '¼' },
}

function cellStyle(mult: number) {
  return CELL_STYLE[mult] ?? CELL_STYLE[1]
}

// ── Full Chart View ──────────────────────────────────────────────────────────

function ChartView() {
  return (
    <div className="overflow-auto flex-1 p-3">
      <div className="min-w-max">
        {/* Legend */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="font-mono text-[9px] text-gray-500 uppercase">Leyenda:</span>
          {([2, 0.5, 0, 1] as const).map(m => {
            const s = cellStyle(m)
            return (
              <span key={m} className="flex items-center gap-1">
                <span
                  className="inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold"
                  style={{ backgroundColor: s.bg, color: s.text, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {s.label || '—'}
                </span>
                <span className="font-mono text-[9px] text-gray-400">
                  {m === 2 ? 'Súper eficaz' : m === 0.5 ? 'Poco eficaz' : m === 0 ? 'Inmune' : 'Normal'}
                </span>
              </span>
            )
          })}
        </div>

        {/* Table */}
        <table className="border-collapse text-[10px] font-mono">
          <thead>
            <tr>
              {/* Corner */}
              <th className="w-14 text-right pr-1 pb-1">
                <div className="text-[8px] text-gray-600 leading-tight text-right">
                  <div>ATQ ↓</div>
                  <div>DEF →</div>
                </div>
              </th>
              {TYPES.map(def => (
                <th key={def} className="pb-1 px-px">
                  <div
                    className="w-7 h-16 flex items-end justify-center pb-1 rounded-t text-[8px] font-bold uppercase leading-none"
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      backgroundColor: getTypeColor(def) + '33',
                      color: getTypeColor(def),
                      borderBottom: `2px solid ${getTypeColor(def)}`,
                    }}
                  >
                    {TYPE_LABELS[def]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TYPES.map(atk => (
              <tr key={atk}>
                <td className="pr-1 py-px">
                  <div
                    className="flex items-center justify-end gap-1 pr-1 pl-2 py-0.5 rounded-l text-[9px] font-bold uppercase"
                    style={{
                      backgroundColor: getTypeColor(atk) + '33',
                      color: getTypeColor(atk),
                      borderLeft: `2px solid ${getTypeColor(atk)}`,
                    }}
                  >
                    {TYPE_LABELS[atk]}
                  </div>
                </td>
                {TYPES.map(def => {
                  const m = eff(atk, def)
                  const s = cellStyle(m)
                  return (
                    <td key={def} className="px-px py-px">
                      <div
                        className="w-7 h-7 flex items-center justify-center rounded font-bold"
                        style={{
                          backgroundColor: s.bg,
                          color: s.text,
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        {s.label}
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

// ── Calculator View ──────────────────────────────────────────────────────────

function TypePicker({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (t: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPES.map(t => {
        const active = selected.includes(t)
        const color = getTypeColor(t)
        return (
          <button
            key={t}
            onClick={() => onToggle(t)}
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{
              backgroundColor: active ? color : color + '22',
              color: active ? '#fff' : color,
              border: `1px solid ${color}55`,
              textShadow: active ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}

const MULT_ORDER = [4, 2, 1, 0.5, 0.25, 0]
const MULT_LABELS: Record<number, string> = {
  4: '4× Súper eficaz', 2: '2× Súper eficaz', 1: '1× Normal',
  0.5: '½× Poco eficaz', 0.25: '¼× Poco eficaz', 0: '0× Inmune',
}

function CalculatorView() {
  const [defending, setDefending] = useState<string[]>([])

  function toggle(t: string) {
    setDefending(prev => {
      if (prev.includes(t)) return prev.filter(x => x !== t)
      if (prev.length >= 2) return [prev[1], t]
      return [...prev, t]
    })
  }

  const [d1, d2] = [defending[0] ?? null, defending[1] ?? null]

  const grouped: Record<number, string[]> = Object.fromEntries(MULT_ORDER.map(m => [m, []]))
  if (d1) {
    for (const atk of TYPES) {
      const m = dualEff(atk, d1, d2)
      if (grouped[m] !== undefined) grouped[m].push(atk)
    }
  }

  return (
    <div className="flex-1 overflow-auto p-4 space-y-5">
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-gray-400">
          Selecciona hasta 2 tipos <span className="text-gray-600">(defensores)</span>:
        </p>
        <TypePicker selected={defending} onToggle={toggle} />
      </div>

      {!d1 && (
        <p className="font-mono text-[11px] text-gray-600">
          Selecciona un tipo para ver sus debilidades y resistencias.
        </p>
      )}

      {d1 && (
        <div className="space-y-1">
          {/* Selected type header */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="px-3 py-1 rounded font-bold text-[11px] uppercase"
              style={{ backgroundColor: getTypeColor(d1), color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
            >
              {d1}
            </span>
            {d2 && (
              <>
                <span className="text-gray-600 font-mono text-[10px]">+</span>
                <span
                  className="px-3 py-1 rounded font-bold text-[11px] uppercase"
                  style={{ backgroundColor: getTypeColor(d2), color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {d2}
                </span>
              </>
            )}
          </div>

          {MULT_ORDER.map(m => {
            const types = grouped[m]
            if (!types || types.length === 0) return null
            const s = cellStyle(m)
            return (
              <div key={m} className="flex items-start gap-3 py-2 border-b border-white/5">
                <div
                  className="shrink-0 w-16 flex items-center justify-center rounded py-0.5 font-bold font-mono text-[11px]"
                  style={{ backgroundColor: s.bg, color: s.text, border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {MULT_LABELS[m].split('×')[0]}×
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {types.map(t => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: getTypeColor(t) + '33',
                        color: getTypeColor(t),
                        border: `1px solid ${getTypeColor(t)}55`,
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'chart' | 'calc'

export default function TypesPage() {
  const [tab, setTab] = useState<Tab>('chart')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 shrink-0 space-y-3">
        <h2 className="font-mono text-xs text-dex-red font-bold">TIPOS</h2>
        <div className="flex gap-1">
          {(['chart', 'calc'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                tab === t ? 'bg-dex-red text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {t === 'chart' ? 'Tabla completa' : 'Calculadora'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'chart' ? <ChartView /> : <CalculatorView />}
    </div>
  )
}
