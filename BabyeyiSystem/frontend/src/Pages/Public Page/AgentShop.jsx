import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  ZoomIn,
  Loader2,
  Package,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";

const NAVY = "#000435";
const AMBER = "#FBBF24";
const AMBER_LIGHT = "#FEF3C7";
const AMBER_DARK = "#92400E";
const NAVY_LIGHT = "#0a0f5e";
function cartStorageKey(agentUserId) {
  return `babyeyi_agent_shop_cart_${agentUserId || "default"}`;
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5100").replace(/\/$/, "");
const API = `${API_ORIGIN}/api`;

function toImage(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function mapProductFromApi(row) {
  const gallery = Array.isArray(row.gallery_images) ? row.gallery_images : [];
  const images = gallery.length ? gallery : row.icon_url ? [row.icon_url] : [];
  return {
    id: row.id,
    service_code: row.service_code,
    name: row.name,
    description: row.description || "",
    short_tagline: row.short_tagline || "",
    icon_url: row.icon_url,
    images,
    product_type: row.product_type,
    product_color: row.product_color,
    stock_quantity: row.stock_quantity,
    category: row.category,
    price: Number(row.price || 0),
  };
}

async function fetchAgentProducts(agentUserId) {
  const res = await fetch(
    `${API}/student-services/public/shop/products?agent_user_id=${encodeURIComponent(agentUserId)}`
  );
  const json = await res.json();
  if (!res.ok || json.success === false) throw new Error(json.message || "Failed to load products");
  return {
    products: (json.data || []).map(mapProductFromApi),
    agent: json.agent || null,
  };
}

// ─── STYLES ────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F4F6FB; color: ${NAVY}; }
  
  .shop-header {
    background: ${NAVY};
    position: sticky; top: 0; z-index: 100;
    border-bottom: 2px solid ${AMBER};
  }
  .shop-header-inner {
    max-width: 1200px; margin: 0 auto;
    padding: 0 1rem;
    min-height: 64px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 10px;
  }
  .header-slot-left { justify-self: start; min-width: 0; }
  .header-slot-center { justify-self: center; text-align: center; min-width: 0; }
  .header-slot-right { justify-self: end; min-width: 0; }
  .header-logo-link { display: inline-flex; align-items: center; text-decoration: none; }
  .header-logo-link img { height: 34px; width: auto; max-width: 130px; object-fit: contain; display: block; }
  .header-agent-title {
    display: block; margin-top: 2px;
    font-size: 0.68rem; font-weight: 600; color: rgba(255,255,255,0.72);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
  }
  .header-page-title {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem; color: #fff;
  }
  .header-actions { display: flex; align-items: center; gap: 10px; }
  
  .cart-btn {
    background: ${AMBER};
    color: ${NAVY};
    border: none; border-radius: 12px;
    padding: 9px 16px;
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.85rem;
    cursor: pointer;
    display: flex; align-items: center; gap: 7px;
    transition: transform 0.15s, box-shadow 0.15s;
    white-space: nowrap;
  }
  .cart-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(251,191,36,0.4); }
  .cart-btn:active { transform: scale(0.97); }
  .cart-badge {
    background: ${NAVY};
    color: ${AMBER};
    font-size: 0.7rem; font-weight: 700;
    width: 20px; height: 20px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
  }
  
  .back-btn {
    background: transparent;
    color: rgba(255,255,255,0.85);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px; padding: 7px 12px;
    font-size: 0.78rem; cursor: pointer;
    transition: all 0.15s;
    font-family: 'DM Sans', sans-serif;
    display: inline-flex; align-items: center; gap: 6px;
    text-decoration: none;
  }
  .back-btn:hover { color: #fff; border-color: rgba(255,255,255,0.4); }
  
  /* ── PRODUCT GRID ── */
  .products-section { max-width: 1200px; margin: 0 auto; padding: 2rem 1.25rem; }
  .section-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 1.6rem; color: ${NAVY};
    margin-bottom: 0.25rem;
  }
  .section-sub { color: #64748B; font-size: 0.9rem; margin-bottom: 1.75rem; }
  
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  
  .product-card {
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    border: 1.5px solid #E8EDF5;
    transition: transform 0.25s, box-shadow 0.25s;
    cursor: pointer;
    position: relative;
  }
  .product-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,4,53,0.12); }
  
  .product-img-wrap {
    position: relative; overflow: hidden; height: 200px;
    background: #F1F5FB;
  }
  .product-img-wrap img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.5s ease;
  }
  .product-card:hover .product-img-wrap img { transform: scale(1.08); }
  
  .product-hover-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(0,4,53,0.92) 0%, rgba(0,4,53,0.5) 50%, transparent 100%);
    opacity: 0; transition: opacity 0.3s;
    display: flex; flex-direction: column; justify-content: flex-end;
    padding: 16px;
    pointer-events: none;
  }
  .product-card:hover .product-hover-overlay { opacity: 1; }
  .overlay-desc {
    color: rgba(255,255,255,0.9);
    font-size: 0.8rem; line-height: 1.5;
    margin-bottom: 10px;
  }
  .overlay-zoom-hint {
    color: ${AMBER}; font-size: 0.75rem; font-weight: 600;
    display: flex; align-items: center; gap: 5px;
  }
  
  .product-info { padding: 14px 16px 16px; }
  .product-name {
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.95rem; color: ${NAVY};
    margin-bottom: 4px;
  }
  .product-tagline {
    font-size: 0.78rem; color: #64748B; line-height: 1.4;
    margin-bottom: 12px; min-height: 32px;
  }
  .product-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .product-price {
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 1rem; color: ${AMBER_DARK};
  }
  .product-price small { font-size: 0.65rem; font-weight: 400; color: #94A3B8; margin-left: 2px; }
  
  .add-btn {
    background: ${NAVY};
    color: ${AMBER};
    border: none; border-radius: 10px;
    padding: 8px 14px;
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.78rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .add-btn:hover { background: #0a0f5e; }
  .add-btn:active { transform: scale(0.96); }
  
  .qty-control {
    display: flex; align-items: center; gap: 4px;
    border: 1.5px solid #E2E8F0; border-radius: 10px;
    overflow: hidden;
  }
  .qty-btn {
    width: 32px; height: 32px; border: none;
    background: #F8FAFC; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 1rem; color: ${NAVY};
    transition: background 0.1s;
  }
  .qty-btn:hover { background: ${AMBER_LIGHT}; }
  .qty-num {
    min-width: 28px; text-align: center;
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.85rem; color: ${NAVY};
  }
  
  /* ── STICKY CART BAR ── */
  .cancel-btn {
    background: #fff; color: ${NAVY}; border: 1.5px solid #E2E8F0;
    border-radius: 12px; padding: 14px 20px;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem;
    cursor: pointer; flex: 1; min-width: 120px;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  }
  .cancel-btn:hover { background: #F8FAFC; }
  .checkout-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
  .checkout-actions .place-order-btn { flex: 2; min-width: 200px; }
  .zoom-meta-block { margin: 12px 0; }
  .zoom-attrs {
    font-size: 0.82rem; color: #64748B; line-height: 1.55;
    margin-top: 10px; padding: 10px 12px; background: #F8FAFC; border-radius: 10px;
    border: 1px solid #E8EDF5;
  }
  .zoom-attrs strong { color: ${NAVY}; font-weight: 700; }
  
  /* ── IMAGE ZOOM MODAL ── */
  .zoom-modal-bg {
    position: fixed; inset: 0; z-index: 999;
    background: rgba(0,4,53,0.92);
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .zoom-modal {
    background: #fff; border-radius: 24px;
    max-width: 900px; width: 100%;
    max-height: 90vh; overflow-y: auto;
    position: relative;
    animation: slideUp 0.25s ease;
  }
  @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .zoom-close {
    position: absolute; top: 14px; right: 14px;
    width: 36px; height: 36px;
    background: rgba(0,4,53,0.08); border: none; border-radius: 50%;
    cursor: pointer; font-size: 1.2rem; color: ${NAVY};
    display: flex; align-items: center; justify-content: center;
    z-index: 10; transition: background 0.15s;
  }
  .zoom-close:hover { background: rgba(0,4,53,0.15); }
  .zoom-layout {
    display: grid; grid-template-columns: 1fr 1fr; gap: 0;
  }
  @media (max-width: 640px) {
    .zoom-layout { grid-template-columns: 1fr; }
  }
  .zoom-gallery { padding: 1.5rem; }
  .zoom-main-img {
    width: 100%; border-radius: 16px; aspect-ratio: 1;
    object-fit: cover; cursor: zoom-in;
    transition: transform 0.3s;
  }
  .zoom-main-img.zoomed { transform: scale(1.6); cursor: zoom-out; }
  .zoom-thumbs { display: flex; gap: 8px; margin-top: 10px; }
  .zoom-thumb {
    width: 60px; height: 60px; border-radius: 10px;
    object-fit: cover; cursor: pointer;
    border: 2px solid transparent; transition: border-color 0.15s;
    opacity: 0.7; transition: opacity 0.15s, border-color 0.15s;
  }
  .zoom-thumb.active, .zoom-thumb:hover { border-color: ${AMBER}; opacity: 1; }
  .zoom-details { padding: 1.5rem 1.5rem 1.5rem 0.5rem; display: flex; flex-direction: column; justify-content: center; }
  @media (max-width: 640px) {
    .zoom-details { padding: 0 1.5rem 1.5rem; }
  }
  .zoom-product-name {
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 1.4rem; color: ${NAVY};
    margin-bottom: 6px;
  }
  .zoom-product-price {
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 1.6rem; color: ${AMBER_DARK};
    margin-bottom: 14px;
  }
  .zoom-desc { font-size: 0.88rem; line-height: 1.7; color: #475569; margin-bottom: 20px; }
  .zoom-add-btn {
    background: ${NAVY}; color: ${AMBER};
    border: none; border-radius: 14px; padding: 14px 24px;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.95rem;
    cursor: pointer; transition: background 0.15s, transform 0.1s;
    width: 100%;
  }
  .zoom-add-btn:hover { background: #0a0f5e; }
  .zoom-qty-control {
    display: flex; align-items: center; gap: 0;
    border: 2px solid #E2E8F0; border-radius: 14px;
    overflow: hidden; width: 100%; justify-content: space-between;
  }
  .zoom-qty-btn {
    width: 50px; height: 50px; border: none;
    background: #F8FAFC; cursor: pointer;
    font-size: 1.2rem; color: ${NAVY};
    transition: background 0.1s; font-weight: 700;
  }
  .zoom-qty-btn:hover { background: ${AMBER_LIGHT}; }
  .zoom-qty-num {
    font-family: 'Syne', sans-serif; font-weight: 800;
    font-size: 1.1rem; color: ${NAVY};
  }
  
  /* ── CART PAGE ── */
  .cart-page { max-width: 1000px; margin: 0 auto; padding: 2rem 1.25rem; }
  .cart-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 1.6rem; color: ${NAVY}; margin-bottom: 1.5rem;
  }
  .cart-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
  @media (max-width: 768px) { .cart-grid { grid-template-columns: 1fr; } }
  
  .cart-items-list { display: flex; flex-direction: column; gap: 12px; }
  .cart-item {
    background: #fff; border-radius: 18px;
    border: 1.5px solid #E8EDF5;
    padding: 14px 16px;
    display: flex; align-items: center; gap: 14px;
    transition: box-shadow 0.2s;
  }
  .cart-item:hover { box-shadow: 0 4px 20px rgba(0,4,53,0.08); }
  .cart-item-img {
    width: 80px; height: 80px; border-radius: 12px;
    object-fit: cover; flex-shrink: 0; background: #F1F5FB;
  }
  .cart-item-info { flex: 1; min-width: 0; }
  .cart-item-name {
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.9rem; color: ${NAVY};
    margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cart-item-price { font-size: 0.82rem; color: #64748B; }
  .cart-item-subtotal {
    font-family: 'Syne', sans-serif; font-weight: 800;
    font-size: 0.95rem; color: ${AMBER_DARK};
    flex-shrink: 0;
  }
  .cart-remove-btn {
    background: none; border: none; cursor: pointer;
    color: #CBD5E1; padding: 4px; border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    flex-shrink: 0;
  }
  .cart-remove-btn:hover { color: #EF4444; background: #FEF2F2; }
  
  .cart-summary {
    background: ${NAVY}; border-radius: 20px;
    padding: 24px; color: #fff;
    position: sticky; top: 80px;
  }
  .cart-summary-title {
    font-family: 'Syne', sans-serif;
    font-weight: 800; font-size: 1.1rem; color: ${AMBER};
    margin-bottom: 16px;
  }
  .summary-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .summary-label { font-size: 0.85rem; opacity: 0.7; }
  .summary-value { font-weight: 600; font-size: 0.9rem; }
  .summary-divider { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 14px 0; }
  .summary-total-label { font-family: 'Syne', sans-serif; font-weight: 700; }
  .summary-total-value { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.2rem; color: ${AMBER}; }
  .proceed-btn {
    width: 100%; margin-top: 18px;
    background: ${AMBER}; color: ${NAVY};
    border: none; border-radius: 14px; padding: 14px;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.95rem;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .proceed-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(251,191,36,0.4); }
  .proceed-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .empty-cart { text-align: center; padding: 4rem 2rem; }
  .empty-cart-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.3; }
  .empty-cart h3 { font-family: 'Syne', sans-serif; font-weight: 700; margin-bottom: 0.5rem; color: ${NAVY}; }
  .empty-cart p { color: #64748B; font-size: 0.9rem; margin-bottom: 1.5rem; }
  
  /* ── CHECKOUT PAGE ── */
  .checkout-page { max-width: 1000px; margin: 0 auto; padding: 2rem 1.25rem; }
  .checkout-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
  @media (max-width: 768px) { .checkout-grid { grid-template-columns: 1fr; } }
  
  .checkout-form-card {
    background: #fff; border-radius: 20px;
    border: 1.5px solid #E8EDF5; padding: 28px;
  }
  .form-section-title {
    font-family: 'Syne', sans-serif;
    font-weight: 700; font-size: 0.95rem; color: ${AMBER_DARK};
    text-transform: uppercase; letter-spacing: 0.5px;
    margin-bottom: 16px; padding-bottom: 8px;
    border-bottom: 1.5px solid #F1F5FB;
    display: flex; align-items: center; gap: 8px;
  }
  .form-section-title svg { flex-shrink: 0; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  @media (max-width: 480px) { .form-row { grid-template-columns: 1fr; } }
  .form-group { margin-bottom: 14px; }
  .form-label {
    display: block; font-size: 0.78rem; font-weight: 600;
    color: #64748B; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.3px;
  }
  .form-input {
    width: 100%; padding: 11px 14px;
    border: 1.5px solid #E2E8F0; border-radius: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: ${NAVY};
    outline: none; transition: border-color 0.15s, box-shadow 0.15s;
    background: #FAFBFD;
  }
  .form-input:focus { border-color: ${AMBER}; box-shadow: 0 0 0 3px rgba(251,191,36,0.15); background: #fff; }
  .form-input::placeholder { color: #C4C9D4; }
  
  .payment-methods { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .payment-option {
    border: 2px solid #E2E8F0; border-radius: 14px;
    padding: 14px; cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .payment-option:hover { border-color: ${AMBER}; }
  .payment-option.selected { border-color: ${AMBER}; background: ${AMBER_LIGHT}; }
  .payment-icon { font-size: 1.5rem; }
  .payment-label { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.8rem; color: ${NAVY}; }
  
  .place-order-btn {
    width: 100%; margin-top: 6px;
    background: ${AMBER}; color: ${NAVY};
    border: none; border-radius: 14px; padding: 16px;
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1rem;
    cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .place-order-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(251,191,36,0.45); }
  
  .checkout-order-summary {
    background: #fff; border-radius: 20px;
    border: 1.5px solid #E8EDF5;
    padding: 24px; position: sticky; top: 80px;
  }
  .order-summary-title {
    font-family: 'Syne', sans-serif; font-weight: 800;
    font-size: 1rem; color: ${NAVY}; margin-bottom: 16px;
  }
  .order-item-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .order-item-img { width: 48px; height: 48px; border-radius: 10px; object-fit: cover; background: #F1F5FB; flex-shrink: 0; }
  .order-item-name { font-size: 0.82rem; font-weight: 500; color: ${NAVY}; flex: 1; }
  .order-item-qty { font-size: 0.75rem; color: #94A3B8; }
  .order-item-price { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; color: ${AMBER_DARK}; flex-shrink: 0; }
  
  /* ── SUCCESS PAGE ── */
  .success-page { max-width: 520px; margin: 3rem auto; padding: 2rem 1.25rem; text-align: center; }
  .success-icon-wrap {
    width: 90px; height: 90px; border-radius: 50%;
    background: ${AMBER_LIGHT}; margin: 0 auto 1.5rem;
    display: flex; align-items: center; justify-content: center;
    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
  @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .success-icon { font-size: 2.5rem; }
  .success-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.8rem; color: ${NAVY}; margin-bottom: 10px; }
  .success-sub { color: #64748B; font-size: 0.9rem; line-height: 1.6; margin-bottom: 2rem; }
  .success-order-card {
    background: ${NAVY}; border-radius: 20px; padding: 20px;
    color: #fff; margin-bottom: 1.5rem; text-align: left;
  }
  .order-number { font-size: 0.78rem; opacity: 0.6; margin-bottom: 4px; }
  .order-number-val { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.1rem; color: ${AMBER}; }
  
  .shop-hero {
    background: linear-gradient(135deg, ${NAVY} 0%, ${NAVY_LIGHT} 100%);
    border-radius: 20px; padding: 1.25rem 1.35rem; margin-bottom: 1.5rem;
    color: #fff; border: 1px solid rgba(251,191,36,0.25);
  }
  .shop-hero h1 { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.35rem; margin-bottom: 4px; }
  .shop-hero p { font-size: 0.82rem; opacity: 0.85; line-height: 1.5; }
  .shop-hero-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .hero-chip {
    font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 999px;
    background: rgba(251,191,36,0.15); color: ${AMBER}; border: 1px solid rgba(251,191,36,0.35);
  }
  .shop-state {
    text-align: center; padding: 3rem 1.25rem;
    background: #fff; border-radius: 20px; border: 1.5px dashed #E2E8F0;
  }
  .shop-state h3 { font-family: 'Syne', sans-serif; font-weight: 700; color: ${NAVY}; margin: 12px 0 6px; }
  .shop-state p { color: #64748B; font-size: 0.88rem; max-width: 360px; margin: 0 auto 16px; }
  .retry-btn, .find-agent-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: ${AMBER}; color: ${NAVY}; border: none; border-radius: 12px;
    padding: 10px 18px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem;
    cursor: pointer; text-decoration: none;
  }
  .find-agent-btn { background: transparent; color: ${NAVY}; border: 1.5px solid #E2E8F0; }
  .spinner {
    width: 36px; height: 36px; border: 3px solid #E8EDF5; border-top-color: ${AMBER};
    border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .icon-spin { animation: spin 0.7s linear infinite; }
  .product-meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .meta-chip {
    font-size: 0.65rem; font-weight: 600; padding: 2px 7px; border-radius: 6px;
    background: ${AMBER_LIGHT}; color: ${AMBER_DARK};
  }
  .out-of-stock {
    position: absolute; top: 10px; left: 10px; z-index: 2;
    background: rgba(0,4,53,0.85); color: #fff; font-size: 0.65rem; font-weight: 700;
    padding: 4px 8px; border-radius: 8px;
  }

  @media (max-width: 640px) {
    .products-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .product-img-wrap { height: 130px; }
    .section-title { font-size: 1.2rem; }
    .zoom-product-name { font-size: 1.1rem; }
    .zoom-product-price { font-size: 1.3rem; }
    .header-logo-link img { height: 28px; max-width: 100px; }
    .header-agent-title { max-width: 120px; font-size: 0.62rem; }
    .shop-hero { padding: 1rem; border-radius: 16px; }
    .product-info { padding: 10px 12px 12px; }
    .product-name { font-size: 0.82rem; }
    .add-btn { padding: 6px 10px; font-size: 0.72rem; }
    .shop-header-inner { height: 56px; padding: 0 0.85rem; }
    .cart-btn { padding: 7px 12px; font-size: 0.78rem; }
    .hide-mobile { display: none; }
  }
  @media (min-width: 641px) {
    .hide-mobile { display: inline; }
  }
`;

function ProductMetaChips({ product }) {
  if (!product?.product_type && !product?.product_color) return null;
  return (
    <div className="product-meta">
      {product.product_type && <span className="meta-chip">{product.product_type}</span>}
      {product.product_color && <span className="meta-chip">{product.product_color}</span>}
    </div>
  );
}

function ShopHeader({ back, agentSubtitle, pageTitle, actions }) {
  return (
    <header className="shop-header">
      <div className="shop-header-inner">
        <div className="header-slot-left">{back}</div>
        <div className="header-slot-center">
          <Link to="/" className="header-logo-link">
            <img
              src={babyeyiLogo}
              alt="Babyeyi"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/1BABYEYI LOGO FINAL.png";
              }}
            />
          </Link>
          {agentSubtitle && <span className="header-agent-title">{agentSubtitle}</span>}
          {pageTitle && !agentSubtitle && <span className="header-page-title">{pageTitle}</span>}
        </div>
        <div className="header-slot-right">{actions}</div>
      </div>
    </header>
  );
}

// ─── IMAGE ZOOM MODAL ──────────────────────────────────────────────
function ZoomModal({ product, cart, onAdd, onInc, onDec, onClose }) {
  const [activeImg, setActiveImg] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const imgs = product.images?.length ? product.images : [product.icon_url].filter(Boolean);
  const inCart = cart.find(x => x.service_id === product.id);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="zoom-modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="zoom-modal">
        <button type="button" className="zoom-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="zoom-layout">
          <div className="zoom-gallery">
            <div style={{ overflow: "hidden", borderRadius: 16 }}>
              <img
                className={`zoom-main-img${zoomed ? " zoomed" : ""}`}
                src={toImage(imgs[activeImg]) || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80"}
                alt={product.name}
                onClick={() => setZoomed(z => !z)}
              />
            </div>
            {imgs.length > 1 && (
              <div className="zoom-thumbs">
                {imgs.map((img, i) => (
                  <img
                    key={i}
                    className={`zoom-thumb${activeImg === i ? " active" : ""}`}
                    src={toImage(img)}
                    alt={`View ${i + 1}`}
                    onClick={() => { setActiveImg(i); setZoomed(false); }}
                  />
                ))}
              </div>
            )}
            <p style={{ fontSize: "0.72rem", color: "#94A3B8", marginTop: 8, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <ZoomIn size={12} /> Click image to zoom · {imgs.length} photo{imgs.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="zoom-details">
            <p style={{ fontSize: "0.72rem", fontWeight: 600, color: AMBER_DARK, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Product Detail</p>
            <h2 className="zoom-product-name">{product.name}</h2>
            <p className="zoom-product-price">{Number(product.price || 0).toLocaleString()} <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#94A3B8" }}>RWF</span></p>
            <ProductMetaChips product={product} />
            <p className="zoom-desc">{product.description || product.short_tagline || "No description."}</p>
            {(product.product_type || product.product_color) && (
              <div className="zoom-attrs">
                {product.product_type && (
                  <div>
                    <strong>Type:</strong> {product.product_type}
                  </div>
                )}
                {product.product_color && (
                  <div style={{ marginTop: product.product_type ? 6 : 0 }}>
                    <strong>Color:</strong> {product.product_color}
                  </div>
                )}
              </div>
            )}
            {!inCart ? (
              <button type="button" className="zoom-add-btn" onClick={() => onAdd(product)}>
                <ShoppingCart size={16} /> Add to Cart
              </button>
            ) : (
              <div className="zoom-qty-control">
                <button type="button" className="zoom-qty-btn" onClick={() => onDec(product.id)} aria-label="Decrease">
                  <Minus size={16} />
                </button>
                <span className="zoom-qty-num">{inCart.quantity} in cart</span>
                <button type="button" className="zoom-qty-btn" onClick={() => onInc(product.id)} aria-label="Increase">
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SHOP PAGE ─────────────────────────────────────────────────────
function ShopPage({
  cart,
  onAdd,
  onInc,
  onDec,
  onGoCart,
  agentName,
  sector,
  products,
  loading,
  error,
  onRetry,
}) {
  const [zoomProduct, setZoomProduct] = useState(null);
  const [search, setSearch] = useState("");
  const total = useMemo(() => cart.reduce((s, x) => s + x.price * x.quantity, 0), [cart]);
  const itemsCount = useMemo(() => cart.reduce((s, x) => s + x.quantity, 0), [cart]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        `${p.name} ${p.short_tagline} ${p.product_type || ""} ${p.category || ""}`.toLowerCase().includes(q)
    );
  }, [products, search]);

  const agentSubtitle = `${agentName}${sector ? ` · ${sector}` : ""}`;

  return (
    <>
      <style>{css}</style>
      <ShopHeader
        back={
          <Link to="/find-agent" className="back-btn">
            <ArrowLeft size={14} /> Agents
          </Link>
        }
        agentSubtitle={agentSubtitle}
        actions={
          <button type="button" className="cart-btn" onClick={onGoCart}>
            <ShoppingCart size={16} strokeWidth={2.25} />
            <span className="hide-mobile">Cart</span>
            {itemsCount > 0 && <span className="cart-badge">{itemsCount}</span>}
          </button>
        }
      />

      <main className="products-section">
        <div className="shop-hero">
          <h1>{agentName}&apos;s shop</h1>
          <p>Active products from your field agent — pay securely with Mobile Money after checkout.</p>
          <div className="shop-hero-meta">
            {sector && (
              <span className="hero-chip">
                <MapPin size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                {sector}
              </span>
            )}
            <span className="hero-chip">{products.length} product{products.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {!loading && !error && products.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <input
              className="form-input"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 420 }}
            />
          </div>
        )}

        {loading && (
          <div className="shop-state">
            <div className="spinner" />
            <h3>Loading shop</h3>
            <p>Fetching products from {agentName}…</p>
          </div>
        )}

        {!loading && error && (
          <div className="shop-state">
            <h3>Could not load shop</h3>
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="shop-state">
            <h3>No products yet</h3>
            <p>This agent has not published any active products. Check back later or choose another agent.</p>
            <Link to="/find-agent" className="find-agent-btn">
              Find another agent
            </Link>
          </div>
        )}

        {!loading && !error && products.length > 0 && filtered.length === 0 && (
          <div className="shop-state">
            <h3>No matches</h3>
            <p>Try a different search term.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="products-grid">
            {filtered.map((p) => {
              const inCart = cart.find((x) => x.service_id === p.id);
              const outOfStock = p.stock_quantity != null && Number(p.stock_quantity) <= 0;
              const imgSrc = toImage(p.images?.[0] || p.icon_url);
              return (
                <article key={p.id} className="product-card">
                  <div className="product-img-wrap" onClick={() => setZoomProduct(p)}>
                    {outOfStock && <span className="out-of-stock">Out of stock</span>}
                    <img src={imgSrc || undefined} alt={p.name} loading="lazy" />
                    <div className="product-hover-overlay">
                      <p className="overlay-desc">{(p.short_tagline || p.description || "").slice(0, 100)}…</p>
                      <span className="overlay-zoom-hint">
                        <ZoomIn size={13} strokeWidth={2.5} /> View details
                      </span>
                    </div>
                  </div>
                  <div className="product-info">
                    <h3 className="product-name">{p.name}</h3>
                    <p className="product-tagline">{p.short_tagline || p.description?.slice(0, 60)}</p>
                    <ProductMetaChips product={p} />
                    <div className="product-footer">
                      <div className="product-price">
                        {Number(p.price || 0).toLocaleString()}
                        <small>RWF</small>
                      </div>
                      {outOfStock ? (
                        <span style={{ fontSize: "0.72rem", color: "#94A3B8", fontWeight: 600 }}>Unavailable</span>
                      ) : !inCart ? (
                        <button
                          type="button"
                          className="add-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAdd(p);
                          }}
                        >
                          <Plus size={14} strokeWidth={2.5} /> Add
                        </button>
                      ) : (
                        <div className="qty-control" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="qty-btn" onClick={() => onDec(p.id)} aria-label="Decrease">
                            <Minus size={14} />
                          </button>
                          <span className="qty-num">{inCart.quantity}</span>
                          <button type="button" className="qty-btn" onClick={() => onInc(p.id)} aria-label="Increase">
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {zoomProduct && (
        <ZoomModal
          product={zoomProduct}
          cart={cart}
          onAdd={onAdd}
          onInc={onInc}
          onDec={onDec}
          onClose={() => setZoomProduct(null)}
        />
      )}
    </>
  );
}

// ─── CART PAGE ─────────────────────────────────────────────────────
function CartPage({ cart, onInc, onDec, onRemove, onBack, onCheckout }) {
  const total = useMemo(() => cart.reduce((s, x) => s + x.price * x.quantity, 0), [cart]);
  const itemsCount = useMemo(() => cart.reduce((s, x) => s + x.quantity, 0), [cart]);

  return (
    <>
      <style>{css}</style>
      <ShopHeader
        back={
          <button type="button" className="back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> Back to Shop
          </button>
        }
        pageTitle="Your Cart"
        actions={null}
      />

      <main className="cart-page">
        <h1 className="cart-title">
          Shopping Cart{" "}
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "#94A3B8" }}>
            ({itemsCount} item{itemsCount !== 1 ? "s" : ""})
          </span>
        </h1>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <div className="empty-cart-icon">
              <ShoppingCart size={40} strokeWidth={1.5} color={AMBER_DARK} />
            </div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven&apos;t added anything yet.</p>
            <button type="button" className="proceed-btn" style={{ width: "auto", padding: "12px 28px", display: "inline-flex" }} onClick={onBack}>
              Start Shopping <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-items-list">
              {cart.map(item => (
                <div key={item.service_id} className="cart-item">
                  <img
                    className="cart-item-img"
                    src={toImage(item.image) || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&q=80"}
                    alt={item.name}
                  />
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-price">{item.price.toLocaleString()} RWF each</div>
                    <div style={{ marginTop: 8 }}>
                      <div className="qty-control" style={{ display: "inline-flex" }}>
                        <button type="button" className="qty-btn" onClick={() => onDec(item.service_id)} aria-label="Decrease">
                          <Minus size={14} />
                        </button>
                        <span className="qty-num">{item.quantity}</span>
                        <button type="button" className="qty-btn" onClick={() => onInc(item.service_id)} aria-label="Increase">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="cart-item-subtotal">{(item.price * item.quantity).toLocaleString()}</div>
                  <button type="button" className="cart-remove-btn" onClick={() => onRemove(item.service_id)} title="Remove" aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-title">Order Summary</div>
              <div className="summary-row">
                <span className="summary-label">Subtotal ({itemsCount} items)</span>
                <span className="summary-value">{total.toLocaleString()} RWF</span>
              </div>
              <p style={{ fontSize: "0.72rem", opacity: 0.55, marginBottom: 12, lineHeight: 1.45 }}>
                Home delivery (+2,500 RWF) is added at checkout if you choose delivery at home.
              </p>
              <hr className="summary-divider" />
              <div className="summary-row">
                <span className="summary-label summary-total-label">Subtotal</span>
                <span className="summary-value summary-total-value">{total.toLocaleString()} RWF</span>
              </div>
              <button type="button" className="proceed-btn" onClick={onCheckout}>
                Proceed to Checkout <ArrowRight size={16} />
              </button>
              <button onClick={onBack} style={{ width: "100%", marginTop: 10, background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.82rem", fontFamily: "'DM Sans', sans-serif" }}>
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// ─── CHECKOUT PAGE ─────────────────────────────────────────────────
function CheckoutPage({ cart, agentMeta, onBack, onCheckoutDone }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    studentCode: "",
    buyerName: "",
    buyerContact: "",
    deliveryMode: "AT_SCHOOL",
    deliveryAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const subtotal = useMemo(() => cart.reduce((s, x) => s + x.price * x.quantity, 0), [cart]);
  const deliveryFee = form.deliveryMode === "AT_HOME" ? 2500 : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setErr("");
    if (!form.studentCode.trim() || !form.buyerName.trim() || !form.buyerContact.trim()) {
      setErr("Student code, your name and phone are required.");
      return;
    }
    if (form.deliveryMode === "AT_HOME" && !form.deliveryAddress.trim()) {
      setErr("Home delivery address is required.");
      return;
    }
    if (!agentMeta?.agent_user_id) {
      setErr("Agent information is missing. Go back and open the shop from Find Agent.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/student-services/public/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_user_id: agentMeta.agent_user_id,
          student_code: form.studentCode.trim(),
          buyer_name: form.buyerName.trim(),
          buyer_contact: form.buyerContact.trim(),
          delivery_mode: form.deliveryMode,
          delivery_address: form.deliveryMode === "AT_HOME" ? form.deliveryAddress.trim() : "",
          items: cart.map((x) => ({ service_id: x.service_id, quantity: x.quantity })),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) throw new Error(json.message || "Checkout failed");
      const d = json.data;
      onCheckoutDone();
      navigate("/payments", {
        state: {
          agentShopPay: {
            batchRef: d.batch_ref,
            grandTotal: d.total,
            subtotal: d.subtotal,
            deliveryFee: d.delivery_fee,
            lines: d.lines,
            student: d.student,
            payerName: form.buyerName.trim(),
            payerPhone: form.buyerContact.trim(),
            agentName: agentMeta.agent_name,
          },
        },
      });
    } catch (e) {
      setErr(e.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <ShopHeader
        back={
          <button type="button" className="back-btn" onClick={onBack}>
            <ArrowLeft size={14} /> Back to Cart
          </button>
        }
        pageTitle="Checkout"
        actions={null}
      />

      <main className="checkout-page">
        <div className="checkout-grid">
          <div>
            <div className="checkout-form-card">
              {err && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", borderRadius: 12, padding: "10px 12px", fontSize: "0.82rem", marginBottom: 14 }}>
                  {err}
                </div>
              )}
              <div className="form-section-title">
                <Package size={16} /> Order details
              </div>
              <div className="form-group">
                <label className="form-label">Student code / SDM code *</label>
                <input className="form-input" placeholder="e.g. STU-2024-001" value={form.studentCode} onChange={(e) => handleField("studentCode", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Your full name *</label>
                <input className="form-input" placeholder="Parent or buyer name" value={form.buyerName} onChange={(e) => handleField("buyerName", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone (MoMo) *</label>
                <input className="form-input" placeholder="+250 7XX XXX XXX" value={form.buyerContact} onChange={(e) => handleField("buyerContact", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Delivery *</label>
                <select className="form-input" value={form.deliveryMode} onChange={(e) => handleField("deliveryMode", e.target.value)}>
                  <option value="AT_SCHOOL">At school (no extra fee)</option>
                  <option value="AT_HOME">At home (+2,500 RWF)</option>
                </select>
              </div>
              {form.deliveryMode === "AT_HOME" && (
                <div className="form-group">
                  <label className="form-label">Home address *</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="District, sector, street, phone…"
                    value={form.deliveryAddress}
                    onChange={(e) => handleField("deliveryAddress", e.target.value)}
                    style={{ resize: "vertical", minHeight: 60 }}
                  />
                </div>
              )}

              <div className="checkout-actions">
                <button type="button" className="cancel-btn" onClick={onBack} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="place-order-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={submitting ? { opacity: 0.6, cursor: "not-allowed" } : {}}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="icon-spin" /> Processing…
                    </>
                  ) : (
                    <>
                      Continue to pay · {grandTotal.toLocaleString()} RWF <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>

              <p style={{ fontSize: "0.75rem", color: "#94A3B8", textAlign: "center", marginTop: 12 }}>
                Choose MoMo, bank transfer, or Visa card on the next screen
              </p>
            </div>
          </div>

          <div className="checkout-order-summary">
            <div className="order-summary-title">Order ({cart.length} item{cart.length !== 1 ? "s" : ""})</div>
            {cart.map(item => (
              <div key={item.service_id} className="order-item-row">
                <img className="order-item-img" src={toImage(item.image) || "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&q=80"} alt={item.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="order-item-name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</div>
                  <div className="order-item-qty">Qty: {item.quantity}</div>
                </div>
                <div className="order-item-price">{(item.price * item.quantity).toLocaleString()}</div>
              </div>
            ))}
            <hr style={{ border: "none", borderTop: "1px solid #E8EDF5", margin: "14px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: "0.82rem", color: "#64748B" }}>Subtotal</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{subtotal.toLocaleString()} RWF</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: "0.82rem", color: "#64748B" }}>Delivery</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: deliveryFee === 0 ? "#16A34A" : AMBER_DARK }}>
                {deliveryFee === 0 ? "At school" : `+${deliveryFee.toLocaleString()} RWF`}
              </span>
            </div>
            <div style={{ background: AMBER_LIGHT, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: NAVY }}>Total</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: AMBER_DARK }}>{grandTotal.toLocaleString()} RWF</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ─── SUCCESS PAGE ──────────────────────────────────────────────────
function SuccessPage({ order, onShopAgain }) {
  return (
    <>
      <style>{css}</style>
      <ShopHeader pageTitle="Order placed" actions={null} back={null} />
      <div className="success-page">
        <div className="success-icon-wrap">
          <CheckCircle2 size={40} color={AMBER_DARK} strokeWidth={2} />
        </div>
        <h1 className="success-title">Order Confirmed!</h1>
        <p className="success-sub">Thank you, <strong>{order.firstName}</strong>! Your order has been placed successfully. You'll receive a confirmation shortly.</p>
        <div className="success-order-card">
          <div className="order-number">Order Number</div>
          <div className="order-number-val">{order.orderNo}</div>
          <div style={{ marginTop: 12, fontSize: "0.82rem", opacity: 0.7 }}>
            Total paid: <strong style={{ color: AMBER }}>{order.total.toLocaleString()} RWF</strong>
          </div>
          {order.phone && <div style={{ marginTop: 6, fontSize: "0.8rem", opacity: 0.6 }}>Confirmation to: {order.phone}</div>}
        </div>
        <button type="button" className="proceed-btn" style={{ margin: "0 auto", display: "flex", width: "auto", padding: "12px 28px" }} onClick={onShopAgain}>
          Continue Shopping <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────
export default function AgentShop() {
  const [params] = useSearchParams();
  const agentUserId = params.get("agent_user_id") || "";
  const agentNameFromUrl = params.get("agent_name") || "";
  const sectorFromUrl = params.get("sector") || "";

  const [page, setPage] = useState("shop");
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [agentInfo, setAgentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const agentName = agentNameFromUrl || agentInfo?.name || "Field agent";
  const sector = sectorFromUrl || agentInfo?.sector || "";

  const agentMeta = useMemo(
    () => ({
      agent_user_id: agentUserId ? Number(agentUserId) : null,
      agent_name: agentName,
      sector,
    }),
    [agentUserId, agentName, sector]
  );

  const loadProducts = useCallback(async () => {
    if (!agentUserId) {
      setLoadError("No agent selected. Please find an agent first.");
      setLoading(false);
      setProducts([]);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const { products: list, agent } = await fetchAgentProducts(agentUserId);
      setProducts(list);
      setAgentInfo(agent);
    } catch (e) {
      setLoadError(e.message || "Failed to load shop");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [agentUserId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!agentUserId) return;
    try {
      const raw = sessionStorage.getItem(cartStorageKey(agentUserId));
      if (raw) setCart(JSON.parse(raw));
    } catch {
      setCart([]);
    }
  }, [agentUserId]);

  useEffect(() => {
    if (!agentUserId) return;
    try {
      sessionStorage.setItem(cartStorageKey(agentUserId), JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, agentUserId]);

  const maxQty = useCallback(
    (productId) => {
      const p = products.find((x) => x.id === productId);
      if (p?.stock_quantity == null) return 99;
      return Math.max(0, Number(p.stock_quantity));
    },
    [products]
  );

  const add = useCallback(
    (p) => {
      if (p.stock_quantity != null && Number(p.stock_quantity) <= 0) return;
      setCart((prev) => {
        const hit = prev.find((x) => x.service_id === p.id);
        const cap = p.stock_quantity != null ? Number(p.stock_quantity) : 99;
        if (hit) {
          if (hit.quantity >= cap) return prev;
          return prev.map((x) => (x.service_id === p.id ? { ...x, quantity: x.quantity + 1 } : x));
        }
        return [
          ...prev,
          {
            service_id: p.id,
            name: p.name,
            price: Number(p.price || 0),
            quantity: 1,
            image: p.images?.[0] || p.icon_url || "",
          },
        ];
      });
    },
    []
  );

  const inc = useCallback(
    (id) =>
      setCart((prev) =>
        prev.map((x) => {
          if (x.service_id !== id) return x;
          const cap = maxQty(id);
          if (x.quantity >= cap) return x;
          return { ...x, quantity: x.quantity + 1 };
        })
      ),
    [maxQty]
  );

  const dec = useCallback(
    (id) =>
      setCart((prev) =>
        prev.map((x) => (x.service_id === id ? { ...x, quantity: Math.max(0, x.quantity - 1) } : x)).filter((x) => x.quantity > 0)
      ),
    []
  );

  const remove = useCallback((id) => setCart((prev) => prev.filter((x) => x.service_id !== id)), []);

  const clearCartAfterCheckout = useCallback(() => {
    setCart([]);
    if (agentUserId) {
      try {
        sessionStorage.removeItem(cartStorageKey(agentUserId));
      } catch {
        /* ignore */
      }
    }
  }, [agentUserId]);

  if (!agentUserId && page === "shop") {
    return (
      <>
        <style>{css}</style>
        <ShopHeader
          back={
            <Link to="/find-agent" className="back-btn">
              <ArrowLeft size={14} /> Find agent
            </Link>
          }
          actions={null}
        />
        <main className="products-section">
          <div className="shop-state">
            <h3>Select an agent</h3>
            <p>Open a shop from Find Agent so we can show that agent&apos;s products.</p>
            <Link to="/find-agent" className="retry-btn">
              Find an agent
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (page === "checkout") {
    return (
      <CheckoutPage
        cart={cart}
        agentMeta={agentMeta}
        onBack={() => setPage("cart")}
        onCheckoutDone={clearCartAfterCheckout}
      />
    );
  }
  if (page === "cart") {
    return (
      <CartPage
        cart={cart}
        onInc={inc}
        onDec={dec}
        onRemove={remove}
        onBack={() => setPage("shop")}
        onCheckout={() => setPage("checkout")}
      />
    );
  }

  return (
    <ShopPage
      cart={cart}
      onAdd={add}
      onInc={inc}
      onDec={dec}
      onGoCart={() => setPage("cart")}
      agentName={agentName}
      sector={sector}
      products={products}
      loading={loading}
      error={loadError}
      onRetry={loadProducts}
    />
  );
}