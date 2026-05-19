import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import PokedexPage from './pages/PokedexPage'
import MovesPage from './pages/MovesPage'
import GuidePage from './pages/GuidePage'
import TypesPage from './pages/TypesPage'
import { NAV_LINKS } from './constants/nav'

function MobileNav() {
  return (
    <nav className="md:hidden flex shrink-0 border-t border-white/10 bg-dex-black pb-[env(safe-area-inset-bottom,0px)]">
      {NAV_LINKS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? 'text-dex-red' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl">{icon}</span>
          <span className="font-mono text-[9px] font-bold">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="flex flex-col md:flex-row h-dvh overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-dex-black min-h-0">
          <Routes>
            <Route path="/" element={<PokedexPage />} />
            <Route path="/moves" element={<MovesPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/types" element={<TypesPage />} />
            <Route path="*" element={
              <div className="flex items-center justify-center h-full text-gray-600">
                <div className="text-center space-y-2">
                  <div className="text-6xl opacity-20">404</div>
                  <p className="font-mono text-xs">Página no encontrada</p>
                </div>
              </div>
            } />
          </Routes>
        </main>
        <MobileNav />
      </div>
    </HashRouter>
  )
}
