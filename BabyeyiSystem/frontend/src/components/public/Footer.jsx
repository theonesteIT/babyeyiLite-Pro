/**
 * PublicFooter.jsx — Shared site footer (matches PublicPage)
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin,
} from 'lucide-react';
import babyeyiIcon from '../../assets/babyeyi-icon.png';
import { LanguageSwitcher } from './Header';
import WhatsAppIcon from './WhatsAppIcon';
import {
  PUBLIC_COMBINED_PAY_PATH, SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_PHONE_DISPLAY, WHATSAPP_URL,
} from './publicSiteConstants';

export default function PublicFooter() {
  const { t, i18n } = useTranslation();
  const localizedDate = new Intl.DateTimeFormat(i18n.language || 'en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const cols = [
    {
      title: t('public.footerPlatform'),
      links: [
        { l: t('public.footerAbout'), h: '#about' },
        { l: t('public.features'), h: '/features', i: true },
        { l: t('public.homePage'), h: '/', i: true },
        { l: t('public.footerPricing'), h: '#pricing' },
      ],
    },
    {
      title: t('public.footerSchools'),
      links: [
        { l: t('public.footerSearchSchools'), h: '/schools', i: true },
        { l: t('public.footerPayByCode'), h: PUBLIC_COMBINED_PAY_PATH, i: true },
        { l: t('public.registerSchool'), h: '/register', i: true },
        { l: t('public.footerTvetTrades'), h: '/schools', i: true },
      ],
    },
    {
      title: t('public.footerAccounts'),
      links: [
        { l: t('public.footerSchoolManagerLogin'), h: '/login-portal-select', i: true },
        { l: t('public.parentLogin'), h: '/parents/login', i: true },
        { l: t('public.footerStaffLogin'), h: '/login/lite', i: true },
        { l: t('public.services'), h: '/services', i: true },
      ],
    },
    {
      title: t('public.footerSupport'),
      links: [
        { l: t('public.footerFindAgent'), h: '/find-agent', i: true },
        { l: t('public.footerWhatsApp'), h: WHATSAPP_URL, e: true },
        { l: t('public.footerHelpCenter'), h: '#' },
        { l: t('public.contactUs'), h: `mailto:${SUPPORT_EMAIL}`, e: true },
        { l: t('public.privacyPolicy'), h: '#' },
        { l: t('public.terms'), h: '#' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#000435' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 pt-12 xl:pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 xl:gap-12 mb-10 xl:mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
                style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}
              >
                <img src={babyeyiIcon} alt="" className="w-7 h-7 object-contain" />
              </div>
              <span className="font-black text-[17px] text-white">
                baby<span className="text-amber-400">eyi</span>
                <span style={{ color: 'rgba(251,191,36,0.5)' }}>.rw</span>
              </span>
            </Link>
            <p className="text-slate-600 leading-relaxed mb-5" style={{ fontSize: 'clamp(12px,1vw,13px)' }}>
              {t('public.brandTagline')}
            </p>
            <div className="mb-4">
              <LanguageSwitcher compact />
            </div>
            <div className="flex gap-2">
              {[
                { Icon: Facebook, bg: '#1877F2' },
                { Icon: Twitter, bg: '#1DA1F2' },
                { Icon: Instagram, bg: '#E4405F' },
                { Icon: Youtube, bg: '#FF0000' },
              ].map(({ Icon, bg }, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg"
                  style={{ background: bg }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-black text-white text-[10.5px] uppercase tracking-[0.12em] mb-4 xl:mb-5">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ l, h, i, e }) => (
                  <li key={l}>
                    {i ? (
                      <Link to={h} className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: 'clamp(12px,1vw,13px)' }}>{l}</Link>
                    ) : e ? (
                      <a href={h} target="_blank" rel="noopener noreferrer" className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: 'clamp(12px,1vw,13px)' }}>{l}</a>
                    ) : (
                      <a href={h} className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: 'clamp(12px,1vw,13px)' }}>{l}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg,transparent,rgba(251,191,36,.22),transparent)' }} />

        <div className="flex flex-wrap gap-5 mb-6">
          {[
            { Icon: Mail, v: SUPPORT_EMAIL, href: `mailto:${SUPPORT_EMAIL}` },
            { Icon: Phone, v: SUPPORT_PHONE_DISPLAY, href: `tel:${SUPPORT_PHONE}` },
            { Icon: MapPin, v: 'Kigali, Rwanda', href: null },
          ].map(({ Icon, v, href }) => (
            href ? (
              <a key={v} href={href} className="flex items-center gap-2 text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: 'clamp(12px,1vw,13px)' }}>
                <Icon size={13} className="text-amber-400 shrink-0" /> {v}
              </a>
            ) : (
              <div key={v} className="flex items-center gap-2 text-slate-600 font-medium" style={{ fontSize: 'clamp(12px,1vw,13px)' }}>
                <Icon size={13} className="text-amber-400 shrink-0" /> {v}
              </div>
            )
          ))}
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-600 font-medium hover:text-amber-400 transition-colors"
            style={{ fontSize: 'clamp(12px,1vw,13px)' }}
          >
            <WhatsAppIcon size={14} className="text-[#25D366] shrink-0" />
            {t('public.footerWhatsApp')}
          </a>
        </div>

        <div className="h-px mb-6" style={{ background: 'linear-gradient(90deg,transparent,rgba(251,191,36,.22),transparent)' }} />
        <p className="text-slate-700 mb-5" style={{ fontSize: 'clamp(10px,0.85vw,12px)' }}>
          {t('public.today', { date: localizedDate })}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-700" style={{ fontSize: 'clamp(10px,0.85vw,12px)' }}>
            © {new Date().getFullYear()} Babyeyi Rwanda. {t('public.allRightsReserved')}
          </p>
          <p className="text-slate-800" style={{ fontSize: 'clamp(10px,0.85vw,12px)' }}>{t('public.madeWith')}</p>
        </div>
      </div>
    </footer>
  );
}
