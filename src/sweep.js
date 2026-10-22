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
 *  KEYWORDS: SWEEP_AMS.keywords lists every title (English + Dutch).
 *     To keep LinkedIn activity low, search them as the combined OR queries
 *     in SWEEP_AMS.keywordGroups (one search per group) — not one per keyword.
 *
 *  1. LINKEDIN JOBS — AMSTERDAM
 *     One search per keyword group, location Amsterdam, posted in the past
 *     week, experience level Associate and above (SWEEP_AMS.amsterdamSearch).
 *
 *  2. LINKEDIN JOBS — REMOTE, CONTRACT/FREELANCE ONLY
 *     Remote roles in each of SWEEP_AMS.remoteCountries (Netherlands, UK,
 *     Germany, Poland), job type Contract / Temporary / Other only (LinkedIn
 *     has no "Freelance" type; freelance roles sit there). English groups for
 *     every country; the Dutch group only for the Netherlands.
 *     Use the country's geoId in the URL — LinkedIn ignores location=<name>
 *     here and silently falls back to the Netherlands.
 *
 *  READING RESULTS: only cards above "Expand your search" are real matches.
 *     A page headed "Jobs you may be interested in" (no result count) means
 *     ZERO matches — those cards are recommendations; don't save them.
 *     Open a shortlisted job before saving to check employment type/seniority.
 *
 *  3. LINKEDIN POST SEARCHES — PEOPLE LOOKING TO HIRE
 *     Run every phrase in SWEEP_AMS.postSearches as a LinkedIn *posts* search
 *     (not jobs), unquoted, sorted by latest. Dutch phrases work far better
 *     than English ones. Look for people publicly looking to hire a producer.
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
    // original set
    'Post Producer',
    'Post production producers',
    'Film Producer',
    'Shoot Producer',
    'Senior post producer',
    'Senior film producer',
    // video & content leads (added after first sweep, 22 Oct 2026)
    'Video Lead',
    'Head of Video',
    'Senior Video Producer',
    'Head of Content Production',
    'Content Production Lead',
    // senior production roles that include post
    'Executive Producer',
    'Head of Production',
    'Line Producer',
    'Post Production Supervisor',
    'Post Production Manager',
    'Finishing Producer',
    'Delivery Producer',
    // Dutch titles
    'Producent',
    'Uitvoerend producent',
    'Postproductie producent',
    'Productieleider',
    'Hoofd productie',
    'Video producer',
  ],
  // Combined LinkedIn queries — one search per group (covers all keywords above)
  keywordGroups: {
    postAndFilm: 'Post Producer OR "post production producer" OR "Film Producer" OR "Shoot Producer" OR "Senior post producer" OR "Senior film producer"',
    videoAndContent: '"Video Lead" OR "Head of Video" OR "Senior Video Producer" OR "Video producer" OR "Head of Content Production" OR "Content Production Lead"',
    seniorProduction: '"Executive Producer" OR "Head of Production" OR "Line Producer" OR "Post Production Supervisor" OR "Post Production Manager" OR "Finishing Producer" OR "Delivery Producer"',
    dutch: 'Producent OR "Uitvoerend producent" OR "Postproductie producent" OR Productieleider OR "Hoofd productie" OR "Video producer"',
  },
  dutchGroupOnlyIn: ['Netherlands'],
  amsterdamSearch: {
    location: 'Amsterdam, North Holland, Netherlands',
    // LinkedIn URL params: past week, experience Associate/Mid-Senior/Director/Executive
    params: { f_TPR: 'r604800', f_E: '3,4,5,6' },
  },
  remoteCountries: ['Netherlands', 'United Kingdom', 'Germany', 'Poland'],
  // LinkedIn geoIds — use &geoId=… (location=<name> is ignored for these searches)
  geoIds: { Netherlands: '102890719', 'United Kingdom': '101165590', Germany: '101282230', Poland: '105072130' },
  remoteSearch: {
    // remote only; job types Contract, Temporary, Other; past week
    params: { f_WT: '2', f_JT: 'C,T,O', f_TPR: 'r604800' },
  },
  // Dutch phrases only — English ones returned nothing useful in the first sweep
  postSearches: [
    'freelance producent gezocht',
    'producent gezocht',
    'postproductie producent gezocht',
    'productieleider gezocht',
    'freelance producer gezocht',
    'video producer gezocht',
  ],
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
