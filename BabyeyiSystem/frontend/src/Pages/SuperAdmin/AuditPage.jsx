import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Menu, X } from "lucide-react";
import { SUPER_ADMIN_DASHBOARD_PATH } from "./components/superAdminNavConfig";
import { fetchAuditTab, fetchAuditUserTimeline } from "./services/superAdminAuditService";

const AuditContext = createContext(null);
function useAuditData() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error("AuditContext required");
  return ctx;
}

function AuditLoading() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 48, gap: 10 }}>
      <Loader2 size={22} color={NAVY} style={{ animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 13, color: COLORS.textMuted }}>Loading audit data…</span>
    </div>
  );
}

function AuditError({ message, onRetry }) {
  return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: NAVY, fontSize: 14, marginBottom: 12 }}>{message || "Failed to load audit data"}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            background: NAVY, color: AMBER, border: "none", borderRadius: 8,
            padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function AuditEmpty({ message = "No audit records yet." }) {
  return <p style={{ fontSize: 13, color: COLORS.textMuted, padding: 16 }}>{message}</p>;
}

const FONT = "'Montserrat', system-ui, sans-serif";
const NAVY = "#000435";
const AMBER = "#fbbf24";

/** Super Admin audit UI — navy sidebar, white content, amber accents only */
const COLORS = {
  bg: "#ffffff",
  surface: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  accent: AMBER,
  accentDim: NAVY,
  navy: NAVY,
  green: NAVY,
  yellow: AMBER,
  orange: "#d97706",
  red: NAVY,
  teal: NAVY,
  purple: NAVY,
  textPrimary: NAVY,
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  sidebar: NAVY,
  sidebarMuted: "rgba(255,255,255,0.45)",
  sidebarText: "rgba(255,255,255,0.75)",
};

const TABS = [
  { id: "overview", label: "Overview", icon: "⬡" },
  { id: "live", label: "Live Activities", icon: "◉" },
  { id: "security", label: "Security Logs", icon: "⊕" },
  { id: "financial", label: "Financial Audits", icon: "◈" },
  { id: "users", label: "User Tracking", icon: "⊞" },
  { id: "schools", label: "School Monitoring", icon: "◫" },
  { id: "suspicious", label: "Suspicious Activities", icon: "⚠" },
  { id: "reports", label: "Reports", icon: "⊟" },
  { id: "investigations", label: "Investigations", icon: "◎" },
  { id: "system", label: "System Health", icon: "⊛" },
];

const RISK_COLORS = { Low: "#64748b", Medium: "#d97706", High: "#d97706", Critical: "#ffffff" };
const RISK_BG = { Low: "#f1f5f9", Medium: "#fffbeb", High: "#fef3c7", Critical: NAVY };

function RiskBadge({ level }) {
  return (
    <span style={{
      background: RISK_BG[level] || "#f1f5f9",
      color: RISK_COLORS[level] || COLORS.textSecondary,
      padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: 0.5
    }}>{level}</span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Success: [NAVY, "#fffbeb"],
    Failed: [NAVY, "#fee2e2"],
    Pending: ["#d97706", "#fffbeb"],
    Blocked: [NAVY, "#fef3c7"],
    Resolved: [NAVY, "#f1f5f9"],
    Active: [NAVY, "#fffbeb"],
  };
  const [color, bg] = map[status] || [COLORS.textSecondary, "#f1f5f9"];
  return (
    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6,
      boxShadow: "0 1px 2px rgba(0,4,53,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: COLORS.textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || COLORS.textPrimary, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{sub}</div>}
    </div>
  );
}

