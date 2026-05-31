import { useEffect, useRef, useState } from 'react';
import {
  Loader2, Plus, Pencil, Trash2, Newspaper, Megaphone, MessageSquare,
  BarChart3, Eye, FileText, Calendar, ToggleLeft, ToggleRight, X, ImagePlus,
} from 'lucide-react';
import SuperAdminPageHeader from './components/SuperAdminPageHeader';
import {
  platformContentApi,
  NEWS_CATEGORIES,
  POPUP_TYPES,
  emptyTranslations,
  emptyBannerTranslations,
  emptyPopupTranslations,
  formatDateTimeLocal,
  mediaUrl,
  MAX_NEWS_GALLERY_EXTRA,
} from '../../utils/platformContentApi';

const inp = 'w-full rounded-xl border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300';
const lbl = 'block text-[11px] font-bold uppercase tracking-wide text-amber-900/70 mb-1';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: BarChart3 },
  { id: 'news', label: 'News Posts', icon: Newspaper },
  { id: 'banners', label: 'Top Bar', icon: Megaphone },
  { id: 'popups', label: 'Popups', icon: MessageSquare },
];

function LangFields({ translations, setTranslations, fields }) {
  return ['en', 'rw', 'fr'].map((lang) => (
    <div key={lang} className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-2">
      <p className="text-xs font-black uppercase text-amber-800">{lang}</p>
      {fields.map((f) => (
        <div key={f.key}>
          <label className={lbl}>{f.label}</label>
          {f.textarea ? (
            <textarea
              className={`${inp} min-h-[${f.rows || 3}rem]`}
              rows={f.rows || 3}
              value={translations[lang]?.[f.key] || ''}
              onChange={(e) =>
                setTranslations((p) => ({
                  ...p,
                  [lang]: { ...p[lang], [f.key]: e.target.value },
                }))
              }
            />
          ) : (
            <input
              className={inp}
              value={translations[lang]?.[f.key] || ''}
              onChange={(e) =>
                setTranslations((p) => ({
                  ...p,
                  [lang]: { ...p[lang], [f.key]: e.target.value },
                }))
              }
            />
          )}
        </div>
      ))}
    </div>
  ));
}

