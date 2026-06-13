/** html2canvas cannot parse Tailwind v4 oklch()/oklab() colors. */

const MODERN_COLOR_RE = /\b(?:oklab|oklch|color-mix|lab|lch)\([^)]*\)/gi;

export function stripModernColors(cssText) {
  return String(cssText || '').replace(MODERN_COLOR_RE, '#64748b');
}

const INLINE_COLOR_PROPS = [
  'color', 'background-color', 'border-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
];

function fallbackForProp(prop) {
  if (prop.includes('background')) return '#ffffff';
  if (prop.includes('border')) return '#e2e8f0';
  return '#1e293b';
}

function hasUnsupportedColor(val) {
  return /oklab|oklch|color-mix|\blab\(|\blch\(/i.test(String(val || ''));
}

export function prepareClonedDocumentForHtml2Canvas(clonedDoc, rootSelector) {
  if (!clonedDoc) return;

  clonedDoc.documentElement.style.backgroundColor = '#ffffff';
  clonedDoc.body.style.backgroundColor = '#ffffff';

  clonedDoc.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.textContent) styleEl.textContent = stripModernColors(styleEl.textContent);
  });

  clonedDoc.querySelectorAll('[style]').forEach((el) => {
    const inlineStyle = el.getAttribute('style');
    if (inlineStyle) el.setAttribute('style', stripModernColors(inlineStyle));
  });

  const win = clonedDoc.defaultView;
  const root = rootSelector ? clonedDoc.querySelector(rootSelector) : clonedDoc.body;
  if (!win || !root) return;

  root.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof win.Element)) return;
    const cs = win.getComputedStyle(el);
    INLINE_COLOR_PROPS.forEach((prop) => {
      let val = cs.getPropertyValue(prop);
      if (!val || val === 'transparent' || val === 'rgba(0, 0, 0, 0)') return;
      if (hasUnsupportedColor(val)) val = fallbackForProp(prop);
      el.style.setProperty(prop, val);
    });
  });

  if (root.matches?.('[data-report-pdf-clone]') || root.hasAttribute?.('data-report-pdf-clone')) {
    root.style.overflow = 'visible';
    root.querySelectorAll('[class*="overflow"]').forEach((el) => {
      el.style.overflow = 'visible';
    });
  }
}

export function html2canvasOncloneForExport(rootSelector = '[data-report-card]') {
  return (clonedDoc) => prepareClonedDocumentForHtml2Canvas(clonedDoc, rootSelector);
}
