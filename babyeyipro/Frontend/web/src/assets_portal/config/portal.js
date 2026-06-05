import { createHref } from '../../lib/hrefFactory'

export const PORTAL = {
  basePath: '/assets',
  loadingMessage: 'Loading Assets Portal…',
}

/** Absolute paths under /assets — avoids relative NavLink bugs on nested routes */
export const assetsHref = createHref(PORTAL.basePath)
