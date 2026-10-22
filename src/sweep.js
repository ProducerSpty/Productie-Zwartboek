/*
 * ===========================================================================
 *  SWEEP INSTRUCTIONS — "Run sweep AMS"
 * ===========================================================================
 *
 *  When the user types "Run sweep AMS", Claude runs this sweep using the
 *  Claude in Chrome extension (the user's own, signed-in Chrome).
 *  The same instructions live in CLAUDE.md and in the claude.ai Project
 *  "CRM TEST" (doc: claude/sweep-ams.md) — keep all three in sync.
 *
 *  Profile: Post Production Producer, based around Amsterdam, freelance (ZZP).
 *
 *  1. LINKEDIN JOBS — AMSTERDAM
 *     Search LinkedIn Jobs, location Amsterdam, once per keyword in
 *     SWEEP_AMS.keywords. Use filters: posted in the past week, experience
 *     level Associate and above (see SWEEP_AMS.amsterdamSearch).
 *
 *  2. LINKEDIN JOBS — REMOTE, CONTRACT/FREELANCE ONLY
 *     Same keywords, remote roles in each of SWEEP_AMS.remoteCountries
 *     (Netherlands, UK, Germany, Poland), job type Contract / Temporary /
 *     Other only (LinkedIn has no "Freelance" type; freelance roles sit there).
 *
 *  3. LINKEDIN POST SEARCHES — PEOPLE LOOKING TO HIRE
 *     Run 2–3 searches in LinkedIn *posts* (not jobs) with broad, UNQUOTED
 *     keywords from SWEEP_AMS.postSearches, sorted by latest. Look for people
 *     publicly looking to hire a producer / post producer.
 *     - A post that describes a concrete role → save it as a job (type
 *       Freelance unless the post says contract), sourceUrl = the post URL,
 *       notes = who posted + a one-line summary.
 *     - Anything vaguer → only mention it in the chat report.
 *
 *  4. WRITE NEW RELEVANT ROLES
 *     Storage mapping (the user's shorthand → this app's real keys):
 *       "jf" (freelance jobs) → crm_data key `jobs`, with type: 'Freelance'
 *       "jc" (contract jobs)  → crm_data key `jobs`, with type: 'Contract'
 *       "jw" (pipeline)       → crm_data key `pipeline`  (READ ONLY in a sweep)
 *     Classification: freelance / ZZP / per-project / day-rate roles → Freelance.
 *     Contract, fixed-term, interim → Contract. Permanent full-time roles from
 *     step 1 → Contract with "Permanent" at the start of notes.
 *     Every new entry gets isNew: true, status 'New', today's dateAdded.
 *     ALWAYS de-duplicate before writing. Don't write to Supabase by hand:
 *     open https://productie-zwartboek.vercel.app in Chrome and call
 *       await window.zwartboek.importSweep([...jobs])
 *     which de-duplicates (LinkedIn job id, URL, or company+role) and saves.
 *     (The sandbox cannot reach Supabase; the browser can.)
 *
 *  5. REPORT OVERDUE PIPELINE CONTACTS — IN CHAT ONLY
 *     Call window.zwartboek.overdueContacts() on the same page and list the
 *     contacts with no contact in 14+ days (or never). NEVER write to the
 *     pipeline during a sweep — importSweep() only touches `jobs`.
 *
 *  6. SKIP
 *     Junior roles, assistants/coordinators, internships, traineeships,
 *     graduate schemes, and anything clearly outside post production /
 *     film & content producing (see SWEEP_AMS.skip).
 *
 *  REPORT FORMAT (chat): jobs added (freelance / contract, with links),
 *  duplicates skipped, hiring posts worth a look, overdue contacts.
 *  Keep LinkedIn activity to these searches — heavy automated browsing can
 *  get an account rate-limited.
 * ===========================================================================
 */

