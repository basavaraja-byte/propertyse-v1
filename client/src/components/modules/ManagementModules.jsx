import { useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const CATEGORIES = ['Plumbing', 'Electrical', 'Air Conditioning', 'Appliance', 'Cleaning', 'Structural', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved']
const EMPTY_TENANT = { fullName: '', phone: '', email: '', leaseStartDate: '', leaseEndDate: '' }
const EMPTY_TICKET = { propertyId: '', category: 'Plumbing', description: '', priority: 'Medium' }

async function request(url, options) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`)
  return data
}

function money(value) {
  return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function PanelHeading({ title, subtitle, children }) {
  return <div className="panel-heading module-panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{children}</div>
}

export function TenantManagement({ properties, companyId, onRefresh, onNotice, onError }) {
  const [editing, setEditing] = useState(null)
  const [tenant, setTenant] = useState(EMPTY_TENANT)
  const [rentEditing, setRentEditing] = useState(null)
  const [rent, setRent] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')

  function startTenantEdit(property) {
    setModalError('')
    setEditing(property)
    setTenant({
      fullName: property.tenant?.fullName || '', phone: property.tenant?.phone || '', email: property.tenant?.email || '',
      leaseStartDate: property.tenant?.leaseStartDate ? String(property.tenant.leaseStartDate).slice(0, 10) : '',
      leaseEndDate: property.tenant?.leaseEndDate ? String(property.tenant.leaseEndDate).slice(0, 10) : '',
    })
    onError('')
  }

  async function saveTenant(event) {
    event.preventDefault()
    if (!editing) return
    if (tenant.leaseEndDate < tenant.leaseStartDate) { setModalError('Lease end date cannot be before lease start date.'); return }
    setSaving(true); setModalError(''); onError(''); onNotice('')
    try {
      const action = editing.tenant?.fullName ? 'update' : 'assign'
      const data = await request(`${API_BASE_URL}/properties/${encodeURIComponent(editing._id)}/tenant?companyId=${encodeURIComponent(companyId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, tenant }),
      })
      onNotice(data.message); setEditing(null); setTenant(EMPTY_TENANT); await onRefresh()
    } catch (error) { setModalError(error.message || 'Could not save tenant details.') }
    finally { setSaving(false) }
  }

  async function clearTenant(property) {
    if (!window.confirm(`Mark the tenant as having left ${property.unitNumber}? The flat will become Vacant.`)) return
    onError(''); onNotice('')
    try {
      const data = await request(`${API_BASE_URL}/properties/${encodeURIComponent(property._id)}/tenant?companyId=${encodeURIComponent(companyId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'clear' }),
      })
      onNotice(data.message); await onRefresh()
    } catch (error) { onError(error.message || 'Could not clear tenant assignment.') }
  }

  async function saveRent(event) {
    event.preventDefault()
    if (!rentEditing) return
    setSaving(true); onError(''); onNotice('')
    try {
      const data = await request(`${API_BASE_URL}/properties/${encodeURIComponent(rentEditing._id)}/rent?companyId=${encodeURIComponent(companyId)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annualRent: Number(rent) }),
      })
      onNotice(data.message); setRentEditing(null); await onRefresh()
    } catch (error) { onError(error.message || 'Could not update annual rent.') }
    finally { setSaving(false) }
  }

  const occupiedCount = properties.filter((p) => p.tenant?.fullName).length
  return <div className="module-stack">
    <section className="panel module-panel">
      <PanelHeading title="Tenant directory" subtitle={`${occupiedCount} tenant assignment(s) across ${properties.length} loaded unit(s). Tenant details and lease dates can be edited independently of rent.`} />
      <div className="table-scroll"><table className="properties-table module-table"><thead><tr><th>FLAT</th><th>TENANT</th><th>CONTACT</th><th>LEASE PERIOD</th><th>ANNUAL RENT</th><th>ACTIONS</th></tr></thead><tbody>
        {properties.length === 0 ? <tr><td colSpan="6" className="table-message">Initialize the company's flat inventory to begin managing tenants.</td></tr> : properties.slice().sort((a, b) => String(a.unitNumber).localeCompare(String(b.unitNumber), undefined, { numeric: true })).map((property) => <tr key={property._id}>
          <td><span className="unit-chip">{property.unitNumber}</span><small className="module-subtext">{property.status}</small></td>
          <td><strong>{property.tenant?.fullName || 'No tenant assigned'}</strong><small className="module-subtext">{property.tenant?.email || '—'}</small></td>
          <td>{property.tenant?.phone || '—'}</td>
          <td>{dateLabel(property.tenant?.leaseStartDate)} – {dateLabel(property.tenant?.leaseEndDate)}</td>
          <td className="rent-cell">{money(property.annualRent)}</td>
          <td><div className="module-row-actions"><button className="text-button" type="button" onClick={() => startTenantEdit(property)}>{property.tenant?.fullName ? 'Edit tenant' : 'Assign tenant'}</button><button className="text-button" type="button" onClick={() => { setRentEditing(property); setRent(String(property.annualRent ?? 0)); onError('') }}>Edit rent</button>{property.tenant?.fullName && <button className="text-button danger-text" type="button" onClick={() => clearTenant(property)}>Tenant left</button>}</div></td>
        </tr>)}
      </tbody></table></div>
    </section>
    {editing && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setEditing(null) }}><section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="tenant-modal-title"><button className="modal-close" type="button" onClick={() => { setEditing(null); setModalError('') }} disabled={saving} aria-label="Close">×</button><div className="modal-eyebrow">TENANT MANAGEMENT · {editing.unitNumber}</div><h2 id="tenant-modal-title">{editing.tenant?.fullName ? 'Edit tenant details' : 'Assign a tenant'}</h2><p className="modal-description">Update contact information and lease dates. Annual rent can be edited separately.</p>{modalError && <div className="modal-error" role="alert">{modalError}</div>}<form className="module-form modal-form" onSubmit={saveTenant}>
      <label>Full name<input value={tenant.fullName} onChange={(e) => setTenant({ ...tenant, fullName: e.target.value })} required maxLength={160} /></label>
      <label>Phone number<input value={tenant.phone} onChange={(e) => setTenant({ ...tenant, phone: e.target.value })} required maxLength={40} /></label>
      <label>Email address<input type="email" value={tenant.email} onChange={(e) => setTenant({ ...tenant, email: e.target.value })} maxLength={254} /></label>
      <label>Lease start date<input type="date" value={tenant.leaseStartDate} onChange={(e) => setTenant({ ...tenant, leaseStartDate: e.target.value })} required /></label>
      <label>Lease end date<input type="date" value={tenant.leaseEndDate} min={tenant.leaseStartDate || undefined} onChange={(e) => setTenant({ ...tenant, leaseEndDate: e.target.value })} required /></label>
      <div className="module-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save tenant details'}</button><button className="secondary-button" type="button" onClick={() => { setEditing(null); setModalError('') }} disabled={saving}>Cancel</button></div>
    </form></section></div>}
    {rentEditing && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setRentEditing(null) }}><section className="action-modal rent-action-modal" role="dialog" aria-modal="true" aria-labelledby="rent-modal-title"><button className="modal-close" type="button" onClick={() => setRentEditing(null)} disabled={saving} aria-label="Close">×</button><div className="modal-eyebrow">PROPERTY FINANCIALS · {rentEditing.unitNumber}</div><h2 id="rent-modal-title">Edit annual rent</h2><p className="modal-description">This updates the unit's annual rent only; tenant details remain unchanged.</p><form className="module-form modal-form rent-editor-form" onSubmit={saveRent}><label>Annual rent (₹)<input type="number" min="0" step="1" value={rent} onChange={(e) => setRent(e.target.value)} required /></label><div className="module-form-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save annual rent'}</button><button className="secondary-button" type="button" onClick={() => setRentEditing(null)} disabled={saving}>Cancel</button></div></form></section></div>}
  </div>
}

