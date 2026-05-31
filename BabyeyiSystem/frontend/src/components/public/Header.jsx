/**
 * PublicHeader.jsx — Shared site header (announcement bar + navbar)
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Globe, ChevronDown, Megaphone, ArrowRight, X, Menu,
  GraduationCap, LogIn, ExternalLink, LayoutGrid,
} from 'lucide-react';
import BabyeyiLogo from '../../assets/1BABYEYI LOGO FINAL.png';
import { platformContentApi } from '../../utils/platformContentApi';
import {
  PUBLIC_LANGS, PUBLIC_COMBINED_PAY_PATH, TEACHER_PORTAL_URL,
} from './publicSiteConstants';
import { OTHER_PORTAL_LOGIN_PATH } from '../../utils/otherPortalEntry';

const BannerStyles = () => (
  <style>{`
    @keyframes banner-slide-in {
      from { opacity: 0; transform: translateY(100%); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes banner-slide-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-70%); }
    }
    .banner-announce-enter { animation: banner-slide-in .55s cubic-bezier(.22,1,.36,1) both; }
    .banner-announce-exit  { animation: banner-slide-out .4s cubic-bezier(.4,0,.2,1) forwards; }
    .btn-shine { position:relative; overflow:hidden; }
    .btn-shine::after {
      content:'';
      position:absolute;
      inset:0;
      background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.25) 50%,transparent 60%);
      transform:translateX(-100%);
      transition:transform .5s;
    }
    .btn-shine:hover::after { transform:translateX(100%); }
  `}</style>
);

export function LanguageSwitcher({ compact = false, iconOnly = false }) {
  const { t, i18n } = useTranslation();
  const baseLanguage = String(i18n.language || 'en').slice(0, 2).toLowerCase();
  const current = PUBLIC_LANGS.includes(baseLanguage) ? baseLanguage : 'en';

  if (iconOnly) {
    return (
      <div
        className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white/90"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
      >
        <Globe size={16} className="text-amber-300 pointer-events-none" />
        <select
          aria-label={t('language.switcherLabel')}
          value={current}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        >
          <option value="rw" className="text-[#000435]">🇷🇼 {t('language.rw')}</option>
          <option value="en" className="text-[#000435]">🇬🇧 {t('language.en')}</option>
          <option value="fr" className="text-[#000435]">🇫🇷 {t('language.fr')}</option>
        </select>
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-white/90 ${
        compact ? 'text-[11px]' : 'text-[12px]'
      }`}
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }}
    >
      <Globe size={compact ? 12 : 13} className="text-amber-300" />
      <span className="font-semibold whitespace-nowrap">{t('language.label')}</span>
      <ChevronDown size={compact ? 12 : 13} className="text-white/70" />
      <select
        aria-label={t('language.switcherLabel')}
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        <option value="rw" className="text-[#000435]">🇷🇼 {t('language.rw')}</option>
        <option value="en" className="text-[#000435]">🇬🇧 {t('language.en')}</option>
        <option value="fr" className="text-[#000435]">🇫🇷 {t('language.fr')}</option>
      </select>
    </div>
  );
}

function useTopBanner() {
  const [visible, setVisible] = useState(true);
  const dismiss = () => setVisible(false);
  return { visible, dismiss };
}

export function usePublicHeaderState() {
  const { i18n } = useTranslation();
  const banner = useTopBanner();
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    platformContentApi.getTopBanners(i18n.language).then(setBanners).catch(() => setBanners([]));
  }, [i18n.language]);

  return {
    bannerVisible: banner.visible,
    dismissBanner: banner.dismiss,
    banners,
  };
}

function TopAnnouncementBar({ onClose, banners = [] }) {
  const { t } = useTranslation();
  const items = banners.length
    ? banners
    : [{
        id: 'fallback',
        message: t('public.topBannerText'),
        cta_text: t('public.topBannerLearnMore'),
        cta_link: '/features',
        bg_color: '#000435',
        text_color: '#ffffff',
      }];

  const [index, setIndex] = useState(0);
  const [animClass, setAnimClass] = useState('banner-announce-enter');
  const item = items[index];
  const bg = item?.bg_color || '#000435';

  useEffect(() => {
    setIndex(0);
    setAnimClass('banner-announce-enter');
  }, [banners]);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const timer = setInterval(() => setAnimClass('banner-announce-exit'), 8000);
    return () => clearInterval(timer);
  }, [items.length, index]);

  const onAnimEnd = () => {
    if (animClass === 'banner-announce-exit') {
      setIndex((i) => (i + 1) % items.length);
      setAnimClass('banner-announce-enter');
    }
  };

  const renderCta = (bannerItem) => {
    if (!bannerItem?.cta_link) return null;
    const label = bannerItem.cta_text || t('public.topBannerLearnMore');
    const track = () => bannerItem.id && platformContentApi.trackBannerClick(bannerItem.id);
    const cls = 'text-[11px] sm:text-[12px] font-bold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap shrink-0';
    return bannerItem.cta_link.startsWith('/') ? (
      <Link to={bannerItem.cta_link} onClick={track} className={cls}>
        {label} <ArrowRight size={11} className="inline -mt-px" />
      </Link>
    ) : (
      <a href={bannerItem.cta_link} onClick={track} className={cls}>
        {label} <ArrowRight size={11} className="inline -mt-px" />
      </a>
    );
  };

  return (
    <div
      className="relative z-[60] w-full overflow-hidden border-b border-amber-400/20 transition-colors duration-500"
      style={{ background: bg }}
      role="region"
      aria-label={t('public.topBannerAria')}
      aria-live="polite"
    >
      <div className="relative h-9 sm:h-10 flex items-center justify-center px-10 sm:px-14 overflow-hidden">
        <div
          key={index}
          onAnimationEnd={onAnimEnd}
          className={`absolute inset-x-10 sm:inset-x-14 flex items-center justify-center gap-2 sm:gap-3 ${animClass}`}
        >
          <Megaphone size={14} className="text-amber-400 shrink-0" strokeWidth={2.5} />
          <span
            className="text-[11px] sm:text-[12.5px] font-semibold leading-tight text-center line-clamp-2 sm:line-clamp-1 sm:whitespace-nowrap"
            style={{ color: item?.text_color || '#ffffff' }}
          >
            {item?.message || item?.title}
          </span>
          {renderCta(item)}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10"
          aria-label={t('public.close')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function LoginMenu({ compact = false, onNavigate }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const closeMenu = () => {
    setOpen(false);
    onNavigate?.();
  };

  const btnClass = compact
    ? 'inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-white text-[10px] font-bold whitespace-nowrap transition-all'
    : 'group relative inline-flex items-center gap-1.5 min-h-[40px] xl:min-h-[42px] px-3.5 xl:px-4 rounded-xl text-[12px] xl:text-[13px] font-bold text-white whitespace-nowrap transition-all duration-300 hover:shadow-[0_6px_28px_rgba(251,191,36,0.22)] active:scale-[.97]';

  const btnStyle = compact
    ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)' }
    : {
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
        border: '1px solid rgba(255,255,255,0.18)',
      };

  const menuClass = compact
    ? 'absolute right-0 top-full mt-2 w-[min(17rem,calc(100vw-1.5rem))] rounded-xl overflow-hidden shadow-2xl z-[70] animate-in fade-in slide-in-from-top-1'
    : 'absolute right-0 top-full mt-2.5 w-64 rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.45)] z-[70]';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={btnClass}
        style={btnStyle}
      >
        <LogIn size={compact ? 11 : 14} strokeWidth={2.5} className="text-amber-300" />
        {t('public.login')}
        <ChevronDown
          size={compact ? 11 : 13}
          className={`text-white/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={menuClass}
          style={{ background: '#000435', border: '1px solid rgba(251,191,36,0.22)' }}
        >
          <div className="px-3 py-2 border-b border-white/8">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400/90">
              {t('public.loginMenuTitle')}
            </p>
          </div>
          <a
            href={TEACHER_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={closeMenu}
            className="flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold text-white hover:bg-white/6 transition-colors group"
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-sky-500/15 border border-sky-400/30 group-hover:border-sky-300/50">
              <GraduationCap size={17} className="text-sky-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold">{t('public.loginAsTeacher')}</span>
              <span className="block text-[11px] text-white/50 font-medium truncate">ticha.babyeyi.rw</span>
            </span>
            <ExternalLink size={13} className="text-white/40 shrink-0" />
          </a>
          <Link
            to={OTHER_PORTAL_LOGIN_PATH}
            role="menuitem"
            onClick={closeMenu}
            className="flex items-center gap-3 px-4 py-3.5 text-[13px] font-semibold text-white hover:bg-white/6 transition-colors group border-t border-white/8"
          >
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/12 border border-amber-400/30 group-hover:border-amber-300/50">
              <LayoutGrid size={16} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold">{t('public.otherPortal')}</span>
              <span className="block text-[11px] text-white/50 font-medium">{t('public.otherPortalHint')}</span>
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}

function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    { label: t('public.homePage'), href: '/' },
    { label: t('public.payFees'), href: PUBLIC_COMBINED_PAY_PATH },
    { label: t('public.services'), href: '/services' },
    { label: t('public.features'), href: '/features' },
    { label: t('public.schools'), href: '/schools' },
  ];

  const isActive = (href) => {
    const path = location.pathname;
    if (href === '/') return path === '/';
    return path === href || path.startsWith(`${href}/`);
  };

  return (
    <nav
      className={`w-full transition-all duration-500 ${
        scrolled ? 'bg-[#000435] shadow-[0_14px_48px_rgba(0,0,0,.5)]' : 'bg-[#000435]'
      }`}
      style={{
        borderBottom: '1px solid rgba(251,191,36,0.22)',
        boxShadow: scrolled ? '0 10px 32px rgba(0, 4, 53, 0.4)' : 'inset 0 -1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 xl:px-10 2xl:px-16 flex items-center justify-between gap-1.5 xl:gap-2 h-12 sm:h-[62px] lg:h-14 xl:h-[70px]">
        <Link to="/" className="flex items-center shrink min-w-0 group">
          <img
            src={BabyeyiLogo}
            alt="Babyeyi logo"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/1BABYEYI LOGO FINAL.png';
            }}
            className="h-5 max-h-5 w-auto max-w-[74px] object-contain object-left transition-all duration-300 group-hover:brightness-110 sm:h-7 sm:max-h-none sm:max-w-[110px] lg:h-8 xl:h-9"
          />
        </Link>

        <div
          className="hidden lg:flex items-center rounded-2xl px-1.5 xl:px-2 py-1"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className={`relative px-2.5 xl:px-3 py-2 text-[13px] xl:text-[13.5px] font-semibold transition-colors duration-200 group ${
                isActive(l.href) ? 'text-amber-400' : 'text-white hover:text-amber-300'
              }`}
            >
              {l.label}
              <span
                className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[1.5px] bg-amber-400 rounded-full transition-all duration-300 ${
                  isActive(l.href) ? 'w-3/4' : 'w-0 group-hover:w-3/4'
                }`}
              />
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          <LoginMenu />
          <Link
            to="/login-portal-select"
            className="btn-shine inline-flex items-center gap-2 min-h-[40px] xl:min-h-[42px] px-4 xl:px-5 rounded-xl font-black text-[12px] xl:text-[13px] text-[#000435] whitespace-nowrap transition-all duration-200 hover:shadow-[0_4px_20px_rgba(251,191,36,.4)] active:scale-[.97]"
            style={{ background: 'linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)' }}
          >
            <LogIn size={14} strokeWidth={2.5} />
            {t('public.shuleManager')}
          </Link>
        </div>

        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          <LanguageSwitcher iconOnly />
          <LoginMenu compact onNavigate={() => setOpen(false)} />
          <Link
            to="/login-portal-select"
            className="btn-shine inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[#000435] text-[10px] font-bold whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}
          >
            <LogIn size={11} strokeWidth={2.5} /> {t('public.shuleManager')}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {open ? <X size={15} className="text-white" /> : <Menu size={15} className="text-white" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="lg:hidden bg-[#000120] border-t px-4 pb-5 pt-2 space-y-1"
          style={{ borderColor: 'rgba(251,191,36,0.12)' }}
        >
          {links.map((l) => (
            <Link
              key={l.label}
              to={l.href}
              onClick={() => setOpen(false)}
              className={`flex px-4 py-3 rounded-xl text-[14px] font-semibold transition-all ${
                isActive(l.href) ? 'text-amber-400 bg-white/5' : 'text-white hover:bg-white/6 hover:text-amber-400'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 space-y-2 border-t border-white/8 mt-2">
            <p className="px-4 pt-2 text-[10px] font-black uppercase tracking-widest text-amber-400/80">
              {t('public.login')}
            </p>
            <a
              href={TEACHER_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-white bg-white/5 border border-white/10"
            >
              <GraduationCap size={16} className="text-sky-300 shrink-0" />
              <span className="flex-1">{t('public.loginAsTeacher')}</span>
              <ExternalLink size={13} className="opacity-60 shrink-0" />
            </a>
            <Link
              to={OTHER_PORTAL_LOGIN_PATH}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-bold text-white bg-white/5 border border-white/10"
            >
              <LayoutGrid size={16} className="text-amber-300 shrink-0" />
              {t('public.otherPortal')}
            </Link>
            <Link
              to="/login-portal-select"
              onClick={() => setOpen(false)}
              className="btn-shine flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-[#000435] text-[14px] font-black"
              style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}
            >
              <LogIn size={16} strokeWidth={2.5} /> {t('public.shuleManager')}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

export default function PublicHeader({
  bannerVisible: bannerVisibleProp,
  onBannerClose,
  banners: bannersProp,
  showTopBanner = true,
}) {
  const internal = usePublicHeaderState();
  const bannerVisible = showTopBanner && (bannerVisibleProp ?? internal.bannerVisible);
  const dismiss = onBannerClose ?? internal.dismissBanner;
  const banners = bannersProp ?? internal.banners;

  useEffect(() => {
    const updateHeight = () => {
      const bannerH = bannerVisible ? 40 : 0;
      const navH = window.innerWidth >= 1280 ? 70 : window.innerWidth >= 640 ? 62 : 56;
      document.documentElement.style.setProperty('--public-header-height', `${bannerH + navH}px`);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [bannerVisible]);

  return (
    <>
      <BannerStyles />
      <header className="fixed inset-x-0 top-0 z-50">
        {bannerVisible && <TopAnnouncementBar onClose={dismiss} banners={banners} />}
        <Navbar />
      </header>
    </>
  );
}
