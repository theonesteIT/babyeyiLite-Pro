/**
 * html2canvas cannot parse Tailwind v4 oklch()/oklab() colors.
 * Strip them from cloned document styles before capture (see dos/Timetable.jsx).
 */

const MODERN_COLOR_RE = /\b(?:oklab|oklch|color-mix|lab|lch)\([^)]*\)/gi;

export function stripModernColors(cssText) {
  return String(cssText || '').replace(MODERN_COLOR_RE, '#64748b');
}

const INLINE_COLOR_PROPS = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
];

function fallbackForProp(prop) {
  if (prop.includes('background')) return '#ffffff';
  if (prop.includes('border')) return '#e2e8f0';
  return '#1e293b';
}

function hasUnsupportedColor(val) {
  return /oklab|oklch|color-mix|\blab\(|\blch\(/i.test(String(val || ''));
}

/** Browser resolves modern colors to rgb when applied to a real element. */
function resolveToRgb(doc, prop, colorVal) {
  if (!colorVal || !hasUnsupportedColor(colorVal)) return colorVal;
  try {
    const probe = doc.createElement('span');
    probe.style.setProperty(prop, colorVal);
    probe.style.position = 'fixed';
    probe.style.left = '-9999px';
    probe.style.visibility = 'hidden';
    doc.body.appendChild(probe);
    const resolved = doc.defaultView.getComputedStyle(probe).getPropertyValue(prop);
    probe.remove();
    if (resolved && !hasUnsupportedColor(resolved)) return resolved;
  } catch {
    /* ignore */
  }
  return fallbackForProp(prop);
}

/**
 * Run inside html2canvas `onclone` to rewrite styles in the cloned document.
 */
export function prepareClonedDocumentForHtml2Canvas(clonedDoc, rootSelector) {
  if (!clonedDoc) return;

  clonedDoc.documentElement.style.backgroundColor = '#ffffff';
  clonedDoc.body.style.backgroundColor = '#ffffff';

  clonedDoc.querySelectorAll('style').forEach((styleEl) => {
    if (styleEl.textContent) {
      styleEl.textContent = stripModernColors(styleEl.textContent);
    }
  });

  clonedDoc.querySelectorAll('[style]').forEach((el) => {
    const inlineStyle = el.getAttribute('style');
    if (inlineStyle) {
      el.setAttribute('style', stripModernColors(inlineStyle));
    }
  });

  try {
    Array.from(clonedDoc.styleSheets).forEach((sheet) => {
      try {
        Array.from(sheet.cssRules || []).forEach((rule) => {
          if (!rule.style) return;
          Array.from(rule.style).forEach((prop) => {
            const val = rule.style.getPropertyValue(prop);
            if (hasUnsupportedColor(val)) {
              rule.style.setProperty(prop, fallbackForProp(prop), rule.style.getPropertyPriority(prop));
            }
          });
        });
      } catch {
        /* cross-origin stylesheets */
      }
    });
  } catch {
    /* CSSOM unavailable */
  }

  const win = clonedDoc.defaultView;
  const root = rootSelector
    ? clonedDoc.querySelector(rootSelector)
    : clonedDoc.body;
  if (!win || !root) return;

  root.querySelectorAll('*').forEach((el) => {
    if (!(el instanceof win.Element)) return;
    const cs = win.getComputedStyle(el);
    INLINE_COLOR_PROPS.forEach((prop) => {
      let val = cs.getPropertyValue(prop);
      if (!val || val === 'transparent' || val === 'rgba(0, 0, 0, 0)') return;
      if (hasUnsupportedColor(val)) {
        val = resolveToRgb(clonedDoc, prop, val);
      }
      el.style.setProperty(prop, val);
    });
  });
}

export function html2canvasOncloneForExport(rootSelector = '#modern-payslip-document') {
  return (clonedDoc) => {
    prepareClonedDocumentForHtml2Canvas(clonedDoc, rootSelector);
  };
}
