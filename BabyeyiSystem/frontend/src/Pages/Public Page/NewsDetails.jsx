/**
 * NewsDetails.jsx — Modern news article page (Babyeyi public site)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, User, Eye, Heart, Loader2, Tag, Printer, Clock, Bookmark,
  ChevronRight, MapPin, Headphones, FileText, Download, Share2, ArrowUp,
  Moon, Sun, Copy, Check, Flame, MessageCircle,
} from 'lucide-react';
import {
  platformContentApi, categoryLabel, badgeStyle, mediaUrl, NEWS_CATEGORIES,
  newsDisplayImageUrls,
} from '../../utils/platformContentApi';
import PublicHeader, { usePublicHeaderState } from '../../components/public/Header';
import PublicFooter from '../../components/public/Footer';
import NewsImageShowcase from '../../components/public/NewsImageShowcase';
import { WHATSAPP_URL, SUPPORT_PHONE } from '../../components/public/publicSiteConstants';

const BOOKMARK_KEY = 'babyeyi_saved_news';

/* ── Helpers ───────────────────────────────────────────────────── */
function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || '';
}

function readTimeMinutes(text) {
  const words = stripHtml(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function categoryCta(category, t) {
  const map = {
    payments: { label: t('public.newsCtaPayFees', { defaultValue: 'Pay Fees Now' }), href: '/payments', sub: t('public.newsCtaPaySub', { defaultValue: 'Ready to pay school fees?' }) },
    announcements: { label: t('public.newsCtaPayFees', { defaultValue: 'Pay Fees Now' }), href: '/payments', sub: t('public.newsCtaPaySub', { defaultValue: 'Ready to pay school fees?' }) },
    new_features: { label: t('public.newsCtaShop', { defaultValue: 'Order School Supplies' }), href: '/agent-shop', sub: t('public.newsCtaShopSub', { defaultValue: 'Shop ShuleKit supplies online.' }) },
    promotions: { label: t('public.newsCtaShop', { defaultValue: 'Order School Supplies' }), href: '/agent-shop', sub: t('public.newsCtaShopSub', { defaultValue: 'Shop ShuleKit supplies online.' }) },
    events: { label: t('public.newsCtaAgent', { defaultValue: 'Become a Babyeyi Agent' }), href: '/find-agent', sub: t('public.newsCtaAgentSub', { defaultValue: 'Join our growing agent network.' }) },
    education: { label: t('public.exploreSchools', { defaultValue: 'Explore Schools' }), href: '/schools', sub: t('public.newsCtaSub', { defaultValue: 'Explore schools and pay fees online.' }) },
  };
  return map[category] || { label: t('public.exploreSchools', { defaultValue: 'Explore Schools' }), href: '/schools', sub: t('public.newsCtaSub', { defaultValue: 'Explore schools and pay fees online.' }) };
}

/* ── Reading progress ──────────────────────────────────────────── */
function ReadingProgressBar({ targetRef }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) { setPct(100); return; }
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      setPct(Math.round((scrolled / total) * 100));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [targetRef]);
  return (
    <div className="fixed left-0 right-0 z-[55] h-1 bg-slate-200/80" style={{ top: 'var(--public-header-height, 70px)' }}>
      <div
        className="h-full transition-all duration-150"
        style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#FBBF24,#F59E0B)' }}
      />
    </div>
  );
}

/* ── Share buttons ─────────────────────────────────────────────── */
function ShareButtons({ url, title, onShare }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const track = () => onShare?.();

  const links = [
    { key: 'wa', label: 'WhatsApp', color: '#25D366', href: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}` },
    { key: 'fb', label: 'Facebook', color: '#1877F2', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { key: 'li', label: 'LinkedIn', color: '#0A66C2', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { key: 'x', label: 'X', color: '#000435', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track();
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
      <h3 className="font-black text-[#000435] mb-4 flex items-center gap-2">
        <Share2 size={18} className="text-amber-500" />
        {t('public.newsShareTitle', { defaultValue: 'Share this news' })}
      </h3>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.key}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={track}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: l.color }}
          >
            {l.label}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-[#000435] text-[#000435] bg-white hover:bg-amber-50 transition-all"
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          {copied ? t('public.newsLinkCopied', { defaultValue: 'Copied!' }) : t('public.newsCopyLink', { defaultValue: 'Copy Link' })}
        </button>
      </div>
    </div>
  );
}

/* ── Sidebar card ──────────────────────────────────────────────── */
function SideCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <h3 className="font-black text-[#000435] mb-4 flex items-center gap-2 text-sm">
        {Icon && <Icon size={16} className="text-amber-500" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ── Floating actions ──────────────────────────────────────────── */
function FloatingActions({ onTop }) {
  const { t } = useTranslation();
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const fn = () => setShowTop(window.scrollY > 400);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="fixed z-[55] flex flex-col items-end gap-2.5 bottom-20 right-4 sm:bottom-24 sm:right-6">
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 transition-transform"
        style={{ background: '#25D366' }}
      >
        <MessageCircle size={20} />
      </a>
      <Link
        to="/find-agent"
        aria-label={t('public.navFindAgent', { defaultValue: 'Find Agent' })}
        className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
        style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}
      >
        <MapPin size={20} className="text-[#000435]" />
      </Link>
      {showTop && (
        <button
          type="button"
          onClick={onTop}
          aria-label={t('public.newsBackToTop', { defaultValue: 'Back to top' })}
          className="w-11 h-11 rounded-full flex items-center justify-center bg-[#000435] text-amber-400 shadow-lg hover:scale-105 transition-transform"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function NewsDetails() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const articleRef = useRef(null);
  const { bannerVisible, dismissBanner, banners } = usePublicHeaderState();

  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [popular, setPopular] = useState([]);
  const [latest, setLatest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(0);
  const [shares, setShares] = useState(0);
  const [views, setViews] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dark, setDark] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterDone, setNewsletterDone] = useState(false);
  const [err, setErr] = useState('');

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const formatDate = useCallback((raw) => {
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleDateString(i18n.language || 'en', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return raw;
    }
  }, [i18n.language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const data = await platformContentApi.getNewsBySlug(slug, i18n.language);
        if (cancelled) return;
        setArticle(data);
        setLikes(data.like_count || 0);
        setShares(data.share_count || 0);
        setViews(data.view_count || 0);
        setSaved(localStorage.getItem(`${BOOKMARK_KEY}_${slug}`) === '1');

        setMeta('description', data.meta_description || data.excerpt);
        setMeta('keywords', data.meta_keywords || (data.tags || []).join(', '));
        setMeta('og:title', data.meta_title || data.title, 'property');
        setMeta('og:description', data.meta_description || data.excerpt, 'property');
        setMeta('og:url', shareUrl, 'property');
        if (data.featured_image) setMeta('og:image', mediaUrl(data.featured_image), 'property');
        document.title = `${data.meta_title || data.title} · Babyeyi`;

        platformContentApi.trackNewsView(data.id).then(() => {
          if (!cancelled) setViews((v) => v + 1);
        });

        const [rel, pop, lat] = await Promise.all([
          platformContentApi.getNews(i18n.language, { category: data.category, limit: 4 }),
          platformContentApi.getPopularNews(i18n.language, 5),
          platformContentApi.getNews(i18n.language, { limit: 5 }),
        ]);
        if (!cancelled) {
          setRelated((rel || []).filter((r) => r.slug !== slug).slice(0, 3));
          setPopular((pop || []).filter((r) => r.slug !== slug).slice(0, 3));
          setLatest((lat || []).filter((r) => r.slug !== slug).slice(0, 4));
        }
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Article not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, i18n.language, shareUrl]);

  const onLike = async () => {
    if (liked || !article) return;
    setLiked(true);
    try {
      const j = await platformContentApi.likeNews(article.id);
      setLikes(j.like_count ?? likes + 1);
    } catch { setLiked(false); }
  };

  const onShare = async () => {
    if (!article) return;
    try {
      const j = await platformContentApi.shareNews(article.id);
      setShares(j.share_count ?? shares + 1);
    } catch { setShares((s) => s + 1); }
  };

  const toggleSave = () => {
    const next = !saved;
    setSaved(next);
    if (next) localStorage.setItem(`${BOOKMARK_KEY}_${slug}`, '1');
    else localStorage.removeItem(`${BOOKMARK_KEY}_${slug}`);
  };

  const onNewsletter = (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterDone(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (err || !article) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
        <p className="font-black text-[#000435] text-xl mb-2">{t('public.newsNotFound')}</p>
        <Link to="/news" className="text-amber-600 font-bold hover:underline">← {t('public.newsViewAll')}</Link>
      </div>
    );
  }

  const badge = badgeStyle(article.category);
  const showcaseImages = newsDisplayImageUrls(article);
  const mins = readTimeMinutes(article.body || article.excerpt);
  const bodyHtml = article.body?.includes('<')
    ? article.body
    : article.body?.split('\n').filter(Boolean).map((p) => `<p>${p}</p>`).join('') || `<p>${article.excerpt || ''}</p>`;
  const cta = categoryCta(article.category, t);
  const attachments = Array.isArray(article.attachments) ? article.attachments : [];
  const tags = Array.isArray(article.tags) ? article.tags : [];

  const pageBg = dark ? 'bg-[#0a0e27] text-slate-200' : 'bg-slate-50 text-slate-900';
  const cardBg = dark ? 'bg-[#121832] border-slate-700' : 'bg-white border-slate-100';
  const titleColor = dark ? 'text-white' : 'text-[#000435]';

  return (
    <div className={`min-h-screen ${pageBg}`} style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <PublicHeader bannerVisible={bannerVisible} onBannerClose={dismissBanner} banners={banners} />
      <ReadingProgressBar targetRef={articleRef} />

      {article.is_breaking && (
        <div
          className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-center py-2 px-4 text-sm font-black flex items-center justify-center gap-2"
          style={{ marginTop: 'var(--public-header-height, 70px)' }}
        >
          <Flame size={16} /> {t('public.newsBreaking', { defaultValue: 'Breaking News' })}
        </div>
      )}

      <div
        ref={articleRef}
        className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8"
        style={!article.is_breaking ? { paddingTop: 'calc(var(--public-header-height, 70px) + 1.5rem)' } : undefined}
      >
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1.5 text-sm font-medium mb-6 text-slate-500">
          <Link to="/" className="hover:text-amber-600 transition-colors">{t('public.homePage')}</Link>
          <ChevronRight size={14} />
          <Link to="/news" className="hover:text-amber-600 transition-colors">{t('public.newsViewAll')}</Link>
          <ChevronRight size={14} />
          <span className={`truncate max-w-[200px] sm:max-w-none ${dark ? 'text-slate-300' : 'text-[#000435]'}`}>{article.title}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8 xl:gap-10">
          {/* Main column */}
          <main className="min-w-0 space-y-6">
            {/* Hero meta */}
            <div>
              <span
                className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-4"
                style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
              >
                {categoryLabel(article.category)}
              </span>
              <h1 className={`font-black leading-tight mb-5 ${titleColor}`} style={{ fontSize: 'clamp(1.65rem, 4vw, 2.75rem)' }}>
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-500">
                {article.author_name && (
                  <span className="inline-flex items-center gap-1.5">
                    <User size={14} className="text-amber-500" />
                    {t('public.newsBy', { defaultValue: 'By' })} {article.author_name}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5"><Calendar size={14} className="text-amber-500" /> {formatDate(article.publish_at)}</span>
                <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-amber-500" /> {mins} {t('public.newsMinRead', { defaultValue: 'min read' })}</span>
                <span className="inline-flex items-center gap-1.5"><Eye size={14} className="text-amber-500" /> {views.toLocaleString()} {t('public.newsViews', { defaultValue: 'views' })}</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button type="button" onClick={toggleSave} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${saved ? 'bg-amber-100 border-amber-300 text-amber-900' : `${cardBg} border-slate-200 ${titleColor}`}`}>
                  <Bookmark size={14} className={saved ? 'fill-amber-600 text-amber-600' : ''} />
                  {saved ? t('public.newsSaved', { defaultValue: 'Saved' }) : t('public.newsSave', { defaultValue: 'Save' })}
                </button>
                <button type="button" onClick={() => window.print()} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${cardBg} border-slate-200 ${titleColor}`}>
                  <Printer size={14} /> {t('public.newsPrint')}
                </button>
                <button type="button" onClick={() => setDark((d) => !d)} aria-label={t('public.newsDarkMode', { defaultValue: 'Toggle dark mode' })} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${cardBg} border-slate-200 ${titleColor}`}>
                  {dark ? <Sun size={14} /> : <Moon size={14} />}
                  {t('public.newsDarkMode', { defaultValue: 'Dark mode' })}
                </button>
              </div>
            </div>

            {/* Article images */}
            {showcaseImages.length > 0 && (
              <NewsImageShowcase images={showcaseImages} alt={article.title || ''} />
            )}

            {/* Article body */}
            <article
              className={`rounded-2xl border p-6 sm:p-10 shadow-sm ${cardBg}
                prose max-w-none prose-lg
                ${dark
                  ? 'prose-invert prose-headings:text-white prose-p:text-slate-300 prose-a:text-amber-400 prose-strong:text-white prose-blockquote:border-amber-400 prose-blockquote:text-slate-300'
                  : 'prose-slate prose-headings:text-[#000435] prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-amber-600 prose-strong:text-[#000435] prose-blockquote:border-l-4 prose-blockquote:border-amber-400 prose-blockquote:bg-amber-50/50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic'
                }`}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            {/* Downloads */}
            {attachments.length > 0 && (
              <div className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${cardBg}`}>
                <h3 className={`font-black mb-4 flex items-center gap-2 ${titleColor}`}>
                  <FileText size={18} className="text-amber-500" />
                  {t('public.newsDownloads', { defaultValue: 'Related Resources' })}
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {attachments.map((a, i) => (
                    <a
                      key={i}
                      href={mediaUrl(a.url) || a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:border-amber-300 hover:shadow-md ${dark ? 'border-slate-600 hover:bg-slate-800' : 'border-slate-100 hover:bg-amber-50/30'}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <Download size={18} className="text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${titleColor}`}>{a.title || 'Download'}</p>
                        {a.subtitle && <p className="text-xs text-slate-500 truncate">{a.subtitle}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className={`rounded-2xl border p-4 shadow-sm flex flex-wrap gap-4 sm:gap-8 justify-center sm:justify-start ${cardBg}`}>
              <button type="button" onClick={onLike} disabled={liked} className="inline-flex items-center gap-2 text-sm font-bold disabled:opacity-70">
                <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : 'text-red-400'} />
                <span className={titleColor}>{likes.toLocaleString()}</span>
                <span className="text-slate-500">{t('public.newsLikes', { defaultValue: 'Likes' })}</span>
              </button>
              <span className="inline-flex items-center gap-2 text-sm font-bold">
                <Eye size={18} className="text-blue-400" />
                <span className={titleColor}>{views.toLocaleString()}</span>
                <span className="text-slate-500">{t('public.newsViews', { defaultValue: 'Views' })}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-bold">
                <Share2 size={18} className="text-green-500" />
                <span className={titleColor}>{shares.toLocaleString()}</span>
                <span className="text-slate-500">{t('public.newsShares', { defaultValue: 'Shares' })}</span>
              </span>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/news?search=${encodeURIComponent(tag.replace(/^#/, ''))}`}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-[#000435] text-amber-400 hover:bg-amber-400 hover:text-[#000435] transition-colors"
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </Link>
                ))}
              </div>
            )}

            <ShareButtons url={shareUrl} title={article.title} onShare={onShare} />

            {/* Category CTA */}
            <div className="rounded-2xl overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg,#000435 0%,#000c6b 100%)' }}>
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-amber-400 font-black text-lg">{cta.sub}</p>
                  <p className="text-white/50 text-sm mt-1">{t('public.newsCtaHint', { defaultValue: 'Powered by Babyeyi — trusted school payments in Rwanda.' })}</p>
                </div>
                <Link
                  to={cta.href}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-black text-[#000435] text-sm shrink-0 hover:scale-[1.02] transition-transform"
                  style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}
                >
                  {cta.label}
                </Link>
              </div>
            </div>

            {/* Related news */}
            {related.length > 0 && (
              <div>
                <h3 className={`font-black text-xl mb-5 ${titleColor}`}>
                  {t('public.newsYouMayLike', { defaultValue: 'You May Also Like' })}
                </h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  {related.map((r) => {
                    const rb = badgeStyle(r.category);
                    const img = mediaUrl(r.featured_image);
                    return (
                      <Link
                        key={r.id}
                        to={`/news/${r.slug}`}
                        className={`group rounded-2xl border overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all ${cardBg}`}
                      >
                        <div className="aspect-[16/10] bg-[#000435] overflow-hidden relative">
                          {img ? (
                            <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center"><Tag size={28} className="text-amber-400/40" /></div>
                          )}
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-black uppercase" style={{ background: rb.bg, color: rb.color }}>{categoryLabel(r.category)}</span>
                        </div>
                        <div className="p-4">
                          <p className={`font-black text-sm leading-snug group-hover:text-amber-600 transition-colors line-clamp-2 ${titleColor}`}>{r.title}</p>
                          <p className="text-xs text-slate-500 mt-2">{formatDate(r.publish_at)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Newsletter */}
            <div className={`rounded-2xl border p-6 sm:p-8 shadow-sm ${cardBg}`}>
              <h3 className={`font-black text-xl mb-2 ${titleColor}`}>{t('public.newsNewsletterTitle', { defaultValue: 'Stay Updated' })}</h3>
              <p className="text-slate-500 text-sm mb-4">{t('public.newsNewsletterSub', { defaultValue: 'Get the latest Babyeyi news, product updates, and school payment tips in your inbox.' })}</p>
              {newsletterDone ? (
                <p className="text-green-600 font-bold text-sm">{t('public.newsNewsletterThanks', { defaultValue: 'Thank you! We will keep you updated.' })}</p>
              ) : (
                <form onSubmit={onNewsletter} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder={t('public.newsNewsletterPlaceholder', { defaultValue: 'Email address' })}
                    className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 ${dark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
                  />
                  <button type="submit" className="px-6 py-3 rounded-xl font-black text-[#000435] text-sm shrink-0" style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}>
                    {t('public.newsNewsletterBtn', { defaultValue: 'Subscribe' })}
                  </button>
                </form>
              )}
            </div>
          </main>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {popular.length > 0 && (
              <SideCard title={t('public.newsPopular', { defaultValue: 'Popular News' })} icon={Flame}>
                <ul className="space-y-4">
                  {popular.map((p, i) => (
                    <li key={p.id}>
                      <Link to={`/news/${p.slug}`} className="flex gap-3 group">
                        <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <p className={`font-bold text-sm leading-snug group-hover:text-amber-600 transition-colors line-clamp-2 ${titleColor}`}>{p.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{p.view_count || 0} {t('public.newsViews', { defaultValue: 'views' })}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </SideCard>
            )}

            <SideCard title={t('public.newsCategories', { defaultValue: 'Categories' })} icon={Tag}>
              <ul className="space-y-2">
                {NEWS_CATEGORIES.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/news?category=${c.id}`}
                      className={`flex items-center justify-between py-1.5 text-sm font-semibold hover:text-amber-600 transition-colors ${c.id === article.category ? 'text-amber-600' : titleColor}`}
                    >
                      {c.label}
                      <ChevronRight size={14} className="text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </SideCard>

            <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <div className="p-5 bg-[#000435]">
                <h3 className="font-black text-white flex items-center gap-2 text-sm">
                  <MapPin size={16} className="text-amber-400" />
                  {t('public.popupTitle', { defaultValue: 'Find a Babyeyi Agent Near You' })}
                </h3>
                <p className="text-white/50 text-xs mt-2">{t('public.popupBody', { defaultValue: 'Get help with school fee payments and account support locally.' })}</p>
                <Link to="/find-agent" className="mt-4 inline-flex w-full items-center justify-center py-2.5 rounded-xl font-black text-[#000435] text-sm" style={{ background: 'linear-gradient(135deg,#FBBF24,#F59E0B)' }}>
                  {t('public.popupCta', { defaultValue: 'Find Agent' })}
                </Link>
              </div>
            </div>

            <SideCard title={t('public.popupNeedHelp', { defaultValue: 'Need Help?' })} icon={Headphones}>
              <p className="text-slate-500 text-sm mb-3">{t('public.supportFabCall', { defaultValue: 'Call Support' })}: {SUPPORT_PHONE.replace('+250', '0')}</p>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#25D366' }}>
                <MessageCircle size={16} /> WhatsApp
              </a>
            </SideCard>

            {latest.length > 0 && (
              <SideCard title={t('public.newsLatestPosts', { defaultValue: 'Latest Posts' })} icon={Calendar}>
                <ul className="space-y-3">
                  {latest.map((l) => (
                    <li key={l.id}>
                      <Link to={`/news/${l.slug}`} className="block group">
                        <p className={`font-bold text-sm leading-snug group-hover:text-amber-600 transition-colors line-clamp-2 ${titleColor}`}>{l.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{formatDate(l.publish_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </SideCard>
            )}
          </aside>
        </div>
      </div>

      <PublicFooter />

      <FloatingActions onTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
    </div>
  );
}
