import { useState } from 'react'

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

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

export default function OwnerPropertyDetails({
  portfolio = [],
  maintenanceTickets = [],
  selectedPropertyId,
  loading = false,
  error = '',
  onRetry,
  onSelectProperty,
  onNavigate,
}) {
  const [currentId, setCurrentId] = useState(
    selectedPropertyId || (portfolio.length > 0 ? portfolio[0].id : '')
  )

  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading unit specifications…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load property details</strong>
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

  const rawProperty = portfolio.find((p) => p.id === currentId) || portfolio[0]
  const property = rawProperty ? {
    ...rawProperty,
    tenantName: rawProperty.tenantName || rawProperty.tenant?.fullName || '',
    tenantPhone: rawProperty.tenantPhone || rawProperty.tenant?.phone || '',
    tenantEmail: rawProperty.tenantEmail || rawProperty.tenant?.email || '',
    leaseStartDate: rawProperty.leaseStartDate || rawProperty.tenant?.leaseStartDate || null,
    leaseEndDate: rawProperty.leaseEndDate || rawProperty.tenant?.leaseEndDate || null,
  } : null

  if (!property) {
    return (
      <div className="owner-view-container">
        <div className="owner-panel owner-empty-state">
          <span className="owner-empty-icon" aria-hidden="true">🏢</span>
          <h3>No Property Selected</h3>
          <p>Select a property from your portfolio to inspect its specifications.</p>
          <button
            type="button"
            className="owner-primary-button"
            onClick={() => onNavigate && onNavigate('properties')}
          >
            ← Back to My Properties
          </button>
        </div>
      </div>
    )
  }

  const unitTickets = maintenanceTickets.filter(
    (ticket) => ticket.propertyId === property.id || ticket.unitNumber === property.unitNumber
  )

  const monthlyPotential = Math.round(property.annualRent / 12)

  let daysRemaining = null
  if (property.leaseEndDate) {
    const end = new Date(property.leaseEndDate)
    const today = new Date()
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    if (!Number.isNaN(diff)) {
      daysRemaining = diff
    }
  }

  function handleUnitSwitch(e) {
    const nextId = e.target.value
    setCurrentId(nextId)
    if (onSelectProperty) {
      onSelectProperty(nextId)
    }
  }

  return (
    <div className="owner-view-container">
      {/* View Header with Unit Selector */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">ASSET SPECIFICATIONS</span>
          <h2>Property Details · {property.unitNumber}</h2>
          <p>
            Detailed specifications, tenancy agreement, financial metrics, and maintenance log for this unit.
          </p>
        </div>

        <div className="owner-unit-selector-wrapper">
          <label htmlFor="owner-property-picker">Switch Unit:</label>
          <select
            id="owner-property-picker"
            className="owner-select"
            value={property.id}
            onChange={handleUnitSwitch}
          >
            {portfolio.map((p) => (
              <option key={p.id} value={p.id}>
                {p.unitNumber} · {p.propertyName} ({p.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Spec Panels Grid */}
      <div className="owner-details-grid">
        {/* Left: Core Specifications & Status */}
        <div className="owner-details-column">
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Unit Overview</h3>
                <p>Location, building assignment, and status</p>
              </div>
              <span className={`owner-status-tag status-${property.status.toLowerCase()}`}>
                {property.status}
              </span>
            </div>

            <div className="owner-spec-list">
              <div className="owner-spec-row">
                <span className="owner-spec-label">Flat / Unit Number</span>
                <strong className="owner-spec-val">{property.unitNumber}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Property Name</span>
                <strong className="owner-spec-val">{property.propertyName}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Building / Block</span>
                <strong className="owner-spec-val">{property.buildingNumber || 'Main Building'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Occupancy Status</span>
                <strong className="owner-spec-val">{property.status}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Tenant Ready</span>
                <strong className="owner-spec-val">{property.tenantReady ? 'Yes (Move-in ready)' : 'Pending inspection'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Estimated Repair Cost</span>
                <strong className="owner-spec-val">{formatMoney(property.estimatedRepairCost || 0)}</strong>
              </div>
            </div>
          </section>

          {/* Financial Breakdown Card */}
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Financial Profile</h3>
                <p>Rental schedule and calculated yield potential</p>
              </div>
              <span className="owner-badge-neutral">₹ INR</span>
            </div>

            <div className="owner-financial-card-box">
              <div className="owner-fin-metric">
                <span className="owner-fin-label">Contracted Annual Rent</span>
                <span className="owner-fin-amount">{formatMoney(property.annualRent)}</span>
                <small className="owner-fin-sub">Gross potential specified in management agreement</small>
              </div>
              <div className="owner-fin-metric">
                <span className="owner-fin-label">Estimated Monthly Potential</span>
                <span className="owner-fin-amount">{formatMoney(monthlyPotential)}</span>
                <small className="owner-fin-sub">Contracted annual rent divided by 12 months</small>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Tenant Profile & Maintenance History */}
        <div className="owner-details-column">
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Current Tenancy Agreement</h3>
                <p>Registered tenant details and lease duration</p>
              </div>
            </div>

            {property.tenantName ? (
              <div className="owner-tenant-card-expanded">
                <div className="owner-tenant-header">
                  <div className="owner-tenant-avatar" aria-hidden="true">
                    {property.tenantName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="owner-tenant-name">{property.tenantName}</h4>
                    <span className="owner-tenant-sub">Registered Tenant</span>
                  </div>
                </div>

                <div className="owner-spec-list">
                  <div className="owner-spec-row">
                    <span className="owner-spec-label">Contact Phone</span>
                    <strong className="owner-spec-val">{property.tenantPhone || '—'}</strong>
                  </div>
                  <div className="owner-spec-row">
                    <span className="owner-spec-label">Contact Email</span>
                    <strong className="owner-spec-val">{property.tenantEmail || '—'}</strong>
                  </div>
                  <div className="owner-spec-row">
                    <span className="owner-spec-label">Lease Commencement</span>
                    <strong className="owner-spec-val">{formatDate(property.leaseStartDate)}</strong>
                  </div>
                  <div className="owner-spec-row">
                    <span className="owner-spec-label">Lease Expiration</span>
                    <strong className="owner-spec-val">{formatDate(property.leaseEndDate)}</strong>
                  </div>
                  {daysRemaining !== null && (
                    <div className="owner-spec-row">
                      <span className="owner-spec-label">Term Remaining</span>
                      <strong className={`owner-spec-val ${daysRemaining < 60 ? 'text-warning' : ''}`}>
                        {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Lease Expired'}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="owner-empty-state-compact">
                <span className="owner-empty-icon-sm" aria-hidden="true">⌂</span>
                <strong>No Active Tenant Assigned</strong>
                <p>This unit is currently vacant. Property management handles tenant screening and leasing.</p>
              </div>
            )}
          </section>

          {/* Maintenance Log for this Unit */}
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Unit Maintenance History</h3>
                <p>Work orders and repairs logged for {property.unitNumber}</p>
              </div>
              <span className="owner-badge-neutral">{unitTickets.length} Record(s)</span>
            </div>

            {unitTickets.length === 0 ? (
              <div className="owner-empty-state-compact">
                <span className="owner-empty-check" aria-hidden="true">✓</span>
                <strong>No Maintenance Tickets on Record</strong>
                <p>No repair requests or open tickets exist for this unit.</p>
              </div>
            ) : (
              <div className="owner-ticket-compact-list">
                {unitTickets.map((ticket) => (
                  <article className="owner-ticket-item" key={ticket.id}>
                    <div className="owner-ticket-top">
                      <span className="owner-ticket-category">{ticket.category}</span>
                      <span className={`owner-status-tag status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="owner-ticket-desc">{ticket.description}</p>
                    <div className="owner-ticket-footer">
                      <span className={`owner-priority-pill priority-${ticket.priority.toLowerCase()}`}>
                        Priority: {ticket.priority}
                      </span>
                      <time className="owner-ticket-date">{formatDate(ticket.createdAt)}</time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

