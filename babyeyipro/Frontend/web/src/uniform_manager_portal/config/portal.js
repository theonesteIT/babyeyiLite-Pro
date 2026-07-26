import { createHref } from '../../lib/hrefFactory'

export const PORTAL = {
  basePath: '/uniform-manager',
  loadingMessage: 'Loading Uniform Manager…',
}

export const uniformHref = createHref(PORTAL.basePath)
