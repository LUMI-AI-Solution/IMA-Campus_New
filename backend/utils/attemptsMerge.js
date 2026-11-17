// Safe merge for Paid-campaign call attempts:
//   attemptsData = { "<month name>": { "1": { status, method, feedback, savedAt? }, "2": {...} } }
//
// Why: every save used to write the FULL attemptsData snapshot from the browser. A stale snapshot
// (old tab, second device, duplicate lead row, or another LeadRoundProgress row) could then
// overwrite a newer answer/remark, so saved data "disappeared" later.
// Rule: the attempt with the newest `savedAt` wins. For old records without `savedAt`,
// a real result (non-pending status / remark) wins over an empty "pending" one.

const parseAttempts = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        const p = JSON.parse(raw);
        return p && typeof p === 'object' ? p : {};
    } catch (e) {
        return {};
    }
};

const ts = (a) => {
    const t = a && a.savedAt ? Date.parse(a.savedAt) : NaN;
    return isNaN(t) ? 0 : t;
};

const contentScore = (a) => {
    if (!a) return -1;
    let s = 0;
    if (a.status && a.status !== 'pending') s += 2;
    if (a.feedback && String(a.feedback).trim() !== '') s += 1;
    return s;
};

// a = existing, b = incoming. Returns the attempt to keep.
const pickAttempt = (a, b) => {
    if (!a) return b;
    if (!b) return a;
    const ta = ts(a);
    const tb = ts(b);
    if (ta && tb) return tb >= ta ? b : a;
    if (tb && !ta) return b;
    if (ta && !tb) {
        // Incoming legacy attempt without savedAt never overwrites a timestamped one
        return a;
    }
    // Both legacy: keep the one with real content; on a tie the incoming one wins (old behaviour)
    return contentScore(b) >= contentScore(a) ? b : a;
};

const mergeAttempts = (existingRaw, incomingRaw) => {
    const existing = parseAttempts(existingRaw);
    const incoming = parseAttempts(incomingRaw);
    const out = {};
    const months = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
    months.forEach(m => {
        const em = existing[m] || {};
        const im = incoming[m] || {};
        const atts = new Set([...Object.keys(em), ...Object.keys(im)]);
        out[m] = {};
        atts.forEach(k => {
            const chosen = pickAttempt(em[k], im[k]);
            if (chosen) out[m][k] = chosen;
        });
    });
    return out;
};

module.exports = { parseAttempts, pickAttempt, mergeAttempts };
