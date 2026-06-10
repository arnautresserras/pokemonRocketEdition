import { useState, useCallback } from 'react'

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (updater: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setState(prev => {
        const next =
          typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // storage unavailable (private mode, quota exceeded) — ignore
        }
        return next
      })
    },
    [key],
  )

  return [state, setValue]
}
