import { useCallback, useEffect, useMemo, useState } from 'react'
import './worker.css'
import WorkerSidebar from './WorkerSidebar'
import WorkerJobCard from './WorkerJobCard'
import { workerApi } from './workerApi'
import { WORKER_PROFILE } from './workerConfig'

const PAGES = {
  dashboard: ['Dashboard', 'Your maintenance workload at a glance.'],
  team: ['Team Jobs', 'Jobs routed automatically to your specialist team.'],
  all: ['All Company Jobs', 'Company-wide maintenance visibility.'],
  mine: ['My Accepted Jobs', 'Jobs you have accepted and are responsible for.'],
  progress: ['In Progress', 'Work currently being handled by you.'],
  completed: ['Completed Jobs', 'Your resolved jobs and work history.'],
  notifications: ['Notifications', 'Recent job activity and items needing attention.'],
  profile: ['My Profile', 'Your worker details and team assignment.'],
}

function Stat({ label, value, hint, tone }) {
  return <article className={`worker-stat ${tone || ''}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>
}

export default function WorkerDashboard({ companyId = 'COMP_001', companyName = 'Property company', onBack }) {
  const [page, setPage] = useState('dashboard')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState([])
  const [noteText, setNoteText] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const worker = WORKER_PROFILE

  const loadTickets = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const data = await workerApi.getTickets(companyId)
      setTickets(Array.isArray(data.tickets) ? data.tickets : [])
    } catch (err) {
      setError(err.message || 'Could not load maintenance jobs.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [companyId])

  useEffect(() => {
    let ignore = false
    async function loadInitialTickets() {
      try {
        const data = await workerApi.getTickets(companyId)
        if (!ignore) setTickets(Array.isArray(data.tickets) ? data.tickets : [])
      } catch (err) {
        if (!ignore) setError(err.message || 'Could not load maintenance jobs.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadInitialTickets()
    return () => { ignore = true }
  }, [companyId])

  const mine = useMemo(() => tickets.filter(t => t.acceptedBy === worker.name), [tickets, worker.name])
  const teamJobs = useMemo(() => tickets.filter(t => t.assignedTeam === worker.team), [tickets, worker.team])
  const pending = teamJobs.filter(t => t.status === 'Open' && !t.acceptedBy)
  const inProgress = mine.filter(t => t.status === 'In Progress')
  const completed = mine.filter(t => t.status === 'Resolved')
  const urgent = tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Resolved')

  const pageTickets = useMemo(() => {
    let list = tickets
    if (page === 'team') list = teamJobs
    if (page === 'mine') list = mine
    if (page === 'progress') list = inProgress
    if (page === 'completed') list = completed
    if (page === 'dashboard') list = [...pending, ...inProgress].slice(0, 4)
    return list.filter(t => {
      const q = search.trim().toLowerCase()
      const matchesSearch = !q || [t.id, t.category, t.description, t.propertyName, t.propertyId, t.unitNumber, t.tenantName]
        .some(v => String(v || '').toLowerCase().includes(q))
      const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter
      return matchesSearch && matchesPriority
    })
  }, [tickets, page, teamJobs, mine, inProgress, completed, pending, search, priorityFilter])

  async function openTicket(ticket) {
    setSelected(ticket)
    setNotes([])
    setNoteText('')
    setNotesLoading(true)
    try {
      const data = await workerApi.getNotes(ticket.id, companyId)
      setNotes(Array.isArray(data.notes) ? data.notes : [])
    } catch {
      // Notes are optional; show ticket details even if the notes API is unavailable.
      setNotes([])
    } finally { setNotesLoading(false) }
  }

  async function perform(action, ticket = selected) {
    if (!ticket || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (action === 'accept') {
        await workerApi.acceptTicket(ticket.id, {
          workerName: worker.name, workerTeam: worker.team, companyId,
        })
        setNotice('Job accepted. It is now listed under My Accepted Jobs.')
      } else if (action === 'start') {
        await workerApi.updateStatus(ticket.id, { companyId, workerName: worker.name, status: 'In Progress' })
        setNotice('Work marked as in progress.')
      } else if (action === 'resolve') {
        await workerApi.updateStatus(ticket.id, { companyId, workerName: worker.name, status: 'Resolved' })
        setNotice('Job marked as resolved.')
      } else if (action === 'note') {
        if (!noteText.trim()) return
        const data = await workerApi.addNote(ticket.id, {
          companyId, workerName: worker.name, note: noteText.trim(),
        })
        setNotes(current => [...current, data.note])
        setNoteText('')
        setNotice('Progress note added.')
        setBusy(false)
        return
      }
      await loadTickets(true)
      if (selected) setSelected(current => ({ ...current, ...(action === 'accept' ? { acceptedBy: worker.name } : {}), ...(action === 'start' ? { status: 'In Progress' } : {}), ...(action === 'resolve' ? { status: 'Resolved' } : {}) }))
    } catch (err) {
      setError(err.message || 'The action could not be completed.')
    } finally { setBusy(false) }
  }

  const title = PAGES[page][0]
  const subtitle = PAGES[page][1]
  const activity = [...tickets].sort((a,b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0,8)

  return (
    <div className="worker-app">
      <WorkerSidebar page={page} onNavigate={next => { setPage(next); setSearch(''); setPriorityFilter('All'); setNotice(''); setError('') }}
        worker={worker} companyName={companyName} onBack={onBack || (() => { window.location.hash = 'overview' })} />
      <main className="worker-main">
        <header className="worker-topbar">
          <div><span className="worker-topbar-kicker">PROPERTYSE · WORKER PORTAL</span><strong>{title}</strong></div>
          <div className="worker-topbar-user"><span className="worker-online-dot" /> {worker.name} <span className="worker-team-pill">{worker.team}</span></div>
        </header>
        <section className="worker-content">
          <div className="worker-page-heading">
            <div><span className="worker-eyebrow">WORKSPACE / {title.toUpperCase()}</span><h1>{page === 'dashboard' ? `Good to see you, ${worker.name.split(' ')[0]}.` : title}</h1><p>{subtitle}</p></div>
            <button className="worker-button worker-button-secondary" type="button" onClick={() => loadTickets(true)} disabled={refreshing}>{refreshing ? 'Refreshing…' : '↻ Refresh'}</button>
          </div>

          {error && <div className="worker-alert worker-alert-error" role="alert">{error}<button onClick={() => setError('')} type="button">×</button></div>}
          {notice && <div className="worker-alert worker-alert-success" role="status">{notice}<button onClick={() => setNotice('')} type="button">×</button></div>}

          {page === 'dashboard' && <>
            <div className="worker-stats-grid">
              <Stat label="Team jobs" value={teamJobs.length} hint="Routed to your team" />
              <Stat label="Awaiting acceptance" value={pending.length} hint="Available to claim" tone="amber" />
              <Stat label="My in progress" value={inProgress.length} hint="Currently handling" tone="blue" />
              <Stat label="My completed" value={completed.length} hint="Resolved by you" tone="green" />
            </div>
            {urgent.length > 0 && <div className="worker-urgent-banner"><strong>{urgent.length} urgent {urgent.length === 1 ? 'job needs' : 'jobs need'} attention</strong><span>Review urgent company tickets and coordinate with the assigned team.</span><button type="button" onClick={() => setPage('all')}>View urgent jobs →</button></div>}
            <div className="worker-section-heading"><div><h2>Jobs needing your attention</h2><p>Unclaimed team jobs and work already in progress.</p></div><button type="button" className="worker-text-button" onClick={() => setPage('team')}>View team jobs →</button></div>
            <JobList tickets={pageTickets} loading={loading} worker={worker} onOpen={openTicket} />
            <div className="worker-section-heading"><div><h2>Recent company activity</h2><p>Latest maintenance requests and updates.</p></div><button type="button" className="worker-text-button" onClick={() => setPage('all')}>All company jobs →</button></div>
            <JobList tickets={activity.slice(0,3)} loading={loading} worker={worker} onOpen={openTicket} />
          </>}

          {['team','all','mine','progress','completed'].includes(page) && <>
            <div className="worker-toolbar">
              <input aria-label="Search jobs" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket, property, tenant or description…" />
              <select aria-label="Filter by priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                {['All','Low','Medium','High','Urgent'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <p className="worker-results-count">{pageTickets.length} job{pageTickets.length === 1 ? '' : 's'} shown</p>
            <JobList tickets={pageTickets} loading={loading} worker={worker} onOpen={openTicket} />
          </>}

          {page === 'notifications' && <div className="worker-panel"><h2>Recent job activity</h2>{activity.length ? activity.map(t => <div className="worker-activity-row" key={t.id}><span className="worker-activity-dot" /><div><strong>{t.category} · {t.priority}</strong><p>{t.status === 'Resolved' ? 'Ticket resolved' : t.acceptedBy ? `Accepted by ${t.acceptedBy}` : 'Awaiting worker acceptance'} · {t.propertyName || t.propertyId || 'Property'}{t.unitNumber ? `, Unit ${t.unitNumber}` : ''}</p></div><small>{t.status}</small></div>) : <Empty text="No job activity is available yet." />}</div>}

          {page === 'profile' && <div className="worker-profile-card"><div className="worker-profile-avatar">{worker.name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}</div><div><span className="worker-eyebrow">WORKER PROFILE</span><h2>{worker.name}</h2><p>Employee ID: {worker.employeeId}</p><p>Assigned specialist team: <strong>{worker.team}</strong></p><p>Company: <strong>{companyName}</strong></p><small>Development profile · Authentication and editable profile settings will be connected later.</small></div></div>}
        </section>
      </main>

      {selected && <div className="worker-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}>
        <section className="worker-modal" role="dialog" aria-modal="true" aria-labelledby="worker-modal-title">
          <div className="worker-modal-head"><div><span className="worker-eyebrow">TICKET DETAILS</span><h2 id="worker-modal-title">{selected.category} request</h2><small>#{selected.id}</small></div><button type="button" onClick={() => setSelected(null)} aria-label="Close details">×</button></div>
          <div className="worker-detail-grid"><div><small>Property / Unit</small><strong>{selected.propertyName || selected.propertyId || 'Property'} · {selected.unitNumber || 'Unit not listed'}</strong></div><div><small>Tenant</small><strong>{selected.tenantName || 'Not listed'}</strong></div><div><small>Priority</small><strong>{selected.priority}</strong></div><div><small>Assigned team</small><strong>{selected.assignedTeam || 'General Review'}</strong></div><div><small>Status</small><strong>{selected.status}</strong></div><div><small>Accepted by</small><strong>{selected.acceptedBy || 'Not accepted'}</strong></div></div>
          <div className="worker-description-block"><small>DESCRIPTION</small><p>{selected.description || 'No description provided.'}</p></div>
          <div className="worker-notes"><h3>Progress notes</h3>{notesLoading ? <p>Loading notes…</p> : notes.length ? notes.map(n => <article key={n.id}><strong>{n.workerName}</strong><p>{n.note}</p><small>{new Date(n.createdAt).toLocaleString()}</small></article>) : <p className="worker-muted">No progress notes yet.</p>}
            {selected.acceptedBy === worker.name && selected.status !== 'Resolved' && <div className="worker-note-form"><textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a progress update…" rows="3" /><button type="button" className="worker-button worker-button-secondary" disabled={busy || !noteText.trim()} onClick={() => perform('note')}>Add note</button></div>}
          </div>
          <div className="worker-modal-actions">
            {selected.status === 'Open' && !selected.acceptedBy && selected.assignedTeam === worker.team && <button type="button" className="worker-button worker-button-primary" disabled={busy} onClick={() => perform('accept')}>{busy ? 'Please wait…' : 'Accept job'}</button>}
            {selected.acceptedBy === worker.name && selected.status === 'Open' && <button type="button" className="worker-button worker-button-primary" disabled={busy} onClick={() => perform('start')}>Start work</button>}
            {selected.acceptedBy === worker.name && selected.status === 'In Progress' && <button type="button" className="worker-button worker-button-primary" disabled={busy} onClick={() => perform('resolve')}>Mark resolved</button>}
            <button type="button" className="worker-button worker-button-secondary" onClick={() => setSelected(null)}>Close</button>
          </div>
          <p className="worker-modal-footnote">Only unclaimed jobs assigned to your team can be accepted. The first successful acceptance wins.</p>
        </section>
      </div>}
    </div>
  )
}

function JobList({ tickets, loading, worker, onOpen }) {
  if (loading) return <div className="worker-empty-state">Loading maintenance jobs…</div>
  if (!tickets.length) return <Empty text="No jobs match this view yet." />
  return <div className="worker-job-list">{tickets.map(ticket => <WorkerJobCard key={ticket.id} ticket={ticket} worker={worker} onOpen={onOpen} />)}</div>
}

function Empty({ text }) { return <div className="worker-empty-state">{text}</div> }