export const SWEEP_AMS = {
  trigger: 'Run sweep AMS',
  appUrl: 'https://productie-zwartboek.vercel.app',
  profile: 'Post Production Producer',
  keywords: [
    'Post Producer',
    'Post production producers',
    'Film Producer',
    'Shoot Producer',
    'Senior post producer',
    'Senior film producer',
  ],
  amsterdamSearch: {
    location: 'Amsterdam, North Holland, Netherlands',
    // LinkedIn URL params: past week, experience Associate/Mid-Senior/Director/Executive
    params: { f_TPR: 'r604800', f_E: '3,4,5,6' },
  },
  remoteCountries: ['Netherlands', 'United Kingdom', 'Germany', 'Poland'],
  remoteSearch: {
    // remote only; job types Contract, Temporary, Other; past week
    params: { f_WT: '2', f_JT: 'C,T,O', f_TPR: 'r604800' },
  },
  postSearches: ['freelance producent gezocht', 'looking for a producer amsterdam', 'freelance post producer needed'],
  skip: ['junior', 'intern', 'internship', 'stage', 'stagiair', 'trainee', 'graduate', 'werkstudent', 'assistant', 'runner'],
  overdueDays: 14,
}

/* ---------------- helpers used by window.zwartboek (see App.jsx) ---------------- */

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// LinkedIn job id from a URL like /jobs/view/1234567890 or ?currentJobId=1234567890
export function linkedinJobId(url) {
  const m = String(url || '').match(/(?:jobs\/view\/|currentJobId=)(\d{6,})/)
  return m ? m[1] : ''
}

function cleanUrl(url) {
  return String(url || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase()
}

export function isDuplicateJob(candidate, existing) {
  const id = linkedinJobId(candidate.sourceUrl)
  const url = cleanUrl(candidate.sourceUrl)
  const key = norm(candidate.company) + '|' + norm(candidate.role)
  return existing.some((j) => {
    if (id && linkedinJobId(j.sourceUrl) === id) return true
    if (url && cleanUrl(j.sourceUrl) === url) return true
    return norm(j.company) && norm(j.role) && norm(j.company) + '|' + norm(j.role) === key
  })
}

const SKIP_RE = new RegExp('\\b(' + SWEEP_AMS.skip.join('|') + ')\\b', 'i')

// Turn raw sweep results into job records; returns { toAdd, duplicates, skipped, invalid }
export function prepareSweepJobs(raw, existing, { today, now, makeId }) {
  const toAdd = []
  const duplicates = []
  const skipped = []
  const invalid = []
  for (const r of raw || []) {
    const role = String(r.role || r.title || '').trim()
    if (!role) {
      invalid.push(r)
      continue
    }
    if (SKIP_RE.test(role)) {
      skipped.push(role)
      continue
    }
    const job = {
      id: makeId(),
      company: String(r.company || '').trim(),
      role,
      type: /contract/i.test(r.type) ? 'Contract' : 'Freelance',
      location: String(r.location || '').trim(),
      sector: String(r.sector || '').trim(),
      priority: Number(r.priority) || 0,
      status: 'New',
      sourceUrl: String(r.sourceUrl || r.url || '').trim(),
      notes: String(r.notes || '').trim(),
      dateAdded: today,
      isNew: true,
      sweep: 'AMS',
      createdAt: now,
      updatedAt: now,
      statusChangedAt: now,
    }
    if (isDuplicateJob(job, [...existing, ...toAdd])) {
      duplicates.push(`${job.role}${job.company ? ' @ ' + job.company : ''}`)
      continue
    }
    toAdd.push(job)
  }
  return { toAdd, duplicates, skipped, invalid }
}

// Pipeline contacts not contacted in `days`+ days (or never); archived ones ignored
export function overdueContacts(pipeline, today, days = SWEEP_AMS.overdueDays) {
  const dayMs = 86400000
  return (pipeline || [])
    .filter((r) => r.stage !== 'Archived')
    .map((r) => {
      const since = r.lastContact ? Math.round((new Date(today + 'T00:00:00') - new Date(r.lastContact + 'T00:00:00')) / dayMs) : null
      return { name: r.name, company: r.company || '', stage: r.stage, lastContact: r.lastContact || null, daysSince: since }
    })
    .filter((c) => c.daysSince === null || c.daysSince >= days)
    .sort((a, b) => (b.daysSince ?? 1e9) - (a.daysSince ?? 1e9))
}
