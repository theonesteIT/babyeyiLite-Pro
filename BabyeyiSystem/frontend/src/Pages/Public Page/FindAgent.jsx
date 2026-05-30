import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  MapPin, Phone, Mail, UserRound, Search, ShoppingBag,
  ChevronDown, X, Send, CheckCircle2, AlertCircle, Loader2,
  MessageSquarePlus, Menu, Map, Building2, Users,
  Headphones, ArrowRight, Star, Shield, Zap, ChevronRight,
} from "lucide-react";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

// ── Brand tokens ────────────────────────────────────────────────
const NAVY    = "#000435";
const AMBER   = "#FBBF24";
const AMBER50 = "#FFFBEB";
const AMBER100= "#FEF3C7";
const AMBER600= "#D97706";
const AMBER700= "#B45309";
const NAVY80  = "rgba(0,4,53,0.80)";
const NAVY50  = "rgba(0,4,53,0.50)";
const NAVY20  = "rgba(0,4,53,0.20)";
const NAVY08  = "rgba(0,4,53,0.08)";
const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/$/, "");
const API = `${API_ORIGIN}/api`;

async function getJson(url) {
  const res  = await fetch(url);
  const json = await res.json();
  if (!res.ok || json.success === false) throw new Error(json.message || "Request failed");
  return json;
}

