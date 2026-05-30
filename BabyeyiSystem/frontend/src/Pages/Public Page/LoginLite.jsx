/**
 * ShuleManager Lite — staff / multi-role sign-in on BabyeyiSystem (no Pro web redirect; Pro schools blocked here).
 */
import { useEffect } from 'react';
import { useTranslation } from "react-i18next";
import Login from '../Auth/Login';
import { setPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';

export default function LoginLite() {
  const { t } = useTranslation();
  useEffect(() => {
    setPostLogoutLoginPath('/login/lite');
  }, []);

  const portalNav = {
    backHref: "/login-portal-select",
    backLabel: t("auth.backToPortalChoice"),
    secondaryHref: "/login/pro",
    secondaryLabel: t("auth.schoolManagerPro"),
  };

  return (
    <Login forceLitePortal portalBrand="lite" portalNav={portalNav} />
  );
}
