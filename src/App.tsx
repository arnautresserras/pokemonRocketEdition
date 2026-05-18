import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import PokedexPage from './pages/PokedexPage'
import MovesPage from './pages/MovesPage'
import GuidePage from './pages/GuidePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-dex-black">
          <Routes>
            <Route path="/" element={<PokedexPage />} />
            <Route path="/moves" element={<MovesPage />} />
            <Route path="/guide" element={<GuidePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
