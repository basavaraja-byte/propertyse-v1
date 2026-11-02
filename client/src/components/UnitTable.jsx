
function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
}

export default function UnitTable({
  properties,
  filteredProperties,
  loading,
  hasError = false,
  onRetry,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  activeSection,
  onAddUnit,
  onViewAll,
  onStatusChange,
  companyId,
}) {
  return (
    <section className="panel properties-panel" id="properties">
      <div className="panel-heading properties-heading">
        <div>
          <h2>
            {activeSection === 'overview'
              ? 'Recently registered units'
              : 'All property units'}
          </h2>
          <p>
            {activeSection === 'overview'
              ? 'The latest units saved to your company workspace.'
              : 'Search, filter and manage your registered units.'}
          </p>
        </div>

        {activeSection === 'overview' && (
          <button
            className="subtle-button"
            type="button"
            onClick={onViewAll}
          >
            View all <span>→</span>
          </button>
        )}
      </div>

      <div className="table-toolbar">
        <label className="search-box">
          <span className="search-icon">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by unit number..."
            aria-label="Search by unit number"
          />

          {search && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </label>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter by unit status"
        >
          <option value="All">All statuses</option>
          <option value="Vacant">Vacant</option>
          <option value="Occupied">Occupied</option>
          <option value="Maintenance">Maintenance</option>
        </select>
      </div>

      <div className="table-scroll">
        <table className="properties-table">
          <thead>
            <tr>
              <th>PROPERTY</th>
              <th>BUILDING</th>
              <th>UNIT NUMBER</th>
              <th>ANNUAL RENT</th>
              <th>STATUS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="table-message">
                  <span className="loading-spinner" />
                  Loading property records...
                </td>
              </tr>
            ) : hasError ? (
              <tr>
                <td colSpan="5" className="table-message error-table-message">
                  <div className="empty-icon error-icon" style={{ color: '#E53E3E' }}>⚠</div>
                  <strong>Could not load property records</strong>
                  <p>Check the backend database connection and try again.</p>
                  {onRetry && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={onRetry}
                      style={{ marginTop: '8px' }}
                    >
                      ↻ Retry loading
                    </button>
                  )}
                </td>
              </tr>
            ) : filteredProperties.length === 0 ? (
              <tr>
                <td colSpan="5" className="table-message">
                  <div className="empty-icon">⌂</div>
                  <strong>
                    {search || statusFilter !== 'All'
                      ? 'No matching units found'
                      : 'Your property list is empty'}
                  </strong>
                  <p>
                    {search || statusFilter !== 'All'
                      ? 'Try another search term or status.'
                      : 'Add your first unit to begin building your portfolio.'}
                  </p>

                  {!search && statusFilter === 'All' && (
                    <button
                      className="text-button"
                      type="button"
                      onClick={onAddUnit}
                    >
                      + Add your first unit
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredProperties
                .slice(
                  0,
                  activeSection === 'overview' ? 5 : undefined
                )
                .map((property) => (
                  <tr key={property._id}>
                    <td>
                      <div className="property-cell">
                        <div className="property-avatar">
                          {(property.propertyName || 'P')
                            .trim()
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="property-details">
                          <strong>{property.propertyName}</strong>
                          <span>{property.companyId}</span>
                        </div>
                      </div>
                    </td>

                    <td>{property.buildingNumber || '—'}</td>

                    <td>
                      <span className="unit-chip">
                        {property.unitNumber}
                      </span>
                    </td>

                    <td className="rent-cell">
                      {formatCurrency(property.annualRent)}
                      <span className="rent-period">/ year</span>
                    </td>

                    <td>
                      <select
                        className={`status-badge ${(property.status || 'Vacant').toLowerCase()}`}
                        value={property.status || 'Vacant'}
                        onChange={(event) =>
                          onStatusChange(
                            property._id,
                            event.target.value
                          )
                        }
                        aria-label={`Change status for unit ${property.unitNumber}`}
                      >
                        <option value="Vacant">Vacant</option>
                        <option value="Occupied">Occupied</option>
                        <option value="Maintenance">Maintenance</option>
                      </select>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="table-footer">
        <span>
          Showing{' '}
          <strong>{loading ? '—' : filteredProperties.length}</strong>
          {' '}of{' '}
          <strong>{loading ? '—' : properties.length}</strong> units
        </span>

        <span className="footer-company">
          Company workspace · {companyId}
        </span>
      </footer>
    </section>
  )
}
