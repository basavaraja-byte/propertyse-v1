import { useMemo, useState } from 'react'

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

export default function OwnerProperties({
  portfolio = [],
  loading = false,
  error = '',
  onRetry,
  onSelectProperty,
  onNavigate,
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'

  const filteredProperties = useMemo(() => {
    return (portfolio || []).map((item) => ({
      ...item,
      tenantName: item.tenantName || item.tenant?.fullName || '',
      tenantPhone: item.tenantPhone || item.tenant?.phone || '',
      leaseEndDate: item.leaseEndDate || item.tenant?.leaseEndDate || null,
    })).filter((item) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        item.propertyName?.toLowerCase().includes(q) ||
        item.buildingNumber?.toLowerCase().includes(q) ||
        item.unitNumber?.toLowerCase().includes(q) ||
        item.tenantName?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [portfolio, search, statusFilter])

  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading property portfolio…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load property portfolio</strong>
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

  const counts = {
    all: portfolio.length,
    occupied: portfolio.filter((p) => p.status === 'Occupied').length,
    vacant: portfolio.filter((p) => p.status === 'Vacant').length,
    maintenance: portfolio.filter((p) => p.status === 'Maintenance').length,
  }

  function handleViewDetails(property) {
    if (onSelectProperty) {
      onSelectProperty(property.id)
    }
    if (onNavigate) {
      onNavigate('property-details')
    }
  }

  return (
    <div className="owner-view-container">
      {/* View Header */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">PORTFOLIO ASSETS</span>
          <h2>My Properties</h2>
          <p>
            Review all properties and units registered under your ownership, including tenant occupancy and lease periods.
          </p>
        </div>
        <div className="owner-view-header-stats">
          <div className="owner-inline-badge">
            <strong>{portfolio.length}</strong> Total Units
          </div>
          <div className="owner-inline-badge">
            <strong>{counts.occupied}</strong> Occupied
          </div>
          <div className="owner-inline-badge">
            <strong>{counts.vacant}</strong> Vacant
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="owner-filter-bar">
        <div className="owner-search-box">
          <span className="owner-search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search by unit number, building, or tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search properties"
          />
          {search && (
            <button
              type="button"
              className="owner-search-clear"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="owner-filter-actions">
          <div className="owner-filter-tabs" role="tablist" aria-label="Filter properties by status">
            {['All', 'Occupied', 'Vacant', 'Maintenance'].map((status) => (
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
                    ? counts.all
                    : status === 'Occupied'
                    ? counts.occupied
                    : status === 'Vacant'
                    ? counts.vacant
                    : counts.maintenance}
                </span>
              </button>
            ))}
          </div>

          <div className="owner-view-toggle" role="group" aria-label="View layout switcher">
            <button
              type="button"
              className={`owner-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Grid Card View"
              aria-pressed={viewMode === 'cards'}
            >
              ⊞ Cards
            </button>
            <button
              type="button"
              className={`owner-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-pressed={viewMode === 'table'}
            >
              ≡ Table
            </button>
          </div>
        </div>
      </div>

      {/* Results Content */}
      {filteredProperties.length === 0 ? (
        <div className="owner-panel owner-empty-state">
          <span className="owner-empty-icon" aria-hidden="true">🏢</span>
          <h3>No properties match your filter</h3>
          <p>Try clearing your search term or selecting a different status filter.</p>
          {(search || statusFilter !== 'All') && (
            <button
              type="button"
              className="owner-primary-button"
              onClick={() => {
                setSearch('')
                setStatusFilter('All')
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        <div className="owner-property-grid">
          {filteredProperties.map((property) => (
            <article className="owner-property-card" key={property.id}>
              <div className="owner-card-top">
                <span className="owner-unit-pill">{property.unitNumber}</span>
                <span className={`owner-status-tag status-${property.status.toLowerCase()}`}>
                  {property.status}
                </span>
              </div>

              <div className="owner-card-body">
                <h3 className="owner-card-title">{property.propertyName}</h3>
                <span className="owner-card-subtitle">{property.buildingNumber}</span>

                <div className="owner-card-metrics">
                  <div className="owner-metric-item">
                    <span className="owner-metric-label">Annual Rent</span>
                    <strong className="owner-metric-val">{formatMoney(property.annualRent)}</strong>
                  </div>
                  <div className="owner-metric-item">
                    <span className="owner-metric-label">Monthly Potential</span>
                    <strong className="owner-metric-val">
                      {formatMoney(Math.round(property.annualRent / 12))}
                    </strong>
                  </div>
                </div>

                <div className="owner-card-tenant-box">
                  <span className="owner-tenant-label">Current Tenancy:</span>
                  {property.tenantName ? (
                    <div className="owner-tenant-detail">
                      <strong>{property.tenantName}</strong>
                      <small>Lease active through {formatDate(property.leaseEndDate)}</small>
                    </div>
                  ) : (
                    <span className="owner-tenant-vacant">Vacant · Ready for tenancy</span>
                  )}
                </div>
              </div>

              <div className="owner-card-footer">
                <button
                  type="button"
                  className="owner-card-action-btn"
                  onClick={() => handleViewDetails(property)}
                  aria-label={`View details for ${property.unitNumber}`}
                >
                  <span>Property Details</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="owner-panel">
          <div className="owner-table-scroll">
            <table className="owner-table">
              <thead>
                <tr>
                  <th scope="col">UNIT</th>
                  <th scope="col">PROPERTY</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">ANNUAL RENT</th>
                  <th scope="col">EST. MONTHLY</th>
                  <th scope="col">TENANT</th>
                  <th scope="col">LEASE END</th>
                  <th scope="col">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((property) => (
                  <tr key={property.id}>
                    <td>
                      <span className="owner-unit-pill">{property.unitNumber}</span>
                    </td>
                    <td>
                      <strong>{property.propertyName}</strong>
                      <small className="owner-table-subtext">{property.buildingNumber}</small>
                    </td>
                    <td>
                      <span className={`owner-status-tag status-${property.status.toLowerCase()}`}>
                        {property.status}
                      </span>
                    </td>
                    <td className="owner-rent-cell">{formatMoney(property.annualRent)}</td>
                    <td>{formatMoney(Math.round(property.annualRent / 12))}</td>
                    <td>
                      {property.tenantName ? (
                        <div>
                          <strong>{property.tenantName}</strong>
                          {property.tenantPhone && (
                            <small className="owner-table-subtext">{property.tenantPhone}</small>
                          )}
                        </div>
                      ) : (
                        <span className="owner-text-muted">Unassigned</span>
                      )}
                    </td>
                    <td>{formatDate(property.leaseEndDate)}</td>
                    <td>
                      <button
                        type="button"
                        className="owner-table-action-button"
                        onClick={() => handleViewDetails(property)}
                      >
                        Inspect
                      </button>
                    </td>
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

