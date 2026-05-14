import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from 'react-dom';
import { useAuth } from "../context/AuthContext";
import { useAcademic } from "../context/AcademicContext";
import {
    Clock, AlertTriangle, TrendingUp,
    Activity, BarChart3, ChevronRight, ChevronDown, Building2,
    DollarSign, Loader2, X, RefreshCw,
    ShieldAlert, Users, Phone, Printer, UserCheck,
    Coins, GraduationCap, UserPlus, FileBarChart2, Receipt, MessageSquare as MessageIcon,
    Download, ShieldCheck, Mars, Venus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from '../services/api';
import { h } from '../utils/href';

// ================================================================
// COLORS
// ================================================================
const NAVY = '#000435';
const GOLD = '#FBBF24';
const WHITE = '#FFFFFF';
const NAVY_LIGHT = 'rgba(0,4,53,0.06)';

// ================================================================
// ANALYTICAL COMPONENTS (kept as-is for compatibility)
// ================================================================
const LineAreaChart = ({ data = [], labelKey = "label", valueKey = "value", color = "#6366f1", height = 140, showGrid = true }) => {
    if (!data.length) return <div className="flex items-center justify-center text-slate-300 text-xs" style={{ height }}>No data</div>;
    const W = 500, H = height, PAD = { top: 16, bottom: 28, left: 36, right: 12 };
    const vals = data.map(d => Number(d[valueKey]) || 0);
    const max = Math.max(...vals, 1);
    const xStep = (W - PAD.left - PAD.right) / (data.length - 1 || 1);
    const toY = v => PAD.top + (1 - (v / max)) * (H - PAD.top - PAD.bottom);
    const toX = i => PAD.left + i * xStep;
    const pts = data.map((d, i) => ({ x: toX(i), y: toY(Number(d[valueKey]) || 0) }));
    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaPath = linePath + ` L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;
    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={`ag${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            {showGrid && [0.25, 0.5, 0.75, 1].map(f => {
                const y = PAD.top + (1 - f) * (H - PAD.top - PAD.bottom);
                return <g key={f}><line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" /><text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{Math.round(max * f)}</text></g>;
            })}
            <path d={areaPath} fill={`url(#ag${color.replace("#", "")})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="2" fill={color} />
                    <text x={p.x} y={H - PAD.bottom + 12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{data[i][labelKey]}</text>
                    <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">{vals[i]}</text>
                </g>
            ))}
        </svg>
    );
};

const DonutChart = ({ data = [], size = 140, centerLabel = null, centerSub = 'TOTAL', onHoverChange = null }) => {
    const [activeSlice, setActiveSlice] = useState(null);
    const interactive = typeof onHoverChange === 'function';
    if (!data.length) return null;
    const total = data.reduce((s, d) => s + d.value, 0);
    const cx = size / 2, cy = size / 2, R = size / 2 - 8, r = R * 0.58;
    if (total === 0) {
        return (
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={R} fill="#f1f5f9" stroke="white" strokeWidth="2" />
                <circle cx={cx} cy={cy} r={r - 4} fill="white" />
                <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{centerLabel != null ? centerLabel : '0'}</text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">{centerSub}</text>
            </svg>
        );
    }
    const slices = data.reduce((acc, d) => {
        const a = (d.value / total) * 2 * Math.PI;
        const angleStart = acc.angle;
        const angleEnd = acc.angle + a;
        const x1 = cx + R * Math.cos(angleStart), y1 = cy + R * Math.sin(angleStart);
        const x2 = cx + R * Math.cos(angleEnd), y2 = cy + R * Math.sin(angleEnd);
        const xi1 = cx + r * Math.cos(angleEnd - a), yi1 = cy + r * Math.sin(angleEnd - a);
        const xi2 = cx + r * Math.cos(angleEnd), yi2 = cy + r * Math.sin(angleEnd);
        const large = a > Math.PI ? 1 : 0;
        acc.list.push({ ...d, path: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1} Z` });
        acc.angle += a;
        return acc;
    }, { angle: -Math.PI / 2, list: [] }).list;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={interactive ? 'cursor-default' : undefined}>
            {slices.map((s, i) => {
                const dimmed = interactive && activeSlice !== null && activeSlice !== i;
                return (
                    <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2"
                        style={{ opacity: dimmed ? 0.38 : 1, filter: interactive && activeSlice === i ? 'brightness(1.06)' : undefined, cursor: interactive ? 'pointer' : undefined }}
                        onMouseEnter={() => { if (!interactive) return; setActiveSlice(i); onHoverChange({ label: s.label, value: s.value, color: s.color, boys: s.boys, girls: s.girls }); }}
                        onMouseLeave={() => { if (!interactive) return; setActiveSlice(null); onHoverChange(null); }}
                    />
                );
            })}
            <circle cx={cx} cy={cy} r={r - 4} fill="white" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">{centerLabel != null ? centerLabel : total}</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8">{centerSub}</text>
        </svg>
    );
};

const CLASS_SLICE_COLORS = [NAVY, GOLD, '#10b981', '#6366f1', '#f43f5e', '#06b6d4', '#a855f7', '#eab308', '#0ea5e9', '#84cc16'];

