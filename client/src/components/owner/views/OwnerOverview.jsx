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

export default function OwnerOverview({
  data,
  loading = false,
  error = '',
  onRetry,
  onNavigate,
}) {
  if (loading) {
    return (
      <div className="owner-overview-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading owner portfolio metrics…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-overview-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load owner overview</strong>
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

  const summary = data?.summary || data?.metrics || {}
  const metrics = {
    totalProperties: Number(summary.totalProperties || 0),
    occupiedProperties: Number(summary.occupiedUnits || summary.occupiedProperties || 0),
    vacantProperties: Number(summary.vacantUnits || summary.vacantProperties || 0),
    maintenanceProperties: Number(summary.maintenanceUnits || summary.maintenanceProperties || 0),
    totalTenants: Number(summary.activeTenantsCount || summary.totalTenants || 0),
    grossAnnualRent: Number(summary.annualExpectedRent || summary.grossAnnualRent || 0),
  }
  const portfolio = data?.portfolio || data?.recentProperties || []
  const recentActivity = data?.recentActivity || []
  const alerts = data?.alerts || []
  const isDevelopmentPreview = Boolean(data?.isDevelopmentPreview)

  const monthlyPotential = Math.round((metrics.grossAnnualRent || 0) / 12)
  const totalUnits = metrics.totalProperties || 0
  const occupancyRate = totalUnits > 0
    ? Math.round((metrics.occupiedProperties / totalUnits) * 100)
    : 0

  const kpis = [
    {
      id: 'total-properties',
      label: 'Total Properties',
      value: metrics.totalProperties,
      detail: `${metrics.occupiedProperties} occupied · ${metrics.vacantProperties} vacant`,
      icon: '▦',
      tone: 'blue',
    },
    {
      id: 'occupied',
      label: 'Occupied Properties',
      value: metrics.occupiedProperties,
      detail: `${occupancyRate}% occupancy rate`,
      icon: '♙',
      tone: 'purple',
    },
    {
      id: 'vacant',
      label: 'Vacant Properties',
      value: metrics.vacantProperties,
      detail: 'Available for new tenant',
      icon: '⌂',
      tone: 'green',
    },
    {
      id: 'maintenance',
      label: 'Maintenance Properties',
      value: metrics.maintenanceProperties,
      detail: metrics.maintenanceProperties > 0 ? 'Under repair' : 'No active repairs',
      icon: '⚒',
      tone: 'orange',
    },
    {
      id: 'total-tenants',
      label: 'Total Tenants',
      value: metrics.totalTenants,
      detail: 'Registered active leases',
      icon: '👤',
      tone: 'indigo',
    },
    {
      id: 'gross-annual-rent',
      label: 'Gross Annual Rent',
      value: formatMoney(metrics.grossAnnualRent),
      detail: `Est. monthly potential: ${formatMoney(monthlyPotential)} / mo`,
      icon: '₹',
      tone: 'emerald',
    },
  ]

  return (
    <div className="owner-overview-container">
      {isDevelopmentPreview && (
        <div className="owner-preview-banner" role="note">
          <span className="owner-preview-tag">DEVELOPMENT PREVIEW</span>
          <span>
            Displaying isolated development preview data for Step 3 UI evaluation. Real database queries will be linked in Step 5.
          </span>
        </div>
      )}

      {/* Heading */}
      <section className="owner-page-heading">
        <div>
          <span className="owner-eyebrow">PORTFOLIO OVERVIEW</span>
          <h2>Welcome back, Owner</h2>
          <p>
            Here is the current status, occupancy breakdown, and financial performance across your property portfolio.
          </p>
        </div>
        <div className="owner-heading-actions">
          <button
            type="button"
            className="owner-primary-button"
            onClick={() => onNavigate && onNavigate('properties')}
          >
            <span>View All Properties</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      {/* Six KPI Cards */}
      <section className="owner-kpi-grid" aria-label="Portfolio Key Performance Indicators">
        {kpis.map((kpi) => (
          <article className="owner-kpi-card" key={kpi.id}>
            <div className="owner-kpi-header">
              <span className="owner-kpi-label">{kpi.label}</span>
              <span className={`owner-kpi-icon ${kpi.tone}`} aria-hidden="true">
                {kpi.icon}
              </span>
            </div>
            <div className="owner-kpi-value">{kpi.value}</div>
            <div className="owner-kpi-detail">
              <span className={`owner-dot ${kpi.tone}`} aria-hidden="true" />
              <span>{kpi.detail}</span>
            </div>
          </article>
        ))}
      </section>

      {/* Visual Analytics & Alerts Row */}
      <div className="owner-analytics-row">
        {/* Occupancy and Vacancy Visualization */}
        <section className="owner-panel owner-occupancy-panel" aria-labelledby="occupancy-breakdown-heading">
          <div className="owner-panel-header">
            <div>
              <h3 id="occupancy-breakdown-heading">Occupancy Breakdown</h3>
              <p>Visual representation of your units across occupancy states</p>
            </div>
            <span className="owner-occupancy-badge">{occupancyRate}% Rented</span>
          </div>

          <div className="owner-progress-bar" role="progressbar" aria-valuenow={occupancyRate} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="owner-progress-segment occupied"
              style={{ width: `${totalUnits > 0 ? (metrics.occupiedProperties / totalUnits) * 100 : 0}%` }}
              title={`Occupied: ${metrics.occupiedProperties} units`}
            />
            <div
              className="owner-progress-segment vacant"
              style={{ width: `${totalUnits > 0 ? (metrics.vacantProperties / totalUnits) * 100 : 0}%` }}
              title={`Vacant: ${metrics.vacantProperties} units`}
            />
            <div
              className="owner-progress-segment maintenance"
              style={{ width: `${totalUnits > 0 ? (metrics.maintenanceProperties / totalUnits) * 100 : 0}%` }}
              title={`Maintenance: ${metrics.maintenanceProperties} units`}
            />
          </div>

          <div className="owner-occupancy-legend">
            <div className="owner-legend-item">
              <span className="owner-legend-dot occupied" aria-hidden="true" />
              <span className="owner-legend-label">Occupied ({metrics.occupiedProperties})</span>
            </div>
            <div className="owner-legend-item">
              <span className="owner-legend-dot vacant" aria-hidden="true" />
              <span className="owner-legend-label">Vacant ({metrics.vacantProperties})</span>
            </div>
            <div className="owner-legend-item">
              <span className="owner-legend-dot maintenance" aria-hidden="true" />
              <span className="owner-legend-label">Maintenance ({metrics.maintenanceProperties})</span>
            </div>
          </div>

          <div className="owner-yield-callout">
            <div className="owner-yield-copy">
              <strong>Estimated Monthly Rental Potential</strong>
              <small>Calculated as gross annual rent divided by 12 months. Actual collected rent depends on tenant payment cycles.</small>
            </div>
            <span className="owner-yield-amount">{formatMoney(monthlyPotential)}</span>
          </div>
        </section>

        {/* Alerts Section */}
        <section className="owner-panel owner-alerts-panel" aria-labelledby="alerts-heading">
          <div className="owner-panel-header">
            <div>
              <h3 id="alerts-heading">Attention & Alerts</h3>
              <p>Time-sensitive property notices and lease events</p>
            </div>
            <span className="owner-alert-count-pill">{alerts.length} Active</span>
          </div>

          <div className="owner-alerts-list">
            {alerts.length === 0 ? (
              <div className="owner-empty-notice">
                <span className="owner-empty-check">✓</span>
                <p>All properties are in good standing with no urgent alerts.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div className={`owner-alert-item severity-${alert.severity || 'info'}`} key={alert.id}>
                  <span className="owner-alert-icon" aria-hidden="true">
                    {alert.severity === 'urgent' ? '⚠' : alert.severity === 'warning' ? '⏰' : 'ℹ'}
                  </span>
                  <div className="owner-alert-body">
                    <strong>{alert.title}</strong>
                    <p>{alert.message}</p>
                    {alert.action && (
                      <span className="owner-alert-action-tag">{alert.action}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Property Portfolio Summary Table */}
      <section className="owner-panel" aria-labelledby="portfolio-summary-heading">
        <div className="owner-panel-header">
          <div>
            <h3 id="portfolio-summary-heading">Property Portfolio Summary</h3>
            <p>Units assigned to your property owner account</p>
          </div>
          <button
            type="button"
            className="owner-text-button"
            onClick={() => onNavigate && onNavigate('properties')}
          >
            View Full Portfolio →
          </button>
        </div>

        {portfolio.length === 0 ? (
          <div className="owner-empty-table-state">
            <p>No properties are currently linked to this owner profile.</p>
          </div>
        ) : (
          <div className="owner-table-scroll">
            <table className="owner-table">
              <thead>
                <tr>
                  <th scope="col">UNIT / FLAT</th>
                  <th scope="col">PROPERTY</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">CURRENT TENANT</th>
                  <th scope="col">LEASE END</th>
                  <th scope="col">ANNUAL RENT</th>
                  <th scope="col">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="owner-unit-pill">{item.unitNumber}</span>
                    </td>
                    <td>
                      <strong>{item.propertyName}</strong>
                      <small className="owner-table-subtext">{item.buildingNumber}</small>
                    </td>
                    <td>
                      <span className={`owner-status-tag status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <strong>{item.tenantName || '—'}</strong>
                      {item.tenantPhone && (
                        <small className="owner-table-subtext">{item.tenantPhone}</small>
                      )}
                    </td>
                    <td>{formatDate(item.leaseEndDate)}</td>
                    <td className="owner-rent-cell">{formatMoney(item.annualRent)}</td>
                    <td>
                      <button
                        type="button"
                        className="owner-table-action-button"
                        onClick={() => onNavigate && onNavigate('property-details')}
                        aria-label={`View details for ${item.unitNumber}`}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Activity Section */}
      <section className="owner-panel" aria-labelledby="recent-activity-heading">
        <div className="owner-panel-header">
          <div>
            <h3 id="recent-activity-heading">Recent Portfolio Activity</h3>
            <p>Recent operational updates, tenant lease notices, and resolved work</p>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div className="owner-empty-table-state">
            <p>No recent activity recorded for this portfolio.</p>
          </div>
        ) : (
          <div className="owner-activity-timeline">
            {recentActivity.map((activity) => (
              <div className="owner-activity-entry" key={activity.id}>
                <div className="owner-activity-marker" aria-hidden="true">
                  <span className={`owner-activity-bullet type-${activity.type || 'info'}`} />
                </div>
                <div className="owner-activity-content">
                  <div className="owner-activity-header">
                    <strong>{activity.title}</strong>
                    <time className="owner-activity-time">{activity.timestamp}</time>
                  </div>
                  <p>{activity.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
