function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export default function OwnerRentalIncome({
  incomeData = null,
  portfolio: rawPortfolio = [],
  loading = false,
  error = '',
  onRetry,
}) {
  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Calculating rental income analytics…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load rental income analytics</strong>
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

  const portfolio = (incomeData?.unitsBreakdown || rawPortfolio || []).map((p) => ({
    ...p,
    annualRent: Number(p.annualRent || p.ownerShareAnnualRent || p.fullAnnualRent || 0),
    tenantName: p.tenantName || p.tenant?.fullName || '',
  }))
  const totalGrossAnnual = portfolio.reduce((sum, p) => sum + Number(p.annualRent || 0), 0)
  const totalMonthlyPotential = Math.round(totalGrossAnnual / 12)

  const occupiedProperties = portfolio.filter((p) => p.status === 'Occupied')
  const vacantProperties = portfolio.filter((p) => p.status === 'Vacant')

  const occupiedAnnualRent = occupiedProperties.reduce((sum, p) => sum + Number(p.annualRent || 0), 0)
  const occupiedMonthlyPotential = Math.round(occupiedAnnualRent / 12)

  const vacantAnnualRent = vacantProperties.reduce((sum, p) => sum + Number(p.annualRent || 0), 0)
  const vacantMonthlyPotentialLoss = Math.round(vacantAnnualRent / 12)

  const portfolioYieldRate = totalGrossAnnual > 0
    ? Math.round((occupiedAnnualRent / totalGrossAnnual) * 100)
    : 0

  return (
    <div className="owner-view-container">
      {/* View Header */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">FINANCIAL PERFORMANCE</span>
          <h2>Rental Income Analytics</h2>
          <p>
            Projections and yield analysis derived from property contracts. This section reflects contracted rental potential; actual collected amounts depend on tenant reconciliation cycles.
          </p>
        </div>
      </div>

      {/* Yield Callout Notice */}
      <div className="owner-callout-notice">
        <span className="owner-callout-icon" aria-hidden="true">ℹ</span>
        <div>
          <strong>Estimated Rental Potential vs. Actual Received Payouts</strong>
          <p>
            The values below calculate contracted potential revenue. Actual owner disbursements are handled via the central billing module and property management reconciliation.
          </p>
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="owner-kpi-grid">
        <article className="owner-kpi-card">
          <div className="owner-kpi-header">
            <span className="owner-kpi-label">Gross Annual Potential</span>
            <span className="owner-kpi-icon emerald" aria-hidden="true">₹</span>
          </div>
          <div className="owner-kpi-value">{formatMoney(totalGrossAnnual)}</div>
          <div className="owner-kpi-detail">
            <span className="owner-dot emerald" aria-hidden="true" />
            <span>Sum of all {portfolio.length} registered unit contracts</span>
          </div>
        </article>

        <article className="owner-kpi-card">
          <div className="owner-kpi-header">
            <span className="owner-kpi-label">Active Contracted Monthly</span>
            <span className="owner-kpi-icon purple" aria-hidden="true">♙</span>
          </div>
          <div className="owner-kpi-value">{formatMoney(occupiedMonthlyPotential)}</div>
          <div className="owner-kpi-detail">
            <span className="owner-dot purple" aria-hidden="true" />
            <span>From {occupiedProperties.length} currently occupied units ({portfolioYieldRate}% yield)</span>
          </div>
        </article>

        <article className="owner-kpi-card">
          <div className="owner-kpi-header">
            <span className="owner-kpi-label">Monthly Vacancy Loss</span>
            <span className="owner-kpi-icon orange" aria-hidden="true">⚠</span>
          </div>
          <div className="owner-kpi-value">{formatMoney(vacantMonthlyPotentialLoss)}</div>
          <div className="owner-kpi-detail">
            <span className="owner-dot orange" aria-hidden="true" />
            <span>Unrealized potential across {vacantProperties.length} vacant flat(s)</span>
          </div>
        </article>
      </div>

      {/* Yield & Breakdown Panel */}
      <section className="owner-panel">
        <div className="owner-panel-header">
          <div>
            <h3>Unit-by-Unit Rental Schedule</h3>
            <p>Annual and calculated monthly yield across each unit in your portfolio</p>
          </div>
          <span className="owner-badge-neutral">{formatMoney(totalMonthlyPotential)} / mo Total Est.</span>
        </div>

        <div className="owner-table-scroll">
          <table className="owner-table">
            <thead>
              <tr>
                <th scope="col">UNIT</th>
                <th scope="col">PROPERTY</th>
                <th scope="col">STATUS</th>
                <th scope="col">TENANT</th>
                <th scope="col">ANNUAL CONTRACT</th>
                <th scope="col">MONTHLY POTENTIAL</th>
                <th scope="col">REVENUE STATUS</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((p) => {
                const monthly = Math.round(p.annualRent / 12)
                const isOccupied = p.status === 'Occupied'

                return (
                  <tr key={p.id}>
                    <td>
                      <span className="owner-unit-pill">{p.unitNumber}</span>
                    </td>
                    <td>
                      <strong>{p.propertyName}</strong>
                      <small className="owner-table-subtext">{p.buildingNumber}</small>
                    </td>
                    <td>
                      <span className={`owner-status-tag status-${p.status.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.tenantName || <span className="owner-text-muted">—</span>}</td>
                    <td className="owner-rent-cell">{formatMoney(p.annualRent)}</td>
                    <td>{formatMoney(monthly)}</td>
                    <td>
                      {isOccupied ? (
                        <span className="owner-status-tag status-vacant">Contract Active</span>
                      ) : (
                        <span className="owner-status-tag status-maintenance">Vacancy Loss</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="owner-table-total-row">
                <td colSpan="4">
                  <strong>Total Portfolio Yield Potential</strong>
                </td>
                <td className="owner-rent-cell">
                  <strong>{formatMoney(totalGrossAnnual)}</strong>
                </td>
                <td>
                  <strong>{formatMoney(totalMonthlyPotential)} / mo</strong>
                </td>
                <td>
                  <span className="owner-badge-neutral">{portfolioYieldRate}% Active</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}