function formatRwfDashboard(n) {
    const v = Math.round(Number(n) || 0);
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v)} RWF`;
}

// ================================================================
// ✨ NEW: ENROLLMENT BAR CHART
// Shows stacked boys/girls bars per class — clean, mobile-first
// ================================================================
function EnrollmentBarChart({ rows = [], academicLabel = '', termLabel = '' }) {
    const [hovered, setHovered] = useState(null);

    const sorted = useMemo(
        () => [...rows].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 14),
        [rows]
    );
    const totals = useMemo(() => {
        let boys = 0, girls = 0, total = 0;
        rows.forEach((r) => {
            boys += Number(r.boys) || 0;
            girls += Number(r.girls) || 0;
            total += Number(r.value) || 0;
        });
        return { boys, girls, total, unspecified: Math.max(0, total - boys - girls) };
    }, [rows]);

    const maxVal = useMemo(() => Math.max(...sorted.map(r => Number(r.value) || 0), 1), [sorted]);

    if (!rows.length) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>No class enrollment yet</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Assign students to classes in your register.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Summary pills */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `rgba(0,4,53,0.04)`, border: `1.5px solid rgba(0,4,53,0.10)`, borderRadius: 14, padding: '10px 16px', flex: 1, minWidth: 130 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Mars size={15} color={GOLD} />
                    </div>
                    <div>
                        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>Total boys</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: NAVY, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totals.boys.toLocaleString()}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFBEB', border: `1.5px solid rgba(251,191,36,0.35)`, borderRadius: 14, padding: '10px 16px', flex: 1, minWidth: 130 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Venus size={15} color={NAVY} />
                    </div>
                    <div>
                        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>Total girls</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: '#92400e', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totals.girls.toLocaleString()}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '10px 16px', flex: 1, minWidth: 130 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users size={15} color="#475569" />
                    </div>
                    <div>
                        <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#64748b', marginBottom: 2 }}>All students</p>
                        <p style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{totals.total.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: NAVY }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Boys</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: GOLD }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Girls</span>
                </div>
                {totals.unspecified > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: '#cbd5e1' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>Unspecified</span>
                    </div>
                )}
            </div>

            {/* Bar chart */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
                {sorted.map((c, idx) => {
                    const total = Math.max(1, Number(c.value) || 0);
                    const boys = Math.min(Number(c.boys) || 0, total);
                    const girls = Math.min(Number(c.girls) || 0, total);
                    const unspec = Math.max(0, total - boys - girls);
                    const widthPct = (total / maxVal) * 100;
                    const isHovered = hovered === idx;

                    return (
                        <div
                            key={c.label}
                            onMouseEnter={() => setHovered(idx)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                                background: isHovered ? '#f8fafc' : '#fff',
                                border: `1.5px solid ${isHovered ? `rgba(0,4,53,0.14)` : 'rgba(0,4,53,0.06)'}`,
                                borderRadius: 12,
                                padding: '10px 14px',
                                cursor: 'default',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {/* Class name + count */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{c.label}</span>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', flexShrink: 0, marginLeft: 8 }}>
                                    {total.toLocaleString()} students
                                </span>
                            </div>

                            {/* Bar track */}
                            <div style={{ background: '#f1f5f9', borderRadius: 99, height: 10, overflow: 'hidden', width: '100%' }}>
                                <div style={{ display: 'flex', height: '100%', width: `${widthPct}%`, transition: 'width 0.4s ease' }}>
                                    {boys > 0 && (
                                        <div style={{ flex: boys, background: NAVY, borderRadius: '99px 0 0 99px', minWidth: 2 }} title={`Boys: ${boys}`} />
                                    )}
                                    {girls > 0 && (
                                        <div style={{ flex: girls, background: GOLD, borderRadius: boys === 0 ? '99px 0 0 99px' : 0, minWidth: 2 }} title={`Girls: ${girls}`} />
                                    )}
                                    {unspec > 0 && (
                                        <div style={{ flex: unspec, background: '#cbd5e1', borderRadius: '0 99px 99px 0', minWidth: 2 }} title={`Unspecified: ${unspec}`} />
                                    )}
                                </div>
                            </div>

                            {/* Mini counts row */}
                            {isHovered && (
                                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: NAVY }}>♂ {boys.toLocaleString()}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>♀ {girls.toLocaleString()}</span>
                                    {unspec > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>? {unspec.toLocaleString()}</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {rows.length > sorted.length && (
                <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#94a3b8', marginTop: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Showing top {sorted.length} of {rows.length} classes
                </p>
            )}
        </div>
    );
}

// ================================================================
// ✨ NEW: STUDENTS BY CLASS BAR CHART
// Replaces the donut — grouped horizontal bars
// ================================================================
function ClassBarChart({ data = [] }) {
    const totalStudents = data.reduce((s, c) => s + (c.value || 0), 0);

    if (!data.length) {
        return (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                <BarChart3 size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 13, fontWeight: 600 }}>No class distribution yet</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                    {data.length} classes · <span style={{ color: NAVY, fontWeight: 800 }}>{totalStudents.toLocaleString()} total</span>
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: NAVY }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Boys</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: GOLD }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Girls</span>
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto', paddingRight: 2 }}>
                {data.map((c) => {
                    const boys = Number(c.boys) || 0;
                    const girls = Number(c.girls) || 0;
                    const total = c.value || 0;

                    return (
                        <div
                            key={c.label}
                            style={{
                                padding: '8px 10px',
                                borderRadius: 10,
                                background: '#fafafa',
                                border: '1px solid rgba(0,4,53,0.06)',
                            }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,4.5rem) minmax(0,1fr) auto auto', alignItems: 'center', gap: 8, columnGap: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, width: 72, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                                <div style={{ minWidth: 0, height: 18, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                                    {boys > 0 && (
                                        <div style={{ flex: boys, background: NAVY, borderRadius: girls === 0 ? 6 : '6px 0 0 6px', minWidth: 2 }} />
                                    )}
                                    {girls > 0 && (
                                        <div style={{ flex: girls, background: GOLD, borderRadius: boys === 0 ? 6 : '0 6px 6px 0', minWidth: 2 }} />
                                    )}
                                    {total === 0 && (
                                        <div style={{ flex: 1, background: '#e2e8f0' }} />
                                    )}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', width: 28, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{total}</span>
                                <span style={{ fontSize: 9, fontWeight: 600, color: '#64748b', flexShrink: 0, width: 76, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                    <span style={{ color: NAVY }}>♂{boys}</span>
                                    <span style={{ color: '#cbd5e1' }}> · </span>
                                    <span style={{ color: '#92400e' }}>♀{girls}</span>
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ================================================================
// ✨ NEW: FEE COLLECTION BAR CHART
// Replaces the donut — clear collected / outstanding / remaining bars
// ================================================================
function FeeCollectionBarChart({ termFinance, feeLayout, feeTermCaption, canReadTermFees }) {
    const { expected, collected, outstanding } = termFinance;
    const remaining = feeLayout.remainingVsTerm;

    const bars = [
        { key: 'collected', label: 'Collected', value: collected, color: NAVY, icon: Receipt, pct: expected > 0 ? (collected / expected) * 100 : 0 },
        { key: 'outstanding', label: 'Outstanding', value: outstanding, color: GOLD, icon: DollarSign, pct: expected > 0 ? (outstanding / expected) * 100 : 0 },
        { key: 'remaining', label: 'Remaining', value: Math.max(0, remaining - outstanding), color: '#cbd5e1', icon: Coins, pct: expected > 0 ? (Math.max(0, remaining - outstanding) / expected) * 100 : 0 },
    ];

    const maxBar = Math.max(...bars.map(b => b.value), 1);

    if (!canReadTermFees) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 24px', color: '#94a3b8' }}>
                <Receipt size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Fee totals unavailable</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Sign in as manager, admin, or accountant.</p>
            </div>
        );
    }

    return (
        <div>
            {/* Collection rate headline */}
            <div style={{
                background: NAVY, borderRadius: 14, padding: '16px 20px', marginBottom: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Collection rate</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: GOLD, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{feeLayout.pct}%</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>of {feeTermCaption || 'term'} expected</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Expected</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: WHITE, fontVariantNumeric: 'tabular-nums' }}>{formatRwfDashboard(expected)}</p>
                </div>
            </div>

            {/* Progress track */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ height: 12, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                    {collected > 0 && (
                        <div style={{ flex: collected, background: NAVY, borderRadius: outstanding === 0 ? 99 : '99px 0 0 99px', transition: 'flex 0.5s ease', minWidth: 4 }} />
                    )}
                    {outstanding > 0 && (
                        <div style={{ flex: outstanding, background: GOLD, borderRadius: collected === 0 ? '99px 0 0 99px' : 0, transition: 'flex 0.5s ease', minWidth: 4 }} />
                    )}
                    {remaining - outstanding > 0 && (
                        <div style={{ flex: remaining - outstanding, background: '#e2e8f0', borderRadius: '0 99px 99px 0', transition: 'flex 0.5s ease', minWidth: 2 }} />
                    )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: NAVY }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Collected</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: GOLD }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>Outstanding</span>
                        </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>Remaining</span>
                </div>
            </div>

            {/* Horizontal bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bars.map((b) => {
                    const barW = maxBar > 0 ? (b.value / maxBar) * 100 : 0;
                    return (
                        <div key={b.key} style={{ background: '#f8fafc', border: '1.5px solid rgba(0,4,53,0.06)', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 8, background: b.color === GOLD ? '#FFFBEB' : b.color === NAVY ? 'rgba(0,4,53,0.08)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <b.icon size={13} color={b.color === '#cbd5e1' ? '#94a3b8' : b.color} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{b.label}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 13, fontWeight: 800, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{formatRwfDashboard(b.value)}</p>
                                    <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{b.pct.toFixed(1)}% of expected</p>
                                </div>
                            </div>
                            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${barW}%`, background: b.color, borderRadius: 99, transition: 'width 0.5s ease' }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {feeLayout.reconciliationGap > 0 && (
                <div style={{ marginTop: 14, background: '#FFFBEB', border: `1.5px solid rgba(251,191,36,0.3)`, borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#92400e' }}>
                        ⚠ Reconciliation gap: {formatRwfDashboard(feeLayout.reconciliationGap)} (remaining vs card balances)
                    </p>
                </div>
            )}
        </div>
    );
}

