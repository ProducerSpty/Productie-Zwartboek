import { useEffect, useMemo, useRef, useState } from 'react'
import { loadAll, saveKey } from './supabase.js'

/* ------------------------------------------------------------------ */
/*  Section definitions — each one is stored as a JSON array under key */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = ['Radar', 'Reached out to me', 'Replied', 'Won', 'Archived']
// Stages from the first version of the app, mapped onto the new ones on load
const LEGACY_STAGES = { Lead: 'Radar', Contacted: 'Replied', Meeting: 'Replied', Proposal: 'Replied', Negotiating: 'Replied', Lost: 'Archived' }
function migratePipeline(list) {
  let changed = false
  const out = (list || []).map((r) => {
    if (LEGACY_STAGES[r.stage]) {
      changed = true
      return { ...r, stage: LEGACY_STAGES[r.stage] }
    }
    return r
  })
  return { list: out, changed }
}
const OUTREACH_STATUS = ['Target', 'Researching', 'Reached out', 'In conversation', 'Worked with', 'Not a fit']
const PRIORITY = ['High', 'Medium', 'Low']
const JOB_STATUS = ['Found', 'Applied', 'Interview', 'Offer', 'Accepted', 'Rejected', 'Passed']
const BOOKING_STATUS = ['1st pencil', '2nd pencil', 'Confirmed', 'Released']

