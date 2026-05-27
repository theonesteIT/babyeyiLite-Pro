import { h } from '../../utils/href'

/** Mounted under DOS portal: /dos/student-promotion/* */
export const PROMOTION_SEGMENT = 'student-promotion'

export function promotionHref(subPath = '/') {
  if (!subPath || subPath === '/') {
    return h(`/${PROMOTION_SEGMENT}`)
  }
  const segment = subPath.startsWith('/') ? subPath.slice(1) : subPath
  return h(`/${PROMOTION_SEGMENT}/${segment}`)
}

/** Last path segment after /student-promotion/ (e.g. "dashboard", "promote-class"). */
export function promotionPageKey(pathname) {
  const marker = `/${PROMOTION_SEGMENT}/`
  const idx = pathname.indexOf(marker)
  if (idx === -1) {
    if (pathname.endsWith(`/${PROMOTION_SEGMENT}`)) return 'dashboard'
    return ''
  }
  const rest = pathname.slice(idx + marker.length).split('/')[0]
  return rest || 'dashboard'
}
