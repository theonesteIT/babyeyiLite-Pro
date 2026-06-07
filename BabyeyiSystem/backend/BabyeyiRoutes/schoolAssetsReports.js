/**
 * Asset Reports API — mounted from schoolAssets.js
 * GET /api/school/assets/reports/:type
 */

function mountAssetReports(router, deps) {
  const {
    promisePool,
    requireRole,
    ASSETS_READ_ROLES,
    trimStr,
    toMoney,
    mapAssetRow,
    mapAssetTestListRow,
    buildQrValue,
    CHART_COLORS,
    ensureAssignmentsTable,
    ensureMaintenanceTable,
    ensureTransfersTable,
    mapConditionToAnalyticsLabel,
  } = deps;

  function buildReportFilters(query) {
    const parts = [];
    const params = [];

    const year = trimStr(query.register_year || query.year);
    if (year && year.toLowerCase() !== 'all') {
      const yr = Number(year);
      if (Number.isFinite(yr)) {
        parts.push('register_year = ?');
        params.push(yr);
      }
    }

    const category = trimStr(query.category);
    if (category && category.toLowerCase() !== 'all') {
      parts.push('category = ?');
      params.push(category);
    }

    const location = trimStr(query.location);
    if (location && location.toLowerCase() !== 'all') {
      parts.push('location LIKE ?');
      params.push(`%${location}%`);
    }

    const status = trimStr(query.status);
    if (status && status.toLowerCase() !== 'all') {
      if (status === 'Assigned') {
        parts.push(`id IN (
          SELECT asset_id FROM school_asset_assignments
          WHERE school_id = school_assets.school_id AND status = 'Active'
        )`);
      } else if (status === 'Maintenance') {
        parts.push("(status = 'Under Maintenance' OR status = 'Maintenance')");
      } else if (status === 'Damaged') {
        parts.push("(UPPER(condition_code) = 'DAMAGED' OR status = 'Damaged')");
      } else if (status === 'Retired') {
        parts.push("(status = 'Retired' OR status = 'Disposed' OR assets_status = 'Retired')");
      } else {
        parts.push('(status = ? OR assets_status = ?)');
        params.push(status, status);
      }
    }

    const health = trimStr(query.health || query.asset_health_status);
    if (health && health.toLowerCase() !== 'all') {
      parts.push('asset_health_status = ?');
      params.push(health);
    }

    const dateRange = trimStr(query.date_range);
    const dateFrom = trimStr(query.date_from || query.dateFrom);
    const dateTo = trimStr(query.date_to || query.dateTo);
    const dateMonth = trimStr(query.date_month || query.dateMonth);
    const dateYear = trimStr(query.date_year || query.dateYear);
    const dateCol = 'DATE(COALESCE(purchase_date, created_at))';

    if (dateFrom && dateTo) {
      parts.push(`${dateCol} >= ? AND ${dateCol} <= ?`);
      params.push(dateFrom, dateTo);
    } else if (dateFrom) {
      parts.push(`${dateCol} >= ?`);
      params.push(dateFrom);
    } else if (dateTo) {
      parts.push(`${dateCol} <= ?`);
      params.push(dateTo);
    } else if (dateMonth && /^\d{4}-\d{2}$/.test(dateMonth)) {
      parts.push(`YEAR(${dateCol}) = ? AND MONTH(${dateCol}) = ?`);
      params.push(Number(dateMonth.slice(0, 4)), Number(dateMonth.slice(5, 7)));
    } else if (dateYear && /^\d{4}$/.test(dateYear)) {
      parts.push(`YEAR(${dateCol}) = ?`);
      params.push(Number(dateYear));
    } else if (dateRange === 'week') {
      parts.push(`YEARWEEK(${dateCol}, 1) = YEARWEEK(CURDATE(), 1)`);
    } else if (dateRange === 'month') {
      parts.push(`YEAR(${dateCol}) = YEAR(CURDATE()) AND MONTH(${dateCol}) = MONTH(CURDATE())`);
    } else if (dateRange === 'quarter') {
      parts.push(`YEAR(${dateCol}) = YEAR(CURDATE()) AND QUARTER(${dateCol}) = QUARTER(CURDATE())`);
    } else if (dateRange === 'year') {
      parts.push(`YEAR(${dateCol}) = YEAR(CURDATE())`);
    }

    const extra = parts.length ? ` AND ${parts.join(' AND ')}` : '';
    return { extra, params };
  }

  async function loadFilterMeta(schoolId) {
    const [catRows] = await promisePool.query(
      `SELECT DISTINCT category FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND category IS NOT NULL AND category != ''
       ORDER BY category`,
      [schoolId]
    );
    const [locRows] = await promisePool.query(
      `SELECT DISTINCT location FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND location IS NOT NULL AND location != ''
       ORDER BY location LIMIT 200`,
      [schoolId]
    );
    const [yearRows] = await promisePool.query(
      `SELECT DISTINCT register_year AS yr FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND register_year IS NOT NULL
       ORDER BY register_year DESC`,
      [schoolId]
    );
    const [fyRows] = await promisePool.query(
      `SELECT year, status FROM school_asset_financial_years
       WHERE school_id = ? ORDER BY year DESC LIMIT 20`,
      [schoolId]
    ).catch(() => [[]]);

    return {
      categories: catRows.map((r) => r.category),
      locations: locRows.map((r) => r.location),
      years: yearRows.map((r) => Number(r.yr)).filter(Boolean),
      financial_years: (fyRows || []).map((r) => ({ year: r.year, status: r.status })),
      statuses: ['Active', 'Assigned', 'Maintenance', 'Damaged', 'Retired'],
    };
  }

  async function loadReportKpis(schoolId, extra, params) {
    const [[row]] = await promisePool.query(
      `SELECT
         COUNT(*) AS total_assets,
         COALESCE(SUM(COALESCE(total_balance, opening_amount, unit_price, 0)), 0) AS total_value,
         COALESCE(SUM(COALESCE(total_dep, accumulated_depreciation, 0)), 0) AS total_depreciation,
         SUM(CASE WHEN status = 'Under Maintenance' OR status = 'Maintenance' THEN 1 ELSE 0 END) AS under_maintenance,
         SUM(CASE WHEN UPPER(condition_code) = 'DAMAGED' OR status = 'Damaged' THEN 1 ELSE 0 END) AS damaged_assets
       FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'${extra}`,
      [schoolId, ...params]
    );

    let activeAssignments = 0;
    try {
      await ensureAssignmentsTable();
      const [[aa]] = await promisePool.query(
        `SELECT COUNT(*) AS cnt FROM school_asset_assignments WHERE school_id = ? AND status = 'Active'`,
        [schoolId]
      );
      activeAssignments = Number(aa?.cnt || 0);
    } catch { /* ignore */ }

    const thisYear = new Date().getFullYear();
    const [[prior]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
         AND register_year = ?`,
      [schoolId, thisYear - 1]
    );
    const [[curr]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
         AND register_year = ?`,
      [schoolId, thisYear]
    );
    const priorCnt = Number(prior?.cnt || 0);
    const currCnt = Number(curr?.cnt || 0);
    const yoyPct = priorCnt > 0 ? Math.round(((currCnt - priorCnt) / priorCnt) * 100) : (currCnt > 0 ? 100 : 0);

    return {
      total_assets: Number(row?.total_assets || 0),
      total_value: Number(row?.total_value || 0),
      total_depreciation: Number(row?.total_depreciation || 0),
      under_maintenance: Number(row?.under_maintenance || 0),
      active_assignments: activeAssignments,
      damaged_assets: Number(row?.damaged_assets || 0),
      yoy_growth_pct: yoyPct,
    };
  }

  async function buildInsights(schoolId, kpis) {
    const insights = [];
    const yr = new Date().getFullYear();

    const [[ict]] = await promisePool.query(
      `SELECT COALESCE(SUM(annual_dep), 0) AS dep FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL AND category LIKE '%IT%'
         AND register_year = ?`,
      [schoolId, yr]
    ).catch(() => [[{ dep: 0 }]]);
    if (Number(ict?.dep || 0) > 0) {
      insights.push({
        level: 'warning',
        text: `ICT equipment annual depreciation is RWF ${Math.round(Number(ict.dep)).toLocaleString()} this year.`,
      });
    }

    const [[replaceCnt]] = await promisePool.query(
      `SELECT COUNT(*) AS cnt FROM school_assets
       WHERE school_id = ? AND deleted_at IS NULL
         AND (UPPER(condition_code) = 'DAMAGED' OR COALESCE(net_book_value, 0) <= 0)`,
      [schoolId]
    );
    const repl = Number(replaceCnt?.cnt || 0);
    if (repl > 0) {
      insights.push({
        level: 'warning',
        text: `${repl} asset${repl === 1 ? '' : 's'} may require replacement or write-off review.`,
      });
    }

    if (kpis.under_maintenance > 0) {
      insights.push({
        level: 'info',
        text: `${kpis.under_maintenance} assets currently under maintenance.`,
      });
    }

    try {
      await ensureAssignmentsTable();
      const [[overdue]] = await promisePool.query(
        `SELECT COUNT(*) AS cnt FROM school_asset_assignments
         WHERE school_id = ? AND status = 'Active'
           AND expected_return_date IS NOT NULL AND expected_return_date < CURDATE()`,
        [schoolId]
      );
      const od = Number(overdue?.cnt || 0);
      if (od > 0) {
        insights.push({
          level: 'danger',
          text: `${od} assigned asset${od === 1 ? '' : 's'} overdue for return.`,
        });
      }
    } catch { /* ignore */ }

    if (!insights.length) {
      insights.push({ level: 'success', text: 'Asset register is healthy — no critical alerts.' });
    }
    return insights;
  }

  async function runReport(schoolId, type, query) {
    const { extra, params } = buildReportFilters(query);
    const baseWhere = `school_id = ? AND deleted_at IS NULL AND status != 'Draft'${extra}`;
    const baseParams = [schoolId, ...params];

    switch (type) {
      case 'overview': {
        const kpis = await loadReportKpis(schoolId, extra, params);
        const filters = await loadFilterMeta(schoolId);
        const insights = await buildInsights(schoolId, kpis);
        const [recent] = await promisePool.query(
          `SELECT id, asset_code, asset_name, category, created_at FROM school_assets
           WHERE ${baseWhere} ORDER BY updated_at DESC LIMIT 8`,
          baseParams
        );
        return {
          type: 'overview',
          title: 'Asset Reports & Analytics',
          subtitle: 'Generate, Analyze & Export Asset Reports',
          kpis,
          insights,
          filters,
          recent: recent.map(mapAssetRow),
        };
      }

      case 'all-assets': {
        const [rows] = await promisePool.query(
          `SELECT * FROM school_assets WHERE ${baseWhere} ORDER BY id ASC LIMIT 2000`,
          baseParams
        );

        const ALL_ASSETS_COLUMNS = [
          'S/N', 'ASSET NAME', 'CATEGORY', 'OPENING STOCK', 'PURCHASE PRICE',
          'TOTAL BALANCE', 'ACCUMULATED DEPRECIATION', 'DEPRECIATION RATE',
          'ANNUAL DEPRECIATION', 'TOTAL DEPRECIATION', 'NET BOOK VALUE',
          'HEALTH STATUS', 'QUANTITY', 'QR CODE',
        ];

        const tableRows = rows.map((row, idx) => {
          const a = mapAssetTestListRow(row);
          if (!a) return null;
          const depRate = a.dep_rate != null ? Number(a.dep_rate) : null;
          return {
            sn: idx + 1,
            asset_name: a.asset_name || '—',
            category: a.category || '—',
            opening_stock: Number(a.opening_amount || 0),
            purchase_price: Number(a.unit_price || 0),
            total_balance: Number(a.total_balance || 0),
            accumulated_depreciation: Number(a.accumulated_depreciation || 0),
            dep_rate: depRate != null ? `${depRate}%` : '—',
            annual_depreciation: Number(a.annual_dep || 0),
            total_depreciation: Number(a.total_dep || 0),
            net_book_value: Number(a.net_book_value || 0),
            asset_health_status: a.asset_health_status || 'Used',
            quantity: Number(a.quantity || 1),
            asset_code: a.asset_code,
            id: a.id,
            qr_code: a.qr_value || buildQrValue(row),
          };
        }).filter(Boolean);

        return {
          type,
          title: 'All Assets Report',
          subtitle: 'Full asset register — same fields as Asset Add Test',
          layout: 'all_assets',
          table: {
            columns: ALL_ASSETS_COLUMNS,
            rows: tableRows,
          },
        };
      }

      case 'categories': {
        const [rows] = await promisePool.query(
          `SELECT COALESCE(category, 'Uncategorized') AS category,
             COUNT(*) AS quantity,
             COALESCE(SUM(unit_price), 0) AS original_cost,
             COALESCE(SUM(COALESCE(net_book_value, total_balance, 0)), 0) AS current_value
           FROM school_assets WHERE ${baseWhere}
           GROUP BY COALESCE(category, 'Uncategorized') ORDER BY quantity DESC`,
          baseParams
        );
        const chart = rows.map((r, i) => ({
          name: r.category,
          quantity: Number(r.quantity),
          original_cost: Number(r.original_cost),
          current_value: Number(r.current_value),
          color: CHART_COLORS[i % CHART_COLORS.length],
        }));
        return {
          type,
          title: 'Assets by Category',
          subtitle: 'Quantity and value breakdown by category',
          chart,
          table: {
            columns: ['Category', 'Quantity', 'Original Cost', 'Current Value'],
            rows: chart,
          },
        };
      }

      case 'financial-years': {
        const [rows] = await promisePool.query(
          `SELECT register_year AS year,
             COUNT(*) AS total_added,
             COALESCE(SUM(unit_price), 0) AS total_value,
             COALESCE(SUM(COALESCE(annual_dep, 0)), 0) AS depreciation,
             COALESCE(SUM(COALESCE(net_book_value, 0)), 0) AS net_book_value
           FROM school_assets WHERE school_id = ? AND deleted_at IS NULL AND status != 'Draft'
             AND register_year IS NOT NULL
           GROUP BY register_year ORDER BY register_year DESC`,
          [schoolId]
        );
        return {
          type,
          title: 'Assets by Financial Year',
          subtitle: 'Register activity per financial year',
          chart: rows.map((r) => ({
            year: String(r.year),
            total_added: Number(r.total_added),
            total_value: Number(r.total_value),
            depreciation: Number(r.depreciation),
            net_book_value: Number(r.net_book_value),
          })),
          table: {
            columns: ['Year', 'Assets Added', 'Total Value', 'Depreciation', 'Net Book Value'],
            rows: rows.map((r) => ({
              year: r.year,
              total_added: Number(r.total_added),
              total_value: Number(r.total_value),
              depreciation: Number(r.depreciation),
              net_book_value: Number(r.net_book_value),
            })),
          },
        };
      }

      case 'health': {
        const HEALTH_COLORS = {
          Used: '#10b981',
          'Not Used (Old)': '#f59e0b',
        };

        const [healthRows] = await promisePool.query(
          `SELECT COALESCE(NULLIF(TRIM(asset_health_status), ''), 'Used') AS health_status,
             COUNT(*) AS cnt
           FROM school_assets
           WHERE ${baseWhere}
           GROUP BY COALESCE(NULLIF(TRIM(asset_health_status), ''), 'Used')`,
          baseParams
        );

        const total = healthRows.reduce((s, r) => s + Number(r.cnt), 0) || 1;
        const chart = healthRows.map((r) => {
          const name = r.health_status || 'Used';
          const cnt = Number(r.cnt);
          return {
            name,
            value: Math.round((cnt / total) * 100),
            count: cnt,
            color: HEALTH_COLORS[name] || '#94a3b8',
          };
        });

        if (!chart.some((c) => c.name === 'Used')) {
          chart.unshift({ name: 'Used', value: 0, count: 0, color: HEALTH_COLORS.Used });
        }
        if (!chart.some((c) => c.name === 'Not Used (Old)')) {
          chart.push({ name: 'Not Used (Old)', value: 0, count: 0, color: HEALTH_COLORS['Not Used (Old)'] });
        }

        const [rows] = await promisePool.query(
          `SELECT asset_code, asset_name, category, location,
                  COALESCE(NULLIF(TRIM(asset_health_status), ''), 'Used') AS health_status,
                  updated_at
           FROM school_assets WHERE ${baseWhere}
           ORDER BY health_status ASC, asset_name ASC LIMIT 500`,
          baseParams
        );

        const usedCount = chart.find((c) => c.name === 'Used')?.count ?? 0;
        const notUsedCount = chart.find((c) => c.name === 'Not Used (Old)')?.count ?? 0;

        return {
          type,
          title: 'Asset Health Report',
          subtitle: 'Used vs Not Used (Old) — asset utilization status',
          summary: {
            used: usedCount,
            not_used_old: notUsedCount,
            total,
          },
          chart,
          table: {
            columns: ['Asset Code', 'Asset Name', 'Category', 'Health Status', 'Location', 'Last Updated'],
            rows: rows.map((r) => {
              const status = r.health_status || 'Used';
              return {
                asset_code: r.asset_code,
                asset_name: r.asset_name,
                category: r.category || '—',
                health_status: status,
                location: r.location || '—',
                last_updated: r.updated_at,
              };
            }),
          },
        };
      }

      case 'assignments': {
        await ensureAssignmentsTable();
        const [rows] = await promisePool.query(
          `SELECT sa.asset_name, sa.asset_code, a.assignee_name, a.staff_department,
                  a.assignment_date, a.returnable, a.expected_return_date, a.status
           FROM school_asset_assignments a
           INNER JOIN school_assets sa ON sa.id = a.asset_id AND sa.school_id = a.school_id
           WHERE a.school_id = ? AND a.status = 'Active'
           ORDER BY a.assignment_date DESC LIMIT 500`,
          [schoolId]
        );
        return {
          type,
          title: 'Assigned Assets Report',
          subtitle: 'Active assignments by staff and location',
          table: {
            columns: ['Asset', 'Assigned To', 'Department', 'Assignment Date', 'Returnable', 'Expected Return'],
            rows: rows.map((r) => ({
              asset: `${r.asset_name} (${r.asset_code})`,
              assigned_to: r.assignee_name,
              department: r.staff_department || '—',
              assignment_date: r.assignment_date,
              returnable: r.returnable ? 'Yes' : 'No',
              expected_return_date: r.expected_return_date || '—',
            })),
          },
        };
      }

      case 'returns': {
        await ensureAssignmentsTable();
        const [rows] = await promisePool.query(
          `SELECT sa.asset_name, sa.asset_code, a.assignee_name, a.returned_at,
                  a.condition_code, a.notes
           FROM school_asset_assignments a
           INNER JOIN school_assets sa ON sa.id = a.asset_id AND sa.school_id = a.school_id
           WHERE a.school_id = ? AND a.status = 'Returned'
           ORDER BY a.returned_at DESC LIMIT 500`,
          [schoolId]
        );
        let onTime = 0;
        let late = 0;
        let damaged = 0;
        rows.forEach((r) => {
          if (String(r.condition_code).toUpperCase() === 'DAMAGED') damaged += 1;
          else onTime += 1;
        });
        return {
          type,
          title: 'Returned Assets Report',
          subtitle: 'Return history and condition tracking',
          summary: { returned_on_time: onTime, returned_late: late, damaged_returns: damaged },
          table: {
            columns: ['Asset', 'Returned By', 'Return Date', 'Condition', 'Notes'],
            rows: rows.map((r) => ({
              asset: `${r.asset_name} (${r.asset_code})`,
              returned_by: r.assignee_name,
              return_date: r.returned_at,
              condition_returned: r.condition_code || '—',
              damage_cost: r.notes?.includes('damage') ? 'See notes' : '—',
              notes: r.notes || '—',
            })),
          },
        };
      }

      case 'transfers': {
        await ensureTransfersTable();
        const [rows] = await promisePool.query(
          `SELECT sa.asset_name, sa.asset_code, t.from_location, t.to_location,
                  t.transfer_date, t.approved_by, t.status
           FROM school_asset_transfers t
           INNER JOIN school_assets sa ON sa.id = t.asset_id AND sa.school_id = t.school_id
           WHERE t.school_id = ?
           ORDER BY t.transfer_date DESC LIMIT 500`,
          [schoolId]
        ).catch(() => [[]]);
        const deptMap = {};
        rows.forEach((r) => {
          const key = r.to_location || 'Unknown';
          deptMap[key] = (deptMap[key] || 0) + 1;
        });
        const chart = Object.entries(deptMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);
        return {
          type,
          title: 'Asset Transfer Report',
          subtitle: 'Movement between locations and departments',
          chart,
          table: {
            columns: ['Asset', 'From', 'To', 'Transfer Date', 'Approved By'],
            rows: (rows || []).map((r) => ({
              asset: `${r.asset_name} (${r.asset_code})`,
              from_location: r.from_location,
              to_location: r.to_location,
              transfer_date: r.transfer_date,
              approved_by: r.approved_by || '—',
            })),
          },
        };
      }

      case 'maintenance': {
        await ensureMaintenanceTable();
        const [rows] = await promisePool.query(
          `SELECT sa.asset_name, m.description, m.priority, m.estimated_cost,
                  m.technician, m.end_date, m.status
           FROM school_asset_maintenance m
           LEFT JOIN school_assets sa ON sa.id = m.asset_id AND sa.school_id = m.school_id
           WHERE m.school_id = ?
           ORDER BY m.created_at DESC LIMIT 500`,
          [schoolId]
        ).catch(() => [[]]);
        const open = rows.filter((r) => r.status === 'Open' || r.status === 'Pending').length;
        const completed = rows.filter((r) => r.status === 'Completed' || r.status === 'Closed').length;
        const cost = rows.reduce((s, r) => s + Number(r.estimated_cost || 0), 0);
        return {
          type,
          title: 'Maintenance Report',
          subtitle: 'Tickets, costs, and completion tracking',
          summary: { open_tickets: open, completed, overdue: 0, maintenance_cost: cost },
          table: {
            columns: ['Asset', 'Issue', 'Priority', 'Cost', 'Technician', 'Completion'],
            rows: (rows || []).map((r) => ({
              asset: r.asset_name || '—',
              issue: r.description || '—',
              priority: r.priority || '—',
              cost: Number(r.estimated_cost || 0),
              technician: r.technician || '—',
              completion_date: r.end_date || '—',
            })),
          },
        };
      }

      case 'depreciation': {
        const [rows] = await promisePool.query(
          `SELECT COALESCE(category, 'Uncategorized') AS category,
             COALESCE(SUM(opening_amount), 0) AS opening_balance,
             COALESCE(SUM(unit_price), 0) AS additions,
             COALESCE(SUM(annual_dep), 0) AS annual_depreciation,
             COALESCE(SUM(total_dep), 0) AS accumulated_depreciation,
             COALESCE(SUM(net_book_value), 0) AS net_book_value
           FROM school_assets WHERE ${baseWhere}
           GROUP BY COALESCE(category, 'Uncategorized') ORDER BY category`,
          baseParams
        );
        return {
          type,
          title: 'Depreciation Report',
          subtitle: 'Financial year engine — category depreciation summary',
          table: {
            columns: ['Category', 'Opening Balance', 'Additions', 'Annual Dep.', 'Accumulated Dep.', 'Net Book Value'],
            rows: rows.map((r) => ({
              category: r.category,
              opening_balance: Number(r.opening_balance),
              additions: Number(r.additions),
              annual_depreciation: Number(r.annual_depreciation),
              accumulated_depreciation: Number(r.accumulated_depreciation),
              net_book_value: Number(r.net_book_value),
            })),
          },
        };
      }

      case 'damaged-lost': {
        const [rows] = await promisePool.query(
          `SELECT asset_code, asset_name, category, status, condition_code, location, unit_price
           FROM school_assets
           WHERE school_id = ? AND deleted_at IS NULL
             AND (status IN ('Damaged', 'Lost', 'Stolen', 'Written Off', 'Disposed')
               OR UPPER(condition_code) = 'DAMAGED')${extra}
           ORDER BY updated_at DESC LIMIT 500`,
          baseParams
        );
        const summary = {
          damaged: rows.filter((r) => r.status === 'Damaged' || r.condition_code === 'DAMAGED').length,
          lost: rows.filter((r) => r.status === 'Lost').length,
          stolen: rows.filter((r) => r.status === 'Stolen').length,
          written_off: rows.filter((r) => r.status === 'Written Off' || r.status === 'Disposed').length,
        };
        return {
          type,
          title: 'Damaged & Lost Assets',
          subtitle: 'Audit-ready exception register',
          summary,
          table: {
            columns: ['Code', 'Name', 'Category', 'Status', 'Condition', 'Location', 'Value'],
            rows: rows.map((r) => ({
              asset_code: r.asset_code,
              asset_name: r.asset_name,
              category: r.category,
              status: r.status,
              condition: r.condition_code,
              location: r.location,
              value: Number(r.unit_price || 0),
            })),
          },
        };
      }

      case 'locations': {
        const [rows] = await promisePool.query(
          `SELECT COALESCE(location, 'Unassigned') AS location, COUNT(*) AS asset_count,
             COALESCE(SUM(COALESCE(net_book_value, total_balance, 0)), 0) AS total_value
           FROM school_assets WHERE ${baseWhere}
           GROUP BY COALESCE(location, 'Unassigned') ORDER BY asset_count DESC`,
          baseParams
        );
        return {
          type,
          title: 'Asset Location Report',
          subtitle: 'Assets grouped by physical location',
          chart: rows.map((r, i) => ({
            name: r.location,
            value: Number(r.asset_count),
            total_value: Number(r.total_value),
            color: CHART_COLORS[i % CHART_COLORS.length],
          })),
          table: {
            columns: ['Location', 'Asset Count', 'Total Value'],
            rows: rows.map((r) => ({
              location: r.location,
              asset_count: Number(r.asset_count),
              total_value: Number(r.total_value),
            })),
          },
        };
      }

      default:
        return null;
    }
  }

  const REPORT_TYPES = new Set([
    'overview', 'all-assets', 'categories', 'financial-years', 'health',
    'assignments', 'returns', 'transfers', 'maintenance', 'depreciation',
    'damaged-lost', 'locations',
  ]);

  router.get('/school/assets/reports/:type', requireRole(ASSETS_READ_ROLES), async (req, res) => {
    try {
      const { schoolId } = req.ctx;
      const type = trimStr(req.params.type).toLowerCase();
      if (!REPORT_TYPES.has(type)) {
        return res.status(404).json({ success: false, message: 'Unknown report type' });
      }
      const data = await runReport(schoolId, type, req.query || {});
      if (!data) return res.status(404).json({ success: false, message: 'Report not found' });
      if (type !== 'overview') {
        data.kpis = await loadReportKpis(schoolId, buildReportFilters(req.query).extra, buildReportFilters(req.query).params);
        data.filters = await loadFilterMeta(schoolId);
      }
      res.json({ success: true, data });
    } catch (err) {
      console.error('GET /school/assets/reports/:type:', err);
      res.status(500).json({ success: false, message: err.message || 'Report failed' });
    }
  });
}

module.exports = mountAssetReports;
