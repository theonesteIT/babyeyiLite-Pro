/**
 * ShuleManager Pro — school manager sign-in (same layout as Lite); Lite-only schools are blocked.
 */
import Login from '../Auth/Login';

const PORTAL_NAV = {
  backHref: '/login-portal-select',
  backLabel: 'Back to portal choice',
  secondaryHref: '/login/lite',
  secondaryLabel: 'Staff & Lite login',
};

export default function LoginPro() {
  return (
    <Login variant="schoolManager" portalBrand="pro" portalNav={PORTAL_NAV} />
  );
}
