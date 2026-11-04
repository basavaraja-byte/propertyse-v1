function formatMoney(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export default function OwnerPayments({
  paymentsData = null,
  portfolio = [],
  loading = false,
  error = '',
  onRetry,
}) {
  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading disbursement records…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load payments information</strong>
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
  const occupiedRentTotal = portfolio
    .filter((p) => p.status === 'Occupied')
    .reduce((sum, p) => sum + Number(p.annualRent || 0), 0)

  const estimatedMonthlyDisbursement = Math.round(occupiedRentTotal / 12)
  const transactions = paymentsData?.transactions || []
  const scheduleDisplay = paymentsData?.schedule || 'Monthly'

  return (
    <div className="owner-view-container">
      {/* View Header */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">DISBURSEMENTS & PAYOUTS</span>
          <h2>Payments & Payouts</h2>
          <p>
            Track rental disbursements and banking payout schedules. Automated payment gateway processing is in development.
          </p>
        </div>
      </div>

      {/* Integration Pending Notice */}
      <div className="owner-preview-banner" role="note">
        <span className="owner-preview-tag">INTEGRATION PENDING</span>
        <span>
          Payment Gateway & Direct Bank Transfer Integration is being established under the central billing module. No actual financial transactions or ledger transfers have been processed yet.
        </span>
      </div>

      {/* Payout Schedule Overview */}
      <div className="owner-kpi-grid">
        <article className="owner-kpi-card">
          <div className="owner-kpi-header">
            <span className="owner-kpi-label">Projected Monthly Disbursement</span>
            <span className="owner-kpi-icon blue" aria-hidden="true">💳</span>
          </div>
          <div className="owner-kpi-value">{formatMoney(estimatedMonthlyDisbursement)}</div>
          <div className="owner-kpi-detail">
            <span className="owner-dot blue" aria-hidden="true" />
            <span>Based on currently active tenant leases</span>
          </div>
        </article>

        <article className="owner-kpi-card">
          <div className="owner-kpi-header">
            <span className="owner-kpi-label">Disbursement Schedule</span>
            <span className="owner-kpi-icon purple" aria-hidden="true">📅</span>
          </div>
          <div className="owner-kpi-value">{scheduleDisplay}</div>
          <div className="owner-kpi-detail">
            <span className="owner-dot purple" aria-hidden="true" />
            <span>Reconciled on 1st–5th of each calendar month</span>
          </div>
        </article>

        <article className="owner-kpi-card">
          <div className="owner-kpi-header">
            <span className="owner-kpi-label">Gateway Status</span>
            <span className="owner-kpi-icon orange" aria-hidden="true">⚙</span>
          </div>
          <div className="owner-kpi-value">Pending</div>
          <div className="owner-kpi-detail">
            <span className="owner-dot orange" aria-hidden="true" />
            <span>Central payment processor integration in progress</span>
          </div>
        </article>
      </div>

      {/* Informative Empty State for Actual Transaction History */}
      <section className="owner-panel">
        <div className="owner-panel-header">
          <div>
            <h3>Disbursement Transaction History</h3>
            <p>Official bank payout and transfer records</p>
          </div>
          <span className="owner-badge-neutral">{transactions.length} Transactions</span>
        </div>

        <div className="owner-empty-state">
          <span className="owner-empty-icon" aria-hidden="true">💳</span>
          <h3>No Payment Records Available</h3>
          <p>
            Actual banking transactions, payout receipts, and payment ledger entries will be generated once automated payment processing is connected.
          </p>
          <div className="owner-payment-guidance">
            <strong>How disbursements work:</strong>
            <ol>
              <li>Tenants pay their monthly rent to the Property Manager account.</li>
              <li>Management verifies receipt and reconciles any approved maintenance deductions.</li>
              <li>Net proceeds are transferred to the verified owner bank account on the scheduled payout date.</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  )
}