export function MaintenanceManagement({ properties, companyId, onRefreshProperties, onNotice, onError }) {
  const [tickets, setTickets] = useState([])
  const [ticketForm, setTicketForm] = useState(EMPTY_TICKET)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('All')
  const eligibleProperties = useMemo(() => properties.filter((p) => p.tenant?.fullName && p.tenant?.phone), [properties])

  const loadTickets = useCallback(async () => {
    setLoading(true)
    try {
      const data = await request(`${API_BASE_URL}/maintenance-tickets?companyId=${encodeURIComponent(companyId)}`)
      setTickets(data.tickets || [])
    } catch (error) { onError(error.message || 'Could not load maintenance tickets.') }
    finally { setLoading(false) }
  }, [companyId, onError])
  useEffect(() => {
    let cancelled = false
    request(`${API_BASE_URL}/maintenance-tickets?companyId=${encodeURIComponent(companyId)}`)
      .then((data) => { if (!cancelled) setTickets(data.tickets || []) })
      .catch((error) => { if (!cancelled) onError(error.message || 'Could not load maintenance tickets.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [companyId, onError])

  async function createTicket(event) {
    event.preventDefault(); setSaving(true); onError(''); onNotice('')
    try {
      const data = await request(`${API_BASE_URL}/maintenance-tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, ...ticketForm }) })
      onNotice(data.message); setTicketForm(EMPTY_TICKET); await Promise.all([loadTickets(), onRefreshProperties()])
    } catch (error) { onError(error.message || 'Could not create maintenance ticket.') }
    finally { setSaving(false) }
  }

  async function updateTicketStatus(ticket, status) {
    onError(''); onNotice('')
    try {
      const data = await request(`${API_BASE_URL}/maintenance-tickets/${encodeURIComponent(ticket._id || ticket.id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId, status }) })
      onNotice(data.message); await Promise.all([loadTickets(), onRefreshProperties()])
    } catch (error) { onError(error.message || 'Could not update ticket status.') }
  }

  const filteredTickets = tickets.filter((ticket) => statusFilter === 'All' || ticket.status === statusFilter)
  return <div className="module-stack">
    <section className="panel module-panel"><PanelHeading title="Raise a maintenance ticket" subtitle="Only units with an assigned tenant can raise a request. New tickets move the flat into Maintenance status." />
      <form className="module-form" onSubmit={createTicket}>
        <label>Tenant's flat<select value={ticketForm.propertyId} onChange={(e) => setTicketForm({ ...ticketForm, propertyId: e.target.value })} required><option value="">Select an occupied flat</option>{eligibleProperties.map((property) => <option key={property._id} value={property._id}>{property.unitNumber} · {property.tenant.fullName}</option>)}</select></label>
        <label>Category<select value={ticketForm.category} onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Priority<select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        <label className="module-full-width">Issue description<textarea value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} rows="3" maxLength="2000" placeholder="Describe the issue and where it occurs…" required /></label>
        <div className="module-form-actions"><button className="primary-button" type="submit" disabled={saving || eligibleProperties.length === 0}>{saving ? 'Submitting…' : 'Raise ticket'}</button>{eligibleProperties.length === 0 && <span className="module-hint">Assign a tenant with a phone number before raising a ticket.</span>}</div>
      </form>
    </section>
    <section className="panel module-panel"><PanelHeading title="Maintenance tickets" subtitle={`${tickets.length} ticket(s) for ${companyId}. Track progress and resolve completed work.`}><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter maintenance tickets"><option value="All">All statuses</option>{TICKET_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></PanelHeading>
      <div className="table-scroll"><table className="properties-table module-table"><thead><tr><th>TICKET</th><th>FLAT / TENANT</th><th>ISSUE</th><th>PRIORITY</th><th>STATUS</th><th>CREATED</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="6" className="table-message">Loading maintenance tickets…</td></tr> : filteredTickets.length === 0 ? <tr><td colSpan="6" className="table-message">No maintenance tickets match this view.</td></tr> : filteredTickets.map((ticket) => <tr key={ticket._id || ticket.id}>
          <td><span className="ticket-id">#{String(ticket._id || ticket.id).slice(0, 8)}</span></td><td><strong>{ticket.unitNumber}</strong><small className="module-subtext">{ticket.tenantName}</small></td><td><strong>{ticket.category}</strong><small className="module-subtext ticket-description">{ticket.description}</small></td><td><span className={`priority-pill priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td><td><select className={`status-badge ticket-status-${ticket.status.toLowerCase().replace(' ', '-')}`} value={ticket.status} onChange={(e) => updateTicketStatus(ticket, e.target.value)} aria-label={`Update ticket ${ticket._id || ticket.id} status`}>{TICKET_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></td><td>{dateLabel(ticket.createdAt)}</td>
        </tr>)}
      </tbody></table></div>
    </section>
  </div>
}


export function CompanyManagement({ companies, activeCompanyId, onCompaniesChanged, onNotice, onError }) {
  const [name, setName] = useState('')
  const [id, setId] = useState('')
  const [busy, setBusy] = useState(false)
  async function addCompany(event) {
    event.preventDefault(); setBusy(true); onError(''); onNotice('')
    try { const data = await request(`${API_BASE_URL}/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id.trim(), name: name.trim() }) }); const next = [...companies, data].sort((a,b) => a.name.localeCompare(b.name)); onCompaniesChanged(next); setName(''); setId(''); onNotice(`Company ${data.name} added. Each company can have up to 20 units.`) }
    catch (error) { onError(error.message || 'Could not add company.') } finally { setBusy(false) }
  }
  async function removeCompany(company) {
    if (!window.confirm(`Remove ${company.name}? Companies with units cannot be removed.`)) return
    onError(''); onNotice('')
    try { const data = await request(`${API_BASE_URL}/companies/${encodeURIComponent(company.id)}`, { method: 'DELETE' }); const next = companies.filter(c => c.id !== company.id); onCompaniesChanged(next); onNotice(data.message || 'Company removed.') }
    catch (error) { onError(error.message || 'Could not remove company.') }
  }
  return <div className="module-stack">
    <section className="panel module-panel"><PanelHeading title="Company directory" subtitle="Manage the companies available in your PropertySE workspace. Each company can register up to 20 units." />
      <form className="module-form company-create-form" onSubmit={addCompany}><label>Company name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={120} placeholder="e.g. Greenfield Estates" /></label><label>Company ID<input value={id} onChange={e=>setId(e.target.value)} required pattern="[A-Za-z0-9_-]{2,64}" maxLength={64} placeholder="e.g. COMP_003" /><small className="module-subtext">Use letters, numbers, hyphens or underscores.</small></label><div className="module-form-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Adding…' : '＋ Add company'}</button></div></form>
    </section>
    <section className="panel module-panel"><PanelHeading title="Registered companies" subtitle={`${companies.length} company record(s)`} /><div className="company-directory">{companies.map(company => <article className="company-card" key={company.id}><div className="company-avatar">{company.name.slice(0,1).toUpperCase()}</div><div className="company-card-copy"><strong>{company.name}</strong><span>{company.id}{company.id === activeCompanyId ? ' · Current company' : ''}</span></div><button type="button" className="secondary-button company-remove-button" onClick={()=>removeCompany(company)} disabled={company.id === activeCompanyId} title={company.id === activeCompanyId ? 'Switch to another company before removing this one' : 'Remove company'}>Remove</button></article>)}</div><p className="module-hint">A company can only be removed when it has no registered units. The active company is protected from accidental removal.</p></section>
  </div>
}
