/**
 * SM48 theme boot.
 * Runs before React renders so every page (login, landing, staff ERP, student portal)
 * starts in the SM48 Bento skin with no flash of the old theme.
 *
 * - First visit (or first visit after this rollout): SM48 + dark mode.
 * - After that, the user's own choices (theme picker / light-dark toggle) are respected.
 */
const ROLLOUT_KEY = 'sm48ThemeRollout';
const ROLLOUT_VERSION = '1';

try {
  if (localStorage.getItem(ROLLOUT_KEY) !== ROLLOUT_VERSION) {
    localStorage.setItem('uiTheme', 'sm48');
    if (!localStorage.getItem('themeMode')) localStorage.setItem('themeMode', 'dark');
    localStorage.setItem(ROLLOUT_KEY, ROLLOUT_VERSION);
  }
} catch (e) { /* storage blocked: fall through to defaults */ }

let uiTheme = 'sm48';
let mode = 'dark';
try {
  uiTheme = localStorage.getItem('uiTheme') || 'sm48';
  mode = localStorage.getItem('themeMode') || 'dark';
} catch (e) { /* ignore */ }

const root = document.documentElement;
if (uiTheme && uiTheme !== 'glass') root.dataset.theme = uiTheme === 'chatline' ? 'aurora' : uiTheme;
root.classList.toggle('dark', mode !== 'light');

export const SM48_DEFAULT_THEME = 'sm48';
