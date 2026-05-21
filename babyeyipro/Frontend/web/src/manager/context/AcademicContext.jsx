/**
 * AcademicContext — single source of truth for academic year & term.
 *
 * The manager sets current_academic_year and active_terms in
 * Settings → Preferences. This context fetches those settings once,
 * infers the "current" term from the calendar month, and makes them
 * available to every page via `useAcademic()`.
 *
 * Pages should use the context values as DEFAULT state — they are still
 * free to let users select a different term/year for historical views.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api from '../services/api';

const STORAGE_KEY = 'babyeyi_academic_settings';

// ── Infer current term from month ────────────────────────────────────────────
// Matches the backend's inferTermFromMonth logic:
//   Sep–Dec → terms[0]  (Term 1)
//   Jan–Apr → terms[1]  (Term 2)
//   May–Aug → terms[2]  (Term 3)
// If fewer / more terms exist we distribute evenly.
function inferTerm(activeTerms) {
    if (!activeTerms || activeTerms.length === 0) return 'Term 1';
    const m = new Date().getMonth(); // 0 = Jan … 11 = Dec
    const n = activeTerms.length;
    // Normalised position in an academic year that starts in September
    // 0 = Sep, 1 = Oct … 3 = Dec, 4 = Jan … 11 = Aug
    const pos = (m >= 8 ? m - 8 : m + 4); // 0–11
    const idx = Math.min(Math.floor((pos / 12) * n), n - 1);
    return activeTerms[idx];
}

// ── Generate a descending list of academic years ──────────────────────────────
function buildYearList(currentYear, count = 4) {
    const [aStr] = String(currentYear || '').split('-');
    const a = Number(aStr);
    if (!a) return [currentYear];
    return Array.from({ length: count }, (_, i) => {
        const y = a - i;
        return `${y}-${y + 1}`;
    });
}

// ── Context & hook ────────────────────────────────────────────────────────────
const AcademicContext = createContext(null);

export function AcademicProvider({ children }) {
    // Warm up from localStorage to avoid blank flicker on first render
    const cached = (() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
    })();

    const [academicYear, setAcademicYear]   = useState(cached.academicYear   || '');
    const [activeTerms, setActiveTerms]     = useState(cached.activeTerms    || []);
    const [currentTerm, setCurrentTerm]     = useState(cached.currentTerm    || '');
    const [termDates, setTermDates]         = useState(cached.termDates      || []);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState(null);

    const [academicYearsRegistry, setAcademicYearsRegistry] = useState(cached.academicYearsRegistry || []);

    const apply = useCallback((data) => {
        const year  = data.current_academic_year || '2025-2026';
        const terms = Array.isArray(data.active_terms) && data.active_terms.length
            ? data.active_terms
            : ['Term 1', 'Term 2', 'Term 3'];
        const term  = inferTerm(terms);
        const dates = Array.isArray(data.term_dates) ? data.term_dates : [];
        const registry = Array.isArray(data.academic_years_registry) ? data.academic_years_registry : [];
        setAcademicYear(year);
        setActiveTerms(terms);
        setCurrentTerm(term);
        setTermDates(dates);
        setAcademicYearsRegistry(registry);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                academicYear: year,
                activeTerms: terms,
                currentTerm: term,
                termDates: dates,
                academicYearsRegistry: registry,
            }));
        } catch { /* storage quota – ignore */ }
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/dos/academic-calendar-settings');
            if (res.data?.success) {
                apply(res.data.data || {});
            } else {
                // Use defaults so the UI is never stuck
                apply({});
            }
        } catch (e) {
            setError(e.message || 'Could not load academic settings');
            // Apply defaults so callers still get a usable value
            apply({});
        } finally {
            setLoading(false);
        }
    }, [apply]);

    useEffect(() => { refresh(); }, [refresh]);

    /** Registered years from settings, else generated list from current year. */
    const academicYears = useMemo(() => {
        if (academicYearsRegistry.length) {
            return academicYearsRegistry.map((r) => r.academic_year);
        }
        return buildYearList(academicYear, 5);
    }, [academicYearsRegistry, academicYear]);

    /** Return the date config for a given term name, or null if not configured. */
    const getTermDates = useCallback((termName) => {
        return termDates.find((t) => t.name === termName) || null;
    }, [termDates]);

    const value = {
        academicYear,   // e.g. "2025-2026"
        currentTerm,    // inferred current term e.g. "Term 2"
        activeTerms,    // e.g. ["Term 1", "Term 2", "Term 3"]
        academicYears,  // registered years or generated list
        academicYearsRegistry, // full registry with terms & dates
        termDates,      // [{ name, start, end }, …]
        getTermDates,   // (termName) => { name, start, end } | null
        loading,
        error,
        refresh,
    };

    return (
        <AcademicContext.Provider value={value}>
            {children}
        </AcademicContext.Provider>
    );
}

/** Hook — always returns safe defaults even outside the provider. */
export function useAcademic() {
    const ctx = useContext(AcademicContext);
    if (!ctx) {
        // Graceful fallback for pages rendered outside AcademicProvider
        const now = new Date();
        const y   = now.getFullYear();
        const fallbackYear = now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
        const m   = now.getMonth();
        const fallbackTerm = m >= 8 ? 'Term 1' : m >= 4 ? 'Term 3' : 'Term 2';
        return {
            academicYear:  fallbackYear,
            currentTerm:   fallbackTerm,
            activeTerms:   ['Term 1', 'Term 2', 'Term 3'],
            academicYears: [fallbackYear, `${Number(fallbackYear.split('-')[0]) - 1}-${Number(fallbackYear.split('-')[0])}`],
            termDates:     [],
            getTermDates:  () => null,
            loading:       false,
            error:         null,
            refresh:       () => {},
        };
    }
    return ctx;
}
