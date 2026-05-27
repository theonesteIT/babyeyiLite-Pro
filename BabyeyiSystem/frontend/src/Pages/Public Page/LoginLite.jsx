/**
 * ShuleManager Lite — staff / multi-role sign-in on BabyeyiSystem (no Pro web redirect; Pro schools blocked here).
 */
import { useEffect } from 'react';
import Login from '../Auth/Login';
import { setPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';

const PORTAL_NAV = {
  backHref: '/login-portal-select',
  backLabel: 'Back to portal choice',
  secondaryHref: '/login/pro',
  secondaryLabel: 'School manager (Pro)',
};

export default function LoginLite() {
  useEffect(() => {
    setPostLogoutLoginPath('/login/lite');
  }, []);

  return (
    <Login forceLitePortal portalBrand="lite" portalNav={PORTAL_NAV} />
  );
}