function Table({ headers, rows, colWidths }) {
  return (
    <div className="audit-table-wrap" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            {headers.map((h, i) => (
              <th key={i} style={{
                padding: "10px 12px", textAlign: "left", color: COLORS.textMuted,
                fontWeight: 600, fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
                width: colWidths?.[i],
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}20`, transition: "background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#fffbeb"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 12px", color: COLORS.textPrimary, verticalAlign: "middle" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniBar({ value, max = 100, color }) {
  return (
    <div style={{ background: COLORS.border, borderRadius: 3, height: 6, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color || COLORS.accent, borderRadius: 3, transition: "width 0.8s ease" }} />
    </div>
  );
}

function Avatar({ name, role, color }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const colors = [NAVY, AMBER, "#d97706", NAVY, AMBER];
  const bg = color || colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", background: bg + "33",
        border: `1px solid ${bg}66`, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 11, fontWeight: 700, color: bg, flexShrink: 0,
      }}>{initials}</div>
      <div>
        <div style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>{name}</div>
        {role && <div style={{ fontSize: 11, color: COLORS.textMuted }}>{role}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.textPrimary, letterSpacing: 0.3 }}>{title}</h3>
      {action && <button style={{
        background: NAVY, color: AMBER, border: "none",
        borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600
      }}>{action}</button>}
    </div>
  );
}

function Dot({ color, pulse }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: 8, height: 8 }}>
      <span style={{
        position: "absolute", width: 8, height: 8, borderRadius: "50%",
        background: color, display: "block",
        animation: pulse ? "pulse 2s ease infinite" : undefined,
      }} />
    </span>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────────────────
function Overview() {
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;
  const s = data?.stats || {};
  const stats = [
    { label: "Total Activities Today", value: Number(s.activitiesToday || 0).toLocaleString(), sub: "Last 24 hours", color: COLORS.accent, icon: "⬡" },
    { label: "Active Users", value: String(s.activeUsers ?? 0), sub: "Portal activity (24h)", color: COLORS.green, icon: "◉" },
    { label: "Failed Logins", value: String(s.failedLogins24h ?? 0), sub: "Last 24 hours", color: COLORS.red, icon: "⊘" },
    { label: "Critical Actions", value: String(s.criticalToday ?? 0), sub: "Require attention", color: COLORS.orange, icon: "⚠" },
    { label: "High-Risk (7d)", value: String(s.pendingInvestigations ?? 0), sub: "Flagged activities", color: COLORS.yellow, icon: "◎" },
    { label: "Financial Changes", value: String(s.financialToday ?? 0), sub: "Today", color: COLORS.teal, icon: "◈" },
    { label: "Suspicious (7d)", value: String(s.suspicious7d ?? 0), sub: "High / critical", color: COLORS.purple, icon: "⊕" },
    { label: "System Errors", value: String(s.systemErrors ?? 0), sub: "Webhook issues (24h)", color: COLORS.red, icon: "⊛" },
  ];

  const recentRows = (data?.recentActivity || []).map((e) => [
    <Avatar name={e.user_name} role={e.user_role} />,
    e.user_role,
    e.action,
    e.module,
    <RiskBadge level={e.risk_level} />,
    e.time_label,
    <StatusBadge status={e.status} />,
  ]);

  const moduleActivity = data?.moduleActivity?.length
    ? data.moduleActivity
    : [{ name: "No activity", count: 0, pct: 0 }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="audit-grid-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="audit-grid-2-1">
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Recent Activity" />
          {recentRows.length ? (
            <Table
              headers={["User", "Role", "Action", "Module", "Risk", "Time", "Status"]}
              rows={recentRows}
            />
          ) : (
            <AuditEmpty message="No recent platform activity recorded yet." />
          )}
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Activity by Module" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {moduleActivity.map((m, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: COLORS.textPrimary }}>{m.name}</span>
                  <span style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: "monospace" }}>{m.count.toLocaleString()}</span>
                </div>
                <MiniBar value={m.pct} color={[COLORS.accent, COLORS.teal, COLORS.green, COLORS.purple, COLORS.orange, COLORS.yellow][i]} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="audit-grid-3">
        {[
          {
            title: "Top Risk Districts",
            items: (data?.topDistricts || []).map((d) => [d.name, d.level, d.count]),
            colors: [COLORS.red, COLORS.orange, COLORS.yellow, COLORS.green, COLORS.teal],
          },
          {
            title: "Most Active Roles",
            items: (data?.topRoles || []).map((r) => [r.name, `${r.count} actions`, r.pct]),
            colors: [COLORS.accent, COLORS.teal, COLORS.purple, COLORS.orange, COLORS.yellow],
          },
          {
            title: "Quick Stats",
            items: [
              ["Approvals Today", String(data?.quickStats?.approvalsToday ?? 0)],
              ["Rejections Today", String(data?.quickStats?.rejectionsToday ?? 0)],
              ["Data Exports", String(data?.quickStats?.dataExports ?? 0)],
              ["Schools Monitored", String(s.schoolsMonitored ?? 0)],
            ],
            isFlat: true,
          },
        ].map((section, si) => (
          <div key={si} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <SectionHeader title={section.title} />
            {section.isFlat ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {section.items.map(([label, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}40` }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.textPrimary, fontFamily: "monospace" }}>{val}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {section.items.map(([name, sub, pct], i) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: COLORS.textPrimary }}>{name}</span>
                      <span style={{ fontSize: 12, color: section.colors[i] }}>{sub}</span>
                    </div>
                    {pct !== undefined && <MiniBar value={pct} color={section.colors[i]} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LIVE ACTIVITIES TAB ─────────────────────────────────────────────────────
function LiveActivities() {
  const { data, loading, error, reload } = useAuditData();
  const [filter, setFilter] = useState("All");

  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const allActivities = (data?.data || []).map((e) => ({
    user: e.user_name,
    role: e.user_role,
    action: e.action,
    module: e.module,
    risk: e.risk_level,
    time: e.time_label,
    device: e.device,
    ip: e.ip_address,
    status: e.status,
  }));

  const modules = ["All", ...new Set(allActivities.map((a) => a.module).filter(Boolean))].slice(0, 8);
  const filters = modules.length > 1 ? modules : ["All", "Finance", "Auth", "Portal", "Fees"];
  const filtered = filter === "All" ? allActivities : allActivities.filter((a) => a.module === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Dot color={COLORS.green} pulse />
          <span style={{ fontSize: 13, color: COLORS.green, fontWeight: 600 }}>LIVE</span>
          <span style={{ fontSize: 13, color: COLORS.textMuted }}>— Auto-refreshes every 10s</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? COLORS.accent : COLORS.card,
              color: filter === f ? "#fff" : COLORS.textSecondary,
              border: `1px solid ${filter === f ? COLORS.accent : COLORS.border}`,
              borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer"
            }}>{f}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {!filtered.length && <AuditEmpty message="No live activity in the selected period." />}
        {filtered.map((a, i) => (
          <div key={i} style={{
            background: COLORS.card, border: `1px solid ${i === 0 ? COLORS.accent + "44" : COLORS.border}`,
            borderLeft: `3px solid ${RISK_COLORS[a.risk]}`,
            borderRadius: 8, padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 12,
            transition: "all 0.2s",
            animation: i === 0 ? "fadeIn 0.5s ease" : undefined,
          }}>
            <Avatar name={a.user} role={a.role} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>{a.action}</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                {a.module} · {a.device} · IP {a.ip}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <RiskBadge level={a.risk} />
              <StatusBadge status={a.status} />
              <span style={{ fontSize: 11, color: COLORS.textMuted, minWidth: 50, textAlign: "right" }}>{a.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SECURITY LOGS TAB ───────────────────────────────────────────────────────
function SecurityLogs() {
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const logs = data?.logs || [];
  const logins = data?.logins || [];
  const st = data?.stats || {};
  const secStats = [
    { label: "Successful Logins", value: String(st.successfulLogins24h ?? 0), color: COLORS.green, icon: "◉" },
    { label: "Failed Logins", value: String(st.failedLogins24h ?? 0), color: COLORS.red, icon: "⊘" },
    { label: "Blocked IPs", value: String(st.blockedIps ?? 0), color: COLORS.orange, icon: "⊝" },
    { label: "Permission Changes", value: String(st.permissionChanges ?? 0), color: COLORS.purple, icon: "⊕" },
  ];
  const failedByHour = data?.failedByHour || Array(24).fill(0);
  const blockedIpList = data?.blockedIpList || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="audit-grid-4">
        {secStats.map((s, i) => <StatCard key={i} {...s} sub="" />)}
      </div>

      <div className="audit-grid-2">
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Security Event Log" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!logs.length && <AuditEmpty message="No security events in the last 7 days." />}
            {logs.map((l, i) => (
              <div key={i} style={{
                borderLeft: `3px solid ${RISK_COLORS[l.risk]}`,
                background: COLORS.surface, borderRadius: "0 6px 6px 0",
                padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>{l.action}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                    {l.user} · IP {l.ip} · {l.device}{l.product && l.product !== "—" ? ` · ${l.product}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <RiskBadge level={l.risk} />
                  <StatusBadge status={l.status} />
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>{l.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <SectionHeader title="Failed Logins by Hour" />
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
              {failedByHour.map((v, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{
                    width: "100%", height: v * 8, background: v > 5 ? COLORS.red : v > 3 ? COLORS.orange : COLORS.accent + "88",
                    borderRadius: "2px 2px 0 0", minHeight: 2, transition: "height 0.5s",
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 10, color: COLORS.textMuted }}>00:00</span>
              <span style={{ fontSize: 10, color: COLORS.textMuted }}>12:00</span>
              <span style={{ fontSize: 10, color: COLORS.textMuted }}>23:00</span>
            </div>
          </div>

          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <SectionHeader title="Blocked IP Addresses" />
            {!blockedIpList.length && <AuditEmpty message="No blocked IPs flagged in recent logs." />}
            {blockedIpList.map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}40` }}>
                <span style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: "monospace" }}>{row.ip} — {row.reason}</span>
                <span style={{ fontSize: 11, color: COLORS.red, background: "#450A0A", padding: "2px 8px", borderRadius: 4 }}>Blocked</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
        <SectionHeader title="Login History (Lite, Pro & Platform)" />
        <p style={{ fontSize: 12, color: COLORS.textMuted, margin: "0 0 12px" }}>
          Every sign-in is recorded with IP address, device, school, and product tier (lite / pro).
        </p>
        {!logins.length ? (
          <AuditEmpty message="No logins recorded yet. Sign in to the system to start tracking." />
        ) : (
          <Table
            headers={["User", "Role", "School", "Product", "IP Address", "Device", "Action", "Time", "Status"]}
            rows={logins.map((l) => [
              l.user,
              l.role,
              l.school,
              <span style={{ fontSize: 11, fontWeight: 700, color: l.product === "pro" ? NAVY : COLORS.textSecondary, textTransform: "uppercase" }}>{l.product}</span>,
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{l.ip}</span>,
              l.device,
              l.action,
              l.time,
              <StatusBadge status={l.status} />,
            ])}
          />
        )}
      </div>
    </div>
  );
}

// ─── FINANCIAL AUDITS TAB ────────────────────────────────────────────────────
function FinancialAudits() {
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const changes = data?.changes || [];
  const st = data?.stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="audit-grid-4">
        <StatCard label="Total Financial Changes" value={String(st.totalChanges ?? 0)} sub="Last 30 days" color={COLORS.teal} icon="◈" />
        <StatCard label="Flagged Transactions" value={String(st.flagged ?? 0)} sub="Needs review" color={COLORS.red} icon="⚠" />
        <StatCard label="Reversals Today" value={String(st.reversalsToday ?? 0)} sub="Detected in logs" color={COLORS.orange} icon="⊟" />
        <StatCard label="Sources" value="Fees + Pay" sub="Babyeyi & webhooks" color={COLORS.accent} icon="⊞" />
      </div>

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
        <SectionHeader title="Financial Change Log" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {!changes.length && <AuditEmpty message="No financial audit events in the last 30 days." />}
          {changes.map((c, i) => (
            <div key={i} style={{ background: COLORS.surface, borderRadius: 8, padding: "14px 16px", border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: COLORS.accent, fontFamily: "monospace", background: COLORS.accentDim, padding: "2px 8px", borderRadius: 4 }}>{c.id}</span>
                  <Avatar name={c.user} role={c.action} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <RiskBadge level={c.risk} />
                  <StatusBadge status={c.status} />
                  <span style={{ fontSize: 11, color: COLORS.textMuted }}>{c.date}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ background: "#450A0A", border: "1px solid #7F1D1D", borderRadius: 6, padding: "8px 14px", flex: 1 }}>
                  <div style={{ fontSize: 10, color: COLORS.red, letterSpacing: 1, marginBottom: 3 }}>BEFORE</div>
                  <div style={{ fontSize: 16, color: "#FCA5A5", fontFamily: "monospace", fontWeight: 700 }}>{c.before}</div>
                </div>
                <span style={{ fontSize: 20, color: COLORS.textMuted }}>→</span>
                <div style={{ background: "#052E16", border: "1px solid #14532D", borderRadius: 6, padding: "8px 14px", flex: 1 }}>
                  <div style={{ fontSize: 10, color: COLORS.green, letterSpacing: 1, marginBottom: 3 }}>AFTER</div>
                  <div style={{ fontSize: 16, color: "#86EFAC", fontFamily: "monospace", fontWeight: 700 }}>{c.after}</div>
                </div>
                <div style={{ flex: 1, paddingLeft: 8 }}>
                  <div style={{ fontSize: 11, color: COLORS.textMuted }}>Approved by</div>
                  <div style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>{c.approver}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── USER TRACKING TAB ───────────────────────────────────────────────────────
function UserTracking() {
  const { data, loading, error, reload } = useAuditData();
  const [selected, setSelected] = useState(0);
  const [timeline, setTimeline] = useState([]);
  const [hourlyPattern, setHourlyPattern] = useState(Array(24).fill(0));
  const [timelineLoading, setTimelineLoading] = useState(false);

  const users = data?.users || [];

  useEffect(() => {
    setSelected(0);
  }, [users.length]);

  useEffect(() => {
    const u = users[selected];
    if (!u?.id) {
      setTimeline([]);
      return undefined;
    }
    let cancelled = false;
    setTimelineLoading(true);
    fetchAuditUserTimeline(u.id)
      .then((res) => {
        if (cancelled) return;
        setTimeline(res.timeline || []);
        setHourlyPattern(res.hourlyPattern || Array(24).fill(0));
      })
      .catch(() => {
        if (!cancelled) setTimeline([]);
      })
      .finally(() => {
        if (!cancelled) setTimelineLoading(false);
      });
    return () => { cancelled = true; };
  }, [selected, users]);

  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;
  if (!users.length) return <AuditEmpty message="No users with recent activity found." />;

  const u = users[selected] || users[0];
  const statusColor = { Online: COLORS.green, Idle: COLORS.yellow, Offline: COLORS.textMuted };

  return (
    <div className="audit-grid-user">
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 }}>
        <SectionHeader title="Users" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {users.map((u, i) => (
            <div key={i} onClick={() => setSelected(i)} style={{
              padding: "10px 12px", borderRadius: 8, cursor: "pointer",
              background: selected === i ? COLORS.accentDim : "transparent",
              border: `1px solid ${selected === i ? COLORS.accent : "transparent"}`,
              transition: "all 0.15s",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <Avatar name={u.name} role={u.role} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Dot color={statusColor[u.status]} />
                <RiskBadge level={u.risk} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textPrimary }}>{u.name}</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 2 }}>
                {u.role} · {u.school || "—"} · <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{u.product || "lite"}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4, fontFamily: "monospace" }}>Last IP: {u.ip}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ color: statusColor[u.status], fontSize: 13, fontWeight: 600 }}>● {u.status}</span>
            </div>
          </div>
          <div className="audit-grid-4">
            {[
              ["Logins Today", u.sessions],
              ["Actions Today", u.actions],
              ["Last IP", u.ip],
              ["Last Seen", u.lastSeen],
            ].map(([label, val], i) => (
              <div key={i} style={{ background: COLORS.surface, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Session Timeline" />
          {timelineLoading && <AuditLoading />}
          {!timelineLoading && !timeline.length && <AuditEmpty message="No portal actions recorded for this user." />}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {!timelineLoading && timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 16, paddingBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: COLORS.accent, border: `2px solid ${COLORS.accentDim}`, flexShrink: 0, marginTop: 3 }} />
                  {i < timeline.length - 1 && <div style={{ width: 2, flex: 1, background: COLORS.border, minHeight: 20, marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontSize: 13, color: COLORS.textPrimary, fontWeight: 500 }}>{t.action}</div>
                  <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{t.module} · {t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Hourly Activity Pattern" />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
            {hourlyPattern.map((v, i) => (
              <div key={i} style={{ flex: 1 }}>
                <div style={{ width: "100%", height: v * 4, background: COLORS.accent + "99", borderRadius: "2px 2px 0 0", minHeight: v ? 2 : 0, transition: "height 0.5s" }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>00:00</span>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>12:00</span>
            <span style={{ fontSize: 10, color: COLORS.textMuted }}>23:59</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCHOOL MONITORING TAB ───────────────────────────────────────────────────
function SchoolMonitoring() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const st = data?.stats || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #0a1648 100%)`,
        borderRadius: 12, padding: 24, color: "#fff",
      }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>School Monitoring Center</h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, opacity: 0.85, maxWidth: 560 }}>
          Monitor all schools in real time — who is online, login IP addresses, roles, suspicious actions,
          and user controls for lite (BabyeyiSystem) and pro (babyeyipro) schools.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, background: "rgba(251,191,36,0.2)", padding: "6px 12px", borderRadius: 8 }}>
            {st.totalSchools ?? 0} schools
          </span>
          <span style={{ fontSize: 12, background: "rgba(251,191,36,0.2)", padding: "6px 12px", borderRadius: 8 }}>
            {st.highRiskSchools ?? 0} high-risk
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/superadmin/school-monitor")}
          style={{
            background: AMBER, color: NAVY, border: "none", borderRadius: 10,
            padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >
          Open full School Monitoring Center →
        </button>
      </div>
      <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>
        Use the dedicated center for province → district → sector → school drill-down, live users, timelines, and account controls.
      </p>
    </div>
  );
}

// ─── SUSPICIOUS ACTIVITIES TAB ───────────────────────────────────────────────
function SuspiciousActivities() {
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const threats = data?.threats || [];
  const st = data?.stats || {};
  const threatTypeColors = [COLORS.red, COLORS.orange, COLORS.purple, COLORS.yellow, COLORS.teal];
  const threatTypes = (data?.threatTypes || []).map((t, i) => ({
    ...t,
    color: threatTypeColors[i % threatTypeColors.length],
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="audit-grid-4">
        <StatCard label="Active Threats" value={String(st.activeThreats ?? 0)} sub="Needs action" color={COLORS.red} icon="⚠" />
        <StatCard label="Blocked Today" value={String(st.blockedToday ?? 0)} sub="From audit logs" color={COLORS.orange} icon="⊘" />
        <StatCard label="Under Review" value={String(st.underReview ?? 0)} sub="Pending status" color={COLORS.yellow} icon="◎" />
        <StatCard label="Resolved (7d)" value={String(st.resolved7d ?? 0)} sub="Cleared events" color={COLORS.green} icon="⊕" />
      </div>

      <div className="audit-grid-2-1">
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Threat Detection Feed" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!threats.length && <AuditEmpty message="No high-risk events in the last 14 days." />}
            {threats.map((t, i) => (
              <div key={i} style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderLeft: `3px solid ${RISK_COLORS[t.risk]}`,
                borderRadius: "0 8px 8px 0", padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "monospace", background: COLORS.border, padding: "1px 6px", borderRadius: 3 }}>{t.id}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: RISK_COLORS[t.risk] }}>{t.type}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <RiskBadge level={t.risk} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
                <div style={{ fontSize: 13, color: COLORS.textSecondary }}>{t.detail}</div>
                <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>User: {t.user} · IP: {t.ip} · {t.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <SectionHeader title="Threat Categories" />
            {threatTypes.map((t, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: COLORS.textPrimary }}>{t.type}</span>
                  <span style={{ fontSize: 12, color: t.color, fontWeight: 700, fontFamily: "monospace" }}>{t.count}</span>
                </div>
                <MiniBar value={t.count} max={10} color={t.color} />
              </div>
            ))}
          </div>

          <div style={{ background: "#450A0A", border: `1px solid #7F1D1D`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.red, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>⚠ CRITICAL ALERT</div>
            <div style={{ fontSize: 14, color: "#FCA5A5", fontWeight: 600, marginBottom: 6 }}>Active Brute Force Detected</div>
            <div style={{ fontSize: 12, color: "#F87171" }}>IP 92.54.12.7 is actively attempting logins. 14 attempts in 3 minutes. Auto-blocked.</div>
            <button style={{
              marginTop: 12, background: COLORS.red, color: "#fff", border: "none",
              borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600, width: "100%"
            }}>Investigate Now</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REPORTS TAB ─────────────────────────────────────────────────────────────
function Reports() {
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const reportTypes = (data?.reportTypes || []).map((r, i) => ({
    title: r.title,
    desc: r.desc,
    icon: ["⊞", "◈", "⊕", "◫", "◉", "⚠"][i % 6],
    color: [COLORS.accent, COLORS.teal, COLORS.red, COLORS.purple, COLORS.yellow, COLORS.orange][i % 6],
  }));

  const recentReports = (data?.snapshots || []).map((s) => ({
    name: s.name,
    generated: s.generated,
    by: "SuperAdmin",
    size: `${s.count} events`,
    format: "Live",
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
        <SectionHeader title="Generate New Report" />
        <div className="audit-grid-3">
          {reportTypes.map((r, i) => (
            <div key={i} style={{
              background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: 16, cursor: "pointer", transition: "all 0.2s",
              borderTop: `3px solid ${r.color}`,
            }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.border + "44"}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.surface}
            >
              <div style={{ fontSize: 24, marginBottom: 8, color: r.color }}>{r.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>{r.desc}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["PDF", "Excel", "CSV"].map(fmt => (
                  <button key={fmt} style={{
                    background: COLORS.card, color: COLORS.textSecondary,
                    border: `1px solid ${COLORS.border}`, borderRadius: 4,
                    padding: "3px 8px", fontSize: 11, cursor: "pointer"
                  }}>{fmt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {data?.exportHint && (
        <p style={{ fontSize: 12, color: COLORS.textMuted, margin: 0 }}>{data.exportHint}</p>
      )}

      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
        <SectionHeader title="Live Snapshots" />
        {!recentReports.length && <AuditEmpty message="No report snapshots available." />}
        <Table
          headers={["Report Name", "Generated", "By", "Size", "Format", "Actions"]}
          rows={recentReports.map(r => [
            r.name,
            r.generated,
            r.by,
            r.size,
            <span style={{ color: COLORS.accent, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>{r.format}</span>,
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ background: COLORS.accentDim, color: COLORS.accent, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>Download</button>
              <button style={{ background: COLORS.border, color: COLORS.textSecondary, border: "none", borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: "pointer" }}>Delete</button>
            </div>
          ])}
        />
      </div>
    </div>
  );
}

// ─── INVESTIGATIONS TAB ──────────────────────────────────────────────────────
function Investigations() {
  const { data, loading, error, reload } = useAuditData();
  const [notes, setNotes] = useState("");

  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const cases = data?.cases || [];
  const st = data?.stats || {};
  const latestNote = data?.latestNote;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="audit-grid-4">
        <StatCard label="Open Cases" value={String(st.openCases ?? 0)} sub="Under review" color={COLORS.red} icon="◎" />
        <StatCard label="Pending Cases" value={String(st.pendingCases ?? 0)} sub="Awaiting review" color={COLORS.yellow} icon="⊟" />
        <StatCard label="Resolved (30d)" value={String(st.resolved30d ?? 0)} sub="Successfully closed" color={COLORS.green} icon="⊕" />
        <StatCard label="Avg Resolution" value={`${st.avgResolutionDays ?? "—"}d`} sub="Estimated" color={COLORS.teal} icon="⊛" />
      </div>

      <div className="audit-grid-inv">
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Investigation Cases" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {!cases.length && <AuditEmpty message="No investigation cases from high-risk events." />}
            {cases.map((c, i) => (
              <div key={i} style={{
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderLeft: `3px solid ${RISK_COLORS[c.severity]}`,
                borderRadius: "0 8px 8px 0", padding: "14px 16px",
                cursor: "pointer", transition: "background 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = COLORS.border + "33"}
                onMouseLeave={e => e.currentTarget.style.background = COLORS.surface}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: "monospace", background: COLORS.border, padding: "1px 6px", borderRadius: 3 }}>{c.id}</span>
                      <StatusBadge status={c.status} />
                      <RiskBadge level={c.severity} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                      Opened {c.opened} · Assigned to {c.assignee} · {c.logs} log entries
                    </div>
                  </div>
                  <button style={{
                    background: COLORS.accentDim, color: COLORS.accent, border: "none",
                    borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", flexShrink: 0
                  }}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Investigation Notes" />
          {latestNote && (
            <div style={{ background: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 4 }}>{latestNote.caseId} · Latest flagged event</div>
              <div style={{ fontSize: 13, color: COLORS.textPrimary }}>{latestNote.text}</div>
            </div>
          )}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add investigation note..."
            style={{
              width: "100%", height: 100, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, color: COLORS.textPrimary, fontSize: 13, padding: 10,
              resize: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button style={{
              flex: 1, background: COLORS.accent, color: "#fff", border: "none",
              borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer", fontWeight: 600
            }}>Save Note</button>
            <button style={{
              background: "#052E16", color: COLORS.green, border: `1px solid ${COLORS.green}44`,
              borderRadius: 6, padding: "8px 14px", fontSize: 13, cursor: "pointer"
            }}>Resolve</button>
          </div>

          <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary, marginBottom: 10 }}>Quick Actions</div>
            {["Pin Log Entry", "Assign Severity", "Lock Record", "Escalate Case"].map((a, i) => (
              <button key={i} style={{
                display: "block", width: "100%", marginBottom: 6, background: COLORS.surface,
                color: COLORS.textSecondary, border: `1px solid ${COLORS.border}`, borderRadius: 6,
                padding: "7px 12px", fontSize: 12, cursor: "pointer", textAlign: "left"
              }}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SYSTEM HEALTH TAB ───────────────────────────────────────────────────────
function SystemHealth() {
  const { data, loading, error, reload } = useAuditData();
  if (loading) return <AuditLoading />;
  if (error) return <AuditError message={error} onRetry={() => reload(false)} />;

  const services = (data?.services || []).map((s) => ({
    ...s,
    color: s.status === "Online" ? COLORS.green : s.status === "Degraded" ? COLORS.yellow : COLORS.red,
  }));
  const errors = data?.recentErrors || [];
  const resources = data?.resources || [];
  const st = data?.stats || {};
  const webhookSummary = data?.webhookSummary || {};

  const statusColor = { Online: COLORS.green, Degraded: COLORS.yellow, Error: COLORS.red };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="audit-grid-4">
        <StatCard label="Webhook Logs" value={String(webhookSummary.total_logs ?? 0)} sub="All time" color={COLORS.green} icon="⊛" />
        <StatCard label="Matched Payments" value={String(webhookSummary.matched_logs ?? 0)} sub="Webhooks" color={COLORS.teal} icon="⬡" />
        <StatCard label="Problem Webhooks" value={String(webhookSummary.problematic_logs ?? 0)} sub="Needs review" color={COLORS.red} icon="⚠" />
        <StatCard label="Recent Errors" value={String(st.activeErrors ?? 0)} sub="From payment logs" color={COLORS.yellow} icon="⊟" />
      </div>

      <div className="audit-grid-2">
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
          <SectionHeader title="Service Status" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {services.map((s, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 12px", background: COLORS.surface, borderRadius: 8,
                border: `1px solid ${s.status === "Error" ? COLORS.red + "44" : COLORS.border}`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Dot color={statusColor[s.status]} pulse={s.status === "Online"} />
                  <span style={{ fontSize: 13, color: COLORS.textPrimary }}>{s.name}</span>
                </div>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{s.latency}</span>
                  <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: "monospace" }}>{s.uptime}</span>
                  <span style={{ fontSize: 11, color: s.color, background: s.color + "22", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <SectionHeader title="Recent System Errors" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {errors.map((e, i) => (
                <div key={i} style={{
                  borderLeft: `3px solid ${RISK_COLORS[e.severity]}`,
                  background: COLORS.surface, borderRadius: "0 6px 6px 0",
                  padding: "10px 12px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: RISK_COLORS[e.severity] }}>{e.type}</span>
                    <span style={{ fontSize: 11, color: COLORS.textMuted }}>{e.time}</span>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{e.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <SectionHeader title="Payment Health" />
            {(resources.length ? resources : [{ label: "No webhook data", val: 0, color: COLORS.textMuted }]).map((r, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: COLORS.textPrimary }}>{r.label}</span>
                  <span style={{ fontSize: 12, color: r.color, fontFamily: "monospace", fontWeight: 700 }}>{r.val}%</span>
                </div>
                <MiniBar value={r.val} color={r.val > 80 ? COLORS.red : r.color} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const PAGES = {
  overview: Overview, live: LiveActivities, security: SecurityLogs,
  financial: FinancialAudits, users: UserTracking, schools: SchoolMonitoring,
  suspicious: SuspiciousActivities, reports: Reports,
  investigations: Investigations, system: SystemHealth,
};

export default function AuditPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const PageComponent = PAGES[activeTab];

  const reload = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await fetchAuditTab(activeTab, search);
      setData(result);
      if (silent) setError(null);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "Failed to load audit data";
      if (status === 429) {
        setError("Too many requests — wait a moment or click Retry.");
      } else if (!silent) {
        setData(null);
        setError(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (activeTab !== "live") return undefined;
    const t = setInterval(() => reload(true), 30000);
    return () => clearInterval(t);
  }, [activeTab, reload]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    document.documentElement.style.setProperty("--sa-sidebar-w", "0px");
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const ctxValue = { data, loading, error, reload, search };
  const alertCount = Number(data?.stats?.criticalToday ?? data?.stats?.activeErrors ?? data?.threats?.length ?? 0);

  const selectTab = (id) => {
    setActiveTab(id);
    setNavOpen(false);
  };

  return (
    <AuditContext.Provider value={ctxValue}>
    <div className="audit-root">
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:none} }
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: ${AMBER}; border-radius: 4px; }

        .audit-root {
          position: fixed; inset: 0; z-index: 50;
          display: flex; height: 100vh; width: 100vw;
          background: ${COLORS.bg}; font-family: ${FONT};
          color: ${COLORS.textPrimary}; overflow: hidden;
        }
        .audit-sidebar {
          width: 220px; flex-shrink: 0; background: ${COLORS.sidebar};
          display: flex; flex-direction: column; padding: 0 0 12px;
        }
        .audit-sidebar-close {
          display: none; position: absolute; top: 12px; right: 12px;
          width: 36px; height: 36px; border: none; border-radius: 8px;
          background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
          align-items: center; justify-content: center;
        }
        .audit-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #fff; min-width: 0; }
        .audit-topbar {
          flex-shrink: 0; background: #fff; border-bottom: 1px solid ${COLORS.border};
          display: flex; flex-direction: column; gap: 12px;
          padding: 14px 20px;
        }
        .audit-topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
        .audit-topbar-head { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .audit-topbar-title-wrap { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .audit-topbar-title { font-size: 17px; font-weight: 700; color: ${NAVY}; }
        .audit-topbar-date { font-size: 11px; color: ${COLORS.textMuted}; font-weight: 500; }
        .audit-menu-btn {
          display: none; flex-shrink: 0; width: 40px; height: 40px;
          border-radius: 10px; border: 1px solid ${COLORS.border};
          background: #fff; cursor: pointer; color: ${NAVY};
          align-items: center; justify-content: center;
        }
        .audit-topbar-actions { display: flex; gap: 10px; align-items: center; width: 100%; }
        .audit-search-input {
          flex: 1; min-width: 0; background: #fff;
          border: 1px solid ${COLORS.border}; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; color: ${NAVY};
          font-family: ${FONT}; outline: none;
        }
        .audit-content { flex: 1; overflow-y: auto; padding: 20px; background: #fff; -webkit-overflow-scrolling: touch; }
        .audit-backdrop {
          display: none; position: fixed; inset: 0; z-index: 55;
          background: rgba(0,4,53,0.55); border: none; cursor: pointer;
        }
        .audit-nav-btn {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 12px; margin-bottom: 2px; border: none; border-radius: 10px;
          cursor: pointer; font-size: 13px; text-align: left; transition: all 0.15s;
          font-family: ${FONT}; min-height: 44px;
        }
        .audit-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .audit-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .audit-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .audit-grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
        .audit-grid-inv { display: grid; grid-template-columns: 1fr 380px; gap: 20px; }
        .audit-grid-user { display: grid; grid-template-columns: 300px 1fr; gap: 20px; height: 100%; }
        .audit-table-wrap { -webkit-overflow-scrolling: touch; }

        @media (min-width: 640px) {
          .audit-topbar-title-wrap { flex-direction: row; align-items: baseline; gap: 10px; }
          .audit-topbar-actions { width: auto; flex: 0 0 auto; margin-left: auto; }
          .audit-topbar { flex-direction: row; align-items: center; flex-wrap: wrap; }
        }

        @media (max-width: 1024px) {
          .audit-grid-4 { grid-template-columns: repeat(2, 1fr); }
          .audit-grid-3 { grid-template-columns: repeat(2, 1fr); }
          .audit-grid-2-1, .audit-grid-inv, .audit-grid-2 { grid-template-columns: 1fr; }
          .audit-grid-user { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .audit-menu-btn { display: flex; }
          .audit-sidebar-close { display: flex; }
          .audit-backdrop.audit-backdrop-visible { display: block; }
          .audit-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0; z-index: 60;
            width: min(288px, 88vw); transform: translateX(-100%);
            transition: transform 0.25s ease; box-shadow: 8px 0 32px rgba(0,0,0,0.25);
          }
          .audit-sidebar.audit-sidebar-open { transform: translateX(0); }
          .audit-topbar { padding: 12px 14px; }
          .audit-content { padding: 14px; }
          .audit-grid-4, .audit-grid-3 { grid-template-columns: 1fr; }
          .audit-notify-wrap { display: none; }
        }
      `}</style>

      <button
        type="button"
        className={`audit-backdrop${navOpen ? " audit-backdrop-visible" : ""}`}
        aria-label="Close menu"
        onClick={() => setNavOpen(false)}
      />

      {/* Audit section nav — same navy as Super Admin sidebar */}
      <aside className={`audit-sidebar${navOpen ? " audit-sidebar-open" : ""}`}>
        <button
          type="button"
          className="audit-sidebar-close"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        >
          <X size={18} />
        </button>
        <div style={{ padding: "14px 12px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            onClick={() => navigate(SUPER_ADMIN_DASHBOARD_PATH)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              marginBottom: 12,
              padding: "8px 10px",
              border: "1px solid rgba(251,191,36,0.35)",
              borderRadius: 10,
              background: "rgba(251,191,36,0.12)",
              color: AMBER,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: FONT,
              textAlign: "left",
            }}
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Back to Super Admin
          </button>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: 0.3 }}>Audit Center</div>
          <div style={{ fontSize: 10, color: COLORS.sidebarMuted, marginTop: 4, fontWeight: 500 }}>
            Full screen · Monitoring
          </div>
        </div>

        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className="audit-nav-btn"
                style={{
                  background: isActive ? "rgba(251,191,36,0.15)" : "transparent",
                  color: isActive ? AMBER : COLORS.sidebarText,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <span style={{ fontSize: 13, opacity: isActive ? 1 : 0.7 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* White content area */}
      <div className="audit-main">
        <header className="audit-topbar">
          <div className="audit-topbar-row">
            <div className="audit-topbar-head">
              <button
                type="button"
                className="audit-menu-btn"
                aria-label="Open navigation menu"
                onClick={() => setNavOpen(true)}
              >
                <Menu size={20} strokeWidth={2} />
              </button>
              <div className="audit-topbar-title-wrap">
                <span className="audit-topbar-title">
                  {TABS.find((t) => t.id === activeTab)?.label}
                </span>
                <span className="audit-topbar-date">
                  {new Date().toLocaleDateString("en-RW", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div className="audit-topbar-actions audit-notify-wrap">
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "#fff",
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                🔔
              </div>
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: AMBER,
                  fontSize: 9,
                  color: NAVY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                }}
              >
                {alertCount > 99 ? "99+" : alertCount}
              </div>
            </div>
            </div>
          </div>
          <input
            type="search"
            className="audit-search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search audit logs…"
          />
        </header>

        <div className="audit-content">
          <PageComponent />
        </div>
      </div>
    </div>
    </AuditContext.Provider>
  );
}