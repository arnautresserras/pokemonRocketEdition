import { useLocalStorage } from '../utils/useLocalStorage'
import { CONSENT_KEY, type Consent, initTracking } from '../lib/consent'
import { optIn, optOut } from '../lib/analytics'

export default function ConsentBanner() {
  const [consent, setConsent] = useLocalStorage<Consent | null>(CONSENT_KEY, null)

  if (consent !== null) return null

  const accept = () => {
    setConsent('granted')
    initTracking()
    optIn()
  }

  const decline = () => {
    setConsent('denied')
    optOut()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-2xl bg-dex-gray border border-white/10 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] text-dex-red font-bold uppercase mb-1">
            Privacidad
          </p>
          <p className="text-xs text-gray-300 leading-relaxed">
            Usamos analíticas anónimas y detección de errores para mejorar la app.
            No se recopila nada hasta que aceptes.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={decline}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-white/10 text-gray-300 hover:bg-white/20 transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-dex-red text-white hover:bg-red-700 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
