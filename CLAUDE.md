# Productie Zwartboek — notes for Claude

Personal freelance CRM for a Post Production Producer. React + Vite (no TypeScript), Supabase, deployed on Vercel at https://productie-zwartboek.vercel.app (auto-deploys on push to `main`).

## Data
One Supabase table `crm_data (key TEXT PRIMARY KEY, data JSONB)`. Keys used by the app:

| Key | Contents |
|---|---|
| `pipeline` | Contacts (stages Radar / Reached out to me / Replied / Won / Archived) |
| `agencies` | Agencies & studios |
| `brands` | Brands |
| `crew` | Rolodex |
| `jobs` | All jobs; `type` is `Freelance` or `Contract` (two tabs in the app) |
| `bookings` | Bookings / Pencils / Time Off (`kind`) |
| `lastSweep` | `{ at, name, jobIds }` written by the job sweep |
| `bookingYears` | Extra years added with "+ New Year" |

The user sometimes calls these `jf` (freelance jobs), `jc` (contract jobs) and `jw` (pipeline). Those keys do **not** exist: jf/jc = `jobs` filtered by `type`, jw = `pipeline`.

## "Run sweep AMS"
Full instructions are in the comment block at the top of `src/sweep.js` (same text is in the claude.ai Project doc `claude/sweep-ams.md`). The exact list of LinkedIn searches comes from `sweepSearches()` in `src/sweep.js` (also `window.zwartboek.searches()` on the live app) — use it instead of hand-typing URLs. In short:

1. **City searches, all job types** (full-time, contract, on-site, remote), English + local-language titles: Amsterdam; Berlin, Hamburg, Munich, Frankfurt, Cologne; Warsaw, Kraków, Wrocław. Past week (past month for a first pass on a new city).
2. **Country-wide contract searches** (Contract / Temporary / Other) for NL, DE, PL; UK remote contract only.
3. **Post searches** in Dutch, German and Polish (Polish is low-yield).
4. Save new relevant roles via `await window.zwartboek.importSweep([...])` on the live app in Chrome (it de-duplicates, sets `isNew: true`, writes `jobs` and `lastSweep`). The sandbox cannot reach Supabase directly.
5. Report overdue contacts (no contact in 14+ days) in chat via `window.zwartboek.overdueContacts()`. **Never write to the pipeline during a sweep.**
6. Skip junior roles, internships, crew roles (editors, camera, audio), game producers, factory production-manager roles, and anything outside post production / film producing.

**Triggers:** "Run sweep AMS" = core countries above. "Run sweep EU" = Czechia (Prague), Spain (Madrid, Barcelona), Italy (Milan, Rome), Switzerland (Zurich, Geneva, Lausanne), Belgium (Antwerp, Ghent, Brussels — Flemish focus), prepared 26 Oct 2026 with localised titles but **not yet run**: on its first run, verify the country geoIds, resolve the city geoIds via LinkedIn's location box, use `{ firstPass: true }`, then mark the countries `status: 'active'` (see the checklist in `src/sweep.js`). "Run sweep all" = both (~85 page loads, only on request). `sweepSearches({ groups: ['eu'] })` gives the EU list.

LinkedIn gotchas: always use geoIds (names get ignored or snapped to districts); never add the experience-level filter (it hides unlabelled listings); only take the first N cards where N is the result count; scroll the list before reading; "Jobs you may be interested in" means zero results.

Use the Claude in Chrome extension (the user's signed-in Chrome) for the LinkedIn steps.
