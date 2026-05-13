import { PORTAL } from '../config/portal';
import { createHref } from '../../../../lib/hrefFactory';

/** Same pattern as manager portal — full paths under `/accountant/...` for the unified Pro app. */
export const h = createHref(PORTAL.basePath || '');
