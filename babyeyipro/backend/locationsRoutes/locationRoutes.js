// ================================================================
// locationRoutes.js  --  Rwanda Administrative Locations  v2.1
//
// Cascade (dependent dropdowns):
//   GET /api/locations/provinces
//   GET /api/locations/districts?province=Northern+Province
//   GET /api/locations/sectors?province=Northern+Province&district=Musanze
//   GET /api/locations/cells?province=...&district=...&sector=...
//   GET /api/locations/villages?province=...&district=...&sector=...&cell=...
//
// Bulk / full-dataset (for autocomplete, seeding, reference):
//   GET /api/locations/all               → entire nested tree
//   GET /api/locations/all/provinces     → flat list, 5 rows
//   GET /api/locations/all/districts     → flat list, 30 rows  (+ province)
//   GET /api/locations/all/sectors       → flat list, 416 rows (+ province, district)
//   GET /api/locations/all/cells         → flat list, 2 149 rows
//   GET /api/locations/all/villages      → flat list, 14 837 rows
//
//   Optional filter on bulk endpoints:
//     ?province=Northern+Province
//     ?province=...&district=Musanze
//     ?province=...&district=...&sector=Muhoza
//     ?province=...&district=...&sector=...&cell=Mpenge
//
// v2.0 fixes (kept):
//   - rwanda v3.x Districts({provinces:'North'}) not Districts('North')
//   - Sectors() package bug bypassed via raw data access
//   - Province names normalised: accepts "North", "Northern Province", etc.
// ================================================================

'use strict';

const express = require('express');
const router  = express.Router();

// ── Load the rwanda package & extract its raw nested data ────────
//
// rwanda v3.x has a Sectors() bug: it returns ALL sectors for the
// entire province, not just the requested district.  We bypass every
// package function by reading the raw data object directly from the
// minified source – this is safe, fast, and version-stable.

let rwandaData   = null;   // { East: { Bugesera: { Gashora: { Biryogo: [villages] }}}}
let rwandaModule = null;

try {
  rwandaModule = require('rwanda');

  const fs = require('fs');
  let pkgPath;
  try { pkgPath = require.resolve('rwanda'); } catch (_) {}

  if (pkgPath) {
    const src    = fs.readFileSync(pkgPath, 'utf8');
    const aStart = src.indexOf('const a=');
    const aEnd   = src.indexOf(';function ', aStart > -1 ? aStart : 0);
    if (aStart > -1 && aEnd > aStart) {
      try {
        // eslint-disable-next-line no-new-func
        rwandaData = new Function('return ' + src.slice(aStart + 8, aEnd))();
        console.log(
          '[locationRoutes] Rwanda data loaded – provinces:',
          Object.keys(rwandaData).join(', ')
        );
      } catch (e) {
        console.warn('[locationRoutes] Could not parse rwanda raw data:', e.message);
      }
    }
  }
} catch (e) {
  console.warn('[locationRoutes] rwanda package not installed. Run: npm install rwanda');
}

// ── Province name mappings ───────────────────────────────────────

// Any variant a client might send  →  internal short key in the data
const TO_SHORT = {
  'kigali city':       'Kigali',
  'kigali':            'Kigali',
  'northern province': 'North',
  'north':             'North',
  'northern':          'North',
  'nothern':           'North',   // common typo in imported data
  'southern province': 'South',
  'south':             'South',
  'southern':          'South',
  'eastern province':  'East',
  'east':              'East',
  'eastern':           'East',
  'western province':  'West',
  'west':              'West',
  'western':           'West',
};

// Short data key  →  display label returned to the client
const TO_DISPLAY = {
  Kigali: 'Kigali City',
  North:  'Northern Province',
  South:  'Southern Province',
  East:   'Eastern Province',
  West:   'Western Province',
};

/** Returns the internal short key, or null if unrecognised. */
function shortKey(raw) {
  return raw ? (TO_SHORT[String(raw).trim().toLowerCase()] || null) : null;
}

// ── Response helpers ─────────────────────────────────────────────

function unavailable(res) {
  return res.status(503).json({
    success: false,
    message: 'Location service unavailable. Install the package: npm install rwanda',
  });
}
function badParam(res, msg) {
  return res.status(400).json({ success: false, message: msg });
}
function notFound(res, msg) {
  return res.status(404).json({ success: false, message: msg });
}
function qStr(req, key) {
  return String(req.query[key] || '').trim();
}

