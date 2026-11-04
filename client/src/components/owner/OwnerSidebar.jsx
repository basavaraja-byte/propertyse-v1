const OWNER_NAV_SECTIONS = [
  {
    group: 'PORTFOLIO & ASSETS',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '⌂' },
      { id: 'properties', label: 'My Properties', icon: '▦', countKey: 'properties' },
      { id: 'property-details', label: 'Property Details', icon: '☵' },
      { id: 'tenants', label: 'Tenants', icon: '♙', countKey: 'tenants' },
    ],
  },
  {
    group: 'FINANCIALS & OPERATIONS',
    items: [
      { id: 'rental-income', label: 'Rental Income', icon: '◈' },
      { id: 'payments', label: 'Payments & Payouts', icon: '▤' },
      { id: 'maintenance', label: 'Maintenance', icon: '⚒', countKey: 'maintenance' },
      { id: 'reports', label: 'Reports & Statements', icon: '☷' },
    ],
  },
  {
    group: 'ACCOUNT & PREFERENCES',
    items: [
      { id: 'notifications', label: 'Notifications', icon: '◉', countKey: 'notifications' },
      { id: 'settings', label: 'Profile & Settings', icon: '⚙' },
    ],
  },
]

export default function OwnerSidebar({
  activeSection = 'dashboard',
  onNavigate,
  counts = {},
  ownerName = 'Rajesh Sharma',
  ownerEmail = 'owner@propertyse.com',
  isMobileOpen = false,
  onCloseMobile,
  onBackToManager,
}) {
  return (
    <>
      {isMobileOpen && (
        <div
          className="owner-dashboard-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`owner-dashboard-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Owner navigation"
      >
        <div className="owner-sidebar-header">
          <div className="owner-brand">
            <span className="owner-brand-mark" aria-hidden="true">P</span>
            <div className="owner-brand-text">
              <span className="owner-brand-title">
                Property<strong>SE</strong>
              </span>
              <span className="owner-brand-badge">OWNER PORTAL</span>
            </div>
          </div>

          {isMobileOpen && (
            <button
              type="button"
              className="owner-sidebar-close"
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              ×
            </button>
          )}
        </div>

        <div className="owner-profile-card">
          <div className="owner-profile-avatar" aria-hidden="true">PO</div>
          <div className="owner-profile-info">
            <span className="owner-profile-eyebrow">PROPERTY OWNER</span>
            <strong className="owner-profile-name" title={ownerName}>{ownerName}</strong>
            <small className="owner-profile-subtext" title={ownerEmail}>{ownerEmail}</small>
          </div>
        </div>

        <nav className="owner-sidebar-nav">
          {OWNER_NAV_SECTIONS.map((sectionGroup) => (
            <div className="owner-nav-group" key={sectionGroup.group}>
              <span className="owner-nav-group-label">{sectionGroup.group}</span>
              <div className="owner-nav-list">
                {sectionGroup.items.map((item) => {
                  const isActive = activeSection === item.id
                  const count = item.countKey ? counts[item.countKey] : null

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`owner-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onNavigate(item.id)
                        if (isMobileOpen && onCloseMobile) {
                          onCloseMobile()
                        }
                      }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="owner-nav-icon" aria-hidden="true">{item.icon}</span>
                      <span className="owner-nav-label">{item.label}</span>
                      {count !== null && count !== undefined && count > 0 && (
                        <span className="owner-nav-counter">{count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="owner-sidebar-footer">
          {onBackToManager && (
            <button
              type="button"
              className="owner-sidebar-return-btn"
              onClick={onBackToManager}
              title="Return to Property Manager Workspace"
            >
              ← Back to Manager Workspace
            </button>
          )}
          <div className="owner-support-card">
            <span className="owner-support-icon" aria-hidden="true">ℹ</span>
            <div>
              <strong>Owner Assistance</strong>
              <p>Contact your assigned Property Manager for lease & maintenance support.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
