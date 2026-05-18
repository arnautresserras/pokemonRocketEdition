import { getTypeColor } from '../utils/types'

interface Props {
  type: string
  small?: boolean
}

export default function TypeBadge({ type, small }: Props) {
  const color = getTypeColor(type)
  return (
    <span
      className={`inline-block rounded font-bold uppercase tracking-wider ${small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
      style={{ backgroundColor: color, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {type}
    </span>
  )
}
