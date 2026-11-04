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

export default function OwnerReports({
  reportsData = null,
  portfolio: rawPortfolio = [],
  ownerProfile: rawProfile = {},
  loading = false,
  error = '',
  onRetry,
}) {
  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Generating portfolio statement…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not generate report statement</strong>
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

  const portfolio = (reportsData?.units || rawPortfolio || []).map((p) => ({
    ...p,
    annualRent: Number(p.annualRent || p.ownerShareAnnualRent || 0),
    tenantName: p.tenantName || p.tenant?.fullName || '',
    leaseEndDate: p.leaseEndDate || p.tenant?.leaseEndDate || null,
  }))
  const ownerProfile = reportsData?.owner || rawProfile || {}
  const totalUnits = portfolio.length
  const occupiedCount = portfolio.filter((p) => p.status === 'Occupied').length
  const vacantCount = portfolio.filter((p) => p.status === 'Vacant').length
  const maintenanceCount = portfolio.filter((p) => p.status === 'Maintenance').length

  const totalAnnualRent = portfolio.reduce((sum, p) => sum + Number(p.annualRent || 0), 0)
  const monthlyPotential = Math.round(totalAnnualRent / 12)
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0

  function handlePrint() {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="owner-view-container owner-report-printable">
      {/* View Header with Print Action */}
      <div className="owner-view-header owner-no-print">
        <div>
          <span className="owner-eyebrow">PORTFOLIO REPORTING</span>
          <h2>Reports & Statements</h2>
          <p>
            Generate and export consolidated portfolio statements, tenancy schedules, and occupancy yield reports.
          </p>
        </div>
        <div>
          <button type="button" className="owner-primary-button" onClick={handlePrint}>
            <span>🖨 Print / Export PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Card */}
      <article className="owner-panel owner-report-document">
        <header className="owner-report-header">
          <div className="owner-report-brand">
            <span className="owner-brand-mark" aria-hidden="true">P</span>
            <div>
              <h3>PropertySE Portfolio Statement</h3>
              <p>Official Property Owner Performance Summary</p>
            </div>
          </div>

          <div className="owner-report-meta">
            <div>
              <span>Generated On:</span>
              <strong>{currentDate}</strong>
            </div>
            <div>
              <span>Owner Account:</span>
              <strong>{ownerProfile.name || 'Rajesh Sharma'} ({ownerProfile.id || 'OWN_001'})</strong>
            </div>
          </div>
        </header>

        {/* Executive Summary Metrics */}
        <section className="owner-report-section">
          <h4 className="owner-report-section-title">1. Executive Portfolio Summary</h4>
          <div className="owner-report-summary-grid">
            <div className="owner-report-stat">
              <span>Total Properties:</span>
              <strong>{totalUnits} Units</strong>
            </div>
            <div className="owner-report-stat">
              <span>Occupancy Rate:</span>
              <strong>{occupancyRate}%</strong>
            </div>
            <div className="owner-report-stat">
              <span>Occupied Units:</span>
              <strong>{occupiedCount} Units</strong>
            </div>
            <div className="owner-report-stat">
              <span>Vacant Units:</span>
              <strong>{vacantCount} Units</strong>
            </div>
            <div className="owner-report-stat">
              <span>Maintenance Units:</span>
              <strong>{maintenanceCount} Units</strong>
            </div>
            <div className="owner-report-stat">
              <span>Contracted Annual Rent:</span>
              <strong>{formatMoney(totalAnnualRent)}</strong>
            </div>
            <div className="owner-report-stat">
              <span>Est. Monthly Potential:</span>
              <strong>{formatMoney(monthlyPotential)} / mo</strong>
            </div>
          </div>
        </section>

        {/* Property Portfolio Asset Table */}
        <section className="owner-report-section">
          <h4 className="owner-report-section-title">2. Unit Asset Register & Lease Schedule</h4>
          <table className="owner-table owner-report-table">
            <thead>
              <tr>
                <th scope="col">UNIT</th>
                <th scope="col">PROPERTY</th>
                <th scope="col">STATUS</th>
                <th scope="col">TENANT NAME</th>
                <th scope="col">LEASE END DATE</th>
                <th scope="col">ANNUAL RENT</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.unitNumber}</strong>
                  </td>
                  <td>{p.propertyName} ({p.buildingNumber})</td>
                  <td>{p.status}</td>
                  <td>{p.tenantName || 'Vacant'}</td>
                  <td>{formatDate(p.leaseEndDate)}</td>
                  <td className="owner-rent-cell">{formatMoney(p.annualRent)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5">
                  <strong>Total Contracted Gross Annual Potential</strong>
                </td>
                <td className="owner-rent-cell">
                  <strong>{formatMoney(totalAnnualRent)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Disclaimer Note */}
        <footer className="owner-report-footer">
          <p>
            <strong>Report Disclaimer:</strong> This statement reflects active lease agreements and inventory status recorded in PropertySE as of {currentDate}. Estimated monthly potential is calculated as contracted annual rent divided by 12 months. Actual payouts are reconciled following tenant collections and approved property management disbursements.
          </p>
        </footer>
      </article>
    </div>
  )
}
