# Productie Zwartboek

Personal freelance CRM for post production work — React + Vite, data in Supabase.

## Sections

| Section | Stored under key | Views |
|---|---|---|
| Pipeline (contacts / leads) | `pipeline` | Board (drag between stages), table |
| Agencies & studios | `agencies` | Board by outreach status, table |
| Brands | `brands` | Board by outreach status, table |
| Crew / rolodex | `crew` | Table, board by discipline |
| Jobs | `jobs` | Board by application status, table |
| Bookings | `bookings` | Month calendar (pencils / confirmed), table |

Plus a dashboard with follow-ups, upcoming bookings, job deadlines and pipeline totals.

## Storage

One Supabase table, `crm_data (key TEXT PRIMARY KEY, data JSONB)`. Each section is a JSON
array saved under its key. Changes are saved ~0.6s after you stop editing; a copy is kept in
the browser's localStorage as an offline fallback.

Run `supabase.sql` once in the Supabase SQL editor to create the table and the access policy.

## Config

`src/supabase.js` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment
(set them in Vercel → Project → Settings → Environment Variables), falling back to the values
in the file.

**No authentication yet:** anyone who finds the deployed URL can read and edit the data.
Add Supabase Auth before putting anything sensitive in here.

## Local dev

```bash
npm install
npm run dev
```
