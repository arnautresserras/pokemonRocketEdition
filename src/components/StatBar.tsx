interface Props {
  label: string
  official?: number
  hackrom?: number
  max?: number
}

export default function StatBar({ label, official, hackrom, max = 255 }: Props) {
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
                      ? '#4ade80'
                      : changed
                        ? '#f87171'
                        : '#60a5fa',
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
