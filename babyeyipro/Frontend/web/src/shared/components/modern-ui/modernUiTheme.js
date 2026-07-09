/** Shared tokens for Modern UI kit — matches Babyeyi orange / navy palette */

export const MODERN_UI = {
  navy: '#000435',
  orange: '#FF8C00',
  orangeDark: '#E67E00',
  gold: '#FEBF10',
  bg: '#F8F9FA',
  border: 'rgba(0, 4, 53, 0.08)',
  font: "'Montserrat', system-ui, sans-serif",
};

export const AVATAR_COLORS = [
  { bg: '#FFF4E5', text: '#C87800' },
  { bg: '#E8F4FD', text: '#2563EB' },
  { bg: '#F3E8FF', text: '#7C3AED' },
  { bg: '#ECFDF5', text: '#059669' },
  { bg: '#FEF3C7', text: '#D97706' },
  { bg: '#FCE7F3', text: '#DB2777' },
];

export function avatarColorFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < String(seed).length; i += 1) {
    hash = String(seed).charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initialsFromName(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}
