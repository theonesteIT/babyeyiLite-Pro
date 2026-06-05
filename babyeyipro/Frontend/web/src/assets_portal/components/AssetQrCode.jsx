import { useEffect, useState } from 'react'
import QRCodeLib from 'qrcode'

const LEVELS = new Set(['L', 'M', 'Q', 'H'])

/**
 * QR renderer for the assets portal.
 * Uses the `qrcode` package (already in app deps) instead of `react-qr-code`,
 * which breaks in production builds (React error #130: element type is object).
 */
export default function AssetQrCode({
  value = '',
  size = 128,
  level = 'M',
  bgColor = '#ffffff',
  fgColor = '#000000',
  className = '',
  style,
}) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    const text = String(value ?? '').trim()
    if (!text) {
      setDataUrl('')
      return undefined
    }

    let cancelled = false
    QRCodeLib.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: LEVELS.has(level) ? level : 'M',
      color: { dark: fgColor, light: bgColor },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [value, size, level, bgColor, fgColor])

  if (!dataUrl) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', width: size, height: size, ...style }}
        aria-hidden
      />
    )
  }

  return (
    <img
      src={dataUrl}
      alt=""
      width={size}
      height={size}
      className={className}
      style={style}
    />
  )
}
