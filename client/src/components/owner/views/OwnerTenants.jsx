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

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export default function OwnerTenants({
  tenants: rawTenants = null,
  portfolio = [],
  loading = false,
  error = '',
  onRetry,
  onNavigate,
  onSelectProperty,
}) {
  const [search, setSearch] = useState('')

  // Extract all occupied properties that have a registered tenant
  const tenants = useMemo(() => {
    if (Array.isArray(rawTenants) && rawTenants.length > 0) {
      return rawTenants.map((t) => {
        let daysRemaining = null
        if (t.leaseEndDate) {
          const end = new Date(t.leaseEndDate)
          const today = new Date()
          daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
        }
        return {
          id: t.propertyId || t.id,
          unitNumber: t.unitNumber,
          propertyName: t.propertyName,
          tenantName: t.fullName || t.tenantName,
          phone: t.phone || t.tenantPhone || '—',
          email: t.email || t.tenantEmail || '—',
          leaseStartDate: t.leaseStartDate,
          leaseEndDate: t.leaseEndDate,
          annualRent: t.annualRent || (t.monthlyRent ? t.monthlyRent * 12 : 0),
          daysRemaining,
        }
      })
    }

    return (portfolio || [])
      .map((p) => ({
        ...p,
        tenantName: p.tenantName || p.tenant?.fullName || '',
        tenantPhone: p.tenantPhone || p.tenant?.phone || '',
        tenantEmail: p.tenantEmail || p.tenant?.email || '',
        leaseStartDate: p.leaseStartDate || p.tenant?.leaseStartDate || null,
        leaseEndDate: p.leaseEndDate || p.tenant?.leaseEndDate || null,
      }))
      .filter((p) => p.tenantName && p.tenantName.trim())
      .map((p) => {
        let daysRemaining = null
        if (p.leaseEndDate) {
          const end = new Date(p.leaseEndDate)
          const today = new Date()
          daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
        }

        return {
          id: p.id,
          unitNumber: p.unitNumber,
          propertyName: p.propertyName,
          tenantName: p.tenantName,
          phone: p.tenantPhone || '—',
          email: p.tenantEmail || '—',
          leaseStartDate: p.leaseStartDate,
          leaseEndDate: p.leaseEndDate,
          annualRent: p.annualRent,
          daysRemaining,
        }
      })
  }, [rawTenants, portfolio])

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tenants
    return tenants.filter(
      (t) =>
        t.tenantName.toLowerCase().includes(q) ||
        t.unitNumber.toLowerCase().includes(q) ||
        t.phone.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
    )
  }, [tenants, search])

  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading tenant directory…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load tenant directory</strong>
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

  function handleInspect(propertyId) {
    if (onSelectProperty) {
      onSelectProperty(propertyId)
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
          <span className="owner-eyebrow">RESIDENT DIRECTORY</span>
          <h2>Tenants</h2>
          <p>
            Directory of active residents residing across your properties. Tenant onboarding and lease renewals are administered by your Property Manager.
          </p>
        </div>
        <div className="owner-view-header-stats">
          <div className="owner-inline-badge">
            <strong>{tenants.length}</strong> Registered Resident(s)
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="owner-filter-bar">
        <div className="owner-search-box">
          <span className="owner-search-icon" aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="Search by tenant name, flat, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tenants"
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
      </div>

      {/* Tenants Content */}
      {filteredTenants.length === 0 ? (
        <div className="owner-panel owner-empty-state">
          <span className="owner-empty-icon" aria-hidden="true">👤</span>
          <h3>{search ? 'No residents match your search' : 'No Active Tenants'}</h3>
          <p>
            {search
              ? 'Try adjusting your search query.'
              : 'None of your units currently have registered tenants on file.'}
          </p>
        </div>
      ) : (
        <div className="owner-tenant-grid">
          {filteredTenants.map((t) => (
            <article className="owner-panel owner-tenant-card" key={t.id}>
              <div className="owner-tenant-card-header">
                <div className="owner-tenant-avatar" aria-hidden="true">
                  {t.tenantName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h3 className="owner-tenant-name">{t.tenantName}</h3>
                  <span className="owner-tenant-sub">
                    {t.unitNumber} · {t.propertyName}
                  </span>
                </div>
                <span className="owner-unit-pill">{t.unitNumber}</span>
              </div>

              <div className="owner-spec-list">
                <div className="owner-spec-row">
                  <span className="owner-spec-label">Phone</span>
                  <a href={`tel:${t.phone}`} className="owner-contact-link">
                    {t.phone}
                  </a>
                </div>
                <div className="owner-spec-row">
                  <span className="owner-spec-label">Email</span>
                  <a href={`mailto:${t.email}`} className="owner-contact-link" title={t.email}>
                    {t.email}
                  </a>
                </div>
                <div className="owner-spec-row">
                  <span className="owner-spec-label">Lease Duration</span>
                  <span className="owner-spec-val">
                    {formatDate(t.leaseStartDate)} – {formatDate(t.leaseEndDate)}
                  </span>
                </div>
                <div className="owner-spec-row">
                  <span className="owner-spec-label">Contracted Rent</span>
                  <strong className="owner-spec-val">{formatMoney(t.annualRent)} / yr</strong>
                </div>
                <div className="owner-spec-row">
                  <span className="owner-spec-label">Lease Status</span>
                  {t.daysRemaining !== null ? (
                    <span
                      className={`owner-status-tag ${
                        t.daysRemaining > 60
                          ? 'status-vacant'
                          : t.daysRemaining > 0
                          ? 'status-maintenance'
                          : 'status-occupied'
                      }`}
                    >
                      {t.daysRemaining > 0
                        ? `${t.daysRemaining} days active`
                        : 'Term Expired'}
                    </span>
                  ) : (
                    <span className="owner-status-tag status-vacant">Active</span>
                  )}
                </div>
              </div>

              <div className="owner-tenant-card-footer">
                <button
                  type="button"
                  className="owner-table-action-button"
                  onClick={() => handleInspect(t.id)}
                >
                  View Property File →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