export default function SuperAdminPlatformContent() {
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [news, setNews] = useState([]);
  const [banners, setBanners] = useState([]);
  const [popups, setPopups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [s, n, b, p] = await Promise.all([
        platformContentApi.adminStats(),
        platformContentApi.adminListNews(),
        platformContentApi.adminListBanners(),
        platformContentApi.adminListPopups(),
      ]);
      setStats(s);
      setNews(n || []);
      setBanners(b || []);
      setPopups(p || []);
    } catch (e) {
      setErr(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statCards = stats ? [
    { label: 'Total News', value: stats.totalNews, icon: Newspaper },
    { label: 'Draft Posts', value: stats.draftPosts, icon: FileText },
    { label: 'Total Views', value: stats.totalViews, icon: Eye },
    { label: 'Active Popups', value: stats.activePopups, icon: MessageSquare },
    { label: 'Scheduled Banners', value: stats.scheduledAnnouncements, icon: Calendar },
    { label: 'Expired Ads', value: stats.expiredAds, icon: Trash2 },
  ] : [];

  return (
    <div className="min-h-screen bg-amber-50/40 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-5">
        <SuperAdminPageHeader
          title="News & Announcements"
          subtitle="Manage top bar, homepage news, and floating popups — RW / EN / FR."
        />

        <div className="flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tab === id
                  ? 'bg-[#000435] text-amber-400 shadow-lg'
                  : 'bg-white border border-amber-200 text-amber-900 hover:bg-amber-50'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {err && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3">{err}</div>}

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-700" /></div>
        ) : tab === 'dashboard' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statCards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border-2 border-amber-100 bg-white p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2"><Icon size={16} /><span className="text-xs font-bold uppercase">{label}</span></div>
                <p className="text-2xl font-black text-[#000435]">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : tab === 'news' ? (
          <NewsTab
            rows={news}
            onRefresh={load}
            onEdit={(row) => setModal({ type: 'news', row })}
            onCreate={() => setModal({ type: 'news', row: null })}
          />
        ) : tab === 'banners' ? (
          <BannersTab
            rows={banners}
            onRefresh={load}
            onEdit={(row) => setModal({ type: 'banner', row })}
            onCreate={() => setModal({ type: 'banner', row: null })}
          />
        ) : (
          <PopupsTab
            rows={popups}
            onRefresh={load}
            onEdit={(row) => setModal({ type: 'popup', row })}
            onCreate={() => setModal({ type: 'popup', row: null })}
          />
        )}
      </div>

      {modal?.type === 'news' && (
        <NewsModal
          row={modal.row}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={async (fd) => {
            setSaving(true);
            setErr('');
            try {
              await platformContentApi.adminSaveNews(modal.row?.id, fd);
              setModal(null);
              await load();
            } catch (e) {
              setErr(e.message);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
      {modal?.type === 'banner' && (
        <BannerModal
          row={modal.row}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={async (body) => {
            setSaving(true);
            try {
              await platformContentApi.adminSaveBanner(modal.row?.id, body);
              setModal(null);
              load();
            } catch (e) {
              setErr(e.message);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
      {modal?.type === 'popup' && (
        <PopupModal
          row={modal.row}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={async (fd) => {
            setSaving(true);
            try {
              await platformContentApi.adminSavePopup(modal.row?.id, fd);
              setModal(null);
              load();
            } catch (e) {
              setErr(e.message);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

function NewsTab({ rows, onRefresh, onEdit, onCreate }) {
  const parse = (j) => { try { return JSON.parse(j); } catch { return {}; } };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#000435] text-amber-400 px-4 py-2 font-bold text-sm">
          <Plus size={16} /> New Post
        </button>
      </div>
      {rows.map((r) => {
        const tr = parse(r.translations_json);
        return (
          <article key={r.id} className="rounded-2xl border-2 border-amber-100 bg-white p-4 flex flex-wrap gap-4 justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 items-center mb-1">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">{r.status}</span>
                <span className="text-[10px] font-bold text-slate-500">{r.category}</span>
                {r.is_featured ? <span className="text-[10px] font-bold text-purple-600">Featured</span> : null}
              </div>
              <p className="font-black text-[#000435]">{tr.en?.title || r.slug}</p>
              <p className="text-sm text-slate-500 line-clamp-2 mt-1">{tr.en?.excerpt}</p>
              <p className="text-xs text-slate-400 mt-2">{r.view_count || 0} views · /news/{r.slug}</p>
            </div>
            <div className="flex gap-2 items-start">
              <button type="button" onClick={() => onEdit(r)} className="p-2 rounded-lg border border-amber-200"><Pencil size={16} /></button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Delete this news post?')) return;
                  await platformContentApi.adminDeleteNews(r.id);
                  onRefresh();
                }}
                className="p-2 rounded-lg border border-red-200 text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        );
      })}
      {!rows.length && <p className="text-center text-slate-500 py-12">No news posts yet.</p>}
    </div>
  );
}

function BannersTab({ rows, onRefresh, onEdit, onCreate }) {
  const parse = (j) => { try { return JSON.parse(j); } catch { return {}; } };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#000435] text-amber-400 px-4 py-2 font-bold text-sm">
          <Plus size={16} /> Add Banner Message
        </button>
      </div>
      {rows.map((r) => {
        const tr = parse(r.translations_json);
        return (
          <article key={r.id} className="rounded-2xl border-2 border-amber-100 bg-white p-4 flex justify-between gap-3">
            <div>
              <p className="font-bold text-[#000435]">{tr.en?.message || tr.en?.title || '—'}</p>
              <p className="text-xs text-slate-500 mt-1">Priority: {r.priority} · {r.is_active ? 'Active' : 'Inactive'} · {r.click_count} clicks</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onEdit(r)} className="p-2 rounded-lg border border-amber-200"><Pencil size={16} /></button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Delete banner?')) return;
                  await platformContentApi.adminDeleteBanner(r.id);
                  onRefresh();
                }}
                className="p-2 rounded-lg border border-red-200 text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PopupsTab({ rows, onRefresh, onEdit, onCreate }) {
  const parse = (j) => { try { return JSON.parse(j); } catch { return {}; } };
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#000435] text-amber-400 px-4 py-2 font-bold text-sm">
          <Plus size={16} /> New Popup
        </button>
      </div>
      {rows.map((r) => {
        const tr = parse(r.translations_json);
        return (
          <article key={r.id} className="rounded-2xl border-2 border-amber-100 bg-white p-4 flex justify-between gap-3">
            <div>
              <p className="font-bold text-[#000435]">{tr.en?.title || r.popup_type}</p>
              <p className="text-xs text-slate-500 mt-1">{r.popup_type} · {r.frequency} · {r.view_count} views · {r.click_count} clicks</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onEdit(r)} className="p-2 rounded-lg border border-amber-200"><Pencil size={16} /></button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Delete popup?')) return;
                  await platformContentApi.adminDeletePopup(r.id);
                  onRefresh();
                }}
                className="p-2 rounded-lg border border-red-200 text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function NewsModal({ row, onClose, onSave, saving }) {
  const parse = (j) => { try { return JSON.parse(j); } catch { return emptyTranslations(); } };
  const parseGallery = (j) => { try { const g = JSON.parse(j); return Array.isArray(g) ? g : []; } catch { return []; } };
  const [translations, setTranslations] = useState(parse(row?.translations_json));
  const [category, setCategory] = useState(row?.category || 'announcements');
  const [status, setStatus] = useState(row?.status || 'draft');
  const [slug, setSlug] = useState(row?.slug || '');
  const [publishAt, setPublishAt] = useState(formatDateTimeLocal(row?.publish_at));
  const [featured, setFeatured] = useState(!!row?.is_featured);
  const [breaking, setBreaking] = useState(!!row?.is_breaking);
  const [imageFile, setImageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [keptGallery, setKeptGallery] = useState(() => parseGallery(row?.gallery_json));
  const [newGallery, setNewGallery] = useState([]);
  const newGalleryRef = useRef(newGallery);
  newGalleryRef.current = newGallery;

  useEffect(() => {
    if (!imageFile) {
      setCoverPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(imageFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => () => {
    newGalleryRef.current.forEach((g) => URL.revokeObjectURL(g.preview));
  }, []);

  const galleryCount = keptGallery.length + newGallery.length;
  const galleryRoom = MAX_NEWS_GALLERY_EXTRA - galleryCount;

  const addGalleryFiles = (fileList) => {
    if (!fileList?.length || galleryRoom <= 0) return;
    const toAdd = [...fileList].slice(0, galleryRoom).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewGallery((prev) => [...prev, ...toAdd]);
  };

  const removeNewGallery = (index) => {
    setNewGallery((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index]?.preview);
      next.splice(index, 1);
      return next;
    });
  };

  const submit = () => {
    if (!translations?.en?.title?.trim()) {
      alert('English title is required.');
      return;
    }
    const fd = new FormData();
    fd.append('translations_json', JSON.stringify(translations));
    fd.append('category', category);
    fd.append('status', status);
    if (slug) fd.append('slug', slug);
    fd.append('publish_at', publishAt);
    fd.append('is_featured', featured ? '1' : '0');
    fd.append('is_breaking', breaking ? '1' : '0');
    if (imageFile) fd.append('featured_image', imageFile);
    else if (row?.featured_image) fd.append('existing_featured_image', row.featured_image);
    newGallery.forEach(({ file }) => fd.append('gallery_images', file));
    fd.append('existing_gallery_json', JSON.stringify(keptGallery));
    onSave(fd);
  };

  const coverSrc = coverPreview || mediaUrl(row?.featured_image);

  return (
    <ModalShell title={row ? 'Edit News Post' : 'Create News Post'} onClose={onClose}>
      <div className="grid gap-3 max-h-[70vh] overflow-y-auto pr-1">
        <LangFields
          translations={translations}
          setTranslations={setTranslations}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'excerpt', label: 'Short description', textarea: true, rows: 2 },
            { key: 'body', label: 'Full content', textarea: true, rows: 6 },
          ]}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Category</label>
            <select className={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
              {NEWS_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Status</label>
            <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">Published posts appear on the homepage (max 3) and on /news.</p>
          </div>
          <div><label className={lbl}>Slug (optional)</label><input className={inp} value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
          <div><label className={lbl}>Publish date</label><input type="datetime-local" className={inp} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} /></div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-3 space-y-3">
          <p className="text-xs font-black uppercase text-amber-800">Post images (max {MAX_NEWS_GALLERY_EXTRA + 1} total)</p>
          <div>
            <label className={lbl}>Cover image</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            {coverSrc && (
              <div className="mt-2 relative inline-block">
                <img src={coverSrc} alt="" className="h-24 w-40 object-cover rounded-lg border border-amber-200" />
                <span className="absolute bottom-1 left-1 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Gallery ({galleryCount}/{MAX_NEWS_GALLERY_EXTRA})</label>
            <p className="text-xs text-slate-500 mb-2">Add up to {MAX_NEWS_GALLERY_EXTRA} extra images. Shown as a slideshow on the article page.</p>
            <label className={`inline-flex items-center gap-2 rounded-xl border border-dashed border-amber-300 px-3 py-2 text-sm font-bold cursor-pointer hover:bg-amber-50 ${galleryRoom <= 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              <ImagePlus size={16} />
              Add gallery images
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={galleryRoom <= 0}
                onChange={(e) => {
                  addGalleryFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            {(keptGallery.length > 0 || newGallery.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {keptGallery.map((path, i) => (
                  <div key={`k-${path}`} className="relative">
                    <img src={mediaUrl(path)} alt="" className="h-20 w-28 object-cover rounded-lg border border-amber-200" />
                    <button
                      type="button"
                      onClick={() => setKeptGallery((g) => g.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {newGallery.map((g, i) => (
                  <div key={`n-${g.preview}`} className="relative">
                    <img src={g.preview} alt="" className="h-20 w-28 object-cover rounded-lg border border-amber-200" />
                    <button
                      type="button"
                      onClick={() => removeNewGallery(i)}
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                      aria-label="Remove image"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured</label>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={breaking} onChange={(e) => setBreaking(e.target.checked)} /> Breaking</label>
        </div>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} />
    </ModalShell>
  );
}

function BannerModal({ row, onClose, onSave, saving }) {
  const parse = (j) => { try { return JSON.parse(j); } catch { return emptyBannerTranslations(); } };
  const [translations, setTranslations] = useState(parse(row?.translations_json));
  const [ctaLink, setCtaLink] = useState(row?.cta_link || '/news');
  const [priority, setPriority] = useState(row?.priority || 'medium');
  const [active, setActive] = useState(row?.is_active !== 0);
  const [startAt, setStartAt] = useState(row?.start_at?.slice?.(0, 16) || '');
  const [endAt, setEndAt] = useState(row?.end_at?.slice?.(0, 16) || '');

  return (
    <ModalShell title={row ? 'Edit Top Bar Message' : 'New Top Bar Message'} onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <LangFields
          translations={translations}
          setTranslations={setTranslations}
          fields={[
            { key: 'title', label: 'Title (optional)' },
            { key: 'message', label: 'Scrolling message', textarea: true, rows: 2 },
            { key: 'cta_text', label: 'CTA text (e.g. Learn more)' },
          ]}
        />
        <div><label className={lbl}>CTA Link</label><input className={inp} value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Priority</label>
            <select className={inp} value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-end"><button type="button" onClick={() => setActive((v) => !v)} className="flex items-center gap-2 font-bold text-sm">{active ? <ToggleRight className="text-green-600" /> : <ToggleLeft />} Active</button></div>
          <div><label className={lbl}>Start</label><input type="datetime-local" className={inp} value={startAt} onChange={(e) => setStartAt(e.target.value)} /></div>
          <div><label className={lbl}>End</label><input type="datetime-local" className={inp} value={endAt} onChange={(e) => setEndAt(e.target.value)} /></div>
        </div>
      </div>
      <ModalActions
        onClose={onClose}
        saving={saving}
        onSave={() => onSave({
          translations_json: translations,
          cta_link: ctaLink,
          priority,
          is_active: active,
          start_at: startAt || null,
          end_at: endAt || null,
        })}
      />
    </ModalShell>
  );
}

function PopupModal({ row, onClose, onSave, saving }) {
  const parse = (j) => { try { return JSON.parse(j); } catch { return emptyPopupTranslations(); } };
  const [translations, setTranslations] = useState(parse(row?.translations_json));
  const [popupType, setPopupType] = useState(row?.popup_type || 'promotion');
  const [ctaLink, setCtaLink] = useState(row?.cta_link || '/find-agent');
  const [delay, setDelay] = useState(row?.delay_seconds ?? 7);
  const [scrollPct, setScrollPct] = useState(row?.scroll_percent ?? 40);
  const [frequency, setFrequency] = useState(row?.frequency || 'once_day');
  const [active, setActive] = useState(row?.is_active !== 0);
  const [imageFile, setImageFile] = useState(null);

  const submit = () => {
    const fd = new FormData();
    fd.append('translations_json', JSON.stringify(translations));
    fd.append('popup_type', popupType);
    fd.append('cta_link', ctaLink);
    fd.append('delay_seconds', String(delay));
    fd.append('scroll_percent', String(scrollPct));
    fd.append('frequency', frequency);
    fd.append('trigger_rule', 'both');
    fd.append('is_active', active ? '1' : '0');
    if (imageFile) fd.append('popup_image', imageFile);
    else if (row?.image_url) fd.append('image_url', row.image_url);
    onSave(fd);
  };

  return (
    <ModalShell title={row ? 'Edit Popup' : 'New Popup'} onClose={onClose}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        <LangFields
          translations={translations}
          setTranslations={setTranslations}
          fields={[
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description', textarea: true, rows: 3 },
            { key: 'cta_text', label: 'Button text' },
          ]}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className={lbl}>Type</label>
            <select className={inp} value={popupType} onChange={(e) => setPopupType(e.target.value)}>
              {POPUP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Frequency</label>
            <select className={inp} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="once_day">Once per day</option>
              <option value="once_session">Once per session</option>
              <option value="always">Always</option>
            </select>
          </div>
          <div><label className={lbl}>CTA Link</label><input className={inp} value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} /></div>
          <div><label className={lbl}>Delay (seconds)</label><input type="number" className={inp} value={delay} onChange={(e) => setDelay(e.target.value)} /></div>
          <div><label className={lbl}>Scroll % trigger</label><input type="number" className={inp} value={scrollPct} onChange={(e) => setScrollPct(e.target.value)} /></div>
        </div>
        <div><label className={lbl}>Popup image</label><input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></div>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active</label>
      </div>
      <ModalActions onClose={onClose} onSave={submit} saving={saving} />
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 p-4 flex items-end sm:items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white border-2 border-amber-100 p-4 sm:p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-[#000435] text-lg">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave, saving }) {
  return (
    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-amber-100">
      <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-amber-200 font-bold text-sm">Cancel</button>
      <button type="button" disabled={saving} onClick={onSave} className="px-4 py-2 rounded-xl bg-[#000435] text-amber-400 font-bold text-sm disabled:opacity-60">
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}