// ================================================================
// UTILS
// ================================================================
function sparkSeriesDeltaPct(spark = []) {
    const vals = spark.map((d) => Number(d?.value) || 0).filter((_, i, a) => a.length >= 2);
    if (vals.length < 2) return null;
    const a = vals[0], b = vals[vals.length - 1];
    if (!a && !b) return null;
    if (!a) return '+100%';
    const p = Math.round(((b - a) / Math.max(a, 1)) * 1000) / 10;
    return `${p >= 0 ? '+' : ''}${p}%`;
}

function getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getCurrentTerm() {
    const month = new Date().getMonth() + 1;
    if (month <= 4) return 'Term 2';
    if (month <= 8) return 'Term 3';
    return 'Term 1';
}

function formatDateTime(value) {
    if (!value) return 'No time';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return 'No time';
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRelativeShort(value) {
    if (!value) return 'Just now';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const sec = Math.round((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.round(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.round(min / 60);
    if (hr < 48) return `${hr}h ago`;
    return `${Math.round(hr / 24)}d ago`;
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

const DEFAULT_TOTAL_MARKS = 100;
function getMarksPct(student, totalMarks) {
    const raw = toNumber(student?.marks_remaining, 0);
    if (raw <= 100 && totalMarks > 100) return raw;
    if (!totalMarks) return raw;
    return Math.max(0, Math.min(100, (raw / totalMarks) * 100));
}

// ================================================================
// DASHBOARD
// ================================================================
const Dashboard = () => {
    const { manager } = useAuth();
    const navigate = useNavigate();
    const academic = useAcademic();

    const roleTokens = useMemo(() => {
        const set = new Set();
        const add = (v) => { const s = String(v || '').trim().toUpperCase(); if (s) set.add(s); };
        add(manager?.role); add(manager?.user_type); add(manager?.staff_role); add(manager?.account_type);
        (Array.isArray(manager?.roles) ? manager.roles : []).forEach(add);
        return set;
    }, [manager]);

    const canUseDiscipline = useMemo(() => ['HOD', 'HEAD_OF_DISCIPLINE', 'DISCIPLINE', 'DISCIPLINE_STAFF'].some((r) => roleTokens.has(r)), [roleTokens]);
    const canUseAccountant = useMemo(() => roleTokens.has('ACCOUNTANT'), [roleTokens]);
    const canReadTermFees = useMemo(() => ['ACCOUNTANT', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN'].some((r) => roleTokens.has(r)), [roleTokens]);

    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [filters, setFilters] = useState({ academic_year: getCurrentAcademicYear(), term: getCurrentTerm() });

    useEffect(() => {
        if (!academic.loading && academic.currentTerm && academic.academicYear) {
            setFilters(prev => ({
                academic_year: prev.academic_year === getCurrentAcademicYear() ? academic.academicYear : prev.academic_year,
                term: prev.term === getCurrentTerm() ? academic.currentTerm : prev.term,
            }));
        }
    }, [academic.loading, academic.currentTerm, academic.academicYear]);

    const [stats, setStats] = useState({
        core: [{ label: "Total Students", value: "0" }, { label: "Teaching Staff", value: "0" }, { label: "Global Attendance", value: "0%" }, { label: "Institutional GPA", value: "0%" }],
        recentActivity: [],
        attendanceOverview: { present: 0, absent: 0, boys: { count: 0, percentage: 0 }, girls: { count: 0, percentage: 0 }, sparkline: [{ value: 0 }], gateToday: { students_in: 0, staff_in: 0 } },
        revenue30d: 0,
        collections14d: [],
        termFinance: { expected: 0, collected: 0, outstanding: 0 },
        academicOverview: { exceptional: 0, expected: 0, needsReview: 0, hasRealData: false, boys: { count: "0", percentage: 0 }, girls: { count: "0", percentage: 0 }, sparkline: [{ value: 0 }] },
        termTrend: [],
        feeByClass: [],
    });

    const [disData, setDisData] = useState({ totalMarks: DEFAULT_TOTAL_MARKS, reportSummary: null, permissions: [], students: [] });
    const [attendanceModal, setAttendanceModal] = useState(null);
    const [attendanceRows, setAttendanceRows] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    const [insightModal, setInsightModal] = useState(null);
    const [casesRows, setCasesRows] = useState([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [casesError, setCasesError] = useState(null);
    const [heroDropdown, setHeroDropdown] = useState(null);
    const [feeReportFilters, setFeeReportFilters] = useState(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        const { academic_year, term } = filters;
        try {
            const [managerRes, reportRes, permissionsRes, settingsRes, studentsRes, financeRes, termFinanceRes, enrollmentRes] = await Promise.allSettled([
                api.get('/dos/dashboard/stats'),
                canUseDiscipline ? api.get('/discipline/report-summary', { params: { academic_year, term } }) : Promise.resolve({ data: { success: false } }),
                api.get('/permissions'),
                canUseDiscipline ? api.get('/discipline/settings') : Promise.resolve({ data: { success: false } }),
                canUseDiscipline ? api.get('/discipline/students-summary', { params: { academic_year, term } }) : Promise.resolve({ data: { success: false } }),
                canReadTermFees ? api.get('/accountant/overview') : Promise.resolve({ data: { success: false } }),
                canReadTermFees ? api.get('/accountant/reports/payments', { params: { academic_year, term } }) : Promise.resolve({ data: { success: false } }),
                api.get('/dos/class-enrollment'),
            ]);

            if (managerRes.status === 'fulfilled' && managerRes.value.data?.success) {
                const d = managerRes.value.data.data;
                setStats(prev => ({
                    ...prev,
                    core: [
                        { label: "Total Students", value: (d.totalStudents || 0).toLocaleString() },
                        { label: "Teaching Staff", value: (d.totalTeachingStaff || 0).toLocaleString() },
                        { label: "Global Attendance", value: `${d.globalAttendance}%` },
                        { label: "Institutional GPA", value: `${d.institutionalGPA}%` },
                    ],
                    recentActivity: d.activityLog || [],
                    attendanceOverview: d.attendanceOverview ? { ...prev.attendanceOverview, ...d.attendanceOverview } : prev.attendanceOverview,
                    academicOverview: d.academicOverview || prev.academicOverview,
                    termTrend: d.termTrend || [],
                    feeByClass: d.feeByClass || [],
                }));
            }

            if (financeRes.status === 'fulfilled' && financeRes.value.data?.success) {
                const fin = financeRes.value.data.data;
                const collections14d = (fin.collections_last_14_days || []).map(d => ({
                    label: d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '',
                    value: Number(d.total_paid) || 0,
                }));
                setStats(p => ({ ...p, revenue30d: fin.last_30_days_total_paid || 0, collections14d }));
            }

            if (termFinanceRes.status === 'fulfilled' && termFinanceRes.value.data?.success) {
                const report = termFinanceRes.value.data.data || {};
                const rows = report.rows || [];
                const summary = rows.reduce((acc, r) => ({
                    expected: acc.expected + (Number(r.total_due) || 0),
                    collected: acc.collected + (Number(r.total_paid) || 0),
                    outstanding: acc.outstanding + (Number(r.remaining) || 0),
                }), { expected: 0, collected: 0, outstanding: 0 });
                setStats(p => ({ ...p, termFinance: summary }));
                setFeeReportFilters(report.filters || null);
            } else {
                setFeeReportFilters(null);
            }

            if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.data?.success) {
                const { rows: classRows } = enrollmentRes.value.data.data;
                if (classRows?.length > 0) {
                    setStats(p => ({
                        ...p, feeByClass: classRows.map(r => ({
                            label: r.class_name,
                            value: Number(r.student_count) || 0,
                            boys: Number(r.boys_count) || 0,
                            girls: Number(r.girls_count) || 0,
                        }))
                    }));
                }
            }

            const reportSummary = reportRes.status === 'fulfilled' && reportRes.value.data?.success ? reportRes.value.data.data : null;
            const permissions = permissionsRes.status === 'fulfilled' && permissionsRes.value.data?.success ? permissionsRes.value.data.data : [];
            const studentsRaw = studentsRes.status === 'fulfilled' && studentsRes.value.data?.success ? studentsRes.value.data.data : [];
            const students = studentsRaw.map(s => ({ ...s, marks_remaining: s.discipline_remaining }));
            const totalMarks = settingsRes.status === 'fulfilled' && settingsRes.value.data?.success ? toNumber(settingsRes.value.data.data?.total_marks, DEFAULT_TOTAL_MARKS) : DEFAULT_TOTAL_MARKS;

            setDisData({ totalMarks, reportSummary, permissions, students });
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setLoading(false);
        }
    }, [filters, canUseDiscipline, canReadTermFees]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);

    const disDerived = useMemo(() => {
        const totalMarks = disData.totalMarks || DEFAULT_TOTAL_MARKS;
        const students = disData.students || [];
        const permissions = disData.permissions || [];
        const reportSummary = disData.reportSummary;
        const criticalStudents = students.filter((s) => getMarksPct(s, totalMarks) < 50);
        const warningStudents = students.filter((s) => { const p = getMarksPct(s, totalMarks); return p >= 50 && p < 75; });
        const atRiskStudents = criticalStudents.concat(warningStudents);
        const now = lastUpdated ? new Date(lastUpdated).getTime() : 0;
        const activePermsCount = permissions.filter((p) => { const ends = new Date(p.ends_at || p.end_date || p.updated_at).getTime(); return p.status !== 'REJECTED' && (!Number.isFinite(ends) || ends >= now); }).length;
        const classTrend = (reportSummary?.by_class || []).map((row) => ({ label: row.class_name || 'Class', value: toNumber(row.case_count, 0) })).sort((a, b) => b.value - a.value).slice(0, 6);
        return {
            studentCount: students.length, casesToday: toNumber(reportSummary?.case_count, 0), atRiskCount: atRiskStudents.length, activePermissions: activePermsCount,
            demographics: reportSummary?.demographics || { boys: 0, girls: 0 }, attendanceToday: reportSummary?.attendance_today || { absent: 0, missed_courses: 0 },
            atRiskRows: atRiskStudents.map(s => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, uid: s.student_uid, pct: Math.round(getMarksPct(s, totalMarks)), tone: getMarksPct(s, totalMarks) < 50 ? 'critical' : 'warning' })),
            classTrend,
        };
    }, [disData, lastUpdated]);

    const feeLayout = useMemo(() => {
        const { expected, collected, outstanding } = stats.termFinance;
        const pct = expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0;
        const remainingVsTerm = Math.max(0, expected - collected);
        const reconciliationGap = Math.max(0, remainingVsTerm - outstanding);
        const slices = [];
        if (collected > 0) slices.push({ label: 'Collected', value: collected, color: NAVY });
        if (outstanding > 0) slices.push({ label: 'Outstanding', value: outstanding, color: GOLD });
        if (reconciliationGap > 0) slices.push({ label: 'Remaining', value: reconciliationGap, color: '#94a3b8' });
        if (!slices.length && expected > 0) slices.push({ label: 'Outstanding', value: Math.max(outstanding, expected), color: GOLD });
        if (!slices.length) slices.push({ label: 'Collected', value: Math.max(collected, 0.0001), color: '#e8edf3' });
        return { slices, pct, remainingVsTerm, reconciliationGap };
    }, [stats.termFinance]);

    const classDistribution = useMemo(() =>
        stats.feeByClass.map((c, i) => ({
            label: c.label, value: Number(c.value) || 0, boys: Number(c.boys) || 0, girls: Number(c.girls) || 0,
            color: CLASS_SLICE_COLORS[i % CLASS_SLICE_COLORS.length],
        })),
        [stats.feeByClass]
    );

    const feeTermCaption = useMemo(() => {
        const ay = feeReportFilters?.academic_year || filters.academic_year;
        const tm = feeReportFilters?.term || filters.term;
        return [ay, tm].filter(Boolean).join(' · ');
    }, [feeReportFilters, filters]);

    const activityFeed = useMemo(() => {
        const raw = Array.isArray(stats.recentActivity) ? stats.recentActivity : [];
        return raw.slice(0, 8).map((a, i) => {
            if (typeof a === 'string') return { id: `s-${i}`, title: a, subtitle: '', ts: null, tone: 'neutral' };
            return { id: a.id ?? `a-${i}`, title: a.message || a.description || a.title || a.action || a.type || 'School activity', subtitle: a.details || a.class_name || a.user || a.module || '', ts: a.created_at || a.timestamp || a.time || a.date || null, tone: a.severity || a.kind || 'neutral' };
        });
    }, [stats.recentActivity]);

    const studentSparkDelta = sparkSeriesDeltaPct(stats.termTrend) ?? sparkSeriesDeltaPct(stats.academicOverview.sparkline);
    const feesSparkDelta = sparkSeriesDeltaPct(stats.collections14d);

    const dashHeroStats = useMemo(() => ([
        { label: 'Total students', value: stats.core[0].value, subValue: studentSparkDelta, icon: Users, onClick: () => navigate(h('/students')) },
        {
            label: 'Fees collected', icon: Coins,
            value: stats.termFinance.collected > 1_000_000 ? `${(stats.termFinance.collected / 1_000_000).toFixed(1)}M RWF` : `${stats.termFinance.collected.toLocaleString()} RWF`,
            subValue: feesSparkDelta || `${feeLayout.pct}% of term expected`,
            onClick: () => navigate(h('/finance/payments')),
        },
        { label: 'Active classes', value: String(classDistribution.length || 0), subValue: 'Enrolled cohorts', icon: GraduationCap, onClick: () => navigate(h('/reports/academic')) },
        { label: 'Teachers', value: stats.core[1].value, subValue: 'Teaching personnel', icon: UserCheck, onClick: () => navigate(h('/hr')) },
    ]), [stats.core, stats.termFinance.collected, classDistribution.length, studentSparkDelta, feesSparkDelta, feeLayout.pct, navigate]);

    const quickActionItems = useMemo(() => ([
        { label: 'Add / review students', path: '/students' },
        { label: 'Collect fees', path: '/finance/payments' },
        { label: 'Academic reports', path: '/reports/academic' },
        { label: 'Invoices wizard', path: '/finance/wizard' },
        { label: 'Messages', path: '/chat' },
    ]), []);

    const openAttendanceModal = useCallback(async (kind) => {
        setAttendanceModal(kind); setAttendanceRows([]); setAttendanceError(null); setAttendanceLoading(true);
        if (!canUseDiscipline) { setAttendanceError('Not available for your role.'); setAttendanceLoading(false); return; }
        try {
            const res = await api.get('/discipline/attendance-today-details', { params: { kind } });
            if (res.data?.success) setAttendanceRows(res.data.data || []);
            else setAttendanceError(res.data?.message || 'Failed to load.');
        } catch { setAttendanceError('Failed to load attendance details.'); }
        finally { setAttendanceLoading(false); }
    }, [canUseDiscipline]);

    const openCasesModal = useCallback(async () => {
        setInsightModal('cases'); setCasesRows([]); setCasesError(null); setCasesLoading(true);
        if (!canUseDiscipline) { setCasesError('Not available for your role.'); setCasesLoading(false); return; }
        try {
            const res = await api.get('/discipline/cases', { params: { academic_year: filters.academic_year, term: filters.term, limit: 80 } });
            if (res.data?.success) setCasesRows(res.data.data || []);
            else setCasesError(res.data?.message || 'Failed to load cases.');
        } catch { setCasesError('Failed to load cases.'); }
        finally { setCasesLoading(false); }
    }, [filters, canUseDiscipline]);

    const ModalShell = ({ title, subtitle, onClose, children }) => createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,4,53,0.45)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: WHITE, width: '100%', maxWidth: 600, maxHeight: '90vh', borderRadius: 24, border: '1.5px solid rgba(0,4,53,0.10)', boxShadow: '0 24px 80px rgba(0,4,53,0.20)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ background: NAVY, padding: '20px 24px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, marginBottom: 4 }}>{subtitle}</p>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>{title}</h3>
                        </div>
                        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.10)', border: 'none', cursor: 'pointer', color: WHITE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
            </div>
        </div>,
        document.body
    );

    if (loading && !stats.core[0].value) return (
        <div className="min-h-screen flex items-center justify-center bg-re-bg">
            <RefreshCw className="animate-spin text-re-navy" />
        </div>
    );

    const cardStyle = {
        background: WHITE,
        border: '1.5px solid rgba(0,4,53,0.08)',
        borderRadius: 20,
        padding: '20px 22px',
        boxShadow: '0 4px 20px rgba(0,4,53,0.06)',
    };

    const sectionHeadingStyle = {
        fontSize: 14,
        fontWeight: 800,
        color: NAVY,
        letterSpacing: '-0.01em',
        marginBottom: 4,
    };

    const sectionSubStyle = {
        fontSize: 11,
        color: '#64748b',
        fontWeight: 500,
        marginBottom: 0,
    };

    return (
        <div className="animate-in fade-in duration-500 bg-re-bg min-h-full pb-24 lg:pb-10">
            {/* Modals */}
            {attendanceModal && (
                <ModalShell title={attendanceModal === 'absent' ? 'Absent Learners' : 'Missed Courses'} subtitle="Attendance Today" onClose={() => setAttendanceModal(null)}>
                    {attendanceError && <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, color: '#9f1239', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>{attendanceError}</div>}
                    {attendanceLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="animate-spin" /></div> :
                        attendanceRows.map(r => (
                            <div key={r.id} style={{ padding: '12px 16px', border: '1.5px solid rgba(0,4,53,0.07)', borderRadius: 14, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{r.first_name} {r.last_name}</p>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{r.class_name}</p>
                                </div>
                                <a href={`tel:${r.father_phone || r.mother_phone}`} style={{ height: 34, padding: '0 12px', borderRadius: 10, border: '1.5px solid rgba(0,4,53,0.12)', background: WHITE, display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: NAVY, textDecoration: 'none' }}>
                                    <Phone size={12} color={GOLD} /> Call
                                </a>
                            </div>
                        ))
                    }
                </ModalShell>
            )}

            {insightModal && (
                <ModalShell title={insightModal === 'cases' ? 'Discipline Cases' : 'At-Risk Learners'} subtitle="Intelligence Insight" onClose={() => setInsightModal(null)}>
                    {insightModal === 'cases' && casesError && <div style={{ padding: '10px 14px', background: '#fff1f2', borderRadius: 10, color: '#9f1239', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>{casesError}</div>}
                    {insightModal === 'cases' ? (
                        casesLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="animate-spin" /></div> :
                            casesRows.map(c => (
                                <div key={c.id} style={{ padding: '12px 16px', border: '1.5px solid rgba(0,4,53,0.07)', borderRadius: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{c.first_name} {c.last_name}</p>
                                        <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{c.class_name} · {formatDateTime(c.created_at)}</p>
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e11d48' }}>-{c.marks_deducted}</span>
                                </div>
                            ))
                    ) : disDerived.atRiskRows.map(r => (
                        <div key={r.id} style={{ padding: '12px 16px', border: '1.5px solid rgba(0,4,53,0.07)', borderRadius: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{r.name}</p>
                            <span style={{ fontSize: 14, fontWeight: 700, color: r.tone === 'critical' ? '#e11d48' : '#d97706' }}>{r.pct}%</span>
                        </div>
                    ))}
                </ModalShell>
            )}

            {/* ── High-Fidelity Hero Section (same institutional pattern as HR Central) ── */}
            <div className="relative w-full min-h-[220px] overflow-hidden bg-[#c87800]">
                <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

                <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-12 pb-16 flex items-center gap-8">
                    <div className="space-y-1 max-w-3xl">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-5 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
                            <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>School operations</p>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Manager dashboard
                        </h1>
                        
                        {(manager?.school?.name || manager?.first_name) && (
                            <p className="text-[10px] font-semibold text-white/50 max-w-lg pt-2 tracking-wide uppercase">
                                {[manager?.first_name, manager?.last_name].filter(Boolean).join(' ')}
                                {manager?.school?.name ? (
                                    <>
                                        {(manager?.first_name || manager?.last_name) ? ' · ' : ''}
                                        {manager.school.name}
                                    </>
                                ) : null}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── HERO STATS BAR (card overlap matches HR Central) ── */}
            <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 mb-6 sm:mb-8">
                <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
                    <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                        <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
                            {dashHeroStats.map((stat) => (
                                <button key={stat.label} type="button" onClick={stat.onClick}
                                    className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all cursor-pointer min-h-[7.5rem]"
                                >
                                    <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: GOLD }}>
                                        <stat.icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} />
                                    </div>
                                    <span className="text-sm sm:text-lg font-semibold tabular-nums tracking-tight leading-snug" style={{ color: NAVY }}>{stat.value}</span>
                                    <p className="text-[7px] sm:text-[8px] font-semibold uppercase tracking-[0.12em] mt-0.5 opacity-65 text-re-text-muted">{stat.label}</p>
                                    {stat.subValue && (
                                        <p className={`text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 opacity-80 max-w-[11rem] ${String(stat.subValue).startsWith('-') ? 'text-rose-600' : ''}`} style={{ color: String(stat.subValue).startsWith('-') ? undefined : NAVY }}>
                                            {stat.subValue}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                            {/* Export dropdown */}
                            <div className="relative">
                                <button type="button" onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                                    className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm active:scale-95 transition-all"
                                    style={{ background: NAVY }}
                                >
                                    <Download size={14} /><span>Export records</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${heroDropdown === 'export' ? 'rotate-180' : ''}`} />
                                </button>
                                {heroDropdown === 'export' && (
                                    <>
                                        <button type="button" className="fixed inset-0 z-[40] cursor-default bg-transparent" onClick={() => setHeroDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                                            <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                                                onClick={() => { window.print(); setHeroDropdown(null); }}>
                                                <Printer size={14} style={{ color: GOLD }} /> Print overview
                                            </button>
                                            <button type="button" className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                                                onClick={() => { navigate(h('/reports/academic')); setHeroDropdown(null); }}>
                                                <FileBarChart2 size={14} style={{ color: GOLD }} /> Open academic reports
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            {/* Quick actions */}
                            <div className="relative">
                                <button type="button" onClick={() => setHeroDropdown(heroDropdown === 'quick' ? null : 'quick')}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
                                >
                                    <ShieldCheck size={14} style={{ color: GOLD }} /><span>Quick actions</span>
                                    <ChevronDown size={12} className={`transition-transform duration-300 ${heroDropdown === 'quick' ? 'rotate-180' : ''}`} />
                                </button>
                                {heroDropdown === 'quick' && (
                                    <>
                                        <button type="button" className="fixed inset-0 z-[40] cursor-default bg-transparent" onClick={() => setHeroDropdown(null)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200 max-h-[20rem] overflow-y-auto">
                                            {quickActionItems.map((item) => (
                                                <button key={item.path} type="button"
                                                    className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors border-t border-black/5 first:border-t-0"
                                                    onClick={() => { navigate(h(item.path)); setHeroDropdown(null); }}>
                                                    {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                            <button type="button" onClick={() => { loadDashboard(); setHeroDropdown(null); }}
                                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest border transition-all"
                                style={{ color: NAVY, borderColor: `rgba(251,191,36,0.4)`, background: `rgba(251,191,36,0.12)` }}
                            >
                                <RefreshCw size={14} /> Refresh data
                            </button>
                        </div>
                    </div>

                    {/* Mobile CTAs */}
                    <div className="lg:hidden grid grid-cols-2 gap-2 p-4 border-b border-black/5 bg-white">
                        <div className="relative">
                            <button type="button" onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                                className="w-full h-10 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm"
                                style={{ background: NAVY }}>
                                <Download size={14} /> Export <ChevronDown size={11} className={heroDropdown === 'export' ? 'rotate-180' : ''} />
                            </button>
                            {heroDropdown === 'export' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-xl overflow-hidden py-1 z-[50]">
                                    <button type="button" className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50" onClick={() => { window.print(); setHeroDropdown(null); }}>Print overview</button>
                                    <button type="button" className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50 border-t border-black/5" onClick={() => { navigate(h('/reports/academic')); setHeroDropdown(null); }}>Academic reports</button>
                                </div>
                            )}
                        </div>
                        <div className="relative">
                            <button type="button" onClick={() => setHeroDropdown(heroDropdown === 'quick' ? null : 'quick')}
                                className="w-full h-10 flex items-center justify-center gap-2 border rounded-xl font-medium text-[9px] uppercase tracking-widest"
                                style={{ color: NAVY, borderColor: `rgba(251,191,36,0.4)`, background: `rgba(251,191,36,0.12)` }}>
                                Quick actions <ChevronDown size={11} className={heroDropdown === 'quick' ? 'rotate-180' : ''} />
                            </button>
                            {heroDropdown === 'quick' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-xl overflow-hidden py-1 z-[50] max-h-56 overflow-y-auto">
                                    {quickActionItems.map((item) => (
                                        <button key={item.path} type="button" className="w-full text-left px-3 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 border-t border-black/5 first:border-t-0" onClick={() => { navigate(h(item.path)); setHeroDropdown(null); }}>{item.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {heroDropdown && <button type="button" className="fixed inset-0 z-[35] lg:hidden bg-transparent cursor-default" onClick={() => setHeroDropdown(null)} />}

            {/* ── MAIN CONTENT ── */}
            <div className="px-6 md:px-12 py-5 sm:py-7 max-w-[1600px] mx-auto space-y-6 sm:space-y-8">

                {/* Discipline shortcuts */}
                {canUseDiscipline && (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openAttendanceModal('absent')}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-re-gold/40">
                            <Clock size={14} /> Absent today <span style={{ color: GOLD, fontWeight: 700 }}>{disDerived.attendanceToday.absent}</span>
                        </button>
                        <button type="button" onClick={() => openAttendanceModal('missed')}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:ring-re-gold/40">
                            <AlertTriangle size={14} /> Missed courses <span className="text-rose-600 font-bold">{disDerived.attendanceToday.missed_courses}</span>
                        </button>
                        <button type="button" onClick={() => openCasesModal()}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm"
                            style={{ background: NAVY }}>
                            <ShieldAlert size={14} /> Discipline cases
                        </button>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════
                    ENROLLMENT OVERVIEW — bar chart (full width)
                ══════════════════════════════════════════════════ */}
                <section>
                    <div style={{ ...cardStyle }}>
                        {/* Card header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                            <div>
                                <h2 style={sectionHeadingStyle}>Enrollment overview</h2>
                                <p style={sectionSubStyle}>Boys and girls per class · live register counts{feeTermCaption ? ` · ${feeTermCaption}` : ''}</p>
                            </div>
                            <div style={{ background: '#f8fafc', border: '1.5px solid rgba(0,4,53,0.07)', borderRadius: 12, padding: '8px 14px', textAlign: 'right' }}>
                                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 }}>Context</p>
                                <p style={{ fontSize: 11, fontWeight: 700, color: NAVY }}>{feeTermCaption || 'Academic year / term'}</p>
                            </div>
                        </div>
                        <EnrollmentBarChart rows={classDistribution} academicLabel={feeReportFilters?.academic_year || filters.academic_year} termLabel={feeReportFilters?.term || filters.term} />
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    STUDENTS BY CLASS + FEE COLLECTION — side by side
                ══════════════════════════════════════════════════ */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 20 }}>

                    {/* Students by class bar chart */}
                    {/* <div style={cardStyle}>
                        <div style={{ marginBottom: 18 }}>
                            <h2 style={sectionHeadingStyle}>Students by class</h2>
                            <p style={sectionSubStyle}>Boys and girls per class — counts shown on each row</p>
                        </div>
                        <ClassBarChart data={classDistribution} />
                    </div> */}

                    {/* Fee collection bar chart */}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                            <div>
                                <h2 style={sectionHeadingStyle}>Fee collection summary</h2>
                                <p style={sectionSubStyle}>Student fee ledger · {feeTermCaption || `${filters.academic_year} · ${filters.term}`}</p>
                            </div>
                        </div>
                        <FeeCollectionBarChart termFinance={stats.termFinance} feeLayout={feeLayout} feeTermCaption={feeTermCaption} canReadTermFees={canReadTermFees} />
                        <Link to={h('/finance')} style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: NAVY, textDecoration: 'none' }}>
                            Open finance center <ChevronRight size={15} />
                        </Link>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    BOTTOM ROW: Quick access + Recent activities
                ══════════════════════════════════════════════════ */}
                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 20 }}>
                    {/* Quick access */}
                    <div style={cardStyle}>
                        <h2 style={{ ...sectionHeadingStyle, marginBottom: 16 }}>Quick access</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {[
                                { label: 'Add student', icon: UserPlus, path: '/students' },
                                { label: 'Collect fees', icon: DollarSign, path: '/finance/payments' },
                                { label: 'View reports', icon: FileBarChart2, path: '/reports/academic' },
                                { label: 'Invoices', icon: Receipt, path: '/finance/wizard' },
                                { label: 'School profile', icon: Building2, path: '/registry' },
                                { label: 'Messages', icon: MessageIcon, path: '/chat' },
                            ].map((item) => (
                                <Link key={item.path} to={h(item.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, border: '1.5px solid rgba(0,4,53,0.08)', background: '#f8fafc', padding: '14px 10px', textAlign: 'center', textDecoration: 'none', transition: 'all 0.15s ease' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(251,191,36,0.5)`; e.currentTarget.style.background = WHITE; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,4,53,0.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,4,53,0.08)'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = 'none'; }}>
                                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: WHITE, boxShadow: '0 2px 8px rgba(0,4,53,0.10)', border: '1.5px solid rgba(0,4,53,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <item.icon size={16} color={NAVY} />
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: NAVY, lineHeight: 1.3 }}>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent activities */}
                    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ ...sectionHeadingStyle, marginBottom: 16 }}>Recent activities</h2>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', maxHeight: 300, paddingRight: 4 }}>
                            {activityFeed.length === 0 && <li style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>No recent events yet.</li>}
                            {activityFeed.map((row, idx) => {
                                const chips = [
                                    { bg: `rgba(251,191,36,0.12)`, color: '#92400e' },
                                    { bg: `rgba(0,4,53,0.07)`, color: NAVY },
                                    { bg: '#d1fae5', color: '#065f46' },
                                    { bg: '#ede9fe', color: '#5b21b6' },
                                    { bg: '#fee2e2', color: '#991b1b' },
                                ];
                                const chip = chips[idx % chips.length];
                                return (
                                    <li key={row.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: chip.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Activity size={16} color={chip.color} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: NAVY, lineHeight: 1.4, wordBreak: 'break-word' }}>{row.title}</p>
                                            {row.subtitle && <p style={{ fontSize: 11, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subtitle}</p>}
                                            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, fontWeight: 600 }}>{formatRelativeShort(row.ts)}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </section>

                {/* ══════════════════════════════════════════════════
                    TREND CHARTS
                ══════════════════════════════════════════════════ */}
                <section style={{ display: 'grid', gridTemplateColumns: canUseAccountant && stats.collections14d.length > 0 ? 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))' : '1fr', gap: 20 }}>
                    {canUseAccountant && stats.collections14d.length > 0 && (
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <TrendingUp size={16} color={GOLD} /> Fee collections · 14 days
                                </h3>
                                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                                    {stats.revenue30d > 1_000_000 ? `${(stats.revenue30d / 1_000_000).toFixed(1)}M` : stats.revenue30d.toLocaleString()} RWF / 30d
                                </span>
                            </div>
                            <LineAreaChart data={stats.collections14d} labelKey="label" valueKey="value" color="#10b981" height={120} />
                        </div>
                    )}
                    <div style={cardStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={16} color={GOLD} /> Gate check-ins trend
                            </h3>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
                                Live · {stats.attendanceOverview.gateToday.students_in} students · {stats.attendanceOverview.gateToday.staff_in} staff today
                            </span>
                        </div>
                        <LineAreaChart data={stats.termTrend} labelKey="label" valueKey="value" color={GOLD} height={120} />
                    </div>
                </section>
            </div>

        </div>
    );
};

export default Dashboard;