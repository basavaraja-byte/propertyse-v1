export default function OwnerTopbar({
  title = 'Dashboard Overview',
  ownerName = 'Rajesh Sharma',
  unreadNotifications = 2,
  onToggleMobileMenu,
  onNavigate,
  onBackToManager,
}) {
  return (
    <header className="owner-topbar" role="banner">
      <div className="owner-topbar-left">
        <button
          type="button"
          className="owner-hamburger-button"
          onClick={onToggleMobileMenu}
          aria-label="Open navigation menu"
        >
          <span className="owner-hamburger-bar" />
          <span className="owner-hamburger-bar" />
          <span className="owner-hamburger-bar" />
        </button>

        <div className="owner-breadcrumbs">
          <span className="owner-breadcrumb-root">Owner Portal</span>
          <span className="owner-breadcrumb-separator" aria-hidden="true">/</span>
          <h1 className="owner-breadcrumb-current">{title}</h1>
        </div>
      </div>

      <div className="owner-topbar-right">
        {onBackToManager && (
          <button
            type="button"
            className="owner-topbar-portal-switch"
            onClick={onBackToManager}
            title="Return to Property Manager Workspace"
          >
            ← Property Manager
          </button>
        )}

        <div className="owner-status-pill" title="Preview Mode Active (Supabase connection not required)">
          <span className="owner-status-dot" aria-hidden="true" />
          <span className="owner-status-text">Preview Mode</span>
        </div>

        <span className="owner-role-pill">OWNER</span>

        <button
          type="button"
          className="owner-topbar-icon-button"
          onClick={() => onNavigate && onNavigate('notifications')}
          aria-label={`${unreadNotifications} unread notifications`}
          title="View Notifications"
        >
          <span className="owner-bell-icon" aria-hidden="true">🔔</span>
          {unreadNotifications > 0 && (
            <span className="owner-notification-badge">{unreadNotifications}</span>
          )}
        </button>

        <div className="owner-topbar-divider" aria-hidden="true" />

        <button
          type="button"
          className="owner-topbar-user"
          onClick={() => onNavigate && onNavigate('settings')}
          title="Owner Profile & Settings"
          aria-label="Owner Profile"
        >
          <div className="owner-topbar-avatar" aria-hidden="true">PO</div>
          <span className="owner-topbar-username">{ownerName}</span>
        </button>
      </div>
    </header>
  )
}