// ════════════════════════════════════════════════════════════════
// CASCADE ENDPOINTS  (dependent dropdown flow)
// ════════════════════════════════════════════════════════════════

// ── GET /api/locations/provinces ────────────────────────────────
router.get('/provinces', (_req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    const keys = rwandaData
      ? Object.keys(rwandaData)
      : (rwandaModule.Provinces() || []);
    return res.json({
      success: true,
      data: keys.map(k => TO_DISPLAY[k] || k).sort(),
    });
  } catch (err) {
    console.error('[locationRoutes] /provinces:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch provinces' });
  }
});

// ── GET /api/locations/districts?province=... ────────────────────
router.get('/districts', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  const rawP = qStr(req, 'province');
  if (!rawP) return badParam(res, 'province param is required');
  const key = shortKey(rawP);
  if (!key) {
    return notFound(res,
      `Unknown province "${rawP}". Valid: ${Object.values(TO_DISPLAY).join(', ')}`);
  }
  try {
    const districts = rwandaData
      ? Object.keys(rwandaData[key] || {})
      : (rwandaModule.Districts({ provinces: key }) || []);
    if (!districts.length) return notFound(res, `No districts for "${rawP}"`);
    return res.json({ success: true, data: districts.sort() });
  } catch (err) {
    console.error('[locationRoutes] /districts:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch districts' });
  }
});

// ── GET /api/locations/sectors?province=...&district=... ─────────
router.get('/sectors', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  const rawP = qStr(req, 'province');
  const rawD = qStr(req, 'district');
  if (!rawP || !rawD) return badParam(res, 'province and district params are required');
  const key = shortKey(rawP);
  if (!key) return notFound(res, `Unknown province "${rawP}"`);
  try {
    let sectors;
    if (rwandaData) {
      const distData = (rwandaData[key] || {})[rawD];
      if (!distData) return notFound(res, `District "${rawD}" not found in "${rawP}"`);
      sectors = Object.keys(distData);
    } else {
      // Package Sectors() has a bug (returns whole province), use as last resort
      sectors = rwandaModule.Sectors({ province: key, district: rawD }) || [];
    }
    if (!sectors.length) return notFound(res, `No sectors for "${rawP}" / "${rawD}"`);
    return res.json({ success: true, data: sectors.sort() });
  } catch (err) {
    console.error('[locationRoutes] /sectors:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch sectors' });
  }
});

// ── GET /api/locations/cells?province=...&district=...&sector=... ─
router.get('/cells', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  const rawP = qStr(req, 'province');
  const rawD = qStr(req, 'district');
  const rawS = qStr(req, 'sector');
  if (!rawP || !rawD || !rawS) {
    return badParam(res, 'province, district and sector params are required');
  }
  const key = shortKey(rawP);
  if (!key) return notFound(res, `Unknown province "${rawP}"`);
  try {
    let cells;
    if (rwandaData) {
      const sectData = ((rwandaData[key] || {})[rawD] || {})[rawS];
      if (!sectData) return notFound(res, `Sector "${rawS}" not found in "${rawD}", "${rawP}"`);
      cells = Object.keys(sectData);
    } else {
      cells = rwandaModule.Cells({ province: key, district: rawD, sector: rawS }) || [];
    }
    if (!cells.length) return notFound(res, `No cells for "${rawP}" / "${rawD}" / "${rawS}"`);
    return res.json({ success: true, data: cells.sort() });
  } catch (err) {
    console.error('[locationRoutes] /cells:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch cells' });
  }
});

// ── GET /api/locations/villages?...&cell=... ────────────────────
router.get('/villages', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  const rawP = qStr(req, 'province');
  const rawD = qStr(req, 'district');
  const rawS = qStr(req, 'sector');
  const rawC = qStr(req, 'cell');
  if (!rawP || !rawD || !rawS || !rawC) {
    return badParam(res, 'province, district, sector and cell params are required');
  }
  const key = shortKey(rawP);
  if (!key) return notFound(res, `Unknown province "${rawP}"`);
  try {
    let villages;
    if (rwandaData) {
      villages = (((rwandaData[key] || {})[rawD] || {})[rawS] || {})[rawC] || [];
    } else if (rwandaModule.Villages) {
      villages = rwandaModule.Villages({
        province: key, district: rawD, sector: rawS, cell: rawC,
      }) || [];
    } else {
      villages = [];
    }
    if (!villages.length) {
      return notFound(res, `No villages for "${rawC}", "${rawS}", "${rawD}", "${rawP}"`);
    }
    return res.json({ success: true, data: villages.sort() });
  } catch (err) {
    console.error('[locationRoutes] /villages:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch villages' });
  }
});

