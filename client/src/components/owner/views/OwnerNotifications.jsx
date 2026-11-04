import { useMemo, useState } from 'react'

export default function OwnerNotifications({
  alerts = [],
  loading = false,
  error = '',
  onRetry,
  onNavigate,
  onSelectProperty,
}) {
  const [filter, setFilter] = useState('All')

  const filteredAlerts = useMemo(() => {
    if (filter === 'All') return alerts || []
    return (alerts || []).filter((a) => (a.severity || a.type) === filter.toLowerCase())
  }, [alerts, filter])

  if (loading) {
    return (
      <div className="owner-view-loading" role="status">
        <div className="owner-spinner" aria-hidden="true" />
        <p>Loading notifications & alerts…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="owner-view-error alert alert-error" role="alert">
        <div className="owner-error-copy">
          <strong>Could not load notifications</strong>
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

  function handleActionClick(alert) {
    if (alert.propertyId && onSelectProperty) {
      onSelectProperty(alert.propertyId)
    }
    if (onNavigate) {
      if (alert.type === 'maintenance') {
        onNavigate('maintenance')
      } else if (alert.type === 'lease' || alert.type === 'vacancy') {
        onNavigate('properties')
      } else {
        onNavigate('dashboard')
      }
    }
  }

  return (
    <div className="owner-view-container">
      {/* View Header */}
      <div className="owner-view-header">
        <div>
          <span className="owner-eyebrow">COMMUNICATIONS & ALERTS</span>
          <h2>Notifications</h2>
          <p>
            Real-time notifications regarding lease events, property availability, and maintenance work orders.
          </p>
        </div>
        <div className="owner-view-header-stats">
          <div className="owner-inline-badge">
            <strong>{alerts.length}</strong> Total Alert(s)
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="owner-filter-bar">
        <div className="owner-filter-tabs" role="tablist" aria-label="Filter notifications by severity">
          {['All', 'Warning', 'Info'].map((level) => (
            <button
              key={level}
              type="button"
              role="tab"
              aria-selected={filter === level}
              className={`owner-filter-tab ${filter === level ? 'active' : ''}`}
              onClick={() => setFilter(level)}
            >
              <span>{level}</span>
              <span className="owner-tab-count">
                {level === 'All'
                  ? alerts.length
                  : alerts.filter((a) => a.severity === level.toLowerCase()).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      {filteredAlerts.length === 0 ? (
        <div className="owner-panel owner-empty-state">
          <span className="owner-empty-check" aria-hidden="true">✓</span>
          <h3>No Notifications</h3>
          <p>All property notifications have been reviewed and there are no active alerts.</p>
        </div>
      ) : (
        <div className="owner-notifications-feed">
          {filteredAlerts.map((alert) => (
            <article
              className={`owner-panel owner-notification-card severity-${alert.severity || 'info'}`}
              key={alert.id}
            >
              <div className="owner-notification-icon-wrapper" aria-hidden="true">
                {alert.severity === 'urgent' ? '⚠' : alert.severity === 'warning' ? '⏰' : 'ℹ'}
              </div>

              <div className="owner-notification-content">
                <div className="owner-notification-top">
                  <span className={`owner-severity-pill severity-${alert.severity || 'info'}`}>
                    {alert.severity || 'info'}
                  </span>
                  <h3 className="owner-notification-title">{alert.title}</h3>
                </div>

                <p className="owner-notification-message">{alert.message}</p>

                {alert.action && (
                  <div className="owner-notification-footer">
                    <button
                      type="button"
                      className="owner-text-button"
                      onClick={() => handleActionClick(alert)}
                    >
                      {alert.action} →
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

