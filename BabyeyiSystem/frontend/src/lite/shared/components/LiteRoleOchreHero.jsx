import LiteOchreHero from './LiteOchreHero';
import { liteHeroUserSubtitle } from '../liteHeroUtils';

/**
 * Factory for portal-specific ochre heroes (manager parity: amber band + user subtitle).
 */
export function createRoleOchreHero(useAuthHook, userKey = 'teacher') {
  return function RoleOchreHero({ subtitle, ...props }) {
    const auth = useAuthHook();
    const user = auth?.[userKey] ?? auth?.staff ?? auth?.teacher ?? null;
    const resolvedSubtitle = liteHeroUserSubtitle(user) || subtitle || '';

    return (
      <LiteOchreHero
        {...props}
        eyebrow="School operations"
        subtitle={resolvedSubtitle}
      />
    );
  };
}