// ════════════════════════════════════════════════════════════════
// BULK / FULL-DATASET ENDPOINTS
// ════════════════════════════════════════════════════════════════
//
// These return flat arrays of every row at the requested level.
// All support optional narrowing via query params so you can get
// e.g. all sectors in a specific district without loading everything.
//
// Counts (no filter):
//   Provinces  :     5
//   Districts  :    30
//   Sectors    :   416
//   Cells      : 2 149
//   Villages   :14 837
//
// Results are sorted and cached on first request (lazily).

// ── Lazy cache ───────────────────────────────────────────────────
const _cache = {};

function buildFlatData() {
  if (_cache.built) return;
  _cache.provinces = [];
  _cache.districts = [];
  _cache.sectors   = [];
  _cache.cells     = [];
  _cache.villages  = [];

  if (!rwandaData) { _cache.built = true; return; }

  for (const pKey of Object.keys(rwandaData).sort()) {
    const pName = TO_DISPLAY[pKey] || pKey;
    _cache.provinces.push({ province: pName });

    for (const dName of Object.keys(rwandaData[pKey]).sort()) {
      _cache.districts.push({ province: pName, district: dName });

      for (const sName of Object.keys(rwandaData[pKey][dName]).sort()) {
        _cache.sectors.push({ province: pName, district: dName, sector: sName });

        for (const cName of Object.keys(rwandaData[pKey][dName][sName]).sort()) {
          _cache.cells.push({ province: pName, district: dName, sector: sName, cell: cName });

          for (const vName of [...(rwandaData[pKey][dName][sName][cName] || [])].sort()) {
            _cache.villages.push({
              province: pName, district: dName, sector: sName, cell: cName, village: vName,
            });
          }
        }
      }
    }
  }
  _cache.built = true;
}

// ── Filter helper for bulk endpoints ────────────────────────────
function applyFilters(rows, req) {
  const rawP = qStr(req, 'province');
  const rawD = qStr(req, 'district');
  const rawS = qStr(req, 'sector');
  const rawC = qStr(req, 'cell');

  let result = rows;
  if (rawP) {
    // Normalise to display name for comparison
    const keyP = shortKey(rawP);
    const displayP = keyP ? (TO_DISPLAY[keyP] || rawP) : rawP;
    result = result.filter(r => r.province && r.province.toLowerCase() === displayP.toLowerCase());
  }
  if (rawD) result = result.filter(r => r.district && r.district.toLowerCase() === rawD.toLowerCase());
  if (rawS) result = result.filter(r => r.sector   && r.sector.toLowerCase()   === rawS.toLowerCase());
  if (rawC) result = result.filter(r => r.cell     && r.cell.toLowerCase()     === rawC.toLowerCase());
  return result;
}

// ── GET /api/locations/all  →  full nested tree ──────────────────
// Returns the complete hierarchy as a nested object:
// { "Eastern Province": { "Bugesera": { "Gashora": { "Biryogo": ["Bidudu",...] }}}}
router.get('/all', (_req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    if (!rwandaData) {
      return res.status(503).json({
        success: false,
        message: 'Full tree unavailable – raw data not loaded.',
      });
    }
    // Convert internal short keys to display names
    const tree = {};
    for (const pKey of Object.keys(rwandaData).sort()) {
      const pName = TO_DISPLAY[pKey] || pKey;
      tree[pName] = {};
      for (const dName of Object.keys(rwandaData[pKey]).sort()) {
        tree[pName][dName] = {};
        for (const sName of Object.keys(rwandaData[pKey][dName]).sort()) {
          tree[pName][dName][sName] = {};
          for (const cName of Object.keys(rwandaData[pKey][dName][sName]).sort()) {
            tree[pName][dName][sName][cName] =
              [...(rwandaData[pKey][dName][sName][cName] || [])].sort();
          }
        }
      }
    }
    return res.json({
      success: true,
      counts: {
        provinces: 5,
        districts: 30,
        sectors:   416,
        cells:     2149,
        villages:  14837,
      },
      data: tree,
    });
  } catch (err) {
    console.error('[locationRoutes] /all:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to build location tree' });
  }
});

