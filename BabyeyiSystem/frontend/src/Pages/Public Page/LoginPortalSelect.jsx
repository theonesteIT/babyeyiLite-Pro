/**
 * LoginPortalSelect.jsx
 * ShuleManager Lite vs Pro portal chooser — matches public marketing layout.
 */

import { Link } from "react-router-dom";
import {
  GraduationCap, Zap, Crown, ArrowRight, Check,
  Sparkles, Shield, Globe, BarChart3,
  Users, Calendar, CreditCard,
  Headphones, ClipboardCheck, X, LogIn,
  Building2, ArrowLeft, UserCog,
} from "lucide-react";
import BabyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --navy:   #000435;
      --navy2:  #000c6b;
      --amber:  #FBBF24;
      --amber2: #F59E0B;
    }

    .lps-root {
      font-family: 'Montserrat', sans-serif;
      min-height: 100svh;
      background: #ffffff;
      color: var(--navy);
      overflow-x: hidden;
      position: relative;
    }

    .lps-bg-pattern {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 0;
      opacity: 0.45;
      background-image:
        linear-gradient(rgba(0,4,53,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,4,53,0.03) 1px, transparent 1px);
      background-size: 48px 48px;
    }
    .lps-bg-pattern::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(251,191,36,0.08), transparent 55%);
    }

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
      color: rgba(255,255,255,0.85);
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.05);
      transition: background 0.2s, border-color 0.2s;
    }
    .lps-nav-back:hover {
      background: rgba(251,191,36,0.1);
      border-color: rgba(251,191,36,0.35);
      color: var(--amber);
    }

    .lps-main {
      position: relative;
      z-index: 1;
      max-width: 1100px;
      margin: 0 auto;
      padding: clamp(2rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2rem) clamp(2.5rem, 5vw, 3.5rem);
    }

    .lps-hero { text-align: center; margin-bottom: clamp(2rem, 4vw, 3rem); }
    .lps-eyebrow {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 10px; font-weight: 800;
      letter-spacing: 0.2em; text-transform: uppercase;
      color: var(--amber2);
      background: rgba(251,191,36,0.1);
      border: 1px solid rgba(251,191,36,0.28);
      border-radius: 99px;
      padding: 6px 16px;
      margin-bottom: 1.1rem;
    }
    .lps-title {
      font-size: clamp(1.85rem, 4.5vw, 3.25rem);
      font-weight: 900;
      line-height: 1.1;
      letter-spacing: -0.03em;
      margin-bottom: 0.85rem;
      color: var(--navy);
    }
    .lps-title span {
      background: linear-gradient(135deg, #FBBF24, #FDE68A, #F59E0B);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .lps-sub {
      font-size: clamp(13px, 1.6vw, 16px);
      font-weight: 500;
      color: rgba(0,4,53,0.58);
      max-width: 540px;
      margin: 0 auto;
      line-height: 1.65;
    }

    .lps-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: clamp(1rem, 2vw, 1.5rem);
      align-items: stretch;
    }
    @media (min-width: 821px) {
      .lps-card-pro { z-index: 2; }
    }
    @media (max-width: 820px) {
      .lps-grid { grid-template-columns: 1fr; }
    }

    .lps-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      transition: transform 0.28s ease, box-shadow 0.28s ease;
    }
    .lps-card:hover { transform: translateY(-4px); }

    .lps-card-lite {
      background: #ffffff;
      border: 1.5px solid rgba(0,4,53,0.1);
      box-shadow: 0 4px 24px rgba(0,4,53,0.06);
    }
    .lps-card-lite:hover {
      border-color: rgba(251,191,36,0.5);
      box-shadow: 0 16px 40px rgba(251,191,36,0.12);
    }

    .lps-card-pro {
      background: linear-gradient(145deg, #FDE68A 0%, #FBBF24 38%, #F59E0B 100%);
      border: 2px solid rgba(0,4,53,0.12);
      box-shadow:
        0 4px 6px rgba(245,158,11,0.15),
        0 20px 50px rgba(245,158,11,0.35),
        inset 0 1px 0 rgba(255,255,255,0.45);
    }
    .lps-card-pro::after {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 100% 0%, rgba(255,255,255,0.35) 0%, transparent 45%),
        radial-gradient(circle at 0% 100%, rgba(0,4,53,0.06) 0%, transparent 50%);
      pointer-events: none;
    }
    .lps-card-pro:hover {
      transform: translateY(-6px);
      box-shadow:
        0 8px 12px rgba(245,158,11,0.2),
        0 28px 60px rgba(245,158,11,0.45),
        inset 0 1px 0 rgba(255,255,255,0.5);
    }
    .lps-card-pro .lps-card-inner { position: relative; z-index: 1; }

    .lps-card-inner {
      padding: clamp(1.5rem, 3vw, 2rem);
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .lps-badge {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 9px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
      border-radius: 99px; padding: 5px 12px;
      margin-bottom: 1.25rem;
      width: fit-content;
    }
    .lps-badge-lite {
      background: rgba(251,191,36,0.12);
      border: 1px solid rgba(251,191,36,0.35);
      color: var(--navy);
    }
    .lps-badge-pro {
      background: var(--navy);
      border: none;
      color: var(--amber);
    }

    .lps-icon-wrap {
      width: 56px; height: 56px;
      border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 1.25rem;
    }
    .lps-icon-lite {
      background: rgba(251,191,36,0.14);
      border: 1px solid rgba(251,191,36,0.35);
    }
    .lps-icon-pro {
      background: rgba(0,4,53,0.08);
      border: 2px solid rgba(0,4,53,0.12);
      box-shadow: 0 4px 12px rgba(0,4,53,0.08);
    }

    .lps-card-headline {
      font-size: clamp(13px, 1.45vw, 15px);
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 0.4rem;
      line-height: 1.45;
    }

    .lps-features-label {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(0,4,53,0.45);
      margin-bottom: 0.75rem;
    }
    .lps-card-pro .lps-features-label { color: rgba(0,4,53,0.55); }

    .lps-card-desc {
      font-size: clamp(11.5px, 1.2vw, 13px);
      font-weight: 500;
      color: rgba(0,4,53,0.65);
      line-height: 1.55;
      margin-bottom: 1.25rem;
      padding: 0.9rem 1rem;
      border-radius: 12px;
      background: rgba(255,255,255,0.55);
      border: 1px solid rgba(0,4,53,0.08);
    }
    .lps-card-pro .lps-card-desc {
      background: rgba(255,255,255,0.65);
      border-color: rgba(0,4,53,0.1);
      box-shadow: 0 2px 8px rgba(0,4,53,0.06);
    }

    .lps-card-name {
      font-size: clamp(1.35rem, 2.5vw, 1.75rem);
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin-bottom: 0.5rem;
    }
    .lps-card-name-lite { color: var(--navy); }
    .lps-card-name-pro { color: var(--navy); }

    .lps-card-tag {
      font-size: clamp(12px, 1.3vw, 14px);
      font-weight: 500;
      color: rgba(0,4,53,0.58);
      margin-bottom: 1.25rem;
      line-height: 1.55;
    }
    .lps-card-pro .lps-card-tag { color: rgba(0,4,53,0.72); }

    .lps-divider {
      height: 1px;
      margin-bottom: 1.25rem;
      background: rgba(0,4,53,0.1);
    }
    .lps-card-pro .lps-divider { background: rgba(0,4,53,0.12); }

    .lps-features {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      margin-bottom: 1.75rem;
      flex: 1;
    }
    .lps-feature {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(0,4,53,0.8);
      line-height: 1.4;
    }
    .lps-card-pro .lps-feature { color: rgba(0,4,53,0.88); }
    .lps-feature-icon {
      width: 20px; height: 20px;
      border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      background: rgba(251,191,36,0.25);
      border: 1px solid rgba(0,4,53,0.06);
    }
    .lps-card-pro .lps-feature-icon {
      background: rgba(0,4,53,0.1);
      border-color: rgba(0,4,53,0.12);
    }

    .lps-cta {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border-radius: 14px;
      padding: 15px 20px;
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 800;
      text-decoration: none;
      background: var(--navy);
      color: #fff;
      border: none;
      transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .lps-cta-lite:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 28px rgba(0,4,53,0.25);
      background: #000c6b;
    }

    .lps-cta-pro {
      background: var(--navy);
      color: #fff;
      box-shadow: 0 8px 24px rgba(0,4,53,0.25);
    }
    .lps-cta-pro:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 32px rgba(0,4,53,0.35);
      background: #000c6b;
    }

    .lps-ribbon {
      position: absolute;
      top: 20px; right: -34px;
      width: 140px;
      background: var(--navy);
      color: var(--amber);
      font-size: 8px; font-weight: 900;
      letter-spacing: 0.12em; text-transform: uppercase;
      text-align: center;
      padding: 7px 0;
      transform: rotate(38deg);
      z-index: 2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .lps-compare { margin-top: clamp(2.5rem, 4vw, 3.5rem); }
    .lps-compare-head {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 1.25rem;
    }
    .lps-compare-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: rgba(0,4,53,0.45);
    }

    .lps-compare-grid {
      display: grid;
      grid-template-columns: 1fr 72px 72px;
      background: #fff;
      border: 1px solid rgba(0,4,53,0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,4,53,0.05);
    }
    @media (max-width: 600px) {
      .lps-compare-grid { display: none; }
    }

    .lps-cg-h {
      padding: 14px 16px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      border-bottom: 1px solid rgba(0,4,53,0.08);
      background: #f8fafc;
    }
    .lps-cg-h:nth-child(2) {
      text-align: center;
      color: rgba(0,4,53,0.55);
      border-left: 1px solid rgba(0,4,53,0.08);
    }
    .lps-cg-h:nth-child(3) {
      text-align: center;
      color: var(--amber2);
      border-left: 1px solid rgba(251,191,36,0.25);
      background: rgba(251,191,36,0.08);
    }

    .lps-cg-row { display: contents; }

    .lps-cg-cell {
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 600;
      border-bottom: 1px solid rgba(0,4,53,0.06);
      display: flex;
      align-items: center;
      gap: 10px;
      color: rgba(0,4,53,0.82);
    }
    .lps-cg-row:last-child .lps-cg-cell { border-bottom: none; }
    .lps-cg-cell.lps-cg-mid {
      justify-content: center;
      border-left: 1px solid rgba(0,4,53,0.06);
    }
    .lps-cg-cell.lps-cg-pro {
      justify-content: center;
      border-left: 1px solid rgba(251,191,36,0.2);
      background: rgba(251,191,36,0.04);
    }
    .lps-cg-row-icon {
      width: 28px; height: 28px;
      border-radius: 8px;
      background: rgba(0,4,53,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: rgba(0,4,53,0.45);
    }
    .lps-tick { color: #16a34a; }
    .lps-amber-tick { color: var(--amber2); }
    .lps-cross { color: rgba(0,4,53,0.25); }

    .lps-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: clamp(2rem, 4vw, 2.75rem);
      padding-top: 1.5rem;
      border-top: 1px solid rgba(0,4,53,0.08);
    }
    .lps-footer-left {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(0,4,53,0.55);
    }
    .lps-footer-left a {
      color: var(--amber2);
      font-weight: 700;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .lps-footer-left a:hover { text-decoration: underline; }
    .lps-footer-copy {
      font-size: 12px;
      font-weight: 600;
      color: rgba(0,4,53,0.4);
    }

    @keyframes fade-up {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .au1 { animation: fade-up 0.55s 0.05s ease both; }
    .au2 { animation: fade-up 0.55s 0.15s ease both; }
    .au3 { animation: fade-up 0.55s 0.28s ease both; }
    .au4 { animation: fade-up 0.55s 0.4s ease both; }
  `}</style>
);

const LITE_FEATURES = [
  "Babyeyi Wizard Setup",
  "Student & Staff Register",
  "Attendance Tracking",
  "School Mini Website",
  "TichaAvance",
  "TichaDeals",
  "Mobile-Friendly Interface",
];

const PRO_FEATURES = [
  "Everything in Babyeyi Lite",
  "Babyeyi Wizard",
  "Tuition & Paid-at-School Payments",
  "Advanced Analytics & Reports",
  "Attendance Management",
  "Multi-Role Staff Permissions",
  "Discipline & Marks System",
  "ShuleAvance Payroll & HR",
  "TichaDeals",
  "Multi-Branch School Support",
  "Priority Support & SLA",
];

const COMPARE_ROWS = [
  { label: "Student & Staff Register", icon: GraduationCap, lite: true, pro: true },
  { label: "School Mini Website", icon: Globe, lite: true, pro: true },
  { label: "Basic Attendance Tracking", icon: Calendar, lite: true, pro: true },
  { label: "TichaAvance & TichaDeals", icon: Sparkles, lite: true, pro: true },
  { label: "Tuition & Paid-at-School Pay", icon: CreditCard, lite: false, pro: true },
  { label: "Attendance Management", icon: ClipboardCheck, lite: false, pro: true },
  { label: "Advanced Analytics & Reports", icon: BarChart3, lite: false, pro: true },
  { label: "Discipline & Marks System", icon: Shield, lite: false, pro: true },
  { label: "Multi-Role Permissions", icon: Users, lite: false, pro: true },
  { label: "Payroll & HR (ShuleAvance)", icon: UserCog, lite: false, pro: true },
  { label: "Priority Support & SLA", icon: Headphones, lite: false, pro: true },
];

export default function LoginPortalSelect() {
  return (
    <>
      <Styles />
      <div className="lps-root">
        <div className="lps-bg-pattern" aria-hidden />

        <nav className="lps-nav">
          <Link to="/">
            <img
              src={BabyeyiLogo}
              alt="Babyeyi"
              className="lps-nav-logo"
              onError={(e) => { e.currentTarget.src = "/1BABYEYI LOGO FINAL.png"; }}
            />
          </Link>
          <Link to="/" className="lps-nav-back">
            <ArrowLeft size={14} strokeWidth={2.5} />
            Back to Home
          </Link>
        </nav>

        <main className="lps-main">
          <div className="lps-hero au1">
            <div className="lps-eyebrow">
              <Sparkles size={11} /> Choose your portal
            </div>
            <h1 className="lps-title">
              Sign in to <span>ShuleManager</span>
            </h1>
            <p className="lps-sub">
              Select the platform that matches your school — both run on Babyeyi&apos;s trusted infrastructure.
            </p>
          </div>

          <div className="lps-grid au2">
            {/* LITE */}
            <div className="lps-card lps-card-lite">
              <div className="lps-card-inner">
                <div className="lps-badge lps-badge-lite">
                  <Zap size={10} /> Babyeyi Lite
                </div>
                <div className="lps-icon-wrap lps-icon-lite">
                  <GraduationCap size={26} color="#000435" strokeWidth={2} />
                </div>
                <div className="lps-card-name lps-card-name-lite">Babyeyi Lite</div>
                <p className="lps-card-headline">
                  Smart, simple, and affordable school management
                </p>
                <p className="lps-card-tag">
                  Perfect for small and growing schools that need essential daily management tools.
                </p>
                <div className="lps-divider" />
                <p className="lps-features-label">Features</p>
                <div className="lps-features">
                  {LITE_FEATURES.map((text) => (
                    <div className="lps-feature" key={text}>
                      <div className="lps-feature-icon">
                        <Check size={11} color="#000435" strokeWidth={2.5} />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>
                <p className="lps-card-desc">
                  Simple tools to manage students, staff, attendance, and communication from anywhere.
                </p>
                <Link to="/login/lite" className="lps-cta lps-cta-lite">
                  <LogIn size={16} strokeWidth={2.5} />
                  Sign in — Lite Portal
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* PRO */}
            <div className="lps-card lps-card-pro">
              <div className="lps-ribbon">Most Popular</div>
              <div className="lps-card-inner">
                <div className="lps-badge lps-badge-pro">
                  <Crown size={10} /> Babyeyi Pro
                </div>
                <div className="lps-icon-wrap lps-icon-pro">
                  <Crown size={26} color="#000435" strokeWidth={2} />
                </div>
                <div className="lps-card-name lps-card-name-pro">Babyeyi Pro</div>
                <p className="lps-card-headline">
                  Complete digital transformation for modern schools
                </p>
                <p className="lps-card-tag">
                  Designed for advanced schools needing finance, HR, analytics, and multi-role management.
                </p>
                <div className="lps-divider" />
                <p className="lps-features-label">Features</p>
                <div className="lps-features">
                  {PRO_FEATURES.map((text) => (
                    <div className="lps-feature" key={text}>
                      <div className="lps-feature-icon">
                        <Check size={11} color="#000435" strokeWidth={2.5} />
                      </div>
                      {text}
                    </div>
                  ))}
                </div>
                <p className="lps-card-desc">
                  Full power for finance, staff, discipline, payroll, reporting, and large school operations.
                </p>
                <Link to="/login/pro" className="lps-cta lps-cta-pro">
                  <Crown size={16} strokeWidth={2.5} />
                  Sign in — Pro Portal
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature comparison */}
          <div className="lps-compare au3">
            <div className="lps-compare-head">
              <BarChart3 size={14} className="text-amber-500" strokeWidth={2.5} />
              <p className="lps-compare-title">Feature comparison</p>
            </div>
            <div className="lps-compare-grid">
              <div className="lps-cg-h">Feature</div>
              <div className="lps-cg-h">Lite</div>
              <div className="lps-cg-h">Pro</div>
              {COMPARE_ROWS.map(({ label, icon: Icon, lite, pro }) => (
                <div className="lps-cg-row" key={label}>
                  <div className="lps-cg-cell">
                    <span className="lps-cg-row-icon">
                      <Icon size={14} strokeWidth={2} />
                    </span>
                    {label}
                  </div>
                  <div className="lps-cg-cell lps-cg-mid">
                    {lite ? (
                      <Check size={18} className="lps-tick" strokeWidth={2.5} />
                    ) : (
                      <X size={16} className="lps-cross" strokeWidth={2} />
                    )}
                  </div>
                  <div className="lps-cg-cell lps-cg-pro">
                    {pro ? (
                      <Check size={18} className="lps-amber-tick" strokeWidth={2.5} />
                    ) : (
                      <X size={16} className="lps-cross" strokeWidth={2} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="lps-footer au4">
            <div className="lps-footer-left">
              <Building2 size={18} className="text-amber-500 shrink-0" strokeWidth={2} />
              <span>
                Not sure which to choose?{" "}
                <Link to="/schools">
                  Browse schools
                  <ArrowRight size={14} strokeWidth={2.5} />
                </Link>
              </span>
            </div>
            <p className="lps-footer-copy">© {new Date().getFullYear()} Babyeyi Rwanda</p>
          </footer>
        </main>
      </div>
    </>
  );
}
