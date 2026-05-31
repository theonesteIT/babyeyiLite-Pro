/**
 * AllNews.jsx — Full news archive with modern filters
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ArrowRight, Loader2, Calendar, Tag, Sparkles, Filter, X,
} from 'lucide-react';
import PublicHeader, { usePublicHeaderState } from '../../components/public/Header';
import PublicFooter from '../../components/public/Footer';
import { publicHeaderPaddingClass } from '../../components/public/publicSiteConstants';
import {
  platformContentApi, categoryLabel, badgeStyle, mediaUrl, NEWS_CATEGORIES,
} from '../../utils/platformContentApi';

const PAGE_SIZE = 9;

export default function AllNews() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const { bannerVisible, dismissBanner, banners } = usePublicHeaderState();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') || '');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [category, setCategory] = useState(() => searchParams.get('category') || '');
  const [sort, setSort] = useState('recent');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.title = `${t('public.newsSectionTitle', { defaultValue: 'Latest News' })} · Babyeyi`;
  }, [t]);

  useEffect(() => {
    const tmr = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(tmr);
  }, [searchInput]);

  const fetchParams = useMemo(() => ({
    limit: PAGE_SIZE,
    sort: sort === 'oldest' ? 'oldest' : 'recent',
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
    ...(featuredOnly ? { featured: '1' } : {}),
  }), [category, search, sort, featuredOnly]);

  const loadPage = useCallback(async (nextOffset, append) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setErr('');
    try {
      const data = await platformContentApi.getNews(i18n.language, {
        ...fetchParams,
        offset: nextOffset,
      });
      const rows = Array.isArray(data) ? data : data?.items || [];
      setItems((prev) => (append ? [...prev, ...rows] : rows));
      setOffset(nextOffset + rows.length);
      setHasMore(rows.length >= PAGE_SIZE);
    } catch (e) {
      setErr(e.message || 'Failed to load news');
      if (!append) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchParams, i18n.language]);

  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const formatDate = (raw) => {
    if (!raw) return '';
    try {
      return new Date(raw).toLocaleDateString(i18n.language || 'en', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return raw;
    }
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setSort('recent');
    setFeaturedOnly(false);
  };

  const activeFilterCount = [category, search, featuredOnly, sort !== 'recent'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <PublicHeader bannerVisible={bannerVisible} onBannerClose={dismissBanner} banners={banners} />

      <section className={`${publicHeaderPaddingClass(bannerVisible)} pb-14 sm:pb-16 bg-[#000435] relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(251,191,36,.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-black text-white mb-3" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            {t('public.newsSectionTitle', { defaultValue: 'Latest News & Announcements' })}
          </h1>
          <div className="w-12 h-1 rounded-full mx-auto mb-4 bg-gradient-to-r from-amber-400 to-amber-600" />
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
            {t('public.newsSectionSub', { defaultValue: 'Stay updated on platform features, payments, and school community news.' })}
          </p>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Filter bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-amber-600" />
            <span className="text-sm font-black text-[#000435]">{t('public.newsFilters', { defaultValue: 'Filters' })}</span>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900">
                <X size={12} /> {t('public.newsClearFilters', { defaultValue: 'Clear all' })}
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300 focus:bg-white"
                placeholder={t('public.newsSearchPlaceholder', { defaultValue: 'Search news…' })}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#000435] min-w-[160px] focus:outline-none focus:ring-2 focus:ring-amber-300"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">{t('public.newsSortRecent', { defaultValue: 'Newest first' })}</option>
              <option value="oldest">{t('public.newsSortOldest', { defaultValue: 'Oldest first' })}</option>
            </select>
            <button
              type="button"
              onClick={() => setFeaturedOnly((v) => !v)}
              className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                featuredOnly
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-[#000435] hover:border-amber-200'
              }`}
            >
              <Sparkles size={15} /> {t('public.newsFeaturedOnly', { defaultValue: 'Featured' })}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                !category ? 'bg-[#000435] text-amber-400 border-[#000435]' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
              }`}
            >
              {t('public.newsAllCategories', { defaultValue: 'All' })}
            </button>
            {NEWS_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id === category ? '' : c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  category === c.id
                    ? 'bg-[#000435] text-amber-400 border-[#000435]'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4 mb-6 text-sm">{err}</div>}

        {loading ? (
          <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-600" /></div>
        ) : !items.length ? (
          <div className="text-center py-20 text-slate-500 rounded-2xl border border-dashed border-slate-200 bg-white">
            <p className="font-bold text-lg mb-2">{t('public.newsEmptyTitle', { defaultValue: 'No news yet' })}</p>
            <p className="text-sm mb-4">{t('public.newsEmptySub', { defaultValue: 'Check back soon for updates from Babyeyi.' })}</p>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-sm font-bold text-amber-700 hover:underline">
                {t('public.newsClearFilters', { defaultValue: 'Clear filters' })}
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-5 font-medium">
              {items.length} {t('public.newsResults', { defaultValue: 'articles' })}
              {search ? ` · "${search}"` : ''}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => {
                const badge = badgeStyle(item.category);
                const img = mediaUrl(item.featured_image);
                return (
                  <article
                    key={item.id}
                    className="group flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:shadow-[0_16px_48px_rgba(0,4,53,0.08)] hover:-translate-y-1 transition-all duration-300"
                  >
                    <Link to={`/news/${item.slug}`} className="relative aspect-[16/10] overflow-hidden block bg-[#000435]">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#000435] to-[#000c6b]">
                          <Tag size={36} className="text-amber-400/40" />
                        </div>
                      )}
                      {item.is_featured ? (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-amber-400 text-[#000435] text-[9px] font-black uppercase">
                          Featured
                        </span>
                      ) : null}
                      <span
                        className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"
                        style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                      >
                        {categoryLabel(item.category)}
                      </span>
                    </Link>
                    <div className="flex flex-col flex-1 p-5">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium mb-2">
                        <Calendar size={12} /> {formatDate(item.publish_at)}
                        {item.is_breaking ? <span className="text-red-500 font-black uppercase">Breaking</span> : null}
                      </div>
                      <Link to={`/news/${item.slug}`}>
                        <h2 className="font-black text-[#000435] mb-2 leading-snug group-hover:text-amber-700 transition-colors text-base">
                          {item.title}
                        </h2>
                      </Link>
                      <p className="text-slate-500 text-sm leading-relaxed flex-1 line-clamp-3">{item.excerpt}</p>
                      <Link
                        to={`/news/${item.slug}`}
                        className="inline-flex items-center gap-1 mt-4 font-black text-[#000435] hover:text-amber-600 text-sm"
                      >
                        {t('public.newsReadMore', { defaultValue: 'Read more' })} <ArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div className="text-center mt-10">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadPage(offset, true)}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-black text-[#000435] border-2 border-[#000435] bg-white hover:bg-amber-50 disabled:opacity-60 transition-all"
                >
                  {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t('public.newsLoadMore', { defaultValue: 'Load more' })}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
