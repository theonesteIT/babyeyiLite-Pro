/**
 * Partner & platform admin sign-in — no school code (Agent, DEO, NESA, Super Admin, Shule Avance, etc.).
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Login from '../Auth/Login';
import { setPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';
import { OTHER_PORTAL_LOGIN_PATH } from '../../utils/otherPortalEntry';

export default function OtherPortalLogin() {
  const { t } = useTranslation();

  useEffect(() => {
    setPostLogoutLoginPath(OTHER_PORTAL_LOGIN_PATH);
  }, []);

  const portalNav = {
    backHref: '/',
    backLabel: t('auth.backToHome'),
    secondaryHref: '/login-portal-select',
    secondaryLabel: t('auth.signInToShuleManager'),
  };

  return (
    <Login
      forceOtherPortal
      hideSchoolCode
      portalBrand="other"
      portalNav={portalNav}
    />
  );
}
