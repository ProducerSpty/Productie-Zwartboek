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
Full instructions are in the comment block at the top of `src/sweep.js` (same text is in the claude.ai Project doc `claude/sweep-ams.md`). In short:

1. LinkedIn Jobs in Amsterdam: one search per combined query in `SWEEP_AMS.keywordGroups` (English + Dutch titles; past week, Associate level and up).
2. LinkedIn Jobs, remote, in Netherlands / UK / Germany / Poland (use `SWEEP_AMS.geoIds`, not country names) — Contract, Temporary, Other job types only; Dutch group only for NL.
3. LinkedIn post searches for every Dutch phrase in `SWEEP_AMS.postSearches`, sorted by latest.

4. Save new relevant roles via `await window.zwartboek.importSweep([...])` on the live app in Chrome (it de-duplicates, sets `isNew: true`, writes `jobs` and `lastSweep`). The sandbox cannot reach Supabase directly.
5. Report overdue contacts (no contact in 14+ days) in chat via `window.zwartboek.overdueContacts()`. **Never write to the pipeline during a sweep.**
6. Skip junior roles, internships and anything outside post production / film producing.

Only cards above "Expand your search" are real matches; a page headed "Jobs you may be interested in" means zero results.

Use the Claude in Chrome extension (the user's signed-in Chrome) for the LinkedIn steps.
