import { useState } from 'react'

export default function OwnerSettings({
  settingsData = null,
  ownerProfile: rawProfile = {
    id: 'OWN_001',
    name: 'Rajesh Sharma',
    email: 'rajesh.owner@propertyse.com',
    phone: '+91 98765 43210',
    unitsOwned: 3,
    managementCompany: 'Sunrise Property Group',
    bankName: 'HDFC Bank',
    accountNumberMasked: '•••• •••• •••• 4892',
  },
  loading = false,
  error = '',
  onRetry,
}) {
  const [notifyLease, setNotifyLease] = useState(true)
  const [notifyMaintenance, setNotifyMaintenance] = useState(true)
  const [notifyDisbursement, setNotifyDisbursement] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')

  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading profile & settings…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load profile settings</strong>
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

  const profile = settingsData?.profile || rawProfile || {}
  const payout = settingsData?.payoutAccount || {}
  const ownerProfile = {
    ...profile,
    bankName: payout.bankName || profile.bankName || 'HDFC Bank',
    accountNumberMasked: payout.accountNumberMasked || profile.accountNumberMasked || '•••• •••• •••• 4892',
  }

  function handleSave(e) {
    e.preventDefault()
    setSaveStatus('Preferences saved in local preview session. Persistent storage will connect in Step 5.')
    setTimeout(() => setSaveStatus(''), 5000)
  }

  return (
    <div className="owner-view-container">
      {/* View Header */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">ACCOUNT MANAGEMENT</span>
          <h2>Profile & Settings</h2>
          <p>
            Review your property owner profile information, notification preferences, and registered banking destination.
          </p>
        </div>
      </div>

      <div className="owner-settings-grid">
        {/* Left Column: Owner Profile Information */}
        <div className="owner-settings-col">
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Owner Profile Information</h3>
                <p>Personal identification registered with Property Management</p>
              </div>
              <span className="owner-role-pill">VERIFIED OWNER</span>
            </div>

            <div className="owner-spec-list">
              <div className="owner-spec-row">
                <span className="owner-spec-label">Full Name</span>
                <strong className="owner-spec-val">{ownerProfile.name || 'Rajesh Sharma'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Owner ID</span>
                <strong className="owner-spec-val">{ownerProfile.id || 'OWN_001'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Registered Email</span>
                <strong className="owner-spec-val">{ownerProfile.email || 'rajesh.owner@propertyse.com'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Contact Phone</span>
                <strong className="owner-spec-val">{ownerProfile.phone || '+91 98765 43210'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Managing Workspace</span>
                <strong className="owner-spec-val">{ownerProfile.managementCompany || 'Sunrise Property Group'}</strong>
              </div>
              <div className="owner-spec-row">
                <span className="owner-spec-label">Registered Units</span>
                <strong className="owner-spec-val">{ownerProfile.unitsOwned || 3} Units Owned</strong>
              </div>
            </div>

            <p className="owner-settings-note">
              To update your legal name or registered email, please submit a profile verification request to your Property Manager.
            </p>
          </section>

          {/* Registered Payout Destination */}
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Registered Payout Destination</h3>
                <p>Banking coordinates on file for net rental disbursements</p>
              </div>
              <span className="owner-badge-neutral">Protected</span>
            </div>

            <div className="owner-payout-box">
              <div className="owner-bank-icon" aria-hidden="true">🏦</div>
              <div className="owner-payout-details">
                <strong>{ownerProfile.bankName || 'HDFC Bank'}</strong>
                <span className="owner-payout-acc">{ownerProfile.accountNumberMasked || '•••• •••• •••• 4892'}</span>
                <small className="owner-payout-type">Direct NEFT/RTGS Settlement Account</small>
              </div>
            </div>

            <p className="owner-settings-note">
              Banking numbers are masked for data security. Bank account modifications require verification with property management before disbursement updates take effect.
            </p>
          </section>
        </div>

        {/* Right Column: Notification Preferences Form */}
        <div className="owner-settings-col">
          <section className="owner-panel">
            <div className="owner-panel-header">
              <div>
                <h3>Notification Preferences</h3>
                <p>Configure which automated alerts and summaries you receive</p>
              </div>
            </div>

            {saveStatus && (
              <div className="owner-preview-banner" role="status">
                <span className="owner-preview-tag">SAVED</span>
                <span>{saveStatus}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="owner-preferences-form">
              <div className="owner-preference-item">
                <div>
                  <strong>Lease Expiry & Renewal Alerts</strong>
                  <p>Receive notices 60 and 30 days before a tenant lease expires.</p>
                </div>
                <input
                  type="checkbox"
                  id="notify-lease"
                  checked={notifyLease}
                  onChange={(e) => setNotifyLease(e.target.checked)}
                  aria-label="Lease Expiry & Renewal Alerts"
                />
              </div>

              <div className="owner-preference-item">
                <div>
                  <strong>Maintenance Status Updates</strong>
                  <p>Get notified when a work order is logged or resolved on your units.</p>
                </div>
                <input
                  type="checkbox"
                  id="notify-maintenance"
                  checked={notifyMaintenance}
                  onChange={(e) => setNotifyMaintenance(e.target.checked)}
                  aria-label="Maintenance Status Updates"
                />
              </div>

              <div className="owner-preference-item">
                <div>
                  <strong>Disbursement Statements</strong>
                  <p>Receive monthly electronic statement receipts upon rental reconciliation.</p>
                </div>
                <input
                  type="checkbox"
                  id="notify-disbursement"
                  checked={notifyDisbursement}
                  onChange={(e) => setNotifyDisbursement(e.target.checked)}
                  aria-label="Disbursement Statements"
                />
              </div>

              <div className="owner-form-footer">
                <button type="submit" className="owner-primary-button">
                  Save Notification Preferences
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}

