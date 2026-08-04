import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_DURATION_MS = 6500

export function useAssetToast(defaultDurationMs = DEFAULT_DURATION_MS) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setToast(null)
  }, [])

  const showToast = useCallback((msg, type = 'error', durationMs = defaultDurationMs) => {
    const text = String(msg || '').trim()
    if (!text) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg: text, type })
    if (durationMs > 0) {
      timerRef.current = setTimeout(() => {
        setToast(null)
        timerRef.current = null
      }, durationMs)
    }
  }, [defaultDurationMs])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { toast, showToast, dismissToast }
}
