function dateLabel(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

export default function WorkerJobCard({ ticket, worker, onOpen }) {
  const acceptedByMe = ticket.acceptedBy === worker.name
  return (
    <article className="worker-job-card">
      <div className="worker-job-topline">
        <span className="worker-ticket-id">#{String(ticket.id).slice(0, 8)}</span>
        <span className={`worker-priority priority-${(ticket.priority || 'medium').toLowerCase()}`}>{ticket.priority || 'Medium'}</span>
      </div>
      <div className="worker-job-title-row">
        <h3>{ticket.category || 'Maintenance'} request</h3>
        <span className={`worker-status status-${(ticket.status || 'open').toLowerCase().replaceAll(' ', '-')}`}>{ticket.status || 'Open'}</span>
      </div>
      <p className="worker-job-description">{ticket.description || 'No description provided.'}</p>
      <div className="worker-job-meta">
        <span>⌂ {ticket.propertyName || ticket.propertyId || 'Property'}{ticket.unitNumber ? ` · Unit ${ticket.unitNumber}` : ''}</span>
        <span>♙ {ticket.tenantName || 'Tenant not listed'}</span>
        <span>⚒ {ticket.assignedTeam || 'General Review'}</span>
        <span>◷ {dateLabel(ticket.createdAt)}</span>
      </div>
      {ticket.acceptedBy && <p className="worker-accepted-line">Accepted by {ticket.acceptedBy}{acceptedByMe ? ' (you)' : ''}</p>}
      <div className="worker-card-actions">
        <button className="worker-button worker-button-secondary" type="button" onClick={() => onOpen(ticket)}>View details</button>
      </div>
    </article>
  )
}
