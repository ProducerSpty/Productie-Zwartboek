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
 *  Profile: (Executive) Post Production Producer, freelance (ZZP), works
 *  internationally — Netherlands, Germany, Poland (+ remote UK).
 *
 *  THE SEARCH LIST IS GENERATED: call sweepSearches() below (or rebuild it the
 *  same way) to get every LinkedIn URL with its label. Don't hand-type URLs.
 *  Updated 23 Oct 2026: Germany + Poland added with localised titles, city
 *  searches, full-time/on-site roles, and country-wide contract searches.
 *
 *  TRIGGERS (SWEEP_AMS.triggers):
 *    "Run sweep AMS" → core group: Netherlands, Germany, Poland, UK  (~40 loads)
 *    "Run sweep EU"  → eu group: Czechia (Prague), Spain (Madrid, Barcelona),
 *                      Italy (Milan, Rome), Switzerland (Zurich, Geneva,
 *                      Lausanne), Belgium (Antwerp, Ghent, Brussels) (~45 loads)
 *    "Run sweep all" → both — only if the user asks; ~85 page loads.
 *  The eu group was prepared 26 Oct 2026 without a LinkedIn test run: on its
 *  first run follow the FIRST RUN CHECKLIST next to the EU countries.
 *
 *  1. CITY SEARCHES — ALL JOB TYPES (full-time, contract, on-site, hybrid, remote)
 *     For every city in SWEEP_AMS.countries[*].cities: one search per query
 *     in that country's `queries` (English + local language), past week.
 *       Netherlands: Amsterdam (4 queries: 3 English groups + Dutch)
 *       Germany:     Berlin, Hamburg, Munich, Frankfurt, Cologne (English + German)
 *       Poland:      Warsaw, Kraków, Wrocław (English + Polish)
 *     Do NOT add the experience-level filter (f_E): LinkedIn then hides every
 *     listing without a stated level (it hid Platige Image's producer role).
 *     Junior roles are filtered by the skip list instead.
 *
 *  2. COUNTRY-WIDE CONTRACT SEARCHES
 *     Netherlands, Germany, Poland: same queries, whole country, job types
 *     Contract / Temporary / Other (f_JT=C,T,O), any workplace type.
 *     United Kingdom: remote only (f_WT=2) + contract types, English queries.
 *     LinkedIn has no "Freelance" type; freelance roles sit under these.
 *
 *  LOCATIONS: always use geoId (SWEEP_AMS geoIds). location=<name> is ignored
 *     for country searches and snaps cities to districts (Berlin → Köpenick).
 *
 *  READING RESULTS:
 *     - Read the "N results" count and only take the first N cards — LinkedIn
 *       appends recommendations after the real matches, sometimes without an
 *       "Expand your search" divider.
 *     - A page headed "Jobs you may be interested in" means ZERO matches.
 *     - Scroll the results list before reading: cards past ~7 render empty
 *       until scrolled into view.
 *     - Give each page ~3.5 s after navigating.
 *     - Open each shortlisted job before saving to check employment type,
 *       hours, language and seniority.
 *
 *  3. LINKEDIN POST SEARCHES — PEOPLE LOOKING TO HIRE
 *     Every phrase in each country's `postSearches`, as a LinkedIn *posts*
 *     search (not jobs), unquoted, sorted by latest.
 *     - Dutch posts work well; German posts are useful (feature films posting
 *       for a Herstellungsleitung); Polish posts are mostly noise because
 *       "producent" also means manufacturer — keep them film-specific.
 *     - A post that describes a concrete role → save it as a job (type
 *       Freelance unless the post says contract), sourceUrl = the post URL or
 *       the poster's profile if the post URL isn't exposed, notes = who
 *       posted + a one-line summary. Ignore posts older than ~6 weeks.
 *     - Anything vaguer → only mention it in the chat report.
 *
 *  4. WRITE NEW RELEVANT ROLES
 *     Storage mapping (the user's shorthand → this app's real keys):
 *       "jf" (freelance jobs) → crm_data key `jobs`, with type: 'Freelance'
 *       "jc" (contract jobs)  → crm_data key `jobs`, with type: 'Contract'
 *       "jw" (pipeline)       → crm_data key `pipeline`  (READ ONLY in a sweep)
 *     Classification: freelance / ZZP / per-project / day-rate roles → Freelance.
 *     Contract, fixed-term, interim → Contract. Permanent full-time roles →
 *     Contract with "Permanent, full-time" at the start of notes; note if the
 *     role needs German or Polish.
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
 *     working students, graduate schemes, video editors / camera / audio
 *     engineers (crew, not producer roles), game producers, factory
 *     "production manager" roles (Produktionsleiter, Kierownik produkcji in
 *     manufacturing), and anything clearly outside post production /
 *     film & content producing (see SWEEP_AMS.skip).
 *
 *  REPORT FORMAT (chat): jobs added grouped by country (freelance / contract,
 *  with links and star priority), duplicates skipped, what was skipped and why,
 *  hiring posts worth a look, overdue contacts.
 *  A full sweep is ~45 LinkedIn page loads. Keep LinkedIn activity to these
 *  searches — heavy automated browsing can get an account rate-limited.
 * ===========================================================================
 */

// English title groups used for the Netherlands (more granular, original set)
const EN_GROUPS = {
  postAndFilm: 'Post Producer OR "post production producer" OR "Film Producer" OR "Shoot Producer" OR "Senior post producer" OR "Senior film producer"',
  videoAndContent: '"Video Lead" OR "Head of Video" OR "Senior Video Producer" OR "Video producer" OR "Head of Content Production" OR "Content Production Lead"',
  seniorProduction: '"Executive Producer" OR "Head of Production" OR "Line Producer" OR "Post Production Supervisor" OR "Post Production Manager" OR "Finishing Producer" OR "Delivery Producer"',
}
// One combined English query for Germany / Poland / UK (keeps page loads down)
const EN_CORE =
  '"Post Producer" OR "Post-Production" OR "Commercial Producer" OR "Executive Producer" OR "Line Producer" OR "Head of Production" OR "Post Production Supervisor" OR "Video Lead" OR "Head of Video" OR "Senior Video Producer" OR "Film Producer" OR "Agency Producer" OR "Integrated Producer"'

// Local-language titles. Avoid bare words that also mean factory work
// (DE "Produktionsleitung", PL bare "Producent" = manufacturer).
const LOCAL = {
  nl: 'Producent OR "Uitvoerend producent" OR "Postproductie producent" OR Productieleider OR "Hoofd productie" OR "Video producer"',
  de: 'Produzent OR Filmproduzent OR Herstellungsleiter OR Herstellungsleitung OR Postproduktion OR Postproduktionsleiter OR "Producer Postproduktion" OR "Video Producer"',
  pl: '"Producent wykonawczy" OR "Producent filmowy" OR "Producent reklam" OR "Producent wideo" OR "Producent postprodukcji" OR "Kierownik postprodukcji" OR Postprodukcja OR "Szef produkcji" OR "Kierownik produkcji"',
  // --- prepared 26 Oct 2026, not yet run on LinkedIn (see EU countries below) ---
  // Czech: avoid bare "Produkční" (also an adjective in factory ads, e.g. "produkční plánovač")
  cs: 'Producent OR "Výkonný producent" OR "Výkonná producentka" OR "Vedoucí produkce" OR "Vedoucí postprodukce" OR Postprodukce OR "Postprodukční producent" OR "Koordinátor postprodukce"',
  // Spanish (+ two Catalan terms for Barcelona). Avoid "Director/Jefe de producción" — mostly factory jobs in Spain
  es: '"Productor ejecutivo" OR "Productora ejecutiva" OR "Productor audiovisual" OR "Productora audiovisual" OR "Productor de postproducción" OR "Coordinador de postproducción" OR "Supervisor de postproducción" OR Postproducción OR "Productor executiu" OR Postproducció',
  // Italian. "Organizzatore generale" is the film line-producer title; avoid "Direttore di produzione" (plant manager)
  it: '"Produttore esecutivo" OR "Produttrice esecutiva" OR "Organizzatore generale" OR "Post producer" OR "Responsabile post-produzione" OR "Responsabile postproduzione" OR "Supervisore post-produzione" OR "Coordinatore post-produzione" OR Postproduzione OR "Producer pubblicitario"',
  // French for Romandy (Geneva, Lausanne). Avoid "Directeur de production" (factory)
  fr: '"Producteur exécutif" OR "Productrice exécutive" OR "Chargé de production" OR "Chargée de production" OR "Directeur de postproduction" OR "Coordinateur postproduction" OR "Responsable postproduction" OR Postproduction OR "Producteur audiovisuel"',
  // Flemish (Belgian Dutch): "productiecoördinator" is common in Flanders; "productieleider" can be factory — filter by sector
  vl: 'Producent OR "Uitvoerend producent" OR Productieleider OR Postproductie OR "Postproductie coördinator" OR Productiecoördinator OR "Hoofd productie" OR "Video producer"',
}

export const SWEEP_AMS = {
  trigger: 'Run sweep AMS',
  appUrl: 'https://productie-zwartboek.vercel.app',
  profile: 'Executive / Post Production Producer',
  // Every title searched, for reference (the queries below are what's actually sent)
  keywords: {
    english: [
      'Post Producer', 'Post production producer', 'Film Producer', 'Shoot Producer', 'Senior post producer',
      'Senior film producer', 'Video Lead', 'Head of Video', 'Senior Video Producer', 'Head of Content Production',
      'Content Production Lead', 'Executive Producer', 'Head of Production', 'Line Producer',
      'Post Production Supervisor', 'Post Production Manager', 'Finishing Producer', 'Delivery Producer',
      'Commercial Producer', 'Agency Producer', 'Integrated Producer', 'Post-Production (Lead/Producer)',
    ],
    dutch: ['Producent', 'Uitvoerend producent', 'Postproductie producent', 'Productieleider', 'Hoofd productie', 'Video producer'],
    german: ['Produzent', 'Filmproduzent', 'Herstellungsleiter / Herstellungsleitung', 'Postproduktion', 'Postproduktionsleiter', 'Producer Postproduktion', 'Video Producer'],
    czech: ['Producent', 'Výkonný producent / Výkonná producentka', 'Vedoucí produkce', 'Vedoucí postprodukce', 'Postprodukce', 'Postprodukční producent', 'Koordinátor postprodukce'],
    spanish: ['Productor/a ejecutivo/a', 'Productor/a audiovisual', 'Productor/a de postproducción', 'Coordinador/a de postproducción', 'Supervisor/a de postproducción', 'Postproducción', 'Catalan: Productor executiu, Postproducció'],
    italian: ['Produttore/Produttrice esecutivo/a', 'Organizzatore generale', 'Post producer', 'Responsabile post-produzione', 'Supervisore post-produzione', 'Coordinatore post-produzione', 'Postproduzione', 'Producer pubblicitario'],
    french: ['Producteur/Productrice exécutif/ve', 'Chargé/e de production', 'Directeur de postproduction', 'Coordinateur postproduction', 'Responsable postproduction', 'Postproduction', 'Producteur audiovisuel'],
    flemish: ['Producent', 'Uitvoerend producent', 'Productieleider', 'Postproductie', 'Postproductie coördinator', 'Productiecoördinator', 'Hoofd productie', 'Video producer'],
    polish: ['Producent wykonawczy', 'Producent filmowy', 'Producent reklam', 'Producent wideo', 'Producent postprodukcji', 'Kierownik postprodukcji', 'Postprodukcja', 'Szef produkcji', 'Kierownik produkcji'],
  },
  countries: {
    Netherlands: {
      geoId: '102890719',
      queries: { ...EN_GROUPS, dutch: LOCAL.nl },
      // Amsterdam by name works (and its radius covers Hilversum / Utrecht)
      cities: [{ name: 'Amsterdam', location: 'Amsterdam, North Holland, Netherlands' }],
      contractSearch: true,
      postSearches: [
        'freelance producent gezocht',
        'producent gezocht',
        'postproductie producent gezocht',
        'productieleider gezocht',
        'freelance producer gezocht',
        'video producer gezocht',
      ],
    },
    Germany: {
      geoId: '101282230',
      queries: { english: EN_CORE, german: LOCAL.de },
      cities: [
        { name: 'Berlin', geoId: '106967730' },
        { name: 'Hamburg', geoId: '106430557' },
        { name: 'Munich', geoId: '100477049' },
        { name: 'Frankfurt', geoId: '106772406' },
        { name: 'Cologne', geoId: '105890944' },
      ],
      contractSearch: true,
      postSearches: ['Postproduktion Producer gesucht', 'Herstellungsleitung gesucht', 'freelance Producer gesucht Film'],
    },
    Poland: {
      geoId: '105072130',
      queries: { english: EN_CORE, polish: LOCAL.pl },
      cities: [
        { name: 'Warsaw', geoId: '105076658' },
        { name: 'Kraków', geoId: '103263110' },
        { name: 'Wrocław', geoId: '90009834' }, // Wrocław metropolitan area
      ],
      contractSearch: true,
      // Low yield on LinkedIn — kept film-specific to avoid manufacturing posts
      postSearches: ['poszukujemy producenta wykonawczego', 'kierownik produkcji filmowej poszukiwany'],
    },
    'United Kingdom': {
      geoId: '101165590',
      queries: { english: EN_CORE },
      cities: [],
      remoteContractOnly: true,
      postSearches: [],
    },

    /* ---------------- EU group — prepared 26 Oct 2026, NOT yet run ----------------
     * FIRST RUN CHECKLIST (status: 'pending'):
     *  1. Country geoIds below are from memory — open each country search once and
     *     check the location box shows the right country; fix if not.
     *  2. City geoIds are null: type the city in LinkedIn's location box, pick the
     *     city (or its metropolitan area), read geoId= from the URL, save it here.
     *     Cities without a geoId fall back to location=<name>, which LinkedIn may
     *     snap to a district — don't trust those results.
     *  3. Run with { firstPass: true } (past month), review noise per query, then
     *     set status: 'active' and commit.
     */
    Czechia: {
      group: 'eu', status: 'pending',
      geoId: '104508036',
      // Prague's industry is largely international service production — English matters as much as Czech
      queries: { english: EN_CORE, czech: LOCAL.cs },
      cities: [{ name: 'Prague', geoId: null, location: 'Prague, Czechia' }],
      contractSearch: true,
      postSearches: ['hledáme producenta', 'hledáme vedoucího produkce'],
    },
    Spain: {
      group: 'eu', status: 'pending',
      geoId: '105646813',
      queries: { english: EN_CORE, spanish: LOCAL.es },
      cities: [
        { name: 'Madrid', geoId: null, location: 'Madrid, Community of Madrid, Spain' },
        { name: 'Barcelona', geoId: null, location: 'Barcelona, Catalonia, Spain' },
      ],
      contractSearch: true,
      postSearches: ['buscamos productor audiovisual', 'buscamos productor ejecutivo', 'busquem productor'],
    },
    Italy: {
      group: 'eu', status: 'pending',
      geoId: '103350119',
      queries: { english: EN_CORE, italian: LOCAL.it },
      // Milan = advertising & post houses; Rome = film / TV
      cities: [
        { name: 'Milan', geoId: null, location: 'Milan, Lombardy, Italy' },
        { name: 'Rome', geoId: null, location: 'Rome, Latium, Italy' },
      ],
      contractSearch: true,
      postSearches: ['cerchiamo producer', 'cercasi produttore esecutivo', 'cerchiamo post producer'],
    },
    Switzerland: {
      group: 'eu', status: 'pending',
      geoId: '106693272',
      // Per-city language: German for Zurich, French for Geneva / Lausanne
      queries: { english: EN_CORE, german: LOCAL.de, french: LOCAL.fr },
      cities: [
        { name: 'Zurich', geoId: null, location: 'Zurich, Switzerland', queries: ['english', 'german'] },
        { name: 'Geneva', geoId: null, location: 'Geneva, Switzerland', queries: ['english', 'french'] },
        { name: 'Lausanne', geoId: null, location: 'Lausanne, Vaud, Switzerland', queries: ['english', 'french'] },
      ],
      contractSearch: true,
      postSearches: ['Producer gesucht Zürich', 'nous recherchons un chargé de production', 'recherche producteur exécutif'],
    },
    Belgium: {
      group: 'eu', status: 'pending',
      geoId: '100565514',
      // Focus on Flanders; Brussels included for VRT / DPG Media / agencies (Flemish + English only)
      queries: { english: EN_CORE, flemish: LOCAL.vl },
      cities: [
        { name: 'Antwerp', geoId: null, location: 'Antwerp, Flemish Region, Belgium' },
        { name: 'Ghent', geoId: null, location: 'Ghent, Flemish Region, Belgium' },
        { name: 'Brussels', geoId: null, location: 'Brussels, Brussels Region, Belgium' },
      ],
      contractSearch: true,
      // The Dutch post searches already catch many Flemish posts; these add Flemish phrasing + cities
      postSearches: ['wij zoeken een producer', 'productieleider gezocht Antwerpen', 'producer gezocht Gent'],
    },
  },
  // Which groups each trigger runs
  triggers: {
    'Run sweep AMS': ['core'],   // Netherlands, Germany, Poland, UK
    'Run sweep EU': ['eu'],      // Czechia, Spain, Italy, Switzerland, Belgium
    'Run sweep all': ['core', 'eu'],
  },
  // Local job boards that carry more film / post roles than LinkedIn in these markets (not searched automatically)
  localBoards: {
    Czechia: ['jobs.cz', 'filmcommission.gov.cz (production company directory)'],
    Spain: ['InfoJobs', 'Crew United (es)'],
    Italy: ['Cinemotore', 'Indeed IT'],
    Switzerland: ['jobup.ch (Romandy)', 'jobs.ch', 'Crew United'],
    Belgium: ['mediarte.be (Flemish & Brussels audiovisual sector)', 'VDAB'],
    Poland: ['pracuj.pl'],
  },
  // Time windows: past week for regular sweeps; past month for a first pass on a new country/city
  timeWindow: { regular: 'r604800', firstPass: 'r2592000' },
  skip: [
    'junior', 'intern', 'internship', 'stage', 'stagiair', 'trainee', 'graduate', 'werkstudent', 'assistant',
    'assistent', 'runner', 'praktikant', 'praktikum', 'stażysta', 'staż', 'praktykant', 'asystent',
    // Czech / Spanish / Italian / French / Flemish
    'stážista', 'stáž', 'becario', 'becaria', 'prácticas', 'auxiliar', 'ayudante', 'asistente',
    'stagista', 'tirocinio', 'tirocinante', 'assistente', 'stagiaire', 'alternance', 'apprenti', 'jobstudent',
  ],
  overdueDays: 14,
}

// Every LinkedIn search for a sweep, in order: [{ label, url }]
// groups: which country groups to include ('core' = NL/DE/PL/UK, 'eu' = CZ/ES/IT/CH/BE)
export function sweepSearches({ firstPass = false, groups = ['core'] } = {}) {
  const tpr = firstPass ? SWEEP_AMS.timeWindow.firstPass : SWEEP_AMS.timeWindow.regular
  const J = 'https://www.linkedin.com/jobs/search/?keywords='
  const P = 'https://www.linkedin.com/search/results/content/?keywords='
  const enc = encodeURIComponent
  const out = []
  for (const [country, c] of Object.entries(SWEEP_AMS.countries)) {
    if (!groups.includes(c.group || 'core')) continue
    for (const city of c.cities) {
      const where = city.geoId ? `&geoId=${city.geoId}` : `&location=${enc(city.location)}`
      const flag = city.geoId ? '' : ' · ⚠ geoId not verified'
      const qNames = city.queries || Object.keys(c.queries)
      for (const qName of qNames) {
        out.push({ label: `${city.name} · ${qName} · all job types${flag}`, url: `${J}${enc(c.queries[qName])}${where}&f_TPR=${tpr}` })
      }
    }
    for (const [qName, q] of Object.entries(c.queries)) {
      if (c.remoteContractOnly) {
        out.push({ label: `${country} · ${qName} · remote contract`, url: `${J}${enc(q)}&geoId=${c.geoId}&f_WT=2&f_JT=C%2CT%2CO&f_TPR=${tpr}` })
      } else if (c.contractSearch) {
        out.push({ label: `${country} · ${qName} · contract (country-wide)`, url: `${J}${enc(q)}&geoId=${c.geoId}&f_JT=C%2CT%2CO&f_TPR=${tpr}` })
      }
    }
    for (const phrase of c.postSearches) {
      out.push({ label: `${country} · posts · ${phrase}`, url: `${P}${enc(phrase)}&sortBy=%22date_posted%22` })
    }
  }
  return out
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
