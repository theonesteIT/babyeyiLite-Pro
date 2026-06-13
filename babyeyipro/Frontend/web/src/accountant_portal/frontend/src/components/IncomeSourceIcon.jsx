import {
  GraduationCap,
  FileText,
  Shirt,
  UtensilsCrossed,
  Coffee,
  Building2,
  UserPlus,
  CircleDollarSign,
  Plus,
  Wallet,
} from 'lucide-react';

const ICON_MAP = {
  GraduationCap,
  FileText,
  Shirt,
  UtensilsCrossed,
  Coffee,
  Building2,
  UserPlus,
  CircleDollarSign,
  Plus,
  Wallet,
};

export default function IncomeSourceIcon({ name = 'CircleDollarSign', size = 18, color = '#000435', strokeWidth = 2 }) {
  const Icon = ICON_MAP[name] || CircleDollarSign;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} aria-hidden />;
}

export function BudgetCodeBadge({ code, compact }) {
  if (!code) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? 4 : 6,
        padding: compact ? '3px 8px' : '5px 12px',
        borderRadius: 8,
        background: 'linear-gradient(135deg, #000435 0%, #0f1f6e 100%)',
        color: '#F59E0B',
        fontSize: compact ? 10 : 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        fontFamily: "'Montserrat', ui-monospace, monospace",
        boxShadow: '0 1px 4px rgba(0,4,53,0.15)',
        whiteSpace: 'nowrap',
      }}
    >
      <Wallet size={compact ? 11 : 13} strokeWidth={2.2} />
      {code}
    </span>
  );
}
