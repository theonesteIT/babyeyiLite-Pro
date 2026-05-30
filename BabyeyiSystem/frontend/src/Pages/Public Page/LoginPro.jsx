/**
 * ShuleManager Pro — all staff at Pro schools (managers, teachers, accountant, etc.).
 */
import { useEffect } from 'react';
import { useTranslation } from "react-i18next";
import Login from '../Auth/Login';
import { setPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';

export default function LoginPro() {
  const { t } = useTranslation();
  useEffect(() => {
    setPostLogoutLoginPath('/login/pro');
  }, []);

  const portalNav = {
    backHref: "/login-portal-select",
    backLabel: t("auth.backToPortalChoice"),
  };

  return (
    <Login variant="schoolManager" portalBrand="pro" portalNav={portalNav} />
  );
}
