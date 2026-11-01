#!/usr/bin/env node
/**
 * Generates src/themes/sm48.generated.css
 *
 * Scans every class name used in src/ and writes exact-match CSS rules for the
 * two things the SM48 palette variables cannot reach on their own:
 *
 *   A. Arbitrary colours, e.g. bg-[#0f172a], text-[#7d0202]/80, from-[#1e293b]
 *      -> re-mapped to the nearest SM48 colour (neutral / orange / teal / red / gold)
 *   B. Light mode for screens that were designed dark-only
 *      (bg-slate-900, text-white, border-white/10 ...) -> light tiles + ink text
 *
 * Run it again whenever new screens are added:   node scripts/gen-sm48-theme.mjs
 * No dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'themes', 'sm48.generated.css');
const T = 'html[data-theme="sm48"]';
const TL = 'html[data-theme="sm48"]:not(.dark)';

/* ---------- SM48 ramps (must match sm48.css) ---------- */
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const RAMPS = {
  n: ['#F6F8F7', '#EEF2F1', '#DCE2E0', '#C3CCD4', '#98A3AC', '#7A868F', '#4A545E', '#262D33', '#1A1F24', '#111518', '#08090B'],
  o: ['#FFF4EC', '#FFE5D3', '#FFC8A6', '#FFA673', '#FF8E52', '#F26A21', '#D9561A', '#B4460B', '#8A360C', '#5E260B', '#2E1406'],
  t: ['#EAFBF9', '#CBF4F0', '#98E8E1', '#6EDDD4', '#3FCFC4', '#17B8AE', '#0F9A91', '#0A7770', '#0B5C57', '#0B3F3C', '#062523'],
  r: ['#FFF1F1', '#FFE0E0', '#FFC2C3', '#FF9A9D', '#FF7A7E', '#E5484D', '#CC2F35', '#A8242A', '#821E23', '#561418', '#2E0A0C'],
  g: ['#FFF9EB', '#FEF0C7', '#FDDF8E', '#F9CB5A', '#F2C14E', '#E0A82E', '#B9851C', '#8F6416', '#6B4A13', '#46300D', '#241806'],
};

