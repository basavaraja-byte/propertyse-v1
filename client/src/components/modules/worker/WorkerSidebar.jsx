const ITEMS = [
  ['dashboard', 'Dashboard', '▦'],
  ['team', 'Team Jobs', '⚒'],
  ['all', 'All Company Jobs', '▤'],
  ['mine', 'My Accepted Jobs', '♙'],
  ['progress', 'In Progress', '◷'],
  ['completed', 'Completed Jobs', '✓'],
  ['notifications', 'Notifications', '♧'],
  ['profile', 'My Profile', '◎'],
]

export default function WorkerSidebar({ page, onNavigate, worker, companyName, onBack }) {
  return (
    <aside className="worker-sidebar">
      <button className="worker-brand" onClick={onBack} type="button" title="Back to management">
        <span className="worker-brand-mark">P</span>
        <span>Property<span>SE</span></span>
      </button>
      <div className="worker-workspace">
        <span className="worker-workspace-label">WORKSPACE</span>
        <strong>{companyName || worker.companyName || 'Property company'}</strong>
        <small>Worker portal</small>
      </div>
      <div className="worker-nav-label">WORKER MENU</div>
      <nav className="worker-nav" aria-label="Worker navigation">
        {ITEMS.map(([key, label, icon]) => (
          <button key={key} type="button" className={page === key ? 'active' : ''}
            onClick={() => onNavigate(key)}>
            <span className="worker-nav-icon">{icon}</span><span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="worker-sidebar-bottom">
        <div className="worker-avatar">{(worker.name || 'W').split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}</div>
        <div><strong>{worker.name}</strong><small>{worker.team} team</small></div>
      </div>
    </aside>
  )
}