const SECTIONS = {
  pipeline: {
    label: 'Pipeline',
    singular: 'Contact',
    icon: '◎',
    views: ['board', 'table'],
    stageField: 'stage',
    titleField: 'name',
    subtitle: (r) => [r.role, r.company].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'company', label: 'Company' },
      { key: 'role', label: 'Their role' },
      { key: 'stage', label: 'Stage', type: 'select', options: PIPELINE_STAGES, default: 'Radar' },
      { key: 'lastContact', label: 'Last contact', type: 'date' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'linkedin', label: 'LinkedIn', type: 'url' },
      { key: 'source', label: 'Source', placeholder: 'Referral, festival, LinkedIn…' },
      { key: 'value', label: 'Est. value (€)', type: 'number' },
      { key: 'nextAction', label: 'Next action' },
      { key: 'nextDate', label: 'Reminder', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'company', 'stage', 'nextAction', 'nextDate', 'value'],
  },
  agencies: {
    label: 'Agencies & Studios',
    singular: 'Agency / Studio',
    icon: '▣',
    views: ['board', 'table'],
    stageField: 'status',
    titleField: 'name',
    subtitle: (r) => [r.type, r.city].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Creative agency', 'Production company', 'Post house', 'VFX studio', 'Animation studio', 'Broadcaster / Streamer', 'Other'] },
      { key: 'status', label: 'Status', type: 'select', options: OUTREACH_STATUS, default: 'Target' },
      { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY, default: 'Medium' },
      { key: 'city', label: 'City' },
      { key: 'country', label: 'Country' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'contactName', label: 'Key contact' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'lastContact', label: 'Last contact', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'type', 'city', 'status', 'priority', 'contactName', 'lastContact'],
  },
  brands: {
    label: 'Brands',
    singular: 'Brand',
    icon: '◆',
    views: ['board', 'table'],
    stageField: 'status',
    titleField: 'name',
    subtitle: (r) => [r.industry, r.contactName].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Brand', required: true },
      { key: 'industry', label: 'Industry' },
      { key: 'status', label: 'Status', type: 'select', options: OUTREACH_STATUS, default: 'Target' },
      { key: 'priority', label: 'Priority', type: 'select', options: PRIORITY, default: 'Medium' },
      { key: 'website', label: 'Website', type: 'url' },
      { key: 'contactName', label: 'Contact (in-house)' },
      { key: 'contactRole', label: 'Contact role' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'angle', label: 'Pitch angle', type: 'textarea' },
      { key: 'lastContact', label: 'Last contact', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'industry', 'status', 'priority', 'contactName', 'lastContact'],
  },
  crew: {
    label: 'Crew',
    singular: 'Crew member',
    icon: '☺',
    views: ['table', 'board'],
    stageField: 'role',
    titleField: 'name',
    subtitle: (r) => [r.role, r.city].filter(Boolean).join(' · '),
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'role', label: 'Discipline', type: 'select', options: ['Editor', 'Assistant editor', 'Colorist', 'VFX', 'Motion / 2D', 'Sound design', 'Mix', 'Composer', 'DIT', 'Producer', 'Online / Finishing', 'Other'] },
      { key: 'city', label: 'City' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'website', label: 'Reel / website', type: 'url' },
      { key: 'dayRate', label: 'Day rate (€)', type: 'number' },
      { key: 'rating', label: 'Rating', type: 'select', options: ['★★★★★', '★★★★', '★★★', '★★', '★'] },
      { key: 'availability', label: 'Availability' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['name', 'role', 'city', 'dayRate', 'rating', 'email', 'phone'],
  },
  jobs: {
    label: 'Jobs',
    singular: 'Job',
    icon: '✦',
    views: ['board', 'table'],
    stageField: 'status',
    titleField: 'title',
    subtitle: (r) => [r.company, r.location].filter(Boolean).join(' · '),
    fields: [
      { key: 'title', label: 'Job title', required: true },
      { key: 'company', label: 'Company' },
      { key: 'type', label: 'Type', type: 'select', options: ['Freelance', 'Contract', 'Fixed-term', 'Permanent'], default: 'Freelance' },
      { key: 'status', label: 'Status', type: 'select', options: JOB_STATUS, default: 'Found' },
      { key: 'location', label: 'Location', placeholder: 'Amsterdam / Remote…' },
      { key: 'rate', label: 'Rate / salary' },
      { key: 'source', label: 'Found via' },
      { key: 'link', label: 'Link', type: 'url' },
      { key: 'deadline', label: 'Apply by', type: 'date' },
      { key: 'appliedOn', label: 'Applied on', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['title', 'company', 'type', 'status', 'location', 'deadline'],
  },
  bookings: {
    label: 'Bookings',
    singular: 'Booking',
    icon: '▦',
    views: ['calendar', 'table'],
    stageField: 'status',
    titleField: 'project',
    subtitle: (r) => [r.client, fmtRange(r.start, r.end)].filter(Boolean).join(' · '),
    fields: [
      { key: 'project', label: 'Project', required: true },
      { key: 'client', label: 'Client' },
      { key: 'status', label: 'Status', type: 'select', options: BOOKING_STATUS, default: '1st pencil' },
      { key: 'start', label: 'Start', type: 'date', required: true },
      { key: 'end', label: 'End', type: 'date' },
      { key: 'role', label: 'My role', placeholder: 'Post Producer' },
      { key: 'location', label: 'Location' },
      { key: 'rate', label: 'Day rate (€)', type: 'number' },
      { key: 'invoiced', label: 'Invoiced', type: 'select', options: ['No', 'Sent', 'Paid'], default: 'No' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: ['project', 'client', 'status', 'start', 'end', 'rate', 'invoiced'],
  },
}

const KEYS = Object.keys(SECTIONS)
const LOCAL_CACHE = 'zwartboek-cache-v1'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const todayISO = () => localISO(new Date())

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtRange(a, b) {
  if (!a) return ''
  if (!b || a === b) return fmtDate(a)
  return `${fmtDate(a)} → ${fmtDate(b)}`
}
function fmtMoney(n) {
  if (n === '' || n == null || isNaN(Number(n))) return ''
  return '€' + Number(n).toLocaleString('nl-NL')
}
function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)
}
function displayValue(field, value) {
  if (!field) return value ?? ''
  if (field.type === 'date') return fmtDate(value)
  if (field.type === 'number' && /€/.test(field.label)) return fmtMoney(value)
  return value ?? ''
}
function stageClass(v) {
  return 'tag tag-' + String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [data, setData] = useState(() => Object.fromEntries(KEYS.map((k) => [k, []])))
  const [loaded, setLoaded] = useState(false)
  const [sync, setSync] = useState('loading') // loading | saved | saving | offline | error
  const [errorMsg, setErrorMsg] = useState('')
  const [tab, setTab] = useState('overview')
  const [meta, setMeta] = useState({ lastSweep: null }) // non-section keys, e.g. lastSweep
  const [editing, setEditing] = useState(null) // { section, record }
  const dirty = useRef(new Set())
  const timer = useRef(null)

  // Initial load from Supabase (fallback to local cache)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const remote = await loadAll()
        if (cancelled) return
        setData((d) => {
          const next = { ...d }
          for (const k of KEYS) if (Array.isArray(remote[k])) next[k] = remote[k]
          const m = migratePipeline(next.pipeline)
          next.pipeline = m.list
          if (m.changed) {
            dirty.current.add('pipeline')
            scheduleSave(next)
          }
          return next
        })
        setMeta({ lastSweep: remote.lastSweep || null })
        setSync('saved')
      } catch (e) {
        console.error(e)
        try {
          const cached = JSON.parse(localStorage.getItem(LOCAL_CACHE) || '{}')
          setData((d) => { const next = { ...d, ...cached }; next.pipeline = migratePipeline(next.pipeline).list; return next })
        } catch {}
        setSync('offline')
        setErrorMsg(e.message || String(e))
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Debounced save of changed keys
  function scheduleSave(next) {
    try {
      localStorage.setItem(LOCAL_CACHE, JSON.stringify(next))
    } catch {}
    clearTimeout(timer.current)
    setSync('saving')
    timer.current = setTimeout(async () => {
      const keys = [...dirty.current]
      dirty.current.clear()
      try {
        await Promise.all(keys.map((k) => saveKey(k, next[k])))
        setSync('saved')
        setErrorMsg('')
      } catch (e) {
        console.error(e)
        keys.forEach((k) => dirty.current.add(k))
        setSync('error')
        setErrorMsg(e.message || String(e))
      }
    }, 600)
  }

  function update(section, fn) {
    setData((prev) => {
      const next = { ...prev, [section]: fn(prev[section] || []) }
      dirty.current.add(section)
      scheduleSave(next)
      return next
    })
  }

  function upsert(section, record) {
    const now = new Date().toISOString()
    update(section, (list) => {
      if (record.id && list.some((r) => r.id === record.id)) {
        return list.map((r) => (r.id === record.id ? { ...record, updatedAt: now } : r))
      }
      return [...list, { ...record, id: record.id || uid(), createdAt: now, updatedAt: now }]
    })
  }

  function remove(section, id) {
    update(section, (list) => list.filter((r) => r.id !== id))
  }

  function openNew(section, preset = {}) {
    const def = SECTIONS[section]
    const blank = {}
    for (const f of def.fields) blank[f.key] = f.default ?? ''
    setEditing({ section, record: { ...blank, ...preset } })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PZ</div>
          <div>
            <div className="brand-name">Productie Zwartboek</div>
            <div className="brand-sub">Freelance CRM</div>
          </div>
        </div>
        <nav>
          <NavItem active={tab === 'overview'} onClick={() => setTab('overview')} icon="⌂" label="Overview" />
          {KEYS.map((k) => (
            <NavItem
              key={k}
              active={tab === k}
              onClick={() => setTab(k)}
              icon={SECTIONS[k].icon}
              label={SECTIONS[k].label}
              count={data[k]?.length}
            />
          ))}
        </nav>
        <SyncBadge state={sync} error={errorMsg} />
      </aside>

      <main className="main">
        {!loaded ? (
          <div className="empty">Loading…</div>
        ) : tab === 'overview' ? (
          <Overview
            data={data}
            meta={meta}
            goTo={setTab}
            onOpen={(section, record) => setEditing({ section, record })}
            onNew={openNew}
          />
        ) : tab === 'pipeline' ? (
          <PipelineView
            records={data.pipeline || []}
            onNew={(preset) => openNew('pipeline', preset)}
            onOpen={(record) => setEditing({ section: 'pipeline', record })}
            onPatch={(record) => upsert('pipeline', record)}
            onDelete={(r) => {
              if (confirm(`Delete ${r.name || 'this contact'}? This can't be undone.`)) remove('pipeline', r.id)
            }}
          />
        ) : (
          <SectionView
            key={tab}
            sectionKey={tab}
            def={SECTIONS[tab]}
            records={data[tab] || []}
            onNew={(preset) => openNew(tab, preset)}
            onOpen={(record) => setEditing({ section: tab, record })}
            onPatch={(record) => upsert(tab, record)}
          />
        )}
      </main>

      {editing && (
        <RecordModal
          def={SECTIONS[editing.section]}
          record={editing.record}
          onClose={() => setEditing(null)}
          onSave={(rec) => {
            upsert(editing.section, rec)
            setEditing(null)
          }}
          onDelete={
            editing.record.id
              ? () => {
                  if (confirm('Delete this record?')) {
                    remove(editing.section, editing.record.id)
                    setEditing(null)
                  }
                }
              : null
          }
        />
      )}
    </div>
  )
}

function NavItem({ active, onClick, icon, label, count }) {
  return (
    <button className={'nav-item' + (active ? ' active' : '')} onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
      {count > 0 && <span className="nav-count">{count}</span>}
    </button>
  )
}

function SyncBadge({ state, error }) {
  const text = {
    loading: 'Connecting…',
    saved: 'Synced to Supabase',
    saving: 'Saving…',
    offline: 'Offline — local copy',
    error: 'Save failed — retrying on next change',
  }[state]
  return (
    <div className={'sync sync-' + state} title={error || ''}>
      <span className="dot" /> {text}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overview                                                           */
/* ------------------------------------------------------------------ */

const ACTIVE_JOB_STATUSES = ['Applied', 'Interview', 'Offer']
const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return localISO(d)
}
const dayOf = (ts) => (ts ? localISO(new Date(ts)) : '')

// "Last sweep" = the newest batch of jobs.
// If a `lastSweep` record exists in crm_data ({ at: ISO timestamp, jobIds?: [...] }) it wins;
// otherwise we use the most recent day on which any job was added.
function lastSweepJobs(jobs, lastSweep) {
  if (lastSweep?.jobIds?.length) {
    const ids = new Set(lastSweep.jobIds)
    return { day: dayOf(lastSweep.at), jobs: jobs.filter((j) => ids.has(j.id)) }
  }
  const day = lastSweep?.at ? dayOf(lastSweep.at) : jobs.map((j) => dayOf(j.createdAt)).sort().pop() || ''
  return { day, jobs: day ? jobs.filter((j) => dayOf(j.createdAt) === day) : [] }
}

function availability(bookings, today) {
  const live = bookings.filter((b) => b.start && b.status !== 'Released')
  const endOf = (b) => b.end || b.start
  const latest = [...live].sort((a, b) => endOf(a).localeCompare(endOf(b))).pop()
  if (!latest || endOf(latest) < today) {
    return {
      free: true,
      headline: 'Available now',
      detail: latest ? `Last booking (${latest.project}) ended ${fmtDate(endOf(latest))}.` : 'No bookings in the calendar.',
    }
  }
  const latestConfirmed = live
    .filter((b) => b.status === 'Confirmed')
    .sort((a, b) => endOf(a).localeCompare(endOf(b)))
    .pop()
  const current = live.find((b) => b.start <= today && endOf(b) >= today)
  const freeFrom = addDays(endOf(latest), 1)
  let detail = `Latest booking: ${latest.project}${latest.client ? ` (${latest.client})` : ''}, ends ${fmtDate(endOf(latest))}`
  if (latest.status !== 'Confirmed') {
    detail += ` — ${latest.status}`
    if (latestConfirmed && endOf(latestConfirmed) >= today) detail += `. Confirmed work runs until ${fmtDate(endOf(latestConfirmed))}`
    else detail += '. No confirmed work ahead'
  }
  return {
    free: false,
    tentative: latest.status !== 'Confirmed',
    headline: current ? `Booked — available from ${fmtDate(freeFrom)}` : `Available from ${fmtDate(freeFrom)}`,
    detail: detail + '.',
  }
}

function Overview({ data, meta, goTo, onOpen, onNew }) {
  const today = todayISO()
  const in30 = addDays(today, 30)
  const pipeline = data.pipeline || []
  const agencies = data.agencies || []
  const jobs = data.jobs || []
  const bookings = data.bookings || []

  const avail = availability(bookings, today)
  const sweep = lastSweepJobs(jobs, meta?.lastSweep)
  const appliedJobs = jobs.filter((j) => ACTIVE_JOB_STATUSES.includes(j.status))

  // Agencies with a known contact but nothing active for them in the pipeline
  const activePipeline = pipeline.filter((r) => r.stage !== 'Archived')
  const activeCompanies = new Set(activePipeline.map((r) => normName(r.company)).filter(Boolean))
  const activeEmails = new Set(activePipeline.map((r) => String(r.email || '').toLowerCase()).filter(Boolean))
  const agenciesToReach = agencies
    .filter((a) => (a.contactName || a.email) && a.status !== 'Not a fit')
    .filter((a) => !activeCompanies.has(normName(a.name)))
    .filter((a) => !(a.email && activeEmails.has(a.email.toLowerCase())))
    .sort((a, b) => PRIORITY.indexOf(a.priority || 'Low') - PRIORITY.indexOf(b.priority || 'Low'))

  const followUps = activePipeline
    .filter((r) => r.nextDate && r.nextDate <= in30)
    .sort((a, b) => a.nextDate.localeCompare(b.nextDate))

  const upcoming = bookings
    .filter((b) => b.start && b.status !== 'Released' && (b.end || b.start) >= today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      <button
        className={'avail ' + (avail.free ? 'avail-free' : avail.tentative ? 'avail-tentative' : 'avail-booked')}
        onClick={() => goTo('bookings')}
      >
        <span className="avail-dot" />
        <span>
          <span className="avail-head">{avail.headline}</span>
          <span className="avail-detail">{avail.detail}</span>
        </span>
      </button>

      <div className="stats">
        <Stat label="Pipeline contacts" value={pipeline.length} onClick={() => goTo('pipeline')} />
        <Stat label="Agencies & studios" value={agencies.length} onClick={() => goTo('agencies')} />
        <Stat label="Brands" value={(data.brands || []).length} onClick={() => goTo('brands')} />
        <Stat label="Applied jobs" value={appliedJobs.length} onClick={() => goTo('jobs')} />
        <Stat
          label={sweep.day ? `New jobs · last sweep ${fmtDate(sweep.day)}` : 'New jobs · no sweep yet'}
          value={sweep.jobs.length}
          onClick={() => goTo('jobs')}
        />
      </div>

      <div className="dash-grid">
        <Panel title={`Agencies not in your pipeline (${agenciesToReach.length})`} action={() => goTo('agencies')}>
          {agenciesToReach.length === 0 && (
            <div className="muted small">Every agency with a known contact already has an active pipeline entry.</div>
          )}
          {agenciesToReach.slice(0, 8).map((a) => (
            <div className="row row-split" key={a.id}>
              <button className="row-main row-btn" onClick={() => onOpen('agencies', a)}>
                <div className="row-title">{a.name}</div>
                <div className="row-sub">{[a.contactName, a.email].filter(Boolean).join(' · ')}</div>
              </button>
              {a.priority && <span className={'pri pri-' + a.priority.toLowerCase()}>{a.priority}</span>}
              <button
                className="btn btn-sm"
                onClick={() =>
                  onNew('pipeline', {
                    name: a.contactName || '',
                    company: a.name,
                    email: a.email || '',
                    source: 'Agencies list',
                    stage: 'Radar',
                  })
                }
              >
                + Pipeline
              </button>
            </div>
          ))}
          {agenciesToReach.length > 8 && <div className="muted small pad">+ {agenciesToReach.length - 8} more</div>}
        </Panel>

        <Panel title="New from last sweep" action={() => goTo('jobs')}>
          {sweep.jobs.length === 0 && <div className="muted small">No jobs added yet.</div>}
          {sweep.jobs.slice(0, 8).map((j) => (
            <Row key={j.id} onClick={() => onOpen('jobs', j)}
              title={j.title}
              sub={[j.company, j.location].filter(Boolean).join(' · ')}
              right={<span className={stageClass(j.status)}>{j.status}</span>}
            />
          ))}
        </Panel>

        <Panel title="Follow-ups" action={() => goTo('pipeline')}>
          {followUps.length === 0 && <div className="muted small">Nothing scheduled. Add a “Follow up on” date to a contact.</div>}
          {followUps.map((r) => (
            <Row key={r.id} onClick={() => onOpen('pipeline', r)}
              title={r.name}
              sub={r.nextAction || r.company}
              right={<span className={r.nextDate < today ? 'overdue' : r.nextDate === today ? 'due-today' : 'muted'}>{r.nextDate < today ? 'Overdue · ' : ''}{fmtDate(r.nextDate)}</span>}
            />
          ))}
        </Panel>

        <Panel title="Upcoming bookings" action={() => goTo('bookings')}>
          {upcoming.length === 0 && <div className="muted small">No upcoming bookings.</div>}
          {upcoming.map((b) => (
            <Row key={b.id} onClick={() => onOpen('bookings', b)}
              title={b.project}
              sub={[b.client, fmtRange(b.start, b.end)].filter(Boolean).join(' · ')}
              right={<span className={stageClass(b.status)}>{b.status}</span>}
            />
          ))}
        </Panel>
      </div>
    </div>
  )
}

function Stat({ label, value, onClick }) {
  return (
    <button className="stat" onClick={onClick}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </button>
  )
}
function Panel({ title, action, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        {action && <button className="link" onClick={action}>View all →</button>}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}
function Row({ title, sub, right, onClick }) {
  return (
    <button className="row" onClick={onClick}>
      <div className="row-main">
        <div className="row-title">{title}</div>
        {sub && <div className="row-sub">{sub}</div>}
      </div>
      <div className="row-right">{right}</div>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Section view: board / table / calendar                             */
/* ------------------------------------------------------------------ */

function SectionView({ sectionKey, def, records, onNew, onOpen, onPatch }) {
  const [view, setView] = useState(def.views[0])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('')

  const stageField = def.fields.find((f) => f.key === def.stageField)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter((r) => {
      if (filter && r[def.stageField] !== filter) return false
      if (!q) return true
      return Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(q))
    })
  }, [records, query, filter, def.stageField])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{def.label}</h1>
          <p className="muted">{records.length} {records.length === 1 ? 'record' : 'records'}</p>
        </div>
        <div className="toolbar">
          <input className="search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {stageField?.options && (
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Any {stageField.label.toLowerCase()}</option>
              {stageField.options.map((o) => <option key={o}>{o}</option>)}
            </select>
          )}
          {def.views.length > 1 && (
            <div className="seg">
              {def.views.map((v) => (
                <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          )}
          <button className="btn primary" onClick={() => onNew()}>+ New {def.singular.toLowerCase()}</button>
        </div>
      </header>

      {records.length === 0 ? (
        <div className="empty">
          <p>No {def.label.toLowerCase()} yet.</p>
          <button className="btn primary" onClick={() => onNew()}>Add the first one</button>
        </div>
      ) : view === 'board' ? (
        <Board def={def} records={filtered} onOpen={onOpen} onPatch={onPatch} onNew={onNew} />
      ) : view === 'calendar' ? (
        <Calendar records={filtered} onOpen={onOpen} onNew={onNew} />
      ) : (
        <Table def={def} records={filtered} onOpen={onOpen} />
      )}
    </div>
  )
}

function Board({ def, records, onOpen, onPatch, onNew }) {
  const field = def.fields.find((f) => f.key === def.stageField)
  const columns = [...(field.options || [])]
  const hasUnset = records.some((r) => !r[def.stageField])
  if (hasUnset) columns.unshift('')
  const [dragId, setDragId] = useState(null)
  const [over, setOver] = useState(null)

  return (
    <div className="board">
      {columns.map((col) => {
        const items = records.filter((r) => (r[def.stageField] || '') === col)
        return (
          <div
            key={col || '_none'}
            className={'column' + (over === col ? ' over' : '')}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              const rec = records.find((r) => r.id === dragId)
              if (rec && rec[def.stageField] !== col) onPatch({ ...rec, [def.stageField]: col })
              setDragId(null)
              setOver(null)
            }}
          >
            <div className="column-head">
              <span className={stageClass(col)}>{col || 'Unsorted'}</span>
              <span className="muted small">{items.length}</span>
            </div>
            {items.map((r) => (
              <div
                key={r.id}
                className="card"
                draggable
                onDragStart={() => setDragId(r.id)}
                onClick={() => onOpen(r)}
              >
                <div className="card-title">{r[def.titleField] || 'Untitled'}</div>
                {def.subtitle(r) && <div className="card-sub">{def.subtitle(r)}</div>}
                <CardMeta r={r} />
              </div>
            ))}
            {col && (
              <button className="add-in-col" onClick={() => onNew({ [def.stageField]: col })}>+ Add</button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function CardMeta({ r }) {
  const today = todayISO()
  const bits = []
  if (r.priority) bits.push(<span key="p" className={'pri pri-' + r.priority.toLowerCase()}>{r.priority}</span>)
  if (r.value) bits.push(<span key="v" className="muted">{fmtMoney(r.value)}</span>)
  if (r.nextDate) bits.push(<span key="n" className={r.nextDate < today ? 'overdue' : 'muted'}>↻ {fmtDate(r.nextDate)}</span>)
  if (r.deadline) bits.push(<span key="d" className={r.deadline < today ? 'overdue' : 'muted'}>⏱ {fmtDate(r.deadline)}</span>)
  if (r.dayRate) bits.push(<span key="r" className="muted">{fmtMoney(r.dayRate)}/day</span>)
  if (!bits.length) return null
  return <div className="card-meta">{bits}</div>
}

function Table({ def, records, onOpen }) {
  const [sort, setSort] = useState({ key: def.columns[0], dir: 1 })
  const sorted = useMemo(() => {
    const f = def.fields.find((x) => x.key === sort.key)
    return [...records].sort((a, b) => {
      let av = a[sort.key] ?? ''
      let bv = b[sort.key] ?? ''
      if (f?.type === 'number') {
        av = Number(av) || 0
        bv = Number(bv) || 0
        return (av - bv) * sort.dir
      }
      return String(av).localeCompare(String(bv)) * sort.dir
    })
  }, [records, sort, def.fields])

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {def.columns.map((c) => {
              const f = def.fields.find((x) => x.key === c)
              return (
                <th key={c} onClick={() => setSort((s) => ({ key: c, dir: s.key === c ? -s.dir : 1 }))}>
                  {f?.label || c}
                  {sort.key === c && <span className="sort">{sort.dir === 1 ? ' ↑' : ' ↓'}</span>}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} onClick={() => onOpen(r)}>
              {def.columns.map((c) => {
                const f = def.fields.find((x) => x.key === c)
                const v = displayValue(f, r[c])
                return (
                  <td key={c}>
                    {c === def.stageField && v ? <span className={stageClass(v)}>{v}</span>
                      : f?.type === 'email' && v ? <a href={'mailto:' + v} onClick={(e) => e.stopPropagation()}>{v}</a>
                      : f?.type === 'url' && v ? <a href={v} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>↗ link</a>
                      : v}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length === 0 && <div className="empty small">No matches.</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bookings calendar                                                  */
/* ------------------------------------------------------------------ */

function Calendar({ records, onOpen, onNew }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7) cells.push(null)

  const iso = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const today = todayISO()

  const onDay = (dISO) =>
    records.filter((b) => b.start && dISO >= b.start && dISO <= (b.end || b.start) && b.status !== 'Released')

  return (
    <div className="calendar">
      <div className="cal-head">
        <button className="btn" onClick={() => setCursor(new Date(year, month - 1, 1))}>←</button>
        <h2>{cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h2>
        <button className="btn" onClick={() => setCursor(new Date(year, month + 1, 1))}>→</button>
        <button className="btn ghost" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Today</button>
        <div className="legend">
          {BOOKING_STATUS.filter((s) => s !== 'Released').map((s) => <span key={s} className={stageClass(s)}>{s}</span>)}
        </div>
      </div>
      <div className="cal-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell blank" />
          const dISO = iso(d)
          const items = onDay(dISO)
          return (
            <div
              key={i}
              className={'cal-cell' + (dISO === today ? ' today' : '') + (i % 7 >= 5 ? ' weekend' : '')}
              onDoubleClick={() => onNew({ start: dISO, end: dISO })}
            >
              <div className="cal-day">{d}</div>
              {items.map((b) => (
                <button key={b.id} className={'cal-event ' + stageClass(b.status)} onClick={() => onOpen(b)} title={`${b.project} — ${b.client || ''}`}>
                  {b.project}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <p className="muted small">Double-click a day to add a booking.</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Edit modal                                                         */
/* ------------------------------------------------------------------ */

function RecordModal({ def, record, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(record)
  const [err, setErr] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e) {
    e.preventDefault()
    const missing = def.fields.filter((f) => f.required && !String(form[f.key] ?? '').trim())
    if (missing.length) return setErr(`Please fill in: ${missing.map((f) => f.label).join(', ')}`)
    if (form.start && form.end && form.end < form.start) return setErr('End date is before start date.')
    onSave(form)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head">
          <h2>{record.id ? `Edit ${def.singular.toLowerCase()}` : `New ${def.singular.toLowerCase()}`}</h2>
          <button type="button" className="x" onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          {def.fields.map((f) => (
            <label key={f.key} className={f.type === 'textarea' ? 'full' : ''}>
              <span>{f.label}{f.required && ' *'}</span>
              {f.type === 'select' ? (
                <select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={3} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <input
                  type={f.type === 'url' ? 'url' : f.type || 'text'}
                  placeholder={f.placeholder || ''}
                  value={form[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  autoFocus={f.required && f === def.fields[0]}
                />
              )}
            </label>
          ))}
        </div>
        {err && <div className="form-err">{err}</div>}
        <div className="modal-foot">
          {onDelete && <button type="button" className="btn danger" onClick={onDelete}>Delete</button>}
          <span className="spacer" />
          {record.updatedAt && <span className="muted small">Updated {fmtDate(record.updatedAt.slice(0, 10))}</span>}
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save</button>
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Pipeline list                                                      */
/* ------------------------------------------------------------------ */

const PIPE_COLUMNS = [
  { key: 'starred', label: '★', sortable: true },
  { key: 'name', label: 'Name', sortable: true },
  { key: 'company', label: 'Company', sortable: true },
  { key: 'stage', label: 'Stage', sortable: true },
  { key: 'lastContact', label: 'Last contact', sortable: true },
  { key: 'nextDate', label: 'Next action', sortable: true },
  { key: 'notes', label: 'Notes' },
  { key: 'actions', label: '' },
]

// Default order: starred → overdue reminders (oldest first) → longest since last contact
function smartPipelineSort(today) {
  return (a, b) => {
    const star = (b.starred ? 1 : 0) - (a.starred ? 1 : 0)
    if (star) return star
    const ao = !!a.nextDate && a.nextDate <= today
    const bo = !!b.nextDate && b.nextDate <= today
    if (ao !== bo) return ao ? -1 : 1
    if (ao && bo && a.nextDate !== b.nextDate) return a.nextDate.localeCompare(b.nextDate)
    // No last-contact date counts as "longest ago"
    const al = a.lastContact || ''
    const bl = b.lastContact || ''
    if (al !== bl) return al.localeCompare(bl)
    return String(a.name || '').localeCompare(String(b.name || ''))
  }
}

function columnPipelineSort({ key, dir }) {
  return (a, b) => {
    let av = a[key]
    let bv = b[key]
    if (key === 'starred') return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir
    if (key === 'stage') return (PIPELINE_STAGES.indexOf(av) - PIPELINE_STAGES.indexOf(bv)) * dir
    av = String(av || '')
    bv = String(bv || '')
    // Empty values always go last
    if (!av && bv) return 1
    if (av && !bv) return -1
    return av.localeCompare(bv, undefined, { sensitivity: 'base' }) * dir
  }
}

function daysAgoLabel(iso, today) {
  if (!iso) return { text: 'never', cls: 'age-old' }
  const n = daysBetween(iso, today)
  if (n < 0) return { text: `in ${-n} day${n === -1 ? '' : 's'}`, cls: 'muted' }
  if (n === 0) return { text: 'today', cls: 'age-fresh' }
  if (n === 1) return { text: 'yesterday', cls: 'age-fresh' }
  return { text: `${n} days ago`, cls: n > 30 ? 'age-old' : n > 14 ? 'age-mid' : 'muted' }
}

function PipelineView({ records, onNew, onOpen, onPatch, onDelete }) {
  const today = todayISO()
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [sort, setSort] = useState(null) // null = smart sort

  const q = query.trim().toLowerCase()
  const matches = (r) =>
    !q || [r.name, r.company, r.role, r.email, r.nextAction, r.notes].some((v) => String(v || '').toLowerCase().includes(q))

  const sorter = sort ? columnPipelineSort(sort) : smartPipelineSort(today)
  const visible = records.filter(matches)
  const won = visible.filter((r) => r.stage === 'Won').sort(sorter)
  const archived = visible.filter((r) => r.stage === 'Archived').sort(sorter)
  const active = visible.filter((r) => r.stage !== 'Won' && r.stage !== 'Archived').sort(sorter)
  const archivedTotal = records.filter((r) => r.stage === 'Archived').length
  const overdue = active.filter((r) => r.nextDate && r.nextDate < today).length

  function clickHeader(col) {
    if (!col.sortable) return
    setSort((s) => {
      if (!s || s.key !== col.key) return { key: col.key, dir: col.key === 'starred' ? -1 : 1 }
      if (s.dir === (col.key === 'starred' ? -1 : 1)) return { key: col.key, dir: -s.dir }
      return null // third click returns to smart sort
    })
  }

  const rowProps = { today, onOpen, onPatch, onDelete }
  const sectionRow = (label, n, extra) => (
    <tr className="section-row">
      <td colSpan={PIPE_COLUMNS.length}>
        {label} <span className="muted">· {n}</span> {extra}
      </td>
    </tr>
  )

  return (
    <div className="page page-wide">
      <header className="page-head">
        <div>
          <h1>Pipeline</h1>
          <p className="muted">
            {records.length - archivedTotal} active
            {overdue > 0 && <span className="overdue"> · {overdue} overdue</span>}
            {' · '}
            {sort ? (
              <>
                sorted by {PIPE_COLUMNS.find((c) => c.key === sort.key)?.label.toLowerCase()}{' '}
                <button className="link inline" onClick={() => setSort(null)}>reset to smart sort</button>
              </>
            ) : (
              'starred, overdue, then longest since contact'
            )}
          </p>
        </div>
        <div className="toolbar">
          <input className="search" placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="toggle">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived ({archivedTotal})
          </label>
          <button className="btn primary" onClick={() => onNew()}>+ New contact</button>
        </div>
      </header>

      {records.length === 0 ? (
        <div className="empty">
          <p>No contacts yet.</p>
          <button className="btn primary" onClick={() => onNew()}>Add the first one</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="pipe-table">
            <thead>
              <tr>
                {PIPE_COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={'col-' + c.key + (c.sortable ? '' : ' nosort')}
                    onClick={() => clickHeader(c)}
                  >
                    {c.label}
                    {sort?.key === c.key && <span className="sort">{sort.dir === 1 ? ' ↑' : ' ↓'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {won.length > 0 && sectionRow('Active bookings', won.length)}
              {won.map((r) => <PipelineRow key={r.id} r={r} {...rowProps} />)}
              {won.length > 0 && sectionRow('Pipeline', active.length)}
              {active.map((r) => <PipelineRow key={r.id} r={r} {...rowProps} />)}
              {active.length === 0 && (
                <tr><td colSpan={PIPE_COLUMNS.length} className="muted small">{q ? 'No matches.' : 'No active contacts.'}</td></tr>
              )}
              {showArchived && archived.length > 0 && sectionRow('Archived', archived.length)}
              {showArchived && archived.map((r) => <PipelineRow key={r.id} r={r} {...rowProps} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PipelineRow({ r, today, onOpen, onPatch, onDelete }) {
  const patch = (changes) => onPatch({ ...r, ...changes })
  const age = daysAgoLabel(r.lastContact, today)
  const isArchived = r.stage === 'Archived'
  const reminderCls = !r.nextDate ? '' : r.nextDate < today ? 'overdue' : r.nextDate === today ? 'due-today' : 'muted'

  return (
    <tr className={'pipe-row' + (isArchived ? ' archived' : '') + (r.starred ? ' starred' : '')}>
      <td className="col-starred">
        <button
          className={'star' + (r.starred ? ' on' : '')}
          title={r.starred ? 'Unstar' : 'Star as priority'}
          onClick={() => patch({ starred: !r.starred })}
        >
          {r.starred ? '★' : '☆'}
        </button>
      </td>
      <td className="col-name">
        <button className="name-btn" onClick={() => onOpen(r)} title="Open full details">
          {r.name || 'Unnamed'}
        </button>
        {r.role && <div className="row-sub">{r.role}</div>}
      </td>
      <td className="col-company">{r.company}</td>
      <td className="col-stage">
        <select className={'stage-select ' + stageClass(r.stage)} value={r.stage || ''} onChange={(e) => patch({ stage: e.target.value })}>
          {!PIPELINE_STAGES.includes(r.stage) && <option value={r.stage || ''}>{r.stage || '—'}</option>}
          {PIPELINE_STAGES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td className="col-last">
        <div className="last-wrap">
          <input
            type="date"
            className="cell-date"
            value={r.lastContact || ''}
            onChange={(e) => patch({ lastContact: e.target.value })}
          />
          <div className="last-meta">
            <span className={age.cls}>{age.text}</span>
            {r.lastContact !== today && (
              <button className="mini" title="Set last contact to today" onClick={() => patch({ lastContact: today })}>today</button>
            )}
          </div>
        </div>
      </td>
      <td className="col-next">
        <DraftField value={r.nextAction} placeholder="Next action…" onCommit={(v) => patch({ nextAction: v })} />
        <div className="remind">
          {r.nextDate ? (
            <span className={reminderCls}>
              {r.nextDate < today ? 'Overdue · ' : r.nextDate === today ? 'Today · ' : '⏰ '}
              {fmtDate(r.nextDate)}
              <button className="mini" title="Clear reminder" onClick={() => patch({ nextDate: '' })}>×</button>
            </span>
          ) : (
            <span className="muted">No reminder</span>
          )}
          {[3, 7, 14].map((n) => (
            <button key={n} className="mini" title={`Remind me on ${fmtDate(addDays(today, n))}`} onClick={() => patch({ nextDate: addDays(today, n) })}>
              +{n}d
            </button>
          ))}
        </div>
      </td>
      <td className="col-notes">
        <DraftField multiline value={r.notes} placeholder="Notes…" onCommit={(v) => patch({ notes: v })} />
      </td>
      <td className="col-actions">
        {isArchived ? (
          <button
            className="mini"
            onClick={() => patch({ stage: r.prevStage && r.prevStage !== 'Archived' ? r.prevStage : 'Radar', prevStage: '' })}
          >
            Unarchive
          </button>
        ) : (
          <button className="mini" onClick={() => patch({ stage: 'Archived', prevStage: r.stage })}>Archive</button>
        )}
        <button className="mini danger" onClick={() => onDelete(r)}>Delete</button>
      </td>
    </tr>
  )
}

// Text field that saves on blur / Enter instead of on every keystroke
function DraftField({ value, onCommit, multiline, placeholder }) {
  const [v, setV] = useState(value || '')
  useEffect(() => setV(value || ''), [value])
  const commit = () => {
    if ((value || '') !== v) onCommit(v)
  }
  const props = {
    value: v,
    placeholder,
    onChange: (e) => setV(e.target.value),
    onBlur: commit,
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        setV(value || '')
        e.currentTarget.blur()
      } else if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.currentTarget.blur()
      }
    },
  }
  return multiline ? <textarea rows={2} className="cell-input cell-notes" {...props} /> : <input className="cell-input" {...props} />
}