/* ---------- colour helpers ---------- */
function parseColor(s) {
  s = s.trim().toLowerCase();
  let m;
  if ((m = s.match(/^#([0-9a-f]{3,8})$/))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }
  if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
    const p = m[1].split(/[\s,/_]+/).filter(Boolean).map(Number);
    if (p.length >= 3 && p.slice(0, 3).every((x) => !Number.isNaN(x))) return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
  }
  return null;
}
function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}
function lum(hex) {
  const c = parseColor(hex);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
const IMA_MAROON = new Set(['#7d0202', '#680101', '#990000', '#e00a14', '#5c0101', '#a00000', '#8b0000', '#b30000']);
function familyOf(c, hex) {
  if (IMA_MAROON.has(hex)) return 'o';
  const { h, s, l } = hsl(c);
  if (s < 0.2 || l < 0.14 || (l < 0.22 && s < 0.7)) return 'n';
  if (h < 12 || h >= 340) return 'r';
  if (h < 40) return 'o';
  if (h < 62) return 'g';
  if (h < 265) return 't';
  return 'o';
}
/** nearest step in a ramp by relative luminance */
function nearestStep(fam, c) {
  const target = lum('#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join(''));
  let best = 0, bd = Infinity;
  RAMPS[fam].forEach((hx, i) => {
    const d = Math.abs(Math.log((lum(hx) + 0.05) / (target + 0.05)));
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
function mapColor(raw) {
  const c = parseColor(raw);
  if (!c) return null;
  const hex = raw.toLowerCase();
  const fam = familyOf(c, hex);
  // the old IMA maroon is the brand colour: it becomes the SM48 orange
  const i = IMA_MAROON.has(hex) ? (hsl(c).l > 0.2 ? 5 : 6) : nearestStep(fam, c);
  return { fam, step: STEPS[i], hex: RAMPS[fam][i], alpha: c.a, isDark: lum(RAMPS[fam][i]) < 0.06 };
}
function withAlpha(hex, a) {
  if (a >= 0.999) return hex;
  const c = parseColor(hex);
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${+a.toFixed(3)})`;
}

/* ---------- class extraction ---------- */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}
const tokens = new Set();
for (const f of walk(SRC)) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/[!A-Za-z0-9_:\-\[\]#/.%(),]+/g)) {
    const t = m[0];
    if (t.length < 4 || t.length > 120) continue;
    if (!/(?:^|:)!?-?(bg|text|border|from|via|to|ring|fill|stroke|outline|divide|placeholder|decoration|caret|accent)-/.test(t)) continue;
    tokens.add(t.replace(/[.,]+$/, ''));
  }
}

/* ---------- css escaping + variants ---------- */
const esc = (s) => s.replace(/[^a-zA-Z0-9_-]/g, (ch) => '\\' + ch);
function splitVariants(tok) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of tok) {
    if (ch === '[') depth++;
    if (ch === ']') depth--;
    if (ch === ':' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return { variants: parts.slice(0, -1), util: parts[parts.length - 1] };
}
const BP = { sm: '40rem', md: '48rem', lg: '64rem', xl: '80rem', '2xl': '96rem' };
const PSEUDO = { hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within', active: ':active', disabled: ':disabled', checked: ':checked', first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)', placeholder: '::placeholder' };
/** returns { sel, media, darkOnly } or null if a variant is unsupported */
function selectorFor(tok, root) {
  const { variants } = splitVariants(tok);
  let cls = '.' + esc(tok), pre = '', media = null, darkOnly = false;
  for (const v of variants) {
    if (v === 'dark') { darkOnly = true; continue; }
    if (BP[v]) { media = `(min-width: ${BP[v]})`; continue; }
    if (PSEUDO[v]) { cls += PSEUDO[v]; continue; }
    if (v === 'group-hover') { pre += '.group:hover '; continue; }
    if (v === 'group-focus') { pre += '.group:focus '; continue; }
    if (v === 'peer-checked') { pre += '.peer:checked ~ '; continue; }
    return null;
  }
  const r = darkOnly ? `${root}.dark` : root;
  return { sel: `${r} ${pre}${cls}`, media, darkOnly };
}

/* ---------- rules ---------- */
const PROP = {
  bg: (v) => `background-color: ${v} !important;`,
  text: (v) => `color: ${v} !important;`,
  border: (v) => `border-color: ${v} !important;`,
  'border-t': (v) => `border-top-color: ${v} !important;`,
  'border-b': (v) => `border-bottom-color: ${v} !important;`,
  'border-l': (v) => `border-left-color: ${v} !important;`,
  'border-r': (v) => `border-right-color: ${v} !important;`,
  'border-x': (v) => `border-left-color: ${v} !important; border-right-color: ${v} !important;`,
  'border-y': (v) => `border-top-color: ${v} !important; border-bottom-color: ${v} !important;`,
  divide: (v) => `& > :not(:last-child) { border-color: ${v} !important; }`,
  ring: (v) => `--tw-ring-color: ${v} !important;`,
  outline: (v) => `outline-color: ${v} !important;`,
  fill: (v) => `fill: ${v} !important;`,
  stroke: (v) => `stroke: ${v} !important;`,
  from: (v) => `--tw-gradient-from: ${v} !important;`,
  via: (v) => `--tw-gradient-via: ${v} !important;`,
  to: (v) => `--tw-gradient-to: ${v} !important;`,
  placeholder: (v) => `&::placeholder { color: ${v} !important; }`,
  decoration: (v) => `text-decoration-color: ${v} !important;`,
  caret: (v) => `caret-color: ${v} !important;`,
  accent: (v) => `accent-color: ${v} !important;`,
};
const out = { both: [], light: [] };
const groups = { both: new Map(), light: new Map() };
/** rules without a media query and with the same body + suffix are grouped into one :is() list */
function emit(bucket, s, body) {
  if (!s) return;
  if (s.media) { out[bucket].push(`@media ${s.media} { ${s.sel} { ${body} } }`); return; }
  const rootEnd = s.sel.indexOf(' ');
  const root = s.sel.slice(0, rootEnd);
  let rest = s.sel.slice(rootEnd + 1), suffix = '';
  const k = rest.indexOf(':not(aside *)');
  if (k > 0) { suffix = rest.slice(k); rest = rest.slice(0, k); }
  const key = root + '|' + suffix + '|' + body;
  if (!groups[bucket].has(key)) groups[bucket].set(key, { root, suffix, body, sels: [] });
  groups[bucket].get(key).sels.push(rest);
}
function flush(bucket) {
  for (const g of groups[bucket].values()) {
    const list = g.sels.length === 1 ? g.sels[0] : `:is(${g.sels.join(', ')})`;
    const sel = g.suffix ? `${g.root} ${list}${g.suffix}` : `${g.root} ${list}`;
    out[bucket].unshift(g.body.startsWith('&') ? `${sel} { ${g.body} }` : `${sel} { ${g.body} }`);
  }
}

const ARB = /^!?(-?)(bg|text|border(?:-[tblrxy])?|from|via|to|ring|fill|stroke|outline|divide|placeholder|decoration|caret|accent)-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]+\))\](?:\/(\d{1,3}|\[[0-9.]+\]))?!?$/;
const NEUTRAL = '(slate|gray|zinc|neutral|stone)';

/* light-mode surfaces (dark-only screens) */
const L = { tile: 'var(--sm-tile)', tile2: 'var(--sm-tile2)', tile3: 'var(--sm-tile3)', line: 'var(--sm-line)', text: 'var(--sm-text)', text2: 'var(--sm-text2)', muted: 'var(--sm-muted)' };
// elements we never flip in light mode
const KEEP = ':not(aside *):not(aside):not(.sm48-keep-dark):not(.sm48-keep-dark *):not(.fixed.inset-0):not(.absolute.inset-0):not(video):not(img)';
// white text stays white on solid red / black surfaces (orange & teal solids already get ink text)
const SOLID_BG = '.bg-red-500, .bg-red-600, .bg-red-700, .bg-rose-500, .bg-rose-600, .bg-rose-700, .bg-black, .bg-black\\/70, .bg-black\\/80, .bg-black\\/90';
const KEEP_TEXT = `${KEEP}:not(:where(${SOLID_BG}) *):not(:where(${SOLID_BG}))`;

function lightRule(tok, util) {
  let m;
  const s = selectorFor(tok, TL);
  if (!s || s.darkOnly) return;
  const withKeep = (k) => ({ ...s, sel: s.sel + k });
  // backgrounds
  if ((m = util.match(new RegExp(`^bg-${NEUTRAL}-(600|700|800|900|950)(?:\\/(\\d+))?$`)))) {
    const v = +m[2] >= 900 ? L.tile : +m[2] === 800 ? L.tile2 : L.tile3;
    return emit('light', withKeep(KEEP), `background-color: ${v} !important;`);
  }
  if ((m = util.match(/^bg-black\/(\d+)$/)) && +m[1] <= 60) return emit('light', withKeep(KEEP), `background-color: ${+m[1] >= 30 ? L.tile2 : L.tile} !important;`);
  if ((m = util.match(/^bg-white\/(\d+)$/)) && +m[1] <= 20) return emit('light', withKeep(KEEP), `background-color: ${+m[1] >= 10 ? L.tile2 : L.tile} !important;`);
  // text
  if (/^text-white(\/\d+)?$/.test(util) || new RegExp(`^text-${NEUTRAL}-(50|100|200)(\\/\\d+)?$`).test(util)) return emit('light', withKeep(KEEP_TEXT), `color: ${L.text} !important;`);
  if (new RegExp(`^text-${NEUTRAL}-300(\\/\\d+)?$`).test(util)) return emit('light', withKeep(KEEP_TEXT), `color: ${L.text2} !important;`);
  if (new RegExp(`^text-${NEUTRAL}-(400|500)(\\/\\d+)?$`).test(util)) return emit('light', withKeep(KEEP_TEXT), `color: ${L.muted} !important;`);
  // light accent text (x-200/300/400 were tuned for dark backgrounds)
  if ((m = util.match(/^text-(emerald|green|teal|cyan|sky|blue|indigo|lime)-(200|300|400)(\/\d+)?$/))) return emit('light', withKeep(KEEP_TEXT), 'color: var(--sm-te-ink) !important;');
  if ((m = util.match(/^text-(orange|purple|violet|fuchsia|pink)-(200|300|400)(\/\d+)?$/))) return emit('light', withKeep(KEEP_TEXT), 'color: var(--sm-or-ink) !important;');
  if ((m = util.match(/^text-(red|rose)-(200|300|400)(\/\d+)?$/))) return emit('light', withKeep(KEEP_TEXT), 'color: #C4262C !important;');
  if ((m = util.match(/^text-(amber|yellow)-(200|300|400)(\/\d+)?$/))) return emit('light', withKeep(KEEP_TEXT), 'color: #8F6416 !important;');
  // dark tinted accent panels (bg-emerald-950, bg-blue-900/40 ...) -> soft tints
  if ((m = util.match(/^bg-(emerald|green|teal|cyan|sky|blue|indigo|lime)-(800|900|950)(\/\d+)?$/))) return emit('light', withKeep(KEEP), 'background-color: var(--sm-te-tint) !important;');
  if ((m = util.match(/^bg-(orange|purple|violet|fuchsia|pink)-(800|900|950)(\/\d+)?$/))) return emit('light', withKeep(KEEP), 'background-color: var(--sm-or-tint) !important;');
  if ((m = util.match(/^bg-(red|rose)-(800|900|950)(\/\d+)?$/))) return emit('light', withKeep(KEEP), 'background-color: #FCE4E4 !important;');
  if ((m = util.match(/^bg-(amber|yellow)-(800|900|950)(\/\d+)?$/))) return emit('light', withKeep(KEEP), 'background-color: #FEF3C7 !important;');
  // borders
  if (/^(border(-[tblrxy])?|divide)-white\/\d+$/.test(util) || new RegExp(`^(border(-[tblrxy])?|divide)-${NEUTRAL}-(600|700|800|900|950)(\\/\\d+)?$`).test(util)) {
    const prop = util.startsWith('divide') ? '& > :not(:last-child) { border-color: var(--sm-line) !important; }' : `border-color: ${L.line} !important;`;
    return emit('light', withKeep(KEEP), prop);
  }
  // gradient stops built from dark neutrals
  if ((m = util.match(new RegExp(`^(from|via|to)-(${NEUTRAL.slice(1, -1)}|black)(?:-(\\d+))?(?:\\/(\\d+))?$`)))) {
    if (m[2] === 'black' || +m[3] >= 700) return emit('light', withKeep(KEEP), `--tw-gradient-${m[1]}: ${L.tile} !important;`);
  }
}

let nArb = 0;
const seen = new Set();
for (const tok of [...tokens].sort()) {
  const { util } = splitVariants(tok);
  const u = util.replace(/^!/, '').replace(/!$/, '');
  // A. arbitrary colours
  const m = u.match(ARB);
  if (m) {
    const mapped = mapColor(m[3]);
    if (!mapped) continue;
    let a = mapped.alpha;
    if (m[4]) a *= m[4].startsWith('[') ? parseFloat(m[4].slice(1, -1)) : (+m[4] / 100);
    const kind = m[2];
    const s = selectorFor(tok, T);
    if (!s || !PROP[kind]) continue;
    const key = s.sel + (s.media || '');
    if (seen.has(key)) continue;
    seen.add(key);
    emit('both', s, PROP[kind](withAlpha(mapped.hex, a)));
    nArb++;
    // light mode for dark arbitrary surfaces / light text
    const ls = selectorFor(tok, TL);
    if (ls && !ls.darkOnly && mapped.fam === 'n') {
      if (kind === 'bg' && mapped.isDark) emit('light', { ...ls, sel: ls.sel + KEEP }, `background-color: ${a < 0.999 && a < 0.5 ? L.tile2 : L.tile} !important;`);
      if (kind === 'text' && !mapped.isDark && lum(mapped.hex) > 0.35) emit('light', { ...ls, sel: ls.sel + KEEP_TEXT }, `color: ${L.text} !important;`);
      if (kind.startsWith('border') && mapped.isDark) emit('light', { ...ls, sel: ls.sel + KEEP }, `border-color: ${L.line} !important;`);
      if ((kind === 'from' || kind === 'via' || kind === 'to') && mapped.isDark) emit('light', { ...ls, sel: ls.sel + KEEP }, `--tw-gradient-${kind}: ${L.tile} !important;`);
    }
    continue;
  }
  // B. light mode for dark-only palette classes
  lightRule(tok, u);
}

flush('both'); flush('light');
const header = `/* AUTO-GENERATED by scripts/gen-sm48-theme.mjs. Do not edit by hand.
   ${tokens.size} class tokens scanned, ${nArb} arbitrary colours re-mapped, ${[...groups.light.values()].reduce((a, g) => a + g.sels.length, 0)} light-mode fixes. */\n`;
const css = header +
  `\n/* ===== A. Arbitrary colours -> SM48 (both modes) ===== */\n` + out.both.join('\n') +
  `\n\n/* ===== B. Light mode for dark-only screens ===== */\n` + out.light.join('\n') + '\n';
fs.writeFileSync(OUT, css);
console.log(`sm48.generated.css: ${tokens.size} tokens, ${nArb} arbitrary colours, ${out.light.length} light rules, ${(css.length / 1024).toFixed(0)} KB`);
