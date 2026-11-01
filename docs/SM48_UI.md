# SM48 Bento UI

The whole frontend runs in the **SM48 Bento** skin by default (orange `#F26A21` + teal `#17B8AE`, Inter, dark + light).
Nothing in the business logic changed: every page, button, modal and API call is the same code, only the look changed.

## How it works

| File | What it does |
| --- | --- |
| `src/themes/sm48.css` | The skin. Re-points Tailwind v4 colour variables (`--color-slate-900`, `--color-emerald-500`, ...) to SM48 ramps, so every existing class re-colours automatically. Also: Inter type, tile radii, inputs, tables, modals, island sidebar, student shell, no glass blur / neon glows. |
| `src/themes/sm48.generated.css` | Generated. Re-maps arbitrary colours (`bg-[#0f172a]`, `text-[#7d0202]` ...) and adds light-mode fixes for screens that were built dark-only. |
| `scripts/gen-sm48-theme.mjs` | Builds the file above from every class used in `src/`. **Run it after adding new screens:** `node scripts/gen-sm48-theme.mjs` |
| `src/themes/sm48-boot.js` | Sets SM48 + dark mode before React renders (first visit), then respects the user's choice. |

Colour mapping: blue / indigo / sky / cyan / emerald / green / teal / lime -> **teal**; purple / violet / fuchsia / pink / orange -> **orange**; red / rose stay **red** (errors); amber / yellow stay **gold** (warnings); slate / gray / zinc / neutral / stone -> SM48 neutrals.

Old themes (Classic glass, Aurora, Bento) are still in the theme picker (palette button in the staff sidebar).

## Screens rebuilt by hand
- Staff layout: island sidebar with SM48 logo, collapse, light/dark toggle (`MainLayout.jsx`, `Sidebar.jsx`)
- Student portal shell + sidebar with light/dark toggle (`StudentDashboardV2.jsx`, `SidebarV2.jsx`)
- Login, Register
- New public home page `/` (`pages/web/pages/SM48LandingPage.jsx`). The old IMA landing is still at `/campus`.

## Branding still to decide (left as-is on purpose)
These are tenant / legal texts, not UI chrome. Change them to the institute's name when SM48 is sold to a client (ideally from the Business record):
- Printed documents: `ThermalReceiptModal`, `LecturerInvoiceModal`, `LecturerAttendanceSheetModal`, `DailyCashFlowPrintModal` ("IMA INSTITUTE OF HIGHER EDUCATION - MALABE"), `AttendanceSessionsReportView`, `AutomatedSmsAuditView`, `ExportReportModal`, `StaffPerformanceModal`, `FinancialReports`, `PhysicalTimetable`, `ClassComparisonReport`
- SMS templates: `SmsSettingsModal`, `BulkSmsModal` ("- IMA Campus")
- AI prompts: `SinhalaVoiceAgentTester`, `AIImageGeneratorPage`, `AIVideoGenerator`
- IMA marketing pages under `pages/web/` (Academy, FastTrack, About, Library portal)

Old IMA logo files are kept as `public/logo-ima.png` and `public/favicon-ima.svg`.