// ── Global styles ────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Cabinet+Grotesk:wght@300;400;500;700;800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body { font-family: 'DM Sans', sans-serif; background: #F2F4F8; color: ${NAVY}; -webkit-font-smoothing: antialiased; }

  .fa-display { font-family: 'Bricolage Grotesque', sans-serif; }

  /* Navbar */
  .fa-nav { position: fixed; inset: 0 0 auto 0; z-index: 100; transition: background 0.4s, backdrop-filter 0.4s, box-shadow 0.4s; }
  .fa-nav.scrolled { background: ${NAVY} !important; box-shadow: 0 2px 32px rgba(0,4,53,0.35); }
  .fa-nav-inner { max-width: 1280px; margin: 0 auto; padding: 0 24px; height: 66px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .fa-nav-logo { display: flex; align-items: center; text-decoration: none; shrink: 0; }
  .fa-nav-logo img { height: 36px; width: auto; max-width: 140px; object-fit: contain; object-position: left; display: block; }
  @media (min-width: 640px) { .fa-nav-logo img { height: 40px; max-width: 160px; } }
  .fa-nav-links { display: flex; align-items: center; gap: 2px; }
  .fa-nav-link { padding: 7px 14px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.65); text-decoration: none; border-radius: 8px; transition: color 0.2s, background 0.2s; }
  .fa-nav-link:hover, .fa-nav-link.active { color: #fff; background: rgba(255,255,255,0.08); }
  .fa-nav-link.highlight { color: ${AMBER}; }
  .fa-nav-link.highlight:hover { color: ${AMBER}; background: rgba(251,191,36,0.12); }
  .fa-nav-cta { display: flex; align-items: center; gap: 10px; }
  .fa-nav-register { padding: 8px 16px; border-radius: 9px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); border: 1px solid rgba(255,255,255,0.18); text-decoration: none; transition: all 0.2s; }
  .fa-nav-register:hover { color: ${AMBER}; border-color: rgba(251,191,36,0.45); }
  .fa-hamburger { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); color: #fff; }
  .fa-mobile-drawer { background: #000825; border-top: 1px solid rgba(251,191,36,0.14); padding: 12px 16px 24px; display: grid; gap: 4px; }
  .fa-mobile-link { display: flex; align-items: center; padding: 13px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.72); text-decoration: none; transition: background 0.15s, color 0.15s; }
  .fa-mobile-link:hover { background: rgba(255,255,255,0.06); color: #fff; }
  .fa-mobile-link.active { color: ${AMBER}; }

  @media (max-width: 900px) {
    .fa-nav-links, .fa-nav-cta { display: none !important; }
    .fa-hamburger { display: flex !important; }
  }
  @media (min-width: 901px) {
    .fa-hamburger { display: none !important; }
    .fa-mobile-drawer { display: none !important; }
  }

  /* Hero */
  .fa-hero { background: ${NAVY}; padding-top: 66px; position: relative; overflow: hidden; }
  .fa-hero::before {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(ellipse 80% 60% at 60% -10%, rgba(251,191,36,0.12) 0%, transparent 70%),
                radial-gradient(ellipse 50% 40% at 100% 100%, rgba(251,191,36,0.06) 0%, transparent 60%);
    pointer-events: none;
  }
  .fa-hero-geo {
    position: absolute; right: -60px; top: 50%; transform: translateY(-50%);
    width: 420px; height: 420px; border-radius: 50%;
    border: 1px solid rgba(251,191,36,0.08);
    pointer-events: none;
  }
  .fa-hero-geo::before {
    content: ''; position: absolute; inset: 40px;
    border-radius: 50%; border: 1px solid rgba(251,191,36,0.06);
  }
  .fa-hero-geo::after {
    content: ''; position: absolute; inset: 80px;
    border-radius: 50%; border: 1px solid rgba(251,191,36,0.04);
  }
  .fa-hero-inner { max-width: 1280px; margin: 0 auto; padding: 60px 24px 0; position: relative; z-index: 1; }
  .fa-hero-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.28);
    border-radius: 999px; padding: 6px 14px; margin-bottom: 22px;
    animation: fadeSlideDown 0.5s ease both;
  }
  .fa-hero-badge span { font-size: 11px; font-weight: 700; color: ${AMBER}; text-transform: uppercase; letter-spacing: 0.1em; }
  .fa-hero-title {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-weight: 800; line-height: 1.06;
    font-size: clamp(2.2rem, 5.5vw, 3.6rem);
    color: #fff; margin-bottom: 16px;
    animation: fadeSlideDown 0.55s 0.1s ease both;
  }
  .fa-hero-title .accent {
    color: ${AMBER};
    position: relative;
  }
  .fa-hero-title .accent::after {
    content: ''; position: absolute; bottom: -4px; left: 0; right: 0;
    height: 3px; background: ${AMBER}; border-radius: 2px; opacity: 0.5;
  }
  .fa-hero-sub {
    color: rgba(255,255,255,0.55); line-height: 1.75; font-size: 15px;
    max-width: 520px; margin-bottom: 40px;
    animation: fadeSlideDown 0.55s 0.18s ease both;
  }

  /* Filter card */
  .fa-filter-card {
    background: #fff; border-radius: 20px 20px 0 0;
    box-shadow: 0 -4px 40px rgba(0,4,53,0.18);
    padding: 28px 28px 32px;
    animation: fadeSlideDown 0.55s 0.25s ease both;
    position: relative; z-index: 2;
  }
  .fa-filter-header { display: flex; align-items: center; gap: 12px; margin-bottom: 22px; }
  .fa-filter-icon { width: 42px; height: 42px; border-radius: 12px; background: ${AMBER50}; border: 1px solid rgba(251,191,36,0.3); display: grid; place-items: center; flex-shrink: 0; }
  .fa-filter-grid { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 14px; align-items: end; }
  @media (max-width: 860px) { .fa-filter-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 520px) { .fa-filter-grid { grid-template-columns: 1fr; } }

  /* Select */
  .fa-select-wrap { display: grid; gap: 6px; }
  .fa-select-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${NAVY50}; }
  .fa-select-inner { position: relative; }
  .fa-select {
    width: 100%; appearance: none;
    border: 1.5px solid ${NAVY08}; border-radius: 12px;
    padding: 12px 40px 12px 14px;
    font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px; color: ${NAVY};
    background: #FAFBFD; outline: none; cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .fa-select:focus { border-color: ${AMBER}; box-shadow: 0 0 0 3px rgba(251,191,36,0.15); background: #fff; }
  .fa-select:disabled { color: #aab; background: #f8fafc; cursor: not-allowed; border-color: #e8eaf0; }
  .fa-select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }

  /* Search CTA button */
  .fa-search-btn {
    height: 48px; padding: 0 22px; border: none; border-radius: 12px;
    background: ${AMBER}; color: ${NAVY};
    font-family: 'DM Sans', sans-serif; font-weight: 800; font-size: 14px;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
    white-space: nowrap; transition: box-shadow 0.2s, transform 0.15s;
    box-shadow: 0 4px 16px rgba(251,191,36,0.35);
  }
  .fa-search-btn:hover { box-shadow: 0 6px 24px rgba(251,191,36,0.5); transform: translateY(-1px); }
  .fa-search-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Steps */
  .fa-steps { display: flex; align-items: center; flex-wrap: wrap; gap: 0 4px; margin-top: 22px; padding-top: 20px; border-top: 1px solid ${NAVY08}; row-gap: 8px; }
  .fa-step { display: flex; align-items: center; gap: 7px; }
  .fa-step-num {
    width: 24px; height: 24px; border-radius: 999px;
    font-weight: 800; font-size: 10px; display: grid; place-items: center; flex-shrink: 0;
    transition: all 0.3s;
  }
  .fa-step-num.done { background: ${AMBER}; color: ${NAVY}; }
  .fa-step-num.current { background: rgba(251,191,36,0.15); color: ${AMBER600}; border: 2px solid ${AMBER}; }
  .fa-step-num.pending { background: #f0f2f5; color: ${NAVY50}; border: 1.5px solid ${NAVY08}; }
  .fa-step-label { font-size: 12px; font-weight: 600; transition: color 0.3s; }
  .fa-step-conn { width: 24px; height: 1.5px; margin: 0 4px; border-radius: 2px; flex-shrink: 0; transition: background 0.3s; }

  /* Stats bar */
  .fa-stats { display: grid; grid-template-columns: repeat(4,1fr); border-top: 1px solid ${NAVY20}; }
  .fa-stat { padding: 24px 0; display: flex; align-items: center; gap: 14px; border-right: 1px solid ${NAVY20}; }
  .fa-stat:last-child { border-right: none; }
  .fa-stat-icon { width: 46px; height: 46px; border-radius: 12px; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2); display: grid; place-items: center; flex-shrink: 0; }
  .fa-stat-val { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.5rem; font-weight: 800; color: #fff; line-height: 1; }
  .fa-stat-label { font-size: 11.5px; color: rgba(255,255,255,0.45); margin-top: 3px; font-weight: 400; }
  @media (max-width: 700px) {
    .fa-stats { grid-template-columns: repeat(2,1fr); }
    .fa-stat:nth-child(2) { border-right: none; }
    .fa-stat:nth-child(3) { border-top: 1px solid ${NAVY20}; }
    .fa-stat:nth-child(4) { border-top: 1px solid ${NAVY20}; border-right: none; }
    .fa-stat { padding: 18px 0; }
  }

  /* Main content */
  .fa-main { max-width: 1280px; margin: 0 auto; padding: 32px 24px 80px; }
  .fa-layout { display: grid; grid-template-columns: 280px 1fr; gap: 24px; align-items: start; }
  @media (max-width: 860px) { .fa-layout { grid-template-columns: 1fr; } .fa-aside-desktop { display: none !important; } }

  /* Sidebar */
  .fa-sidebar { background: #fff; border-radius: 18px; border: 1.5px solid ${NAVY08}; overflow: hidden; position: sticky; top: 82px; }
  .fa-sidebar-head { background: ${NAVY}; padding: 16px 20px; display: flex; align-items: center; gap: 10px; }
  .fa-sidebar-head-icon { width: 34px; height: 34px; border-radius: 9px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.25); display: grid; place-items: center; flex-shrink: 0; }
  .fa-sidebar-head-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 14px; font-weight: 700; color: #fff; }
  .fa-sidebar-head-sub { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .fa-sidebar-body { padding: 20px; display: grid; gap: 14px; }

  /* Results header */
  .fa-results-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; flex-wrap: wrap; gap: 10px; }
  .fa-results-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.1rem; font-weight: 700; color: ${NAVY}; }
  .fa-results-sub { font-size: 12px; color: ${NAVY50}; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
  .fa-request-area-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 10px 16px; border-radius: 11px;
    border: 1.5px solid ${AMBER}; background: ${AMBER50}; color: ${AMBER700};
    font-weight: 700; font-size: 12px; cursor: pointer;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .fa-request-area-btn:hover { background: ${AMBER100}; box-shadow: 0 2px 12px rgba(251,191,36,0.25); }

  /* Empty state */
  .fa-empty { background: #fff; border: 1.5px solid ${NAVY08}; border-radius: 20px; padding: 56px 24px; text-align: center; }
  .fa-empty-icon { width: 66px; height: 66px; border-radius: 18px; display: grid; place-items: center; margin: 0 auto 18px; }
  .fa-empty-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 1.05rem; color: ${NAVY}; margin-bottom: 8px; }
  .fa-empty-sub { font-size: 13px; color: ${NAVY50}; line-height: 1.65; max-width: 280px; margin: 0 auto; }

  /* Agent card */
  .fa-agent-card {
    background: #fff; border-radius: 18px;
    border: 1.5px solid ${NAVY08};
    overflow: hidden;
    transition: box-shadow 0.25s, transform 0.25s, border-color 0.25s;
    animation: cardIn 0.35s ease both;
  }
  .fa-agent-card:hover { box-shadow: 0 12px 40px rgba(0,4,53,0.1); transform: translateY(-3px); border-color: rgba(251,191,36,0.35); }
  .fa-agent-stripe { height: 4px; background: linear-gradient(90deg, ${NAVY} 0%, ${AMBER} 100%); }
  .fa-agent-body { padding: 18px 18px 16px; }
  .fa-agent-top { display: flex; align-items: flex-start; gap: 13px; margin-bottom: 14px; }
  .fa-agent-avatar {
    width: 50px; height: 50px; border-radius: 14px;
    background: ${NAVY}; color: ${AMBER};
    display: flex; align-items: center; justify-content: center;
    font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: 17px;
    flex-shrink: 0;
  }
  .fa-agent-name { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 16px; color: ${NAVY}; line-height: 1.2; margin-bottom: 4px; }
  .fa-agent-location { display: flex; align-items: center; gap: 4px; font-size: 12px; color: ${NAVY50}; }
  .fa-agent-badge-active { background: #f0fdf4; border: 1px solid #86efac; border-radius: 999px; padding: 3px 10px; font-size: 10px; font-weight: 700; color: #16a34a; text-transform: uppercase; white-space: nowrap; }
  .fa-agent-contacts { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 15px; }
  .fa-agent-pill {
    display: inline-flex; align-items: center; gap: 5px;
    border-radius: 999px; border: 1px solid rgba(251,191,36,0.4);
    background: ${AMBER50}; color: ${AMBER700};
    font-size: 11.5px; font-weight: 600; padding: 5px 11px;
    text-decoration: none; white-space: nowrap; transition: background 0.15s;
  }
  .fa-agent-pill:hover { background: ${AMBER100}; }
  .fa-agent-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .fa-agent-btn-support {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 11px 12px; border-radius: 11px;
    border: 1.5px solid ${AMBER}; background: ${AMBER50}; color: ${AMBER700};
    font-weight: 700; font-size: 12.5px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: background 0.15s, box-shadow 0.15s;
  }
  .fa-agent-btn-support:hover { background: ${AMBER100}; box-shadow: 0 2px 12px rgba(251,191,36,0.25); }
  .fa-agent-btn-shop {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 11px 12px; border-radius: 11px;
    background: ${NAVY}; color: ${AMBER};
    font-weight: 700; font-size: 12.5px; text-decoration: none;
    font-family: 'DM Sans', sans-serif; transition: background 0.15s, box-shadow 0.15s;
  }
  .fa-agent-btn-shop:hover { background: #0a0f5e; box-shadow: 0 4px 14px rgba(0,4,53,0.2); }

  /* Modal */
  .fa-modal-bg {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,4,53,0.60); backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .fa-modal {
    width: 100%; max-width: 480px; background: #fff; border-radius: 22px;
    overflow: hidden; box-shadow: 0 28px 80px rgba(0,4,53,0.28);
    animation: modalIn 0.24s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .fa-modal-head { background: ${NAVY}; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; }
  .fa-modal-head-left { display: flex; align-items: center; gap: 12px; }
  .fa-modal-head-icon { width: 38px; height: 38px; border-radius: 11px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.28); display: grid; place-items: center; flex-shrink: 0; }
  .fa-modal-head-title { color: #fff; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 15px; line-height: 1.2; }
  .fa-modal-head-sub { color: rgba(255,255,255,0.45); font-size: 11.5px; margin-top: 2px; }
  .fa-modal-close { width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,0.08); border: none; cursor: pointer; display: grid; place-items: center; color: #fff; transition: background 0.15s; flex-shrink: 0; }
  .fa-modal-close:hover { background: rgba(255,255,255,0.15); }
  .fa-modal-body { padding: 24px; }
  .fa-modal-success { text-align: center; padding: 16px 0; }
  .fa-modal-success-icon { width: 64px; height: 64px; border-radius: 999px; background: #f0fdf4; border: 1px solid #86efac; display: grid; place-items: center; margin: 0 auto 16px; }
  .fa-modal-success-title { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 700; font-size: 18px; color: ${NAVY}; margin-bottom: 8px; }
  .fa-modal-success-sub { font-size: 13.5px; color: ${NAVY50}; line-height: 1.65; margin-bottom: 22px; }

  /* Form elements */
  .fa-form { display: grid; gap: 14px; }
  .fa-form-label-group { display: grid; gap: 5px; }
  .fa-form-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; color: ${NAVY50}; }
  .fa-form-input {
    width: 100%; border: 1.5px solid ${NAVY08}; border-radius: 12px;
    padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 14px;
    color: ${NAVY}; background: #FAFBFD; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .fa-form-input:focus { border-color: ${AMBER}; box-shadow: 0 0 0 3px rgba(251,191,36,0.15); background: #fff; }
  .fa-form-input::placeholder { color: #C4C9D4; }
  textarea.fa-form-input { resize: vertical; min-height: 90px; }
  .fa-form-error { display: flex; gap: 8px; align-items: flex-start; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 10px 14px; }
  .fa-form-error span { font-size: 12.5px; color: #9a3412; font-weight: 500; }
  .fa-submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px; border-radius: 13px; border: none;
    background: ${AMBER}; color: ${NAVY};
    font-family: 'DM Sans', sans-serif; font-weight: 800; font-size: 14px;
    cursor: pointer; box-shadow: 0 4px 18px rgba(251,191,36,0.35);
    transition: box-shadow 0.2s, transform 0.15s;
  }
  .fa-submit-btn:hover { box-shadow: 0 6px 24px rgba(251,191,36,0.5); transform: translateY(-1px); }
  .fa-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
  .fa-close-btn {
    padding: 12px 28px; border-radius: 11px; background: ${NAVY}; color: #fff;
    border: none; font-weight: 700; font-size: 14px; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: background 0.15s;
  }
  .fa-close-btn:hover { background: #0a0f5e; }

  /* Animations */
  @keyframes fadeSlideDown {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: none; }
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.92) translateY(16px); }
    to   { opacity: 1; transform: scale(1) none; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Loading spinner */
  .fa-spin { animation: spin 0.9s linear infinite; }

  /* Tip card */
  .fa-tip { background: ${AMBER50}; border: 1px solid rgba(251,191,36,0.3); border-radius: 12px; padding: 12px 14px; font-size: 12.5px; color: ${AMBER700}; font-weight: 500; line-height: 1.5; display: flex; gap: 9px; align-items: flex-start; }

  @media (max-width: 520px) {
    .fa-hero-inner { padding: 40px 18px 0; }
    .fa-filter-card { padding: 20px 18px 24px; border-radius: 16px 16px 0 0; }
    .fa-main { padding: 24px 16px 64px; }
    .fa-agent-actions { grid-template-columns: 1fr; }
    .fa-stats .fa-stat { padding: 14px 0; }
  }
`;

// ── SelectField ──────────────────────────────────────────────────
function SelectField({ label, value, onChange, disabled, children }) {
  return (
    <div className="fa-select-wrap">
      <span className="fa-select-label">{label}</span>
      <div className="fa-select-inner">
        <select className="fa-select" value={value} onChange={onChange} disabled={disabled}>
          {children}
        </select>
        <ChevronDown size={15} color={disabled ? "#ccc" : NAVY50} className="fa-select-chevron" />
      </div>
    </div>
  );
}

// ── InputField ───────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, as: As = "input", rows }) {
  return (
    <div className="fa-form-label-group">
      {label && <span className="fa-form-label">{label}</span>}
      <As
        className="fa-form-input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  );
}

function resolveAgentSector(agent, filterSector) {
  const fromFilter = String(filterSector || "").trim();
  if (fromFilter) return fromFilter;
  if (!agent) return "";
  const sectors = Array.isArray(agent.sectors) ? agent.sectors.map((s) => String(s).trim()).filter(Boolean) : [];
  if (sectors.length) return sectors[0];
  if (agent.sector) return String(agent.sector).trim();
  if (agent.all_sectors) return "District-wide";
  return "";
}

function agentDisplaySector(agent, filterSector) {
  const s = resolveAgentSector(agent, filterSector);
  if (s === "District-wide") return agent.district || "All sectors";
  return s || filterSector || "";
}

// ── Support Modal ────────────────────────────────────────────────
function SupportModal({ agents, initialAgentId, initialAgent, province, district, sector, onClose, t }) {
  const [agentId,     setAgentId]     = useState(initialAgentId || (agents[0]?.id ? String(agents[0].id) : ""));
  const [name,        setName]        = useState("");
  const [contact,     setContact]     = useState("");
  const [description, setDescription] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [err,         setErr]         = useState("");
  const bgRef = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const selectedAgent = useMemo(
    () => agents.find((a) => String(a.id) === String(agentId)) || initialAgent || null,
    [agents, agentId, initialAgent]
  );

  const sectorForSubmit = useMemo(
    () => resolveAgentSector(selectedAgent, sector),
    [selectedAgent, sector]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!agentId || !name.trim() || !contact.trim() || !description.trim()) {
      setErr(t("findAgent.errFillRequired", { defaultValue: "Please fill in all required fields." }));
      return;
    }
    if (!province?.trim() || !district?.trim()) {
      setErr(t("findAgent.errProvinceDistrictRequired", { defaultValue: "Province and district are required. Search for agents first." }));
      return;
    }
    if (!sectorForSubmit) {
      setErr(t("findAgent.errSelectSector", { defaultValue: "Select a sector in the finder, or pick an agent assigned to a specific sector." }));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/public/agents/support-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_user_id: Number(agentId),
          requester_name: name.trim(),
          requester_contact: contact.trim(),
          requester_description: description.trim(),
          province: province.trim(),
          district: district.trim(),
          sector: sectorForSubmit,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || t("findAgent.errFailedSubmit", { defaultValue: "Failed to submit." }));
      setSuccess(true);
    } catch (e) { setErr(e.message || t("findAgent.errFailedSend", { defaultValue: "Failed to send request." })); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fa-modal-bg" ref={bgRef} onClick={(e) => e.target === bgRef.current && onClose()}>
      <div className="fa-modal">
        <div className="fa-modal-head">
          <div className="fa-modal-head-left">
            <div className="fa-modal-head-icon">
              <MessageSquarePlus size={17} color={AMBER} />
            </div>
            <div>
              <div className="fa-modal-head-title">{t("findAgent.requestAgentSupport", { defaultValue: "Request Agent Support" })}</div>
              <div className="fa-modal-head-sub">
                {[district, sectorForSubmit || sector].filter(Boolean).join(" · ") || province}
              </div>
            </div>
          </div>
          <button className="fa-modal-close" onClick={onClose} aria-label={t("findAgent.close", { defaultValue: "Close" })}>
            <X size={16} />
          </button>
        </div>
        <div className="fa-modal-body">
          {success ? (
            <div className="fa-modal-success">
              <div className="fa-modal-success-icon">
                <CheckCircle2 size={30} color="#16a34a" />
              </div>
              <div className="fa-modal-success-title">{t("findAgent.requestSent", { defaultValue: "Request Sent!" })}</div>
              <div className="fa-modal-success-sub">{t("findAgent.requestSentSub", { defaultValue: "Your support request has been received. The agent will review it and get back to you shortly." })}</div>
              <button className="fa-close-btn" onClick={onClose}>{t("findAgent.close", { defaultValue: "Close" })}</button>
            </div>
          ) : (
            <form className="fa-form" onSubmit={handleSubmit}>
              {agents.length > 1 && (
                <SelectField label={t("findAgent.selectAgent", { defaultValue: "Select Agent" })} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                  {agents.map((a) => (
                    <option key={a.id} value={String(a.id)}>
                      {a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim()}
                    </option>
                  ))}
                </SelectField>
              )}
              <InputField label={t("findAgent.yourFullName", { defaultValue: "Your Full Name *" })} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("findAgent.enterFullName", { defaultValue: "Enter your full name" })} />
              <InputField label={t("findAgent.phoneOrEmail", { defaultValue: "Phone or Email *" })} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="+250 7XX XXX XXX or email@example.com" />
              <InputField label={t("findAgent.howCanWeHelp", { defaultValue: "How can we help you? *" })} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("findAgent.describeSupport", { defaultValue: "Describe the support you need…" })} as="textarea" rows={4} />
              {err && (
                <div className="fa-form-error">
                  <AlertCircle size={15} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{err}</span>
                </div>
              )}
              <button type="submit" className="fa-submit-btn" disabled={submitting}>
                {submitting
                  ? <><Loader2 size={16} className="fa-spin" /> {t("findAgent.sending", { defaultValue: "Sending…" })}</>
                  : <><Send size={15} /> {t("findAgent.sendRequest", { defaultValue: "Send Request" })}</>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ───────────────────────────────────────────────────
function AgentCard({ agent, sector, onRequestSupport, style, t }) {
  const name     = agent.full_name || `${agent.first_name || ""} ${agent.last_name || ""}`.trim();
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <article className="fa-agent-card" style={style}>
      <div className="fa-agent-stripe" />
      <div className="fa-agent-body">
        <div className="fa-agent-top">
          <div className="fa-agent-avatar">{initials || <UserRound size={20} />}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fa-agent-name">{name}</div>
            <div className="fa-agent-location">
              <MapPin size={11} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {[agent.province, agent.district, agentDisplaySector(agent, sector)].filter(Boolean).join(" · ")}
              </span>
            </div>
          </div>
          <div className="fa-agent-badge-active">{t("findAgent.active", { defaultValue: "Active" })}</div>
        </div>

        {(agent.phone || agent.email) && (
          <div className="fa-agent-contacts">
            {agent.phone && (
              <a href={`tel:${agent.phone}`} className="fa-agent-pill">
                <Phone size={11} /> {agent.phone}
              </a>
            )}
            {agent.email && (
              <a href={`mailto:${agent.email}`} className="fa-agent-pill">
                <Mail size={11} /> {agent.email}
              </a>
            )}
          </div>
        )}

        <div className="fa-agent-actions">
          <button type="button" onClick={() => onRequestSupport(agent)} className="fa-agent-btn-support">
            <MessageSquarePlus size={14} /> {t("findAgent.requestSupport", { defaultValue: "Request Support" })}
          </button>
          <Link
            to={`/agent-shop?agent_user_id=${encodeURIComponent(agent.id)}&agent_name=${encodeURIComponent(name)}&sector=${encodeURIComponent(agentDisplaySector(agent, sector))}`}
            className="fa-agent-btn-shop"
          >
            <ShoppingBag size={14} /> {t("findAgent.agentShop", { defaultValue: "Agent Shop" })}
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── Navbar ───────────────────────────────────────────────────────
function Navbar({ t }) {
  const [open,     setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: t("findAgent.navHome", { defaultValue: "Home" }),        href: "/" },
    { label: t("findAgent.navPayFees", { defaultValue: "Pay Fees" }),    href: "/combined-tution-requrement" },
    { label: t("findAgent.navServices", { defaultValue: "Services" }),    href: "/services" },
    { label: t("findAgent.navFeatures", { defaultValue: "Features" }),    href: "/features" },
    { label: t("findAgent.navSchools", { defaultValue: "Schools" }),     href: "/schools" },
    { label: t("findAgent.navFindAgent", { defaultValue: "Find Agent" }),  href: "/find-agent", active: true },
  ];

  return (
    <nav className={`fa-nav${scrolled ? " scrolled" : ""}`} style={{ background: "rgba(0,4,53,0.96)", backdropFilter: "blur(16px)" }}>
      <div className="fa-nav-inner">
        {/* Logo */}
        <Link to="/" className="fa-nav-logo">
          <img
            src={babyeyiLogo}
            alt="Babyeyi"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/1BABYEYI LOGO FINAL.png";
            }}
          />
        </Link>

        {/* Desktop links */}
        <div className="fa-nav-links">
          {links.map(l => (
            <Link
              key={l.label}
              to={l.href}
              className={`fa-nav-link${l.active ? " highlight" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="fa-nav-cta">
          <Link to="/register" className="fa-nav-register">{t("findAgent.navRegisterSchool", { defaultValue: "Register School" })}</Link>
        </div>

        <button type="button" className="fa-hamburger" onClick={() => setOpen((v) => !v)} aria-label={t("findAgent.menu", { defaultValue: "Menu" })}>
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {open && (
        <div className="fa-mobile-drawer">
          {links.map(l => (
            <Link key={l.label} to={l.href} className={`fa-mobile-link${l.active ? " active" : ""}`} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div style={{ paddingTop: 12, display: "grid", gap: 8 }}>
            <Link to="/register" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700, color: AMBER, border: `1px solid rgba(251,191,36,0.3)`, textDecoration: "none" }}>
              {t("findAgent.navRegisterSchool", { defaultValue: "Register School" })}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Steps indicator ──────────────────────────────────────────────
function Steps({ step, t }) {
  const items = [
    t("findAgent.stepProvince", { defaultValue: "Province" }),
    t("findAgent.stepDistrict", { defaultValue: "District" }),
    t("findAgent.stepSector", { defaultValue: "Sector" }),
    t("findAgent.stepViewAgents", { defaultValue: "View Agents" }),
  ];
  return (
    <div className="fa-steps">
      {items.map((label, i) => {
        const done    = step > i + 1;
        const current = step === i + 1;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            <div className="fa-step">
              <div className={`fa-step-num ${done ? "done" : current ? "current" : "pending"}`}>
                {done ? "✓" : i + 1}
              </div>
              <span className="fa-step-label" style={{ color: done ? AMBER600 : current ? NAVY : NAVY50 }}>
                {label}
              </span>
            </div>
            {i < items.length - 1 && (
              <div className="fa-step-conn" style={{ background: done ? AMBER : NAVY08 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main FindAgent page ──────────────────────────────────────────
export default function FindAgent() {
  const { t } = useTranslation();
  const [provinces,     setProvinces]     = useState([]);
  const [districts,     setDistricts]     = useState([]);
  const [sectors,       setSectors]       = useState([]);
  const [agents,        setAgents]        = useState([]);
  const [province,      setProvince]      = useState("");
  const [district,      setDistrict]      = useState("");
  const [sector,        setSector]        = useState("");
  const [loadingGeo,    setLoadingGeo]    = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [error,         setError]         = useState("");
  const [modalAgent,    setModalAgent]    = useState(null);
  const [showModal,     setShowModal]     = useState(false);

  // Load provinces
  useEffect(() => {
    let off = false;
    setLoadingGeo(true);
    getJson(`${API}/locations/provinces`)
      .then(j => { if (!off) setProvinces(Array.isArray(j.data) ? j.data : []); })
      .catch(e => !off && setError(e.message))
      .finally(() => !off && setLoadingGeo(false));
    return () => { off = true; };
  }, []);

  // Load districts
  useEffect(() => {
    if (!province) { setDistricts([]); setDistrict(""); setSectors([]); setSector(""); setAgents([]); return; }
    let off = false; setLoadingGeo(true); setError("");
    getJson(`${API}/locations/districts?province=${encodeURIComponent(province)}`)
      .then(j => { if (!off) { setDistricts(Array.isArray(j.data) ? j.data : []); setDistrict(""); setSectors([]); setSector(""); setAgents([]); } })
      .catch(e => !off && setError(e.message))
      .finally(() => !off && setLoadingGeo(false));
    return () => { off = true; };
  }, [province]);

  // Load sectors
  useEffect(() => {
    if (!province || !district) { setSectors([]); setSector(""); setAgents([]); return; }
    let off = false; setLoadingGeo(true); setError("");
    getJson(`${API}/locations/sectors?province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}`)
      .then(j => { if (!off) { setSectors(Array.isArray(j.data) ? j.data : []); setSector(""); setAgents([]); } })
      .catch(e => !off && setError(e.message))
      .finally(() => !off && setLoadingGeo(false));
    return () => { off = true; };
  }, [province, district]);

  // Load agents
  useEffect(() => {
    if (!province || !district) { setAgents([]); return; }
    let off = false; setLoadingAgents(true); setError("");
    const q = sector
      ? `province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}&sector=${encodeURIComponent(sector)}`
      : `province=${encodeURIComponent(province)}&district=${encodeURIComponent(district)}`;
    getJson(`${API}/public/agents/find?${q}`)
      .then(j => !off && setAgents(Array.isArray(j.data) ? j.data : []))
      .catch(e => !off && setError(e.message))
      .finally(() => !off && setLoadingAgents(false));
    return () => { off = true; };
  }, [province, district, sector]);

  const openModal  = (agent) => { setModalAgent(agent); setShowModal(true); };
  const closeModal = ()      => { setShowModal(false); setModalAgent(null); };

  const filtersComplete = !!(province && district);
  const step = !province ? 1 : !district ? 2 : !sector ? 3 : 4;

  const STATS = [
    { Icon: Map,        value: "5",    label: t("findAgent.statsProvinces", { defaultValue: "Provinces covered" }) },
    { Icon: Building2,  value: "30+",  label: t("findAgent.statsDistricts", { defaultValue: "Districts served" })  },
    { Icon: Users,      value: "100+", label: t("findAgent.statsActiveAgents", { defaultValue: "Active agents" })     },
    { Icon: Headphones, value: "24/7", label: t("findAgent.statsSupport", { defaultValue: "Support available" }) },
  ];

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{GLOBAL_CSS}</style>
      <Navbar t={t} />

      {/* ── Hero ── */}
      <section className="fa-hero">
        <div className="fa-hero-geo" />
        <div className="fa-hero-inner">

          {/* Badge */}
          <div className="fa-hero-badge">
            <Shield size={12} color={AMBER} />
            <span>{t("findAgent.officialAgentFinder", { defaultValue: "Official Agent Finder" })}</span>
          </div>

          {/* Heading */}
          <h1 className="fa-hero-title fa-display">
            {t("findAgent.findYour", { defaultValue: "Find your" })}<br />
            <span className="">{t("findAgent.babyeyiAgent", { defaultValue: "Babyeyi Agent" })}</span>
          </h1>
          <p className="fa-hero-sub">
            {t("findAgent.heroSub", { defaultValue: "Select your province, district, and sector to instantly discover the certified Babyeyi agent allocated to your exact location." })}
          </p>

          {/* ── Filter Card ── */}
          <div className="fa-filter-card">
            <div className="fa-filter-header">
              <div className="fa-filter-icon">
                <MapPin size={18} color={AMBER600} />
              </div>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 15, color: NAVY }}>{t("findAgent.locationSearch", { defaultValue: "Location Search" })}</div>
                <div style={{ fontSize: 12, color: NAVY50, marginTop: 2 }}>{t("findAgent.findCertifiedNearYou", { defaultValue: "Find certified agents near you" })}</div>
              </div>
            </div>

            <div className="fa-filter-grid">
              <SelectField label={t("findAgent.province", { defaultValue: "Province" })} value={province} onChange={e => setProvince(e.target.value)}>
                <option value="">{t("findAgent.selectProvince", { defaultValue: "Select province…" })}</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </SelectField>

              <SelectField label={t("findAgent.district", { defaultValue: "District" })} value={district} onChange={e => setDistrict(e.target.value)} disabled={!province}>
                <option value="">{t("findAgent.selectDistrict", { defaultValue: "Select district…" })}</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </SelectField>

              <SelectField label={t("findAgent.sectorOptional", { defaultValue: "Sector (optional)" })} value={sector} onChange={e => setSector(e.target.value)} disabled={!district}>
                <option value="">{t("findAgent.allSectors", { defaultValue: "All sectors" })}</option>
                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
              </SelectField>

              <div>
                <div className="fa-select-label" style={{ marginBottom: 6 }}>&nbsp;</div>
                <button
                  className="fa-search-btn"
                  style={{ width: "100%" }}
                  disabled={!filtersComplete || loadingAgents}
                >
                  {loadingAgents
                    ? <><Loader2 size={15} className="fa-spin" /> {t("findAgent.searching", { defaultValue: "Searching…" })}</>
                    : filtersComplete
                    ? <><Search size={15} /> {agents.length > 0 ? t("findAgent.foundCount", { defaultValue: "{{count}} Found", count: agents.length }) : t("findAgent.search", { defaultValue: "Search" })}</>
                    : <><Search size={15} /> {t("findAgent.search", { defaultValue: "Search" })}</>
                  }
                </button>
              </div>
            </div>

            {error && (
              <div className="fa-form-error" style={{ marginTop: 14 }}>
                <AlertCircle size={14} color="#c2410c" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <Steps step={step} t={t} />
          </div>
        </div>

        {/* ── Stats ── */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div className="fa-stats">
            {STATS.map(({ Icon, value, label }) => (
              <div key={label} className="fa-stat" style={{ paddingLeft: 0 }}>
                <div className="fa-stat-icon"><Icon size={20} color={AMBER} /></div>
                <div>
                  <div className="fa-stat-val">{value}</div>
                  <div className="fa-stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <main className="fa-main">
        <div className="fa-layout">

          {/* Sidebar (desktop only) */}
          <aside className="fa-aside-desktop">
            <div className="fa-sidebar">
              <div className="fa-sidebar-head">
                <div className="fa-sidebar-head-icon">
                  <MapPin size={15} color={AMBER} />
                </div>
                <div>
                  <div className="fa-sidebar-head-title">{t("findAgent.refineLocation", { defaultValue: "Refine Location" })}</div>
                  <div className="fa-sidebar-head-sub">{t("findAgent.narrowToFindAgent", { defaultValue: "Narrow to find your agent" })}</div>
                </div>
              </div>
              <div className="fa-sidebar-body">
                <SelectField label={t("findAgent.province", { defaultValue: "Province" })} value={province} onChange={e => setProvince(e.target.value)}>
                  <option value="">{t("findAgent.selectProvince", { defaultValue: "Select province…" })}</option>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </SelectField>
                <SelectField label={t("findAgent.district", { defaultValue: "District" })} value={district} onChange={e => setDistrict(e.target.value)} disabled={!province}>
                  <option value="">{t("findAgent.selectDistrict", { defaultValue: "Select district…" })}</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </SelectField>
                <SelectField label={t("findAgent.sectorOptional", { defaultValue: "Sector (optional)" })} value={sector} onChange={e => setSector(e.target.value)} disabled={!district}>
                  <option value="">{t("findAgent.allSectors", { defaultValue: "All sectors" })}</option>
                  {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                </SelectField>

                {!filtersComplete ? (
                  <div className="fa-tip">
                    <Zap size={14} color={AMBER600} style={{ flexShrink: 0, marginTop: 1 }} />
                    {t("findAgent.selectProvinceDistrictTip", { defaultValue: "Select a province and district to discover agents in your area." })}
                  </div>
                ) : agents.length > 0 ? (
                  <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 14px", fontSize: 12.5, color: "#15803d", fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>
                    <CheckCircle2 size={14} /> {t("findAgent.agentsFoundCount", { defaultValue: "{{count}} agent", count: agents.length })}{agents.length !== 1 ? "s" : ""} {t("findAgent.found", { defaultValue: "found" })}
                  </div>
                ) : null}

                {/* Feature highlights */}
                <div style={{ paddingTop: 6, borderTop: `1px solid ${NAVY08}`, display: "grid", gap: 10 }}>
                  {[
                    { icon: <Shield size={13} color={AMBER600} />, text: t("findAgent.featureVerified", { defaultValue: "All agents are verified by Babyeyi" }) },
                    { icon: <Star   size={13} color={AMBER600} />, text: t("findAgent.featureRated", { defaultValue: "Rated and reviewed by community" }) },
                    { icon: <Zap    size={13} color={AMBER600} />, text: t("findAgent.featureInstantSupport", { defaultValue: "Instant support request system" }) },
                  ].map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{ width: 26, height: 26, borderRadius: 7, background: AMBER50, border: `1px solid rgba(251,191,36,0.25)`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {f.icon}
                      </div>
                      <span style={{ fontSize: 12, color: NAVY50, lineHeight: 1.5, paddingTop: 4 }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Results section */}
          <section>
            <div className="fa-results-header">
              <div>
                <div className="fa-results-title">
                  {loadingAgents
                    ? t("findAgent.searchingAgents", { defaultValue: "Searching agents…" })
                    : agents.length > 0
                    ? `${agents.length} ${t("findAgent.agentWord", { defaultValue: "Agent" })}${agents.length !== 1 ? "s" : ""} ${t("findAgent.found", { defaultValue: "Found" })}`
                    : t("findAgent.agentsInArea", { defaultValue: "Agents in Your Area" })
                  }
                </div>
                {filtersComplete && (
                  <div className="fa-results-sub">
                    <MapPin size={11} />
                    {[province, district, sector].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              {agents.length > 0 && (
                <button type="button" onClick={() => openModal(null)} className="fa-request-area-btn">
                  <MessageSquarePlus size={14} />
                  {t("findAgent.areaSupport", { defaultValue: "Area Support" })}
                </button>
              )}
            </div>

            {/* Empty: no filters */}
            {!filtersComplete && !loadingGeo && (
              <div className="fa-empty">
                <div className="fa-empty-icon" style={{ background: AMBER50, border: `1px solid rgba(251,191,36,0.28)` }}>
                  <Search size={28} color={AMBER600} />
                </div>
                <div className="fa-empty-title">{t("findAgent.startYourSearch", { defaultValue: "Start your search" })}</div>
                <div className="fa-empty-sub">{t("findAgent.startSearchSub", { defaultValue: "Use the location filter above to find certified Babyeyi agents near you." })}</div>
                <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
                  {["Kigali City", "Eastern Province", "Northern Province"].map(hint => (
                    <button
                      key={hint}
                      onClick={() => setProvince(hint)}
                      style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${NAVY20}`, background: "#fff", fontSize: 12, color: NAVY50, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.target.style.borderColor = AMBER; e.target.style.color = AMBER700; }}
                      onMouseLeave={e => { e.target.style.borderColor = NAVY20; e.target.style.color = NAVY50; }}
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {loadingAgents && (
              <div className="fa-empty">
                <Loader2 size={32} color={AMBER600} className="fa-spin" style={{ margin: "0 auto 16px" }} />
                <div className="fa-empty-title">{t("findAgent.findingAgents", { defaultValue: "Finding agents…" })}</div>
                <div className="fa-empty-sub">{t("findAgent.findingAgentsSub", { defaultValue: "Searching for certified agents in your selected area." })}</div>
              </div>
            )}

            {/* Empty: no agents */}
            {filtersComplete && !loadingAgents && agents.length === 0 && !error && (
              <div className="fa-empty">
                <div className="fa-empty-icon" style={{ background: "#f8fafc", border: `1px solid ${NAVY08}` }}>
                  <UserRound size={28} color={NAVY50} />
                </div>
                <div className="fa-empty-title">{t("findAgent.noAgentsFound", { defaultValue: "No agents found" })}</div>
                <div className="fa-empty-sub">
                  {t("findAgent.noAgentsFoundSub", { defaultValue: "No agent is currently allocated to this location. Try selecting a different district or leave the sector empty." })}
                </div>
                <button
                  onClick={() => { setSector(""); }}
                  style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: `1.5px solid ${AMBER}`, background: AMBER50, color: AMBER700, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
                >
                  <ArrowRight size={14} /> {t("findAgent.tryAllSectors", { defaultValue: "Try all sectors" })}
                </button>
              </div>
            )}

            {/* Agents grid */}
            {!loadingAgents && agents.length > 0 && (
              <div style={{ display: "grid", gap: 14 }}>
                {agents.map((a, idx) => (
                  <AgentCard
                    key={a.id}
                    agent={a}
                    sector={sector}
                    onRequestSupport={openModal}
                    t={t}
                    style={{ animationDelay: `${idx * 0.07}s` }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <SupportModal
          agents={agents}
          initialAgentId={modalAgent ? String(modalAgent.id) : (agents[0]?.id ? String(agents[0].id) : "")}
          initialAgent={modalAgent}
          province={province}
          district={district}
          sector={sector}
          t={t}
          onClose={closeModal}
        />
      )}
    </div>
  );
}