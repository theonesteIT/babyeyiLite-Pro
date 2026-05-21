/**
 * ShuleManager Pro — all staff at Pro schools (managers, teachers, accountant, etc.).
 */
import { useEffect } from 'react';
import Login from '../Auth/Login';
import { setPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';

const PORTAL_NAV = {
  backHref: '/login-portal-select',
  backLabel: 'Back to portal choice',
};

export default function LoginPro() {
  useEffect(() => {
    setPostLogoutLoginPath('/login/pro');
  }, []);

  return (
    <Login variant="schoolManager" portalBrand="pro" portalNav={PORTAL_NAV} />
  );
}
