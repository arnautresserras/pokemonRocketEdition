import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', label: 'Pokédex', icon: '◉' },
  { to: '/moves', label: 'Movimientos', icon: '⚡' },
  { to: '/guide', label: 'Guía', icon: '📖' },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-52 shrink-0 bg-dex-red flex-col">
      {/* Header */}
      <div className="px-4 py-5 border-b border-dex-darkred">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-white border-2 border-dex-darkred" />
          <div className="w-3 h-3 rounded-full bg-red-300" />
          <div className="w-3 h-3 rounded-full bg-yellow-300" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <h1 className="font-mono text-[10px] text-white leading-tight mt-2">PKMN ROCKET</h1>
        <p className="font-mono text-[8px] text-red-200 mt-0.5">POKÉDEX v1.0</p>
      </div>

      {/* Screen decoration */}
      <div className="mx-4 my-3 rounded bg-dex-darkred p-2">
        <div className="rounded bg-dex-screen/20 h-12 flex items-center justify-center border border-dex-darkred/50">
          <span className="font-mono text-[8px] text-dex-screen/70">SELECT SECTION</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-1">
        {LINKS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isActive
                  ? 'bg-white text-dex-red shadow-lg'
                  : 'text-red-100 hover:bg-dex-darkred hover:text-white'
              }`
            }
          >
            <span className="text-base w-5 text-center">{icon}</span>
            <span className="font-mono text-[10px]">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom decoration */}
      <div className="p-4 border-t border-dex-darkred">
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full bg-dex-darkred" />
          ))}
        </div>
      </div>
    </aside>
  )
}
