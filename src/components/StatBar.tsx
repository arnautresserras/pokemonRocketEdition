import { STAT_MAX } from '../constants'

const COLOR_BUFF = '#4ade80'   // Tailwind green-400
const COLOR_NERF = '#f87171'   // Tailwind red-400
const COLOR_BASE = '#60a5fa'   // Tailwind blue-400

interface Props {
  label: string
  official?: number
  hackrom?: number
  max?: number
}

export default function StatBar({ label, official, hackrom, max = STAT_MAX }: Props) {
  const offPct = official !== undefined ? Math.min((official / max) * 100, 100) : 0
  const hackPct = hackrom !== undefined ? Math.min((hackrom / max) * 100, 100) : 0
  const changed = official !== undefined && hackrom !== undefined && official !== hackrom

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-400 shrink-0">{label}</span>
      <div className="flex-1 space-y-0.5">
        {official !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="stat-bar-track flex-1">
              <div
                className="h-full rounded-full bg-gray-500 transition-all"
                style={{ width: `${offPct}%` }}
              />
            </div>
            <span className={`w-8 text-right tabular-nums ${changed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
              {official}
            </span>
          </div>
        )}
        {hackrom !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="stat-bar-track flex-1">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${hackPct}%`,
                  backgroundColor:
                    changed && hackrom > (official ?? 0)
                      ? COLOR_BUFF
                      : changed
                        ? COLOR_NERF
                        : COLOR_BASE,
                }}
              />
            </div>
            <span className={`w-8 text-right tabular-nums font-bold ${changed && hackrom > (official ?? 0) ? 'text-green-400' : changed ? 'text-red-400' : 'text-blue-400'}`}>
              {hackrom}
            </span>
          </div>
        )}
        {official === undefined && hackrom === undefined && (
          <div className="stat-bar-track">
            <div className="h-full w-0" />
          </div>
        )}
      </div>
    </div>
  )
}
