/**
 * LoginPortalSelect.jsx
 * Landing portal chooser — ShuleManager Lite vs Pro (light page: white + navy + amber).
 * Montserrat · fully responsive 320px → 2560px
 */

import { Link } from "react-router-dom";
import {
  GraduationCap, Zap, Crown, ArrowRight, Check,
  Sparkles, Shield, Globe, BarChart3,
  Users, Smartphone, Lock, Star, X, LogIn,
} from "lucide-react";
import BabyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

/* ─── style injection ─────────────────────────────────────────── */
const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy:   #000435;
      --navy2:  #000c6b;
      --navy3:  #000120;
      --amber:  #FBBF24;
      --amber2: #F59E0B;
      --amber3: #FDE68A;
      --white:  #FFFFFF;
    }

    .lps-root {
      font-family: 'Montserrat', sans-serif;
      min-height: 100svh;
      background: #ffffff;
      color: var(--navy);
      overflow-x: hidden;
      position: relative;
    }

    /* ── navbar ── */
    .lps-nav {
      position: relative;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 clamp(1rem, 4vw, 3rem);
      height: 64px;
      border-bottom: 1px solid rgba(251,191,36,0.18);
      background: var(--navy);
    }
    .lps-nav-logo { height: 36px; object-fit: contain; display: block; }
    .lps-nav-back {
      display: flex; align-items: center; gap: 7px;
      font-size: 12px; font-weight: 700;
      color: rgba(255,255,255,0.72);
      text-decoration: none;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      transition: color 0.2s, border-color 0.2s, background 0.2s;
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.04);
    }
    .lps-nav-back:hover {
      color: var(--amber);
      border-color: rgba(251,191,36,0.45);
      background: rgba(251,191,36,0.08);
    }

    /* ── main ── */
    .lps-main {
      position: relative;
      z-index: 1;
      max-width: 1320px;
      margin: 0 auto;
      padding: clamp(2.5rem, 6vw, 5rem) clamp(1rem, 4vw, 3rem) clamp(2rem, 5vw, 4rem);
    }

    /* ── hero text ── */
    .lps-hero { text-align: center; margin-bottom: clamp(2.5rem, 5vw, 4.5rem); }
    .lps-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 10px; font-weight: 800;
      letter-spacing: 0.22em; text-transform: uppercase;
      color: var(--amber);
      background: rgba(251,191,36,0.08);
      border: 1px solid rgba(251,191,36,0.22);
      border-radius: 99px;
      padding: 6px 16px;
      margin-bottom: 1.25rem;
    }
    .lps-title {
      font-size: clamp(2rem, 5.5vw, 4rem);
      font-weight: 900;
      line-height: 1.07;
      letter-spacing: -0.03em;
      margin-bottom: 1rem;
      color: var(--navy);
    }
    .lps-title span {
      background: linear-gradient(135deg, #FBBF24, #FDE68A, #F59E0B);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .lps-sub {
      font-size: clamp(14px, 1.8vw, 17px);
      font-weight: 500;
      color: rgba(0,4,53,0.62);
      max-width: 520px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* ── cards grid ── */
    .lps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr));
      gap: clamp(1rem, 2.5vw, 1.75rem);
      align-items: stretch;
    }

    /* ── card base ── */
    .lps-card {
      position: relative;
      border-radius: 28px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s;
      outline: none;
      text-decoration: none;
    }
    .lps-card:hover  { transform: translateY(-6px); }
    .lps-card:active { transform: translateY(-2px) scale(0.99); }

    /* ── LITE card ── */
    .lps-card-lite {
      background: #f8fafc;
      border: 1.5px solid rgba(0,4,53,0.12);
      box-shadow: 0 8px 32px rgba(0,4,53,0.06);
    }
    .lps-card-lite:hover {
      border-color: rgba(251,191,36,0.75);
      box-shadow: 0 20px 48px rgba(251,191,36,0.2), 0 8px 24px rgba(0,4,53,0.08);
    }

    /* ── PRO card ── */
    .lps-card-pro {
      background: linear-gradient(145deg, #000c6b 0%, #000435 55%, #000120 100%);
      border: 1.5px solid rgba(251,191,36,0.35);
      box-shadow: 0 8px 40px rgba(0,4,53,0.5), 0 0 0 1px rgba(251,191,36,0.1);
    }
    .lps-card-pro:hover {
      border-color: var(--amber);
      box-shadow: 0 28px 70px rgba(251,191,36,0.22), 0 8px 24px rgba(0,0,0,0.4);
    }

    /* PRO glow ring */
    .lps-card-pro::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: 28px;
      padding: 1.5px;
      background: linear-gradient(135deg, rgba(251,191,36,0.6), rgba(251,191,36,0.05), rgba(251,191,36,0.4));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .lps-card-pro:hover::before { opacity: 1; }

    /* ── card inner ── */
    .lps-card-inner {
      padding: clamp(1.75rem, 3.5vw, 2.5rem);
      display: flex;
      flex-direction: column;
      gap: 0;
      height: 100%;
    }

    /* badge */
    .lps-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
      border-radius: 99px; padding: 5px 12px;
      margin-bottom: 1.5rem;
      width: fit-content;
    }
    .lps-badge-lite {
      background: rgba(251,191,36,0.12);
      border: 1px solid rgba(251,191,36,0.35);
      color: var(--navy);
    }
    .lps-badge-pro {
      background: rgba(251,191,36,0.14);
      border: 1px solid rgba(251,191,36,0.4);
      color: var(--amber);
    }

    /* icon */
    .lps-icon-wrap {
      width: clamp(52px,6vw,64px); height: clamp(52px,6vw,64px);
      border-radius: 18px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1.5rem;
      flex-shrink: 0;
    }
    .lps-icon-lite {
      background: rgba(251,191,36,0.12);
      border: 1.5px solid rgba(0,4,53,0.12);
    }
    .lps-icon-pro {
      background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(251,191,36,0.06));
      border: 1.5px solid rgba(251,191,36,0.35);
    }

    /* name + tagline */
    .lps-card-name {
      font-size: clamp(1.4rem, 2.8vw, 2rem);
      font-weight: 900;
      letter-spacing: -0.025em;
      line-height: 1.1;
      margin-bottom: 0.5rem;
    }
    .lps-card-name-lite { color: var(--navy); }
    .lps-card-name-pro  {
      background: linear-gradient(135deg, #FBBF24 0%, #FDE68A 50%, #F59E0B 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }

    .lps-card-tag {
      font-size: clamp(12px, 1.4vw, 14px);
      font-weight: 500;
      color: rgba(0,4,53,0.58);
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .lps-card-pro .lps-card-tag { color: rgba(255,255,255,0.5); }

    /* divider */
    .lps-divider {
      height: 1px;
      margin-bottom: 1.75rem;
      background: rgba(0,4,53,0.1);
    }
    .lps-card-pro .lps-divider { background: rgba(251,191,36,0.14); }

    /* features */
    .lps-features { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2rem; flex: 1; }
    .lps-feature {
      display: flex; align-items: flex-start; gap: 11px;
      font-size: clamp(12px, 1.3vw, 13.5px);
      font-weight: 600;
      color: rgba(0,4,53,0.78);
      line-height: 1.45;
    }
    .lps-feature-icon {
      width: 20px; height: 20px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 1px;
    }
    .lps-feature-icon-lite { background: rgba(251,191,36,0.15); border: 1px solid rgba(0,4,53,0.06); }
    .lps-feature-icon-pro  { background: rgba(251,191,36,0.12); }
    .lps-card-pro .lps-feature { color: rgba(255,255,255,0.72); }

    /* CTA button */
    .lps-cta {
      width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      border-radius: 16px;
      padding: clamp(14px, 1.8vw, 17px) 24px;
      font-family: 'Montserrat', sans-serif;
      font-size: clamp(13px, 1.3vw, 14.5px);
      font-weight: 800;
      letter-spacing: 0.02em;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.25s cubic-bezier(.22,1,.36,1);
      position: relative;
      overflow: hidden;
    }
    .lps-cta::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 60%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
      transform: skewX(-20deg);
      transition: left 0.5s;
    }
    .lps-cta:hover::after { left: 130%; }

    .lps-cta-lite {
      background: var(--navy);
      border: 1.5px solid var(--navy);
      color: #ffffff;
    }
    .lps-cta-lite:hover {
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      border-color: transparent;
      color: var(--navy);
      transform: translateY(-1px);
      box-shadow: 0 10px 28px rgba(251,191,36,0.45);
    }

    .lps-cta-pro {
      background: linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%);
      color: var(--navy);
      box-shadow: 0 6px 24px rgba(251,191,36,0.35);
    }
    .lps-cta-pro:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 36px rgba(251,191,36,0.5);
      filter: brightness(1.05);
    }

    /* ── PRO POPULAR ribbon ── */
    .lps-ribbon {
      position: absolute;
      top: 22px; right: -32px;
      width: 130px;
      background: var(--amber);
      color: var(--navy);
      font-size: 8px; font-weight: 900;
      letter-spacing: 0.14em; text-transform: uppercase;
      text-align: center;
      padding: 6px 0;
      transform: rotate(38deg);
      transform-origin: center;
      z-index: 2;
    }

    /* ── compare section ── */
    .lps-compare { margin-top: clamp(2.5rem, 5vw, 4rem); }
    .lps-compare-title {
      text-align: center;
      font-size: clamp(10px, 1.1vw, 11px);
      font-weight: 800;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: rgba(0,4,53,0.45);
      margin-bottom: 1.5rem;
    }
    .lps-compare-grid {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 0;
      background: #f8fafc;
      border: 1px solid rgba(0,4,53,0.12);
      border-radius: 20px;
      overflow: hidden;
    }
    .lps-cg-header {
      display: contents;
    }
    .lps-cg-h {
      padding: 14px 20px;
      font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
      border-bottom: 1px solid rgba(0,4,53,0.1);
    }
    .lps-cg-h:nth-child(1) { color: rgba(0,4,53,0.5); }
    .lps-cg-h:nth-child(2) {
      text-align: center; color: rgba(0,4,53,0.65);
      border-left: 1px solid rgba(0,4,53,0.1);
      min-width: 80px;
    }
    .lps-cg-h:nth-child(3) {
      text-align: center; color: var(--amber2);
      border-left: 1px solid rgba(251,191,36,0.35);
      background: rgba(251,191,36,0.1);
      min-width: 80px;
    }
    .lps-cg-row { display: contents; }
    .lps-cg-cell {
      padding: 12px 20px;
      font-size: clamp(11px, 1.2vw, 13px); font-weight: 600;
      border-bottom: 1px solid rgba(0,4,53,0.06);
      display: flex; align-items: center;
    }
    .lps-cg-row:last-child .lps-cg-cell { border-bottom: none; }
    .lps-cg-cell:nth-child(1) { color: rgba(0,4,53,0.82); }
    .lps-cg-cell:nth-child(2) {
      justify-content: center;
      border-left: 1px solid rgba(0,4,53,0.08);
    }
    .lps-cg-cell:nth-child(3) {
      justify-content: center;
      border-left: 1px solid rgba(251,191,36,0.25);
      background: rgba(251,191,36,0.06);
    }
    .lps-tick { color: #15803d; font-size: 15px; }
    .lps-cross { color: rgba(0,4,53,0.28); font-size: 15px; }
    .lps-amber-tick { color: var(--amber); font-size: 15px; }

    /* ── footer note ── */
    .lps-footer-note {
      text-align: center;
      margin-top: clamp(1.75rem, 3vw, 2.5rem);
      font-size: 11px; font-weight: 600;
      color: rgba(0,4,53,0.45);
      letter-spacing: 0.04em;
    }
    .lps-footer-note a { color: var(--amber2); text-decoration: none; font-weight: 700; }
    .lps-footer-note a:hover { color: var(--navy); text-decoration: underline; }

    /* ── MOBILE SPECIFIC ── */
    @media (max-width: 600px) {
      .lps-compare-grid { display: none; } /* hide on very small — already covered by cards */
      .lps-card { border-radius: 22px; }
    }

    /* ── animations ── */
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .au1 { animation: fade-up 0.6s 0.05s cubic-bezier(.22,1,.36,1) both; }
    .au2 { animation: fade-up 0.6s 0.15s cubic-bezier(.22,1,.36,1) both; }
    .au3 { animation: fade-up 0.6s 0.25s cubic-bezier(.22,1,.36,1) both; }
    .au4 { animation: fade-up 0.6s 0.38s cubic-bezier(.22,1,.36,1) both; }
    .au5 { animation: fade-up 0.6s 0.50s cubic-bezier(.22,1,.36,1) both; }
  `}</style>
);

/* ─── data ─────────────────────────────────────────────────────── */
const LITE_FEATURES = [
  { icon: Users,       text: "Student & staff register" },
  { icon: BarChart3,   text: "Basic attendance tracking" },
  { icon: GraduationCap, text: "Class & subject management" },
  { icon: Globe,       text: "School mini-website" },
  { icon: Shield,      text: "Fee collection & invoices" },
  { icon: Smartphone,  text: "Mobile-friendly interface" },
];

const PRO_FEATURES = [
  { icon: Crown,       text: "Everything in Lite, unlocked" },
  { icon: BarChart3,   text: "Advanced analytics & reports" },
  { icon: Zap,         text: "AI-powered insights & alerts" },
  { icon: Lock,        text: "Multi-role staff permissions" },
  { icon: Star,        text: "Discipline & marks system" },
  { icon: Sparkles,    text: "ShuleAvance payroll & HR" },
  { icon: Globe,       text: "Multi-branch school support" },
  { icon: Shield,      text: "Priority support & SLA" },
];

const COMPARE_ROWS = [
  { label: "Student register & profiles",  lite: true,  pro: true },
  { label: "Fee collection & invoices",    lite: true,  pro: true },
  { label: "School mini-website",          lite: true,  pro: true },
  { label: "Basic attendance",             lite: true,  pro: true },
  { label: "Advanced analytics & AI",      lite: false, pro: true },
  { label: "Discipline marks system",      lite: false, pro: true },
  { label: "Multi-role permissions",       lite: false, pro: true },
  { label: "Payroll & HR (ShuleAvance)",   lite: false, pro: true },
  { label: "Priority support",             lite: false, pro: true },
];

/* ─── component ────────────────────────────────────────────────── */
export default function LoginPortalSelect() {
  return (
    <>
      <Styles />
      <div className="lps-root">

        {/* navbar */}
        <nav className="lps-nav">
          <Link to="/">
            <img src={BabyeyiLogo} alt="Babyeyi" className="lps-nav-logo"
              onError={e => { e.currentTarget.src = "/1BABYEYI LOGO FINAL.png"; }} />
          </Link>
          <Link to="/" className="lps-nav-back">
            <X size={13} /> Back to home
          </Link>
        </nav>

        {/* main */}
        <main className="lps-main">

          {/* hero */}
          <div className="lps-hero au1">
            <div className="lps-eyebrow">
              <Sparkles size={11} /> Choose your portal
            </div>
            <h1 className="lps-title">
              Sign in to <span>ShuleManager</span>
            </h1>
            <p className="lps-sub">
              Select the platform that matches your school — both run on Babyeyi's trusted infrastructure.
            </p>
          </div>

          {/* cards */}
          <div className="lps-grid au2">

            {/* ── LITE ── */}
            <div
              className="lps-card lps-card-lite"
            >
              <div className="lps-card-inner">
                <div className="lps-badge lps-badge-lite">
                  <Zap size={10} /> Lite
                </div>

                <div className="lps-icon-wrap lps-icon-lite">
                  <GraduationCap size={28} color="#000435" />
                </div>

                <div className="lps-card-name lps-card-name-lite">ShuleManager<br />Lite</div>
                <p className="lps-card-tag">
                  Smart, fast, and simple — all the essentials for everyday school management.
                </p>

                <div className="lps-divider" />

                <div className="lps-features">
                  {LITE_FEATURES.map(({ icon: Icon, text }) => (
                    <div className="lps-feature" key={text}>
                      <div className="lps-feature-icon lps-feature-icon-lite">
                        <Check size={11} color="#000435" strokeWidth={2.5} />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>

                <Link to="/login/lite" className="lps-cta lps-cta-lite">
                  <LogIn size={16} strokeWidth={2.5} />
                  Sign in — Lite portal
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* ── PRO ── */}
            <div
              className="lps-card lps-card-pro"
            >
              {/* popular ribbon */}
              <div className="lps-ribbon">Most Popular</div>

              <div className="lps-card-inner">
                <div className="lps-badge lps-badge-pro">
                  <Crown size={10} /> Pro · Premium
                </div>

                <div className="lps-icon-wrap lps-icon-pro">
                  <Crown size={28} color="#FBBF24" />
                </div>

                <div className="lps-card-name lps-card-name-pro">ShuleManager<br />Pro</div>
                <p className="lps-card-tag">
                  Full power — AI insights, payroll, discipline, multi-role access and beyond.
                </p>

                <div className="lps-divider" />

                <div className="lps-features">
                  {PRO_FEATURES.map(({ icon: Icon, text }) => (
                    <div className="lps-feature" key={text}>
                      <div className="lps-feature-icon lps-feature-icon-pro">
                        <Check size={11} color="#FBBF24" strokeWidth={2.5} />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>

                <Link to="/login/pro" className="lps-cta lps-cta-pro">
                  <Crown size={16} strokeWidth={2.5} />
                  Sign in — Pro portal
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          {/* compare table */}
          <div className="lps-compare au4">
            <p className="lps-compare-title">Feature comparison</p>
            <div className="lps-compare-grid">
              <div className="lps-cg-header">
                <div className="lps-cg-h">Feature</div>
                <div className="lps-cg-h">Lite</div>
                <div className="lps-cg-h">Pro</div>
              </div>
              {COMPARE_ROWS.map(({ label, lite, pro }) => (
                <div className="lps-cg-row" key={label}>
                  <div className="lps-cg-cell">{label}</div>
                  <div className="lps-cg-cell">
                    {lite
                      ? <Check size={16} className="lps-tick" strokeWidth={2.5} />
                      : <X size={14} className="lps-cross" strokeWidth={2} />}
                  </div>
                  <div className="lps-cg-cell">
                    {pro
                      ? <Check size={16} className="lps-amber-tick" strokeWidth={2.5} />
                      : <X size={14} className="lps-cross" strokeWidth={2} />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* footer note */}
          <p className="lps-footer-note au5">
            Not sure which to choose? <Link to="/schools">Browse schools</Link> · © {new Date().getFullYear()} Babyeyi Rwanda
          </p>

        </main>
      </div>
    </>
  );
}