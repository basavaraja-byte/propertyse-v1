function Topbar({ activeLabel, selectedCompany, companyId }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>{activeLabel}</strong>
      </div>

      <div className="topbar-actions">
        <span className="live-indicator" />
        <span className="live-label">{selectedCompany?.name || companyId}</span>
        <div className="topbar-divider" />
        <div className="topbar-avatar">PM</div>
      </div>
    </header>
  )
}

export default Topbar
