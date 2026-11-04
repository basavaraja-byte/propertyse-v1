import { useMemo, useState } from 'react'

function formatDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function OwnerMaintenance({
  maintenanceTickets = [],
  loading = false,
  error = '',
  onRetry,
}) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')

  const categories = useMemo(() => {
    const set = new Set((maintenanceTickets || []).map((t) => t.category).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [maintenanceTickets])

  const filteredTickets = useMemo(() => {
    return (maintenanceTickets || []).filter((t) => {
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter
      return matchesStatus && matchesCategory
    })
  }, [maintenanceTickets, statusFilter, categoryFilter])

  const counts = {
    total: (maintenanceTickets || []).length,
    open: (maintenanceTickets || []).filter((t) => t.status === 'Open').length,
    inProgress: (maintenanceTickets || []).filter((t) => t.status === 'In Progress').length,
    resolved: (maintenanceTickets || []).filter((t) => t.status === 'Resolved').length,
  }

  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading maintenance work orders…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load maintenance requests</strong>
          <p>{error}</p>
        </div>
        {onRetry && (
          <button type="button" className="owner-retry-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="owner-view-container">
      {/* View Header */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">PROPERTY OPERATIONS</span>
          <h2>Maintenance Requests</h2>
          <p>
            Track work orders and repair tickets filed for your units. Ticket creation and dispatch are handled directly by Property Managers and Service Providers.
          </p>
        </div>
        <div className="owner-view-header-stats">
          <div className="owner-inline-badge">
            <strong>{counts.total}</strong> Total Ticket(s)
          </div>
          <div className="owner-inline-badge">
            <strong>{counts.open}</strong> Open
          </div>
          <div className="owner-inline-badge">
            <strong>{counts.resolved}</strong> Resolved
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="owner-filter-bar">
        <div className="owner-filter-actions">
          <div className="owner-filter-tabs" role="tablist" aria-label="Filter tickets by status">
            {['All', 'Open', 'In Progress', 'Resolved'].map((status) => (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={statusFilter === status}
                className={`owner-filter-tab ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                <span>{status}</span>
                <span className="owner-tab-count">
                  {status === 'All'
                    ? counts.total
                    : status === 'Open'
                    ? counts.open
                    : status === 'In Progress'
                    ? counts.inProgress
                    : counts.resolved}
                </span>
              </button>
            ))}
          </div>

          {categories.length > 2 && (
            <div className="owner-select-group">
              <label htmlFor="owner-ticket-category">Category:</label>
              <select
                id="owner-ticket-category"
                className="owner-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Ticket List / Table */}
      {filteredTickets.length === 0 ? (
        <div className="owner-panel owner-empty-state">
          <span className="owner-empty-check" aria-hidden="true">✓</span>
          <h3>No Maintenance Tickets Found</h3>
          <p>
            {statusFilter !== 'All' || categoryFilter !== 'All'
              ? 'No tickets match the selected filters.'
              : 'There are currently no maintenance work orders logged for your properties.'}
          </p>
          {(statusFilter !== 'All' || categoryFilter !== 'All') && (
            <button
              type="button"
              className="owner-primary-button"
              onClick={() => {
                setStatusFilter('All')
                setCategoryFilter('All')
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="owner-panel">
          <div className="owner-table-scroll">
            <table className="owner-table">
              <thead>
                <tr>
                  <th scope="col">TICKET ID</th>
                  <th scope="col">FLAT</th>
                  <th scope="col">CATEGORY</th>
                  <th scope="col">DESCRIPTION</th>
                  <th scope="col">PRIORITY</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">DATE LOGGED</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <span className="owner-ticket-id">#{String(ticket.id).slice(0, 8)}</span>
                    </td>
                    <td>
                      <span className="owner-unit-pill">{ticket.unitNumber}</span>
                      {ticket.tenantName && (
                        <small className="owner-table-subtext">{ticket.tenantName}</small>
                      )}
                    </td>
                    <td>
                      <strong>{ticket.category}</strong>
                    </td>
                    <td>
                      <p className="owner-table-description">{ticket.description}</p>
                    </td>
                    <td>
                      <span className={`owner-priority-pill priority-${ticket.priority.toLowerCase()}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className={`owner-status-tag status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>{formatDate(ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