// ── GET /api/locations/all/provinces ────────────────────────────
// Returns: [ { province: "Eastern Province" }, ... ]  (5 rows)
router.get('/all/provinces', (_req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    buildFlatData();
    return res.json({
      success: true,
      count:   _cache.provinces.length,
      data:    _cache.provinces,
    });
  } catch (err) {
    console.error('[locationRoutes] /all/provinces:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch all provinces' });
  }
});

// ── GET /api/locations/all/districts ────────────────────────────
// Returns: [ { province, district }, ... ]  (30 rows)
// Filter:  ?province=Northern+Province
router.get('/all/districts', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    buildFlatData();
    const data = applyFilters(_cache.districts, req);
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[locationRoutes] /all/districts:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch all districts' });
  }
});

// ── GET /api/locations/all/sectors ──────────────────────────────
// Returns: [ { province, district, sector }, ... ]  (416 rows)
// Filter:  ?province=...  or  ?province=...&district=...
router.get('/all/sectors', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    buildFlatData();
    const data = applyFilters(_cache.sectors, req);
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[locationRoutes] /all/sectors:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch all sectors' });
  }
});

// ── GET /api/locations/all/cells ────────────────────────────────
// Returns: [ { province, district, sector, cell }, ... ]  (2 149 rows)
// Filter:  ?province=...&district=...&sector=...  (any combination)
router.get('/all/cells', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    buildFlatData();
    const data = applyFilters(_cache.cells, req);
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[locationRoutes] /all/cells:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch all cells' });
  }
});

// ── GET /api/locations/all/villages ─────────────────────────────
// Returns: [ { province, district, sector, cell, village }, ... ]  (14 837 rows)
// Filter:  ?province=...&district=...&sector=...&cell=...  (any combination)
// NOTE: Unfiltered response is ~3 MB – always filter for production use.
router.get('/all/villages', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    buildFlatData();

    // Warn if caller requests unfiltered 14k-row payload
    const anyFilter = qStr(req, 'province') || qStr(req, 'district') ||
                      qStr(req, 'sector')   || qStr(req, 'cell');
    if (!anyFilter) {
      res.setHeader('X-Warning', 'Unfiltered village list (14 837 rows). Add ?province=... to narrow.');
    }

    const data = applyFilters(_cache.villages, req);
    return res.json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('[locationRoutes] /all/villages:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch all villages' });
  }
});

// ── GET /api/locations/search?q=... ─────────────────────────────
// Full-text search across all admin levels (province / district /
// sector / cell / village).  Returns up to 50 matches by default.
// ?q=Musanze  →  all rows where any field contains "musanze"
// ?q=Musanze&level=sector  →  only sector-level rows
// ?limit=100  →  return up to 100 results
router.get('/search', (req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  const q     = qStr(req, 'q').toLowerCase();
  const level = qStr(req, 'level').toLowerCase();   // province|district|sector|cell|village
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);

  if (!q) return badParam(res, 'q param is required');

  try {
    buildFlatData();

    // Determine which pool to search
    let pool;
    switch (level) {
      case 'province': pool = _cache.provinces; break;
      case 'district': pool = _cache.districts; break;
      case 'sector':   pool = _cache.sectors;   break;
      case 'cell':     pool = _cache.cells;     break;
      case 'village':  pool = _cache.villages;  break;
      default:         pool = _cache.villages;  break; // deepest = most fields to search
    }

    const results = [];
    for (const row of pool) {
      if (results.length >= limit) break;
      const values = Object.values(row).join(' ').toLowerCase();
      if (values.includes(q)) results.push(row);
    }

    return res.json({ success: true, count: results.length, q, level: level || 'village', data: results });
  } catch (err) {
    console.error('[locationRoutes] /search:', err.message);
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// ── GET /api/locations/stats ─────────────────────────────────────
// Quick count of every level.
router.get('/stats', (_req, res) => {
  if (!rwandaData && !rwandaModule) return unavailable(res);
  try {
    buildFlatData();
    return res.json({
      success: true,
      data: {
        provinces: _cache.provinces.length,
        districts: _cache.districts.length,
        sectors:   _cache.sectors.length,
        cells:     _cache.cells.length,
        villages:  _cache.villages.length,
      },
    });
  } catch (err) {
    console.error('[locationRoutes] /stats:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

module.exports = router;