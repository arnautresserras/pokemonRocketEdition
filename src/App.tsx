import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import GlobalSearch, { openGlobalSearch } from './components/GlobalSearch'
import PokedexPage from './pages/PokedexPage'
import MovesPage from './pages/MovesPage'
import GuidePage from './pages/GuidePage'
import TypesPage from './pages/TypesPage'
import NaturesPage from './pages/NaturesPage'
import { NAV_LINKS } from './constants/nav'
import { usePageTracking } from './hooks/usePageTracking'
import { trackEvent } from './lib/analytics'

function PageTracker() {
  usePageTracking()
  return null
}

function MobileNav() {
  return (
    <nav className="md:hidden flex shrink-0 border-t border-white/10 bg-dex-black pb-[env(safe-area-inset-bottom,0px)]">
      {NAV_LINKS.map(({ to, mobileLabel, icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => trackEvent('nav_clicked', { destination: to, source: 'mobile' })}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? 'text-dex-red' : 'text-gray-500'
            }`
          }
        >
          <span className="text-xl">{icon}</span>
          <span className="font-mono text-[8px] font-bold">{mobileLabel}</span>
        </NavLink>
      ))}
      <button
        onClick={openGlobalSearch}
        className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-gray-500 transition-colors active:text-dex-red"
      >
        <span className="text-xl">🔍</span>
        <span className="font-mono text-[8px] font-bold">Buscar</span>
      </button>
    </nav>
  )
}

export default function App() {
  return (
    <HashRouter>
      <PageTracker />
      <div className="flex flex-col md:flex-row h-dvh overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-dex-black min-h-0">
          <Routes>
            <Route path="/" element={<Navigate to="/pokedex" replace />} />
            <Route path="/pokedex" element={<PokedexPage />} />
            <Route path="/pokedex/:pokemonName" element={<PokedexPage />} />
            <Route path="/moves" element={<MovesPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/guide/:region" element={<GuidePage />} />
            <Route path="/guide/:region/:section" element={<GuidePage />} />
            <Route path="/types" element={<TypesPage />} />
            <Route path="/natures" element={<NaturesPage />} />
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center h-full text-gray-600">
                  <div className="text-center space-y-2">
                    <div className="text-6xl opacity-20">404</div>
                    <p className="font-mono text-xs">Página no encontrada</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
        <MobileNav />
        <GlobalSearch />
      </div>
    </HashRouter>
  )
}
