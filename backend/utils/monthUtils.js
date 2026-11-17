// Shared month-name helpers.
// Used to merge Theory (classType 1) and Paper (classType 2) groups of the same month
// into ONE campaign month, even when their Group names are written slightly differently.

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const SINHALA_MONTH_MAP = {
    'ජනවාරි': 'January', 'පෙබරවාරි': 'February', 'මාර්තු': 'March', 'අප්‍රේල්': 'April',
    'මැයි': 'May', 'ජූනි': 'June', 'ජූලි': 'July', 'අගෝස්තු': 'August',
    'සැප්තැම්බර්': 'September', 'ඔක්තෝම්බර්': 'October', 'නොවැම්බර්': 'November', 'දෙසැම්බර්': 'December'
};

const SHORT_PREFIXES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// "Monthly Payment - May" / "MAY Paper" / "මැයි" -> "May". Returns null if no month found.
const parseMonthName = (str) => {
    if (!str) return null;
    const s = String(str).trim();
    for (const [sin, eng] of Object.entries(SINHALA_MONTH_MAP)) {
        if (s.includes(sin)) return eng;
    }
    const lower = s.toLowerCase();
    for (const m of MONTH_NAMES) {
        if (lower.includes(m.toLowerCase())) return m;
    }
    for (let i = 0; i < SHORT_PREFIXES.length; i++) {
        if (new RegExp(`\\b${SHORT_PREFIXES[i]}`).test(lower)) return MONTH_NAMES[i];
    }
    return null;
};

// Key used to merge groups: month + year (if a 4-digit year is in the name).
// Groups without any month word fall back to their trimmed, lower-cased name (no merging).
const getMonthKey = (groupName) => {
    const month = parseMonthName(groupName);
    if (!month) return `raw:${String(groupName || '').trim().toLowerCase()}`;
    const yearMatch = String(groupName).match(/\b(20\d{2})\b/);
    return `${month.toLowerCase()}${yearMatch ? '-' + yearMatch[1] : ''}`;
};

module.exports = { MONTH_NAMES, SINHALA_MONTH_MAP, parseMonthName, getMonthKey };
