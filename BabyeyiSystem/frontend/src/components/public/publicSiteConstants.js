export const PUBLIC_COMBINED_PAY_PATH = '/combined-tution-requrement';
export const PUBLIC_PAY_FEES_PATH = '/paid-at-school';
export const PUBLIC_PAY_REQUIREMENTS_PATH = '/services/shulekit-pay';

/** Build tuition-only and requirements-only pay links with an optional student/school code. */
export function publicPayLinks(code) {
  const c = String(code || '').trim();
  const qs = c ? `?code=${encodeURIComponent(c)}` : '';
  return {
    fees: `${PUBLIC_PAY_FEES_PATH}${qs}`,
    requirements: `${PUBLIC_PAY_REQUIREMENTS_PATH}${qs}`,
  };
}
export const PUBLIC_LANGS = ['rw', 'en', 'fr'];
export const SUPPORT_PHONE = '+250796898894';
export const SUPPORT_PHONE_DISPLAY = '0796898894';
export const SUPPORT_EMAIL = 'hello@babyeyi.rw';
export const WHATSAPP_URL = `https://wa.me/250796898894?text=${encodeURIComponent('Hello Babyeyi, I need help with school fees and account support.')}`;
export const TEACHER_PORTAL_URL =
  import.meta.env.VITE_TEACHER_PORTAL_URL || 'https://ticha.babyeyi.rw';

export function publicHeaderPaddingClass(bannerVisible) {
  return bannerVisible
    ? 'pt-[calc(3.5rem+2.25rem)] sm:pt-[calc(62px+2.5rem)] xl:pt-[calc(70px+2.5rem)]'
    : 'pt-14 sm:pt-[62px] xl:pt-[70px]';
}
