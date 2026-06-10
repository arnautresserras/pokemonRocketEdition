interface Props {
  message?: string
  onClear?: () => void
}

export default function EmptyState({ message = 'Sin resultados', onClear }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-600">
      <div className="text-4xl opacity-20">◉</div>
      <p className="font-mono text-xs">{message}</p>
      {onClear && (
        <button
          onClick={onClear}
          className="text-[10px] font-bold text-dex-red hover:text-red-400 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
