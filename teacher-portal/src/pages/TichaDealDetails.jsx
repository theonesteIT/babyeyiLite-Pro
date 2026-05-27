import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../services/api';
import {
  Package, Loader2, ArrowLeft, AlertCircle, CheckCircle2, ShoppingBag,
  ChevronRight, X, MapPin, Home, Truck, CreditCard, Banknote,
  ChevronDown, Check, ArrowRight, Smartphone, Building2, Star,
  Shield, Clock, TrendingUp, Calendar, Users, Store, Navigation,
  Search, Loader, ChevronUp, Info
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null;
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
  const clean = pathLike.replace(/\\/g, '/');
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString()} RWF`;
}

const REPAYMENT_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Montserrat is linked globally in `teacher-portal/index.html` */
const PAGE_FONT_FAMILY = "'Montserrat', system-ui, sans-serif";

/* ─────────────────────────────────────────────
   SHARED MODAL SHELL
───────────────────────────────────────────── */
function ModalShell({
  open,
  onClose,
  children,
  title,
  subtitle,
  footer,
  /** Optional control shown left of the title on small screens (e.g. Back). */
  headerLeading,
  headerActions,
  /** Hide bottom footer bar below `lg` — use when Back + Continue live in the header on mobile. */
  suppressFooterOnMobile,
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  /**
   * Mobile Safari: do NOT use h-[100dvh] — it often exceeds the *visible* viewport when browser chrome
   * is shown, clipping the sticky footer (Continue) below the fold. Cap with min(svh,dvh) and let height
   * shrink to content on short steps so header + body + footer stay on screen.
   */
  const panelCls = footer
    ? 'relative w-full max-w-lg flex flex-col min-h-0 h-auto max-h-[min(88svh,100dvh)] sm:max-h-[min(92vh,880px)] bg-white rounded-[24px] shadow-2xl overflow-hidden mx-auto'
    : 'relative w-full max-w-lg flex flex-col min-h-0 max-h-[min(90svh,100dvh)] sm:max-h-[90vh] bg-white rounded-[24px] shadow-2xl overflow-hidden mx-auto';

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))]"
      style={{ fontFamily: PAGE_FONT_FAMILY }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 z-0 bg-[#000435]/90 backdrop-blur-md" onClick={onClose} />

      {/* Modal */}
      <div
        className={`${panelCls} z-10`}
        style={{ animation: 'modalSlide 0.35s cubic-bezier(.22,1,.36,1) both' }}
      >

        {/* Header */}
        <div
          className="flex-shrink-0 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-6 pb-3 sm:pb-4 border-b border-slate-100"
          style={{ background: 'linear-gradient(135deg, #000435 0%, #001080 100%)' }}
        >
          {/* Title + controls: stacked on mobile with a wide action strip (44px+ targets); lg+ title left / actions right */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400/95 mb-1 leading-snug">
                {subtitle}
              </p>
              <h2 className="text-[17px] sm:text-xl font-black text-white leading-snug break-words">
                {title}
              </h2>
            </div>

            <div
              className={`flex items-stretch gap-2 w-full lg:w-auto lg:flex-shrink-0 lg:justify-end ${
                headerLeading || headerActions ? '' : 'justify-end'
              }`}
            >
              {(headerLeading || headerActions) && headerLeading ? (
                <div className="shrink-0 [&_button]:min-h-[44px] [&_button]:min-w-[44px] [&_button]:rounded-xl">
                  {headerLeading}
                </div>
              ) : null}
              {(headerLeading || headerActions) && headerActions ? (
                <div className="flex-1 min-w-0 lg:flex-initial lg:max-w-none [&_button]:min-h-[44px] max-lg:[&_button]:w-full max-lg:[&_button]:justify-center max-lg:[&_button]:text-[13px] max-lg:[&_button]:font-black max-lg:[&_button]:shadow-lg">
                  {headerActions}
                </div>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="h-11 w-11 shrink-0 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white hover:bg-white/25 transition-all active:scale-[0.98] shadow-sm lg:h-9 lg:w-9 lg:bg-white/10 lg:border-white/15 lg:hover:bg-white/20"
                aria-label="Close"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body — extra bottom padding when footer is hidden on mobile */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch] pb-6 max-sm:pb-10 ${
            suppressFooterOnMobile ? 'max-lg:pb-[max(1.5rem,env(safe-area-inset-bottom))]' : ''
          }`}
        >
          {children}
        </div>

        {footer && (
          <div
            className={`flex-shrink-0 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-0.5 ${
              suppressFooterOnMobile ? 'hidden lg:block' : ''
            }`}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalSlide {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes stepFade {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-animate { animation: stepFade 0.3s cubic-bezier(.22,1,.36,1) both; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin-it { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STEP DOTS
───────────────────────────────────────────── */
function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-2 justify-center py-2 sm:py-3 px-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all duration-300 ${
          i === current - 1
            ? 'w-6 h-2 bg-[#000435]'
            : i < current - 1
              ? 'w-2 h-2 bg-amber-400'
              : 'w-2 h-2 bg-slate-200'
        }`} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAV BUTTONS
───────────────────────────────────────────── */
function NavBtns({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  nextLoading = false,
  backLabel = 'Back',
  /** Primary action shown in ModalShell header on small screens — hide duplicate here so it stays above the app bottom nav. */
  hidePrimaryOnMobile = false,
  /** Back shown in header on mobile — hide duplicate in footer below `lg`. */
  hideBackOnMobile = false,
}) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-4 sm:py-5 bg-white">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className={`items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-xl border-2 border-slate-200
          text-slate-600 font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all flex
          ${hideBackOnMobile ? 'hidden lg:flex' : ''}
          ${hidePrimaryOnMobile && !hideBackOnMobile ? 'flex-1 min-[1024px]:flex-none' : ''}
          `}
        >
          <ArrowLeft size={15} /> {backLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || nextLoading}
        className={`items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm
        transition-all min-h-[48px] ${hidePrimaryOnMobile ? 'hidden lg:flex flex-1' : 'flex flex-1'}
        ${nextDisabled || nextLoading
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
          : 'bg-[#000435] text-white hover:bg-[#000c70] shadow-lg shadow-[#000435]/20 active:scale-[.98]'
        }`}
      >
        {nextLoading && <Loader2 size={16} className="spin-it" />}
        {nextLabel}
        {!nextLoading && <ChevronRight size={15} />}
      </button>
    </div>
  );
}

/** Primary CTA in modal header — hidden on `lg+` where footer NavBtns apply. */
function MobileHeaderContinue({ onClick, disabled, loading, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="lg:hidden inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-3
      min-h-[44px] text-[13px] font-black uppercase tracking-wide text-[#000435] shadow-lg shadow-amber-900/25 ring-2 ring-amber-300/70
      active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
    >
      {loading && <Loader2 size={16} className="spin-it shrink-0" />}
      <span className="truncate leading-tight text-center">{label}</span>
      {!loading && <ChevronRight size={17} className="shrink-0 opacity-90" strokeWidth={2.5} />}
    </button>
  );
}

/** Back / exit — hidden on `lg+`; step 1 usually closes the modal. */
function MobileHeaderBack({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/20 border-2 border-white/40 text-white
      shadow-md hover:bg-white/28 active:scale-[0.97]"
      aria-label="Back"
    >
      <ArrowLeft size={20} strokeWidth={2.25} />
    </button>
  );
}

/* ─────────────────────────────────────────────
   OPTION CARD (radio-style selector)
───────────────────────────────────────────── */
function OptionCard({ selected, onClick, icon: Icon, iconBg, title, description, badge }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all
      ${selected
        ? 'border-[#000435] bg-[#000435]/4 shadow-sm'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
      }`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon size={20} className={selected ? 'text-[#000435]' : 'text-slate-500'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-black text-sm ${selected ? 'text-[#000435]' : 'text-slate-700'}`}>{title}</span>
          {badge && <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">{badge}</span>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all
        ${selected ? 'border-[#000435] bg-[#000435]' : 'border-slate-300'}`}>
        {selected && <Check size={11} className="text-white" strokeWidth={3} />}
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   DIRECT PAY MODAL (Step Wizard)
   Steps: 1=Delivery, 2=Agent/Home address, 3=Payer, 4=Confirm
───────────────────────────────────────────── */
function DirectPayModal({ open, onClose, product, quantity, teacher }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [delivery, setDelivery] = useState('');       // 'agent_station' | 'home'

  /** Agent pickup — same cascade as Babyeyi PublicShoesVoucherFlow (province → district → sector → agents). */
  const [locProvince, setLocProvince] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locSector, setLocSector] = useState('');
  const [provinces, setProvinces] = useState([]);
  const [pickDistricts, setPickDistricts] = useState([]);
  const [pickSectors, setPickSectors] = useState([]);
  const [geoPickLoading, setGeoPickLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);

  /** Home delivery — province/district required; other fields optional. */
  const [homeLocation, setHomeLocation] = useState('');
  const [homeProvince, setHomeProvince] = useState('');
  const [homeDistrict, setHomeDistrict] = useState('');
  const [homeSector, setHomeSector] = useState('');
  const [homeVillage, setHomeVillage] = useState('');
  const [homeCell, setHomeCell] = useState('');
  const [homeStreetNumber, setHomeStreetNumber] = useState('');
  const [shipDistricts, setShipDistricts] = useState([]);
  const [shipSectors, setShipSectors] = useState([]);
  const [geoShipLoading, setGeoShipLoading] = useState(false);

  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const TOTAL_STEPS = 4;
  const principal = Number(product?.price_rwf || 0) * quantity;

  // Pre-fill payer from teacher context
  useEffect(() => {
    if (teacher) {
      const name = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ');
      setPayerName(name);
      setPayerPhone(String(teacher.phone || teacher.mobile || teacher.phone_number || ''));
    }
  }, [teacher]);

  // Pre-fill geo + agent pickup when modal opens (school row / profile hints)
  useEffect(() => {
    if (!open || !teacher) return;
    const sch = teacher.school || {};
    const prov = String(sch.province || teacher.province || '').trim();
    const dist = String(sch.district || teacher.district || '').trim();
    setHomeLocation('');
    setHomeProvince(prov);
    setHomeDistrict(dist);
    setHomeSector('');
    setHomeVillage('');
    setHomeCell('');
    setHomeStreetNumber('');
    setLocProvince(prov);
    setLocDistrict(dist);
    setLocSector('');
  }, [open, teacher?.id, teacher?.school_id]);

  useEffect(() => {
    if (!open) return;
    let off = false;
    api.get('/locations/provinces')
      .then((res) => {
        if (off) return;
        setProvinces(Array.isArray(res.data?.data) ? res.data.data : []);
      })
      .catch(() => { if (!off) setProvinces([]); });
    return () => { off = true; };
  }, [open]);

  useEffect(() => {
    if (!locProvince) {
      setPickDistricts([]);
      setLocDistrict('');
      setPickSectors([]);
      setLocSector('');
      return;
    }
    let off = false;
    setGeoPickLoading(true);
    api.get(`/locations/districts?province=${encodeURIComponent(locProvince)}`)
      .then((res) => {
        if (off) return;
        const dList = Array.isArray(res.data?.data) ? res.data.data : [];
        setPickDistricts(dList);
        setLocDistrict((prev) => (prev && dList.includes(prev) ? prev : ''));
      })
      .catch(() => { if (!off) setPickDistricts([]); })
      .finally(() => { if (!off) setGeoPickLoading(false); });
    return () => { off = true; };
  }, [locProvince]);

  useEffect(() => {
    if (!locProvince || !locDistrict) {
      setPickSectors([]);
      setLocSector('');
      return;
    }
    let off = false;
    setGeoPickLoading(true);
    api.get(`/locations/sectors?province=${encodeURIComponent(locProvince)}&district=${encodeURIComponent(locDistrict)}`)
      .then((res) => {
        if (off) return;
        const sList = Array.isArray(res.data?.data) ? res.data.data : [];
        setPickSectors(sList);
        setLocSector((prev) => (prev && sList.includes(prev) ? prev : ''));
      })
      .catch(() => { if (!off) setPickSectors([]); })
      .finally(() => { if (!off) setGeoPickLoading(false); });
    return () => { off = true; };
  }, [locProvince, locDistrict]);

  useEffect(() => {
    if (!locProvince || !locDistrict) {
      setAgents([]);
      setSelectedAgent(null);
      return;
    }
    let off = false;
    setAgentsLoading(true);
    const path = locSector
      ? `/public/agents/find?province=${encodeURIComponent(locProvince)}&district=${encodeURIComponent(locDistrict)}&sector=${encodeURIComponent(locSector)}`
      : `/public/agents/find?province=${encodeURIComponent(locProvince)}&district=${encodeURIComponent(locDistrict)}`;
    api.get(path)
      .then((res) => {
        if (off) return;
        if (!res.data?.success) throw new Error(res.data?.message || 'Agents failed');
        setAgents(Array.isArray(res.data.data) ? res.data.data : []);
        setSelectedAgent(null);
      })
      .catch(() => {
        if (!off) {
          setAgents([]);
          setSelectedAgent(null);
        }
      })
      .finally(() => { if (!off) setAgentsLoading(false); });
    return () => { off = true; };
  }, [locProvince, locDistrict, locSector]);

  useEffect(() => {
    if (!homeProvince) {
      setShipDistricts([]);
      setHomeDistrict('');
      setShipSectors([]);
      setHomeSector('');
      return;
    }
    let off = false;
    setGeoShipLoading(true);
    api.get(`/locations/districts?province=${encodeURIComponent(homeProvince)}`)
      .then((res) => {
        if (off) return;
        const dList = Array.isArray(res.data?.data) ? res.data.data : [];
        setShipDistricts(dList);
        setHomeDistrict((prev) => (prev && dList.includes(prev) ? prev : ''));
      })
      .catch(() => { if (!off) setShipDistricts([]); })
      .finally(() => { if (!off) setGeoShipLoading(false); });
    return () => { off = true; };
  }, [homeProvince]);

  useEffect(() => {
    if (!homeProvince || !homeDistrict) {
      setShipSectors([]);
      setHomeSector('');
      return;
    }
    let off = false;
    setGeoShipLoading(true);
    api.get(`/locations/sectors?province=${encodeURIComponent(homeProvince)}&district=${encodeURIComponent(homeDistrict)}`)
      .then((res) => {
        if (off) return;
        const sList = Array.isArray(res.data?.data) ? res.data.data : [];
        setShipSectors(sList);
        setHomeSector((prev) => (prev && sList.includes(prev) ? prev : ''));
      })
      .catch(() => { if (!off) setShipSectors([]); })
      .finally(() => { if (!off) setGeoShipLoading(false); });
    return () => { off = true; };
  }, [homeProvince, homeDistrict]);

  const filteredAgents = useMemo(() => {
    if (!agentSearch.trim()) return agents;
    const q = agentSearch.toLowerCase();
    return agents.filter(a =>
      (a.full_name || `${a.first_name || ''} ${a.last_name || ''}`).toLowerCase().includes(q) ||
      (a.district || '').toLowerCase().includes(q) ||
      (Array.isArray(a.sectors) && a.sectors.some(s => String(s).toLowerCase().includes(q))) ||
      (a.phone || '').toLowerCase().includes(q)
    );
  }, [agents, agentSearch]);

  const handleClose = () => {
    setStep(1);
    setDelivery('');
    setSelectedAgent(null);
    setAgentSearch('');
    setError('');
    setLocProvince('');
    setLocDistrict('');
    setLocSector('');
    setPickDistricts([]);
    setPickSectors([]);
    setAgents([]);
    setHomeLocation('');
    setHomeProvince('');
    setHomeDistrict('');
    setHomeSector('');
    setHomeVillage('');
    setHomeCell('');
    setHomeStreetNumber('');
    setShipDistricts([]);
    setShipSectors([]);
    onClose();
  };

  const stepTitles = ['Delivery Method', delivery === 'agent_station' ? 'Choose Agent' : 'Home address', 'Your Details', 'Review & Pay'];

  const goNext = () => {
    setError('');
    if (step === 1 && !delivery) { setError('Please choose a delivery method.'); return; }
    if (step === 2 && delivery === 'agent_station') {
      if (!locProvince || !locDistrict) {
        setError('Choose province and district to see agents near you.');
        return;
      }
      if (!selectedAgent) { setError('Select the agent where you will pick up.'); return; }
    }
    if (step === 2 && delivery === 'home') {
      if (!homeProvince || !homeDistrict) {
        setError('Choose province and district for home delivery.');
        return;
      }
    }
    if (step === 3) {
      if (!payerName.trim()) { setError('Please enter your full name.'); return; }
      if (!payerPhone.trim()) { setError('Please enter your phone number.'); return; }
    }
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else handleConfirm();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body = {
        deal_product_id: product.id,
        quantity,
        delivery_method: delivery,
        agent_user_id: delivery === 'agent_station' ? selectedAgent?.id : null,
        payer_name: payerName.trim(),
        payer_phone: payerPhone.trim(),
        province: delivery === 'agent_station' ? locProvince : homeProvince,
        district: delivery === 'agent_station' ? locDistrict : homeDistrict,
        sector: delivery === 'agent_station' ? locSector : homeSector,
        home_location: delivery === 'home' ? homeLocation.trim() : '',
        village: delivery === 'home' ? homeVillage.trim() : '',
        cell: delivery === 'home' ? homeCell.trim() : '',
        street_number: delivery === 'home' ? homeStreetNumber.trim() : '',
      };
      const res = await api.post('/services/shule-avance/applicant/teacher-deal-pay-token', body);
      const token = res.data?.data?.token ?? res.data?.token;
      if (res.data?.success && token) {
        handleClose();
        navigate(`/ticha-deals/pay?tdt=${token}`);
      } else {
        setError(res.data?.message || 'Could not start payment. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Payment setup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const homeGeoLine = useMemo(() => {
    return [homeProvince, homeDistrict, homeSector].filter(Boolean).join(' · ');
  }, [homeProvince, homeDistrict, homeSector]);

  const homeExtraParts = useMemo(() => {
    return [
      homeLocation.trim(),
      homeVillage.trim(),
      homeCell.trim(),
      homeStreetNumber.trim(),
    ].filter(Boolean);
  }, [homeLocation, homeVillage, homeCell, homeStreetNumber]);

  const selectedAgentLabel = useMemo(() => {
    if (!selectedAgent) return '';
    return (
      selectedAgent.full_name
      || `${selectedAgent.first_name || ''} ${selectedAgent.last_name || ''}`.trim()
      || 'Agent'
    );
  }, [selectedAgent]);

  const pickupLocationLine = useMemo(() => {
    const parts = [locProvince, locDistrict, locSector].filter(Boolean);
    return parts.join(' · ');
  }, [locProvince, locDistrict, locSector]);

  const stepSubtitles = ['Step 1 of 4', 'Step 2 of 4', 'Step 3 of 4', 'Step 4 of 4'];

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={stepTitles[step - 1]}
      subtitle={stepSubtitles[step - 1]}
      headerLeading={(
        <MobileHeaderBack
          onClick={() => {
            if (step > 1) {
              setError('');
              setStep((s) => s - 1);
            } else {
              handleClose();
            }
          }}
        />
      )}
      footer={(
        <NavBtns
          hideBackOnMobile
          onBack={
            step > 1
              ? () => { setError(''); setStep((s) => s - 1); }
              : () => handleClose()
          }
          onNext={goNext}
          nextLabel={step === TOTAL_STEPS ? 'Proceed to Payment' : 'Continue'}
          nextLoading={submitting}
          nextDisabled={submitting}
        />
      )}
    >

      <StepDots total={TOTAL_STEPS} current={step} />

      {/* Product summary pill */}
      <div className="mx-4 sm:mx-6 mb-2 flex items-center gap-3 p-3 rounded-xl bg-[#000435]/4 border border-[#000435]/10">
        <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={16} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-[#000435] truncate">{product?.name}</p>
          <p className="text-xs font-bold text-amber-600">{formatMoney(principal)}</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-6 pt-3 sm:pt-4 step-animate" key={step}>

        {/* ── STEP 1: Delivery ── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-3 sm:mb-4">How would you like to receive your item?</p>
            <OptionCard
              selected={delivery === 'agent_station'}
              onClick={() => setDelivery('agent_station')}
              icon={Store}
              iconBg={delivery === 'agent_station' ? 'bg-amber-100' : 'bg-slate-100'}
              title="Pick up at Agent Station"
              description="Collect from a nearby Babyeyi agent. You'll choose your preferred station next."
            />
            <OptionCard
              selected={delivery === 'home'}
              onClick={() => setDelivery('home')}
              icon={Home}
              iconBg={delivery === 'home' ? 'bg-blue-100' : 'bg-slate-100'}
              title="Deliver at My Home"
              description="We'll deliver to your address. Enter province, district, and any extra location details next."
              badge="Convenient"
            />
          </div>
        )}

        {/* ── STEP 2A: Location + agent (same flow as PublicShoesVoucherFlow) ── */}
        {step === 2 && delivery === 'agent_station' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Match province and district to your area. Sector is optional — leave it on “Any sector” to list all agents in the district, then choose who will receive your pickup.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Province <span className="text-amber-500">*</span>
                </label>
                <select
                  value={locProvince}
                  onChange={(e) => setLocProvince(e.target.value)}
                  disabled={geoPickLoading && !provinces.length}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                >
                  <option value="">Choose…</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  District <span className="text-amber-500">*</span>
                </label>
                <select
                  value={locDistrict}
                  onChange={(e) => setLocDistrict(e.target.value)}
                  disabled={!locProvince || geoPickLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                >
                  <option value="">Choose…</option>
                  {pickDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Sector <span className="text-slate-400 font-bold normal-case">(optional)</span>
                </label>
                <select
                  value={locSector}
                  onChange={(e) => setLocSector(e.target.value)}
                  disabled={!locDistrict || geoPickLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                >
                  <option value="">Any sector in district</option>
                  {pickSectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-3.5 h-11 rounded-xl border-2 border-slate-200
              focus-within:border-[#000435] bg-slate-50 transition-all">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                value={agentSearch}
                onChange={e => setAgentSearch(e.target.value)}
                placeholder="Search agents by name, phone…"
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-medium"
              />
            </div>

            {agentsLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={24} className="text-amber-500 spin-it" />
                <p className="text-xs text-slate-400 font-semibold">Loading agents…</p>
              </div>
            )}

            {!agentsLoading && locProvince && locDistrict && filteredAgents.length === 0 && (
              <div className="text-center py-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80">
                <MapPin size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-semibold">No agents match this location</p>
                <p className="text-xs text-slate-400 mt-1 px-4">Try another sector or contact support.</p>
              </div>
            )}

            {!agentsLoading && locProvince && locDistrict && filteredAgents.length > 0 && (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1">
                {filteredAgents.map((agent) => {
                  const label = agent.full_name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim() || 'Agent';
                  const sectorLine = agent.all_sectors
                    ? 'All sectors'
                    : (Array.isArray(agent.sectors) && agent.sectors.length ? agent.sectors.join(', ') : '');
                  const sel = selectedAgent?.id === agent.id;
                  return (
                    <button key={agent.id} type="button"
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all
                      ${sel ? 'border-[#000435] bg-[#000435]/4' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                        ${sel ? 'bg-[#000435]' : 'bg-slate-100'}`}>
                        <Users size={15} className={sel ? 'text-amber-400' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-sm ${sel ? 'text-[#000435]' : 'text-slate-800'}`}>{label}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {agent.district}{sectorLine ? ` · ${sectorLine}` : ''}
                        </p>
                        {(agent.phone || agent.email) && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            {agent.phone}{agent.email ? ` · ${agent.email}` : ''}
                          </p>
                        )}
                      </div>
                      {sel && (
                        <div className="w-5 h-5 rounded-full bg-[#000435] flex items-center justify-center flex-shrink-0 mt-1">
                          <Check size={11} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {!agentsLoading && (!locProvince || !locDistrict) && (
              <p className="text-xs text-slate-400 font-semibold text-center py-6">Choose province and district to see agents.</p>
            )}
          </div>
        )}

        {/* ── STEP 2B: Home delivery address ── */}
        {step === 2 && delivery === 'home' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Province and district are required so we can route your delivery. Location, sector, village, cell, and street number are optional but help couriers find you faster.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Province <span className="text-amber-500">*</span>
                </label>
                <select
                  value={homeProvince}
                  onChange={(e) => setHomeProvince(e.target.value)}
                  disabled={geoShipLoading && !provinces.length}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                >
                  <option value="">Choose…</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  District <span className="text-amber-500">*</span>
                </label>
                <select
                  value={homeDistrict}
                  onChange={(e) => setHomeDistrict(e.target.value)}
                  disabled={!homeProvince || geoShipLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                >
                  <option value="">Choose…</option>
                  {shipDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Sector <span className="text-slate-400 font-bold normal-case">(optional)</span>
                </label>
                <select
                  value={homeSector}
                  onChange={(e) => setHomeSector(e.target.value)}
                  disabled={!homeDistrict || geoShipLoading}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                >
                  <option value="">Choose sector…</option>
                  {shipSectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Location / landmark <span className="text-slate-400 font-bold normal-case">(optional)</span>
              </label>
              <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border-2 border-slate-200 focus-within:border-[#000435] bg-slate-50 transition-all min-h-[3rem]">
                <MapPin size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <textarea
                  value={homeLocation}
                  onChange={e => setHomeLocation(e.target.value)}
                  placeholder="e.g. Near the market, building name, directions…"
                  rows={2}
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-medium resize-none min-h-[2.5rem]"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Village <span className="text-slate-400 font-bold normal-case">(optional)</span>
                </label>
                <input
                  value={homeVillage}
                  onChange={e => setHomeVillage(e.target.value)}
                  placeholder="Village"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Cell <span className="text-slate-400 font-bold normal-case">(optional)</span>
                </label>
                <input
                  value={homeCell}
                  onChange={e => setHomeCell(e.target.value)}
                  placeholder="Cell"
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Street number <span className="text-slate-400 font-bold normal-case">(optional)</span>
              </label>
              <input
                value={homeStreetNumber}
                onChange={e => setHomeStreetNumber(e.target.value)}
                placeholder="House / street No."
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 outline-none focus:border-[#000435]"
              />
            </div>

            {(homeGeoLine || homeExtraParts.length > 0) ? (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200">
                <Navigation size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Address preview</p>
                  {homeGeoLine ? (
                    <p className="text-sm font-bold text-slate-700">{homeGeoLine}</p>
                  ) : null}
                  {homeExtraParts.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-600 font-semibold">
                      {homeExtraParts.map((line, i) => (
                        <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex gap-2.5">
              <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                Continue to enter your contact details, then review before payment. You can update this address anytime before confirming.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Payer details ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-2">Enter your details for the payment receipt.</p>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Full Name <span className="text-amber-500">*</span>
              </label>
              <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl border-2 border-slate-200 focus-within:border-[#000435] bg-slate-50 transition-all">
                <Users size={15} className="text-slate-400 flex-shrink-0" />
                <input
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                  placeholder="Your full name"
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Phone Number <span className="text-amber-500">*</span>
              </label>
              <div className="flex items-center gap-2.5 px-3.5 h-12 rounded-xl border-2 border-slate-200 focus-within:border-[#000435] bg-slate-50 transition-all">
                <Smartphone size={15} className="text-slate-400 flex-shrink-0" />
                <input
                  value={payerPhone}
                  onChange={e => setPayerPhone(e.target.value)}
                  placeholder="078 000 0000"
                  inputMode="tel"
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none font-medium"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 ml-1">Used for MTN MoMo payment confirmation</p>
            </div>

            {/* Selected delivery summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Delivery Summary</p>
              {delivery === 'agent_station' ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-[#000435] flex-shrink-0" />
                    <span className="text-sm font-bold text-slate-700">{selectedAgentLabel || '—'}</span>
                  </div>
                  {pickupLocationLine ? (
                    <p className="text-xs text-slate-500 font-semibold pl-[22px]">{pickupLocationLine}</p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Home size={14} className="text-[#000435] flex-shrink-0" />
                    <span className="text-sm font-bold text-slate-700">Deliver at home</span>
                  </div>
                  {homeGeoLine ? (
                    <p className="text-xs text-slate-500 font-semibold pl-[22px]">{homeGeoLine}</p>
                  ) : null}
                  {homeExtraParts.length > 0 ? (
                    <div className="pl-[22px] space-y-0.5 text-xs text-slate-500 font-semibold">
                      {homeExtraParts.map((line, i) => (
                        <p key={`${i}-${line.slice(0, 20)}`}>{line}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Review & Confirm ── */}
        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-2">Review your order before proceeding to payment.</p>

            {/* Order card */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-[#000435]">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">Order Summary</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-500 font-semibold">Product</span>
                  <span className="text-sm font-black text-slate-800 text-right max-w-[60%]">{product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 font-semibold">Quantity</span>
                  <span className="text-sm font-black text-slate-800">× {quantity}</span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span className="text-sm text-slate-500 font-semibold flex-shrink-0">Delivery</span>
                  <span className="text-sm font-black text-slate-800 text-right">
                    {delivery === 'agent_station'
                      ? (
                        <span className="block">
                          {selectedAgentLabel || 'Agent Station'}
                          {pickupLocationLine ? <span className="block text-xs font-semibold text-slate-500 mt-0.5">{pickupLocationLine}</span> : null}
                        </span>
                      )
                      : (
                        <span className="block text-right">
                          <span className="block font-black text-slate-800">Home delivery</span>
                          {homeGeoLine ? (
                            <span className="block text-xs font-semibold text-slate-500 mt-0.5">{homeGeoLine}</span>
                          ) : null}
                          {homeExtraParts.length > 0 ? (
                            <span className="block text-xs font-semibold text-slate-500 mt-1 space-y-0.5">
                              {homeExtraParts.map((line, i) => (
                                <span key={`${i}-${line.slice(0, 20)}`} className="block">{line}</span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                      )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 font-semibold">Payer</span>
                  <span className="text-sm font-black text-slate-800">{payerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 font-semibold">Phone</span>
                  <span className="text-sm font-black text-slate-800">{payerPhone}</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                  <span className="font-black text-[#000435]">Total</span>
                  <span className="text-xl font-black text-amber-500">{formatMoney(principal)}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex gap-2.5">
              <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-semibold leading-relaxed">
                You'll choose your payment method (MTN MoMo, Airtel, Bank transfer, or Visa) on the next screen.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}
      </div>

    </ModalShell>
  );
}

/* ─────────────────────────────────────────────
   TICHA AVANCE MODAL (Step Wizard)
   Steps: 1=Plan, 2=Summary, 3=Confirm
───────────────────────────────────────────── */
function AvanceModal({ open, onClose, product, quantity, monthlyRatePercent = 3.0 }) {
  const [step, setStep] = useState(1);
  const [repayment, setRepayment] = useState(6);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState(null);
  const navigate = useNavigate();

  const TOTAL_STEPS = 3;
  const principal = Number(product?.price_rwf || 0) * quantity;
  const rate = monthlyRatePercent / 100;
  const totalInterest = principal * rate * repayment;
  const totalRepay = principal + totalInterest;
  const monthlyPayment = totalRepay / repayment;

  const exceedsMonthlyCap = useMemo(() => {
    if (!eligibility?.allowed) return false;
    const remaining = Number(eligibility.remaining_cap_rwf) || 0;
    return remaining > 0 ? principal > remaining : principal > Number(eligibility.monthly_cap_rwf || 0);
  }, [eligibility, principal]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/services/shule-avance/applicant/eligibility');
        if (!cancelled && res.data?.success) {
          setEligibility(res.data.data || null);
        }
      } catch {
        if (!cancelled) setEligibility(null);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const handleClose = () => {
    setStep(1); setRepayment(6); setError('');
    onClose();
  };

  const goNext = () => {
    setError('');
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const body = {
        request_type: 'service',
        service_category: 'teacher_deals',
        amount_requested: principal,
        repayment_term_months: repayment,
        selected_deal_product_ids: [Number(product.id)],
        metadata: {
          payment_method: 'ticha_avance',
          delivery_method: 'school',
          quantity,
          unit_price: Number(product.price_rwf),
          monthly_rate_percent: monthlyRatePercent,
          monthly_payment: monthlyPayment,
          total_repay: totalRepay,
          total_interest: totalInterest,
        }
      };
      const res = await api.post('/services/shule-avance/applicant/requests', body);
      if (res.data?.success) {
        handleClose();
        navigate('/shule-avance', {
          state: {
            avanceNotice: res.data.message
              || (res.data.exceeds_monthly_cap
                ? 'Your request exceeds the monthly limit and was sent to finance, then to your school manager.'
                : 'Ticha Avance request submitted.'),
          },
        });
      } else {
        setError(res.data?.message || 'Submission failed. Please try again.');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Choose Your Plan', 'Financial Summary', 'Confirm & Submit'];

  const avanceNextLabel =
    step === 1 ? 'Review' : step === TOTAL_STEPS ? 'Submit Request' : 'Continue';

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={stepTitles[step - 1]}
      subtitle={`Step ${step} of ${TOTAL_STEPS} · Ticha Avance`}
      headerLeading={(
        <MobileHeaderBack
          onClick={() => {
            if (step > 1) {
              setError('');
              setStep((s) => s - 1);
            } else {
              handleClose();
            }
          }}
        />
      )}
      footer={(
        <NavBtns
          hideBackOnMobile
          onBack={
            step > 1
              ? () => { setError(''); setStep((s) => s - 1); }
              : () => handleClose()
          }
          onNext={goNext}
          nextLabel={avanceNextLabel}
          nextLoading={submitting}
          nextDisabled={submitting}
        />
      )}
    >

      <StepDots total={TOTAL_STEPS} current={step} />

      {/* Product pill */}
      <div className="mx-4 sm:mx-6 mb-2 flex items-center gap-3 p-3 rounded-xl bg-[#000435]/4 border border-[#000435]/10">
        <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center flex-shrink-0">
          <ShoppingBag size={16} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-[#000435] truncate">{product?.name}</p>
          <p className="text-xs font-bold text-amber-600">Item price: {formatMoney(principal)}</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-6 pt-3 sm:pt-4 step-animate" key={step}>

        {/* ── STEP 1: Plan Selection ── */}
        {step === 1 && (
          <div>
            <p className="text-sm text-slate-500 mb-5">Choose how many months you want to spread your payments.</p>

            {/* Month selector — visual pills */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">
                Repayment Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {REPAYMENT_OPTIONS.map(m => (
                  <button key={m} onClick={() => setRepayment(m)}
                    className={`py-3 rounded-xl font-black text-sm transition-all border-2 ${
                      repayment === m
                        ? 'bg-[#000435] text-white border-[#000435] shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}>
                    {m}mo
                  </button>
                ))}
              </div>
            </div>

            {/* Quick preview card */}
            <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-[#000435] to-[#001080] text-white">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-3">Preview</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-white/50 font-semibold">Per month</p>
                  <p className="text-xl font-black text-amber-400">{formatMoney(monthlyPayment)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/50 font-semibold">Total repay</p>
                  <p className="text-xl font-black text-white">{formatMoney(totalRepay)}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Rate</span>
                  <span className="font-bold text-white">{monthlyRatePercent}% / month</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Financial Summary ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-2">
              Here's a full breakdown of your financing plan.
            </p>

            {/* Main breakdown card */}
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <div className="bg-[#000435] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">Payment Breakdown</p>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex justify-between items-center px-4 py-3.5">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Item Price</p>
                    <p className="text-xs text-slate-400">× {quantity} unit{quantity > 1 ? 's' : ''}</p>
                  </div>
                  <span className="font-black text-[#000435]">{formatMoney(principal)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3.5">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Interest</p>
                    <p className="text-xs text-slate-400">{monthlyRatePercent}% × {repayment} months</p>
                  </div>
                  <span className="font-black text-amber-500">{formatMoney(totalInterest)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3.5 bg-slate-50">
                  <div>
                    <p className="text-sm font-black text-[#000435]">Total to Repay</p>
                    <p className="text-xs text-slate-400">Over {repayment} months</p>
                  </div>
                  <span className="font-black text-[#000435] text-lg">{formatMoney(totalRepay)}</span>
                </div>
              </div>
            </div>

            {/* Monthly payment highlight */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-[#000435]">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={16} />
                <p className="text-[10px] font-black uppercase tracking-wider">Monthly Deduction from Payroll</p>
              </div>
              <p className="text-4xl font-black tracking-tight">{formatMoney(monthlyPayment)}</p>
              <p className="text-sm font-bold opacity-70 mt-1">Every month for {repayment} months</p>
            </div>

            {/* Month-by-month schedule */}
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">Payment Schedule</p>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-3 px-4 py-2 bg-slate-50 border-b border-slate-200">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Month</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Payment</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Balance</span>
                </div>
                <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100">
                  {Array.from({ length: repayment }).map((_, i) => {
                    const remaining = Math.max(0, totalRepay - monthlyPayment * (i + 1));
                    return (
                      <div key={i} className="grid grid-cols-3 px-4 py-2.5">
                        <span className="text-xs font-bold text-slate-600">Month {i + 1}</span>
                        <span className="text-xs font-black text-amber-600 text-center">{formatMoney(monthlyPayment)}</span>
                        <span className="text-xs font-bold text-slate-500 text-right">
                          {i === repayment - 1 ? '—' : formatMoney(remaining)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex gap-2.5">
              <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                Monthly payments are automatically deducted from your payroll. No manual action needed after approval.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: Confirm ── */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-2">Review and confirm your Ticha Avance financing request.</p>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#000435] px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">Final Summary</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Product</span>
                  <span className="font-black text-slate-800 text-right max-w-[55%]">{product?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Item price</span>
                  <span className="font-black text-slate-800">{formatMoney(principal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Total interest</span>
                  <span className="font-black text-amber-600">{formatMoney(totalInterest)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Total repayable</span>
                  <span className="font-black text-[#000435]">{formatMoney(totalRepay)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-semibold">Duration</span>
                  <span className="font-black text-slate-800">{repayment} months</span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                  <span className="font-black text-[#000435]">Monthly payment</span>
                  <span className="text-2xl font-black text-amber-500">{formatMoney(monthlyPayment)}</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-2.5">
              <Shield size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 font-semibold leading-relaxed">
                {exceedsMonthlyCap
                  ? `This amount exceeds your ${eligibility?.max_percent ?? 20}% monthly limit (${formatMoney(eligibility?.remaining_cap_rwf ?? 0)} remaining). Your request will go to the accountant, then to your school manager for approval.`
                  : 'By submitting, you agree to the monthly payroll deduction schedule. School finance will approve and process your request.'}
              </p>
            </div>
            {exceedsMonthlyCap && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex gap-2.5">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                  Over-limit requests are not blocked — they require finance review before the school manager decides.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            <AlertCircle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}
      </div>

    </ModalShell>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE: TichaDealDetails
───────────────────────────────────────────── */
export default function TichaDealDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { teacher } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [monthlyRatePercent, setMonthlyRatePercent] = useState(3.00);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Modal state
  const [showDirectPay, setShowDirectPay] = useState(false);
  const [showAvance, setShowAvance] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/services/shule-avance/catalog'),
        api.get('/services/shule-avance/teacher-deal-products'),
      ]);
      if (catRes.data?.success && catRes.data.data) {
        const services = Array.isArray(catRes.data.data.services) ? catRes.data.data.services : [];
        const dealService = services.find(s => s.slug === 'teacher_deals');
        if (dealService?.income_rate_percent) setMonthlyRatePercent(Number(dealService.income_rate_percent));
      }
      if (prodRes.data?.success) {
        const products = Array.isArray(prodRes.data.data) ? prodRes.data.data : [];
        const found = products.find(p => String(p.id) === String(id));
        if (found) setProduct(found);
        else setError('Product not found.');
      } else {
        setError('Failed to load products.');
      }
    } catch {
      setError('Could not load deal details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center gap-4"
        style={{ fontFamily: PAGE_FONT_FAMILY }}>
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="text-[#000435]/60 text-[10px] font-black uppercase tracking-widest">Loading Deal…</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-[#f0f2f9] flex flex-col items-center justify-center p-6 text-center"
        style={{ fontFamily: PAGE_FONT_FAMILY }}>
        <div className="w-16 h-16 bg-red-50 text-red-400 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={32} />
        </div>
        <p className="text-sm font-bold text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate('/ticha-deals')}
          className="px-6 py-3 rounded-xl bg-[#000435] text-white font-black text-sm shadow-lg">
          Back to Catalog
        </button>
      </div>
    );
  }

  const principal = Number(product?.price_rwf || 0) * quantity;
  const rate = monthlyRatePercent / 100;
  const estMonthly6 = (principal + principal * rate * 6) / 6; // preview for 6mo

  const heroSlots = product?.media?.length > 0
    ? product.media.map(m => m?.url).filter(Boolean)
    : product?.image_url ? [product.image_url] : [];
  const heroSrc = heroSlots.length ? toAssetUrl(heroSlots[Math.min(activeImageIdx, heroSlots.length - 1)]) : null;

  return (
    <>
      <div className="min-h-screen bg-[#f0f2f9] pb-12" style={{ fontFamily: PAGE_FONT_FAMILY }}>

        {/* Top nav */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <button onClick={() => navigate('/ticha-deals')}
              className="w-9 h-9 rounded-xl bg-[#000435]/6 flex items-center justify-center text-[#000435] hover:bg-[#000435]/12 transition-all">
              <ArrowLeft size={18} />
            </button>
            <span className="font-black text-[#000435] text-sm truncate flex-1">{product?.name}</span>
            <span className="font-black text-amber-500 text-sm hidden sm:block">{formatMoney(product?.price_rwf)}</span>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">

          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold">
              <AlertCircle size={16} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* ── Left: Product Info ── */}
            <div className="lg:col-span-7 space-y-5">

              {/* Image card */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 group">
                <div className="relative aspect-[4/3] bg-slate-50 flex items-center justify-center p-8 overflow-hidden">
                  {heroSrc ? (
                    <>
                      <img src={heroSrc} alt={product.name}
                        className="w-full h-full object-contain mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
                      {heroSlots.length > 1 && (
                        <>
                          {/* Dots */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 rounded-full bg-black/10 backdrop-blur-sm">
                            {heroSlots.map((_, i) => (
                              <button key={i} onClick={() => setActiveImageIdx(i)}
                                className={`rounded-full transition-all ${i === activeImageIdx ? 'w-5 h-1.5 bg-[#000435]' : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'}`} />
                            ))}
                          </div>
                          {/* Arrows */}
                          <button onClick={() => setActiveImageIdx(p => p > 0 ? p - 1 : heroSlots.length - 1)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-[#000435] opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowLeft size={16} />
                          </button>
                          <button onClick={() => setActiveImageIdx(p => p < heroSlots.length - 1 ? p + 1 : 0)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm shadow-md flex items-center justify-center text-[#000435] opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                    </>
                  ) : (
                    <Package className="h-16 w-16 text-slate-300" />
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    {product.category && (
                      <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm border border-black/5 text-[10px] font-black text-[#000435] uppercase tracking-wider shadow-sm">
                        {product.category}
                      </span>
                    )}
                    {product.product_code && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#000435] text-white text-[10px] font-bold tracking-wider shadow-sm">
                        {product.product_code}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Partner */}
              {product.partner_org_name && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-black/5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-slate-50 border border-black/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {product.partner_org_logo
                      ? <img src={toAssetUrl(product.partner_org_logo)} alt={product.partner_org_name} className="w-full h-full object-cover" />
                      : <ShoppingBag className="w-7 h-7 text-slate-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 size={10} /> Verified
                      </span>
                    </div>
                    <h3 className="font-black text-[#000435] text-sm">{product.partner_org_name}</h3>
                    {product.partner_org_login && <p className="text-xs text-slate-400 mt-0.5">@{product.partner_org_login}</p>}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <h1 className="text-2xl font-black text-[#000435] leading-tight mb-2">
                  {product.name}
                </h1>
                <p className="text-3xl font-black text-amber-500 mb-6">{formatMoney(product.price_rwf)}</p>

                {product.description && (
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-3">
                      Description
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}
              </div>

              {/* Avance preview card — mobile only show, desktop in sidebar */}
              <div className="lg:hidden bg-gradient-to-br from-[#000435] to-[#001080] rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={16} className="text-amber-400" />
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Ticha Avance Option</p>
                </div>
                <p className="text-xs text-white/60 mb-3">Pay in installments from your payroll</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/50">From just</p>
                    <p className="text-2xl font-black text-amber-400">{formatMoney(estMonthly6)}</p>
                    <p className="text-[10px] text-white/50">/month for 6 months</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-white/50">Rate</p>
                    <p className="text-sm font-black text-white">{monthlyRatePercent}%</p>
                    <p className="text-[10px] text-white/50">per month</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: Checkout Sidebar ── */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5 lg:sticky lg:top-20 space-y-5">

                {/* Price + Qty */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Price</p>
                  <p className="text-3xl font-black text-[#000435]">
                    {formatMoney(product.price_rwf)}
                  </p>
                  {quantity > 1 && (
                    <p className="text-sm text-amber-600 font-bold mt-1">Total: {formatMoney(principal)}</p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Quantity</label>
                    {product.max_quantity && (
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        Max {product.max_quantity}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-fit">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#000435] font-black text-lg shadow-sm hover:bg-slate-100 active:scale-90 transition-all">
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-black text-[#000435]">{quantity}</span>
                    <button onClick={() => setQuantity(q => product.max_quantity ? Math.min(product.max_quantity, q + 1) : q + 1)}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#000435] font-black text-lg shadow-sm hover:bg-slate-100 active:scale-90 transition-all">
                      +
                    </button>
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* CTA Buttons */}
                <div className="space-y-3">
                  {/* Direct Pay */}
                  <button onClick={() => setShowDirectPay(true)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-[#000435] text-white
                    hover:bg-[#000c70] transition-all shadow-lg shadow-[#000435]/20 active:scale-[.98] group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                        <Smartphone size={18} className="text-amber-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm">Pay Directly</p>
                        <p className="text-[11px] text-white/60">MTN, Airtel, Bank, Visa</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Ticha Avance */}
                  <button onClick={() => setShowAvance(true)}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-2xl
                    bg-gradient-to-r from-amber-400 to-amber-500 text-[#000435]
                    hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-400/25 active:scale-[.98] group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#000435]/10 flex items-center justify-center">
                        <TrendingUp size={18} className="text-[#000435]" />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-sm">Ticha Avance</p>
                        <p className="text-[11px] text-[#000435]/60">Pay monthly from payroll</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#000435]/40 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Avance teaser — desktop only */}
                <div className="hidden lg:block bg-[#000435]/4 rounded-2xl p-4 border border-[#000435]/8">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-amber-500" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Avance Preview</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">From (6 months)</p>
                      <p className="text-base font-black text-amber-500">{formatMoney(estMonthly6)}<span className="text-[10px] text-slate-400 font-bold">/mo</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold">Interest rate</p>
                      <p className="text-base font-black text-[#000435]">{monthlyRatePercent}%<span className="text-[10px] text-slate-400 font-bold">/mo</span></p>
                    </div>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                    <Shield size={11} className="text-slate-400" /> Secure
                  </span>
                  <span className="text-slate-200">·</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                    <CheckCircle2 size={11} className="text-slate-400" /> Rwanda 🇷🇼
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <DirectPayModal
        open={showDirectPay}
        onClose={() => setShowDirectPay(false)}
        product={product}
        quantity={quantity}
        teacher={teacher}
      />
      <AvanceModal
        open={showAvance}
        onClose={() => setShowAvance(false)}
        product={product}
        quantity={quantity}
        monthlyRatePercent={monthlyRatePercent}
      />
    </>
  );
}