
import { useCallback, useEffect, useState } from 'react'
import './App.css'
import AddUnitModal from './components/unitmodel'
import UnitTable from './components/UnitTable'
import PortfolioSnapshot from './components/PortfolioSnapshot'
import Sidebar from './components/layouts/sidebar'
import Topbar from './components/layouts/topbar'
import { NAV_ITEMS } from './components/layouts/navigation'
import {
  TenantManagement,
  MaintenanceManagement,
  CompanyManagement,
} from './components/modules/ManagementModules'

const API_BASE_URL = 'http://localhost:5000/api'

const DEFAULT_COMPANIES = [
  { id: 'COMP_001', name: 'Sunrise Property Group' },
  { id: 'COMP_002', name: 'BlueSky Estates' },
]

const EMPTY_FORM = {
  propertyName: '',
  buildingNumber: '',
  unitNumber: '',
  annualRent: '',
  status: 'Vacant',
  estimatedRepairCost: '0',
  tenantReady: false,
  estimatedDaysToRent: '30',
}

function App() {
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES)
  const [companyId, setCompanyId] = useState('COMP_001')
  const [formCompanyId, setFormCompanyId] = useState('COMP_001')
  const [properties, setProperties] = useState([])
  const [activeSection, setActiveSection] = useState('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedCompany = companies.find(
    (company) => company.id === companyId
  )

  const loadCompanies = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies`)
      const data = await response.json()

      if (response.ok && Array.isArray(data) && data.length) {
        setCompanies(data)
        setCompanyId((current) =>
          data.some((company) => company.id === current)
            ? current
            : data[0].id
        )
      }
    } catch (error) {
      console.warn('Could not load companies; using default list.', error)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  const loadProperties = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/properties?companyId=${encodeURIComponent(companyId)}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`)
      }

      if (!Array.isArray(data)) {
        throw new Error('Unexpected response from the properties API.')
      }

      setProperties(data)
    } catch (error) {
      console.error('Load properties failed:', error)
      setPageError(
        `Could not load properties: ${error.message}. Check that the backend is running and allows requests from this frontend.`
      )
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    loadProperties()
  }, [loadProperties])

  const total = properties.length
  const vacant = properties.filter((property) => property.status === 'Vacant').length
  const occupied = properties.filter((property) => property.status === 'Occupied').length
  const maintenance = properties.filter(
    (property) => property.status === 'Maintenance'
  ).length

  const vacantProperties = properties.filter(
    (property) => property.status === 'Vacant'
  )

  const getVacancyDays = (property) => {
    if (!property.vacantSince) return 0

    const start = new Date(property.vacantSince).getTime()
    if (!Number.isFinite(start)) return 0

    return Math.max(0, Math.floor((Date.now() - start) / 86400000))
  }

  const rankedVacancies = vacantProperties
    .map((property) => {
      const daysVacant = getVacancyDays(property)
      const monthlyRent = Math.max(0, Number(property.annualRent || 0) / 12)
      const repairCost = Math.max(
        0,
        Number(property.estimatedRepairCost || 0)
      )
      const estimatedDaysToRent = Math.max(
        0,
        Number(property.estimatedDaysToRent ?? 30)
      )
      const tenantReady = Boolean(property.tenantReady)

      const score =
        (tenantReady ? 40 : 0) +
        Math.min(daysVacant, 60) * 0.5 +
        Math.min(monthlyRent / 1000, 30) -
        Math.min(repairCost / 1000, 40) -
        Math.min(estimatedDaysToRent, 60) * 0.25

      return {
        ...property,
        daysVacant,
        monthlyRent,
        repairCost,
        tenantReady,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)

  const topVacancyRecommendation = rankedVacancies[0] || null

  const filteredProperties = properties.filter((property) => {
    const query = search.trim().toLowerCase()

    // Search by unit number, ignoring letter case and surrounding spaces.
    const matchesSearch = String(property.unitNumber || '')
      .toLowerCase()
      .includes(query)

    const matchesStatus =
      statusFilter === 'All' || property.status === statusFilter

    return matchesSearch && matchesStatus
  })

  function handleCompanyChange(event) {
    const nextCompanyId = event.target.value

    setCompanyId(nextCompanyId)
    setProperties([])
    setSearch('')
    setStatusFilter('All')
    setNotice('')
    setPageError('')
    setFormError('')
    setShowForm(false)
  }

  function openForm() {
    setFormCompanyId(companyId)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setShowForm(true)
  }

  function closeForm() {
    if (saving) return
    setShowForm(false)
    setFormError('')
  }

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setFormError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    setNotice('')

    if (!form.propertyName.trim()) {
      setFormError('Enter the property name.')
      return
    }

    if (!form.unitNumber.trim()) {
      setFormError('Enter the unit number.')
      return
    }

    if (
      form.annualRent === '' ||
      !Number.isFinite(Number(form.annualRent)) ||
      Number(form.annualRent) < 0
    ) {
      setFormError('Enter a valid annual rent.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`${API_BASE_URL}/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: formCompanyId,
          propertyName: form.propertyName.trim(),
          buildingNumber: form.buildingNumber.trim(),
          unitNumber: form.unitNumber.trim(),
          annualRent: Number(form.annualRent),
          status: form.status,
          estimatedRepairCost: Number(form.estimatedRepairCost || 0),
          tenantReady: Boolean(form.tenantReady),
          estimatedDaysToRent: Number(form.estimatedDaysToRent || 30),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError(
          data.message || `Could not save property (${response.status}).`
        )
        return
      }

      const savedCompany = companies.find(
        (company) => company.id === formCompanyId
      )

      if (formCompanyId === companyId) {
        await loadProperties()
      } else {
        setCompanyId(formCompanyId)
      }

      setForm({ ...EMPTY_FORM })
      setShowForm(false)
      setActiveSection('properties')
      setNotice(`Property saved to ${savedCompany?.name || formCompanyId}.`)
    } catch (error) {
      console.error('Save property failed:', error)
      setFormError(
        `Could not connect to the backend: ${error.message}. Check the backend and CORS configuration.`
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(propertyId, newStatus) {
    setPageError('')
    setNotice('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/properties/${encodeURIComponent(propertyId)}/status?companyId=${encodeURIComponent(companyId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Update failed (${response.status})`)
      }

      setProperties((current) =>
        current.map((property) =>
          property._id === data._id ? data : property
        )
      )

      setNotice(`Unit ${data.unitNumber} status updated to ${data.status}.`)
    } catch (error) {
      console.error('Status update failed:', error)
      setPageError(error.message || 'Could not update the unit status.')
    }
  }

  const stats = [
    {
      label: 'Total units',
      value: total,
      detail: 'Registered in this company',
      icon: '▦',
      tone: 'blue',
    },
    {
      label: 'Vacant',
      value: vacant,
      detail: 'Available for occupancy',
      icon: '⌂',
      tone: 'green',
    },
    {
      label: 'Occupied',
      value: occupied,
      detail: 'Currently rented',
      icon: '♙',
      tone: 'purple',
    },
    {
      label: 'Maintenance',
      value: maintenance,
      detail: 'Needs attention',
      icon: '⚒',
      tone: 'orange',
    },
  ]

  const activeLabel =
    NAV_ITEMS.find((item) => item.section === activeSection)?.label ||
    'Overview'

  function navigate(section) {
    setActiveSection(section)
    setNotice('')
  }

  return (
    <div className="app-shell">
      <Sidebar
        companies={companies}
        companyId={companyId}
        onCompanyChange={handleCompanyChange}
        activeSection={activeSection}
        navigate={navigate}
        total={total}
        selectedCompany={selectedCompany}
      />

      <main className="main-content">
        <Topbar
          activeLabel={activeLabel}
          selectedCompany={selectedCompany}
          companyId={companyId}
        />

        <div className="page-content">
          {activeSection === 'overview' || activeSection === 'properties' ? (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    {activeSection === 'overview'
                      ? 'WORKSPACE OVERVIEW'
                      : 'PROPERTY MANAGEMENT'}
                  </div>

                  <h1>
                    {activeSection === 'overview'
                      ? 'Good to see you.'
                      : 'Properties & units'}
                  </h1>

                  <p>
                    {activeSection === 'overview'
                      ? `Here is an overview of ${selectedCompany?.name || 'your company'}’s property portfolio.`
                      : `View and manage units registered to ${selectedCompany?.name || 'your company'}.`}
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={openForm}
                  type="button"
                >
                  <span className="button-plus">＋</span>
                  Add Unit
                </button>
              </section>

              {pageError && (
                <div className="alert alert-error" role="alert">
                  <span>{pageError}</span>
                  <button type="button" onClick={loadProperties}>
                    Retry
                  </button>
                </div>
              )}

              {notice && (
                <div className="alert alert-success" role="status">
                  <span>✓</span> {notice}
                  <button
                    type="button"
                    className="alert-dismiss"
                    onClick={() => setNotice('')}
                    aria-label="Dismiss notification"
                  >
                    ×
                  </button>
                </div>
              )}

              <section className="stats-grid" aria-label="Property statistics">
                {stats.map((stat) => (
                  <article className="stat-card" key={stat.label}>
                    <div className="stat-card-top">
                      <span className="stat-label">{stat.label}</span>
                      <span className={`stat-icon ${stat.tone}`}>
                        {stat.icon}
                      </span>
                    </div>

                    <div className="stat-value">
                      {loading ? '—' : stat.value}
                    </div>

                    <div className="stat-detail">
                      <span className={`mini-dot ${stat.tone}`} />
                      {stat.detail}
                    </div>
                  </article>
                ))}
              </section>

              {activeSection === 'overview' && (
                <section className="overview-grid">
                  <PortfolioSnapshot
                    loading={loading}
                    total={total}
                    vacant={vacant}
                    occupied={occupied}
                    maintenance={maintenance}
                    topVacancyRecommendation={topVacancyRecommendation}
                    onViewUnits={() => navigate('properties')}
                  />

                  <article className="panel quick-actions-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Quick actions</h2>
                        <p>Common property tasks</p>
                      </div>
                    </div>

                    <button
                      className="quick-action"
                      type="button"
                      onClick={openForm}
                    >
                      <span className="quick-icon blue">＋</span>
                      <span>
                        <strong>Add a unit</strong>
                        <small>Register one unit at a time</small>
                      </span>
                      <span className="quick-arrow">→</span>
                    </button>

                    <button
                      className="quick-action"
                      type="button"
                      onClick={() => navigate('properties')}
                    >
                      <span className="quick-icon green">▦</span>
                      <span>
                        <strong>View all units</strong>
                        <small>Search and filter properties</small>
                      </span>
                      <span className="quick-arrow">→</span>
                    </button>

                    <button
                      className="quick-action"
                      type="button"
                      onClick={() => navigate('maintenance')}
                    >
                      <span className="quick-icon orange">⚒</span>
                      <span>
                        <strong>Maintenance</strong>
                        <small>Open the maintenance section</small>
                      </span>
                      <span className="quick-arrow">→</span>
                    </button>
                  </article>
                </section>
              )}

              <UnitTable
                properties={properties}
                filteredProperties={filteredProperties}
                loading={loading}
                search={search}
                setSearch={setSearch}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                activeSection={activeSection}
                onAddUnit={openForm}
                onViewAll={() => navigate('properties')}
                onStatusChange={handleStatusChange}
                companyId={companyId}
              />
            </>
          ) : activeSection === 'tenants' ||
            activeSection === 'maintenance' ||
            activeSection === 'companies' ? (
            <>
              <section className="page-heading module-page-heading">
                <div>
                  <div className="eyebrow">PROPERTYSE WORKSPACE</div>
                  <h1>{activeLabel}</h1>
                  <p>
                    {activeSection === 'tenants'
                      ? `Manage tenant details, lease periods and annual rent for ${selectedCompany?.name || companyId}.`
                      : activeSection === 'companies'
                        ? 'Add companies, review registered workspaces, and manage company availability.'
                        : `Raise requests and track maintenance work for ${selectedCompany?.name || companyId}.`}
                  </p>
                </div>
              </section>

              {pageError && (
                <div className="alert alert-error" role="alert">
                  <span>{pageError}</span>
                  <button type="button" onClick={() => setPageError('')}>
                    Dismiss
                  </button>
                </div>
              )}

              {notice && (
                <div className="alert alert-success" role="status">
                  <span>✓</span> {notice}
                  <button
                    type="button"
                    className="alert-dismiss"
                    onClick={() => setNotice('')}
                    aria-label="Dismiss notification"
                  >
                    ×
                  </button>
                </div>
              )}

              {activeSection === 'tenants' && (
                <TenantManagement
                  properties={properties}
                  companyId={companyId}
                  onNotice={setNotice}
                  onError={setPageError}
                  onRefresh={loadProperties}
                />
              )}

              {activeSection === 'maintenance' && (
                <MaintenanceManagement
                  properties={properties}
                  companyId={companyId}
                  onNotice={setNotice}
                  onError={setPageError}
                  onRefreshProperties={loadProperties}
                />
              )}

              {activeSection === 'companies' && (
                <CompanyManagement
                  companies={companies}
                  activeCompanyId={companyId}
                  onCompaniesChanged={async (nextCompanies) => {
                    setCompanies(nextCompanies)

                    if (
                      !nextCompanies.some((company) => company.id === companyId) &&
                      nextCompanies.length
                    ) {
                      setCompanyId(nextCompanies[0].id)
                    }

                    await loadCompanies()
                  }}
                  onNotice={setNotice}
                  onError={setPageError}
                />
              )}
            </>
          ) : (
            <section className="placeholder-page">
              <div className="placeholder-icon">
                {NAV_ITEMS.find((item) => item.section === activeSection)?.icon}
              </div>

              <div className="eyebrow">PROPERTYSE WORKSPACE</div>
              <h1>{activeLabel}</h1>

              <p>
                This section is part of the planned property-management
                workflow. Its data and actions will appear when the
                corresponding backend module is implemented.
              </p>

              <span className="coming-soon">MODULE NOT CONNECTED YET</span>

              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate('overview')}
              >
                ← Back to overview
              </button>
            </section>
          )}

          <footer className="page-footer">
            <span>
              PropertySE <span>©</span> 2026
            </span>
            <span>Property operations, organised.</span>
          </footer>
        </div>
      </main>

      <AddUnitModal
        isOpen={showForm}
        form={form}
        formError={formError}
        saving={saving}
        companyId={formCompanyId}
        companies={companies}
        onCompanyChange={setFormCompanyId}
        onClose={closeForm}
        onSubmit={handleSubmit}
        onChange={updateForm}
        onTenantReadyChange={(checked) => {
          setForm((current) => ({ ...current, tenantReady: checked }))
          setFormError('')
        }}
      />
    </div>
  )
}

export default App
