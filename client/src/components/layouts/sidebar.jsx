import { NAV_ITEMS } from './navigation'

function Sidebar({
  companies,
  companyId,
  onCompanyChange,
  activeSection,
  navigate,
  total,
  selectedCompany,
}) {
  return (
    <aside className="sidebar">
      <button
        className="brand"
        type="button"
        onClick={() => navigate('overview')}
        aria-label="PropertySE overview"
      >
        <span className="brand-mark">P</span>
        <span className="brand-name">
          Property<span>SE</span>
        </span>
      </button>

      <div className="workspace-switcher">
        <div className="workspace-avatar">PM</div>
        <div className="workspace-copy">
          <span>SELECT COMPANY</span>
          <select
            aria-label="Select company"
            value={companyId}
            onChange={onCompanyChange}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
          <small>{companyId}</small>
        </div>
      </div>

      <div className="nav-label">MANAGEMENT</div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.section}
            type="button"
            className={`nav-item ${activeSection === item.section ? 'active' : ''}`}
            onClick={() => navigate(item.section)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.section === 'properties' && (
              <span className="nav-count">{total}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <div className="help-symbol">✦</div>
          <strong>PropertySE workspace</strong>
          <p>
            Manage your properties, tenants and operations in one place.
          </p>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">PM</div>
          <div className="user-copy">
            <strong>Property Manager</strong>
            <span>{selectedCompany?.name || companyId}</span>
          </div>
          <span className="user-menu">···</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
