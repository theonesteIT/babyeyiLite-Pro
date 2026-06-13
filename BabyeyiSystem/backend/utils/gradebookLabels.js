/**
 * Canonical class/subject labels for gradebook + timetable ↔ students alignment.
 * Must match teacher portal: trim + collapse internal whitespace (case handled in SQL).
 */
function normalizeGradebookLabel(raw) {
    return String(raw || '').trim().replace(/\s+/g, ' ');
}

/**
 * MariaDB: trim, collapse runs of whitespace, lowercase — compare column to bound ?.
 */
function sqlNormLabelEquals(columnSql) {
    return (
        `LOWER(REGEXP_REPLACE(TRIM(IFNULL(${columnSql}, '')), '[[:space:]]+', ' ')) = ` +
        `LOWER(REGEXP_REPLACE(TRIM(IFNULL(?, '')), '[[:space:]]+', ' '))`
    );
}

/** Compare two columns with the same normalization as sqlNormLabelEquals. */
function sqlNormColumnsEqual(columnA, columnB) {
    const norm = (col) =>
        `LOWER(REGEXP_REPLACE(TRIM(IFNULL(${col}, '')), '[[:space:]]+', ' '))`;
    return `${norm(columnA)} = ${norm(columnB)}`;
}

function normKeyClass(s) {
    return normalizeGradebookLabel(s).toLowerCase();
}

function formatSchoolClassRow(r) {
    return normalizeGradebookLabel(
        `${r.group_name || ''} ${r.stream_name || ''} ${r.combination || ''}`
    );
}

/**
 * Map timetable class_name (often "Group Stream" without combination) to full labels
 * that match `students.class_name` and school_classes (group + stream + combination).
 *
 * @param {string} ttClassRaw - value from academic_timetables.class_name
 * @param {string[]} studentClassNames - DISTINCT students.class_name for the school
 * @param {Array<{group_name?:string,stream_name?:string,combination?:string}>} registryRows - school_classes rows
 * @returns {string[]} canonical labels (normalized), sorted; at least one entry (timetable fallback)
 */
function resolveTimetableClassLabels(ttClassRaw, studentClassNames, registryRows) {
    const tt = normalizeGradebookLabel(ttClassRaw);
    const k = normKeyClass(ttClassRaw);
    if (!tt) return [];

    const students = (studentClassNames || [])
        .map((s) => String(s || '').trim())
        .filter(Boolean);

    const exactStudents = students.filter((sc) => normKeyClass(sc) === k);
    if (exactStudents.length) {
        return [...new Set(exactStudents.map((sc) => normalizeGradebookLabel(sc)))].sort((a, b) =>
            a.localeCompare(b)
        );
    }

    const byPrefix = students.filter(
        (sc) => normKeyClass(sc) === k || normKeyClass(sc).startsWith(`${k} `)
    );
    if (byPrefix.length) {
        return [...new Set(byPrefix.map((sc) => normalizeGradebookLabel(sc)))].sort((a, b) =>
            a.localeCompare(b)
        );
    }

    const regFormatted = (registryRows || [])
        .map((r) => formatSchoolClassRow(r))
        .filter(Boolean);

    const exactReg = regFormatted.filter((full) => normKeyClass(full) === k);
    if (exactReg.length) {
        return [...new Set(exactReg)].sort((a, b) => a.localeCompare(b));
    }

    const regPrefix = regFormatted.filter(
        (full) => normKeyClass(full) === k || normKeyClass(full).startsWith(`${k} `)
    );
    if (regPrefix.length) {
        return [...new Set(regPrefix)].sort((a, b) => a.localeCompare(b));
    }

    return [tt];
}

/** Union of school registry, student roster, and timetable class labels. */
function collectSchoolRegisteredClassNames({
    registryRows = [],
    studentClassNames = [],
    timetableClassNames = [],
} = {}) {
    const set = new Set();
    for (const r of registryRows) {
        const label = formatSchoolClassRow(r);
        if (label) set.add(label);
    }
    for (const name of studentClassNames) {
        const label = normalizeGradebookLabel(name);
        if (label) set.add(label);
    }
    for (const name of timetableClassNames) {
        const label = normalizeGradebookLabel(name);
        if (label) set.add(label);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

module.exports = {
    normalizeGradebookLabel,
    sqlNormLabelEquals,
    sqlNormColumnsEqual,
    formatSchoolClassRow,
    resolveTimetableClassLabels,
    collectSchoolRegisteredClassNames,
};
