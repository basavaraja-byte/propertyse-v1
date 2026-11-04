import { useCallback, useEffect, useRef, useState } from 'react'
import ownerService, {
  DEV_PREVIEW_DATA,
  isDevelopmentPreviewEnabled,
  setDevelopmentPreview,
} from '../../services/ownerService'
import OwnerSidebar from './OwnerSidebar'
import OwnerTopbar from './OwnerTopbar'
import OwnerOverview from './views/OwnerOverview'
import OwnerProperties from './views/OwnerProperties'
import OwnerPropertyDetails from './views/OwnerPropertyDetails'
import OwnerTenants from './views/OwnerTenants'
import OwnerRentalIncome from './views/OwnerRentalIncome'
import OwnerPayments from './views/OwnerPayments'
import OwnerMaintenance from './views/OwnerMaintenance'
import OwnerReports from './views/OwnerReports'
import OwnerNotifications from './views/OwnerNotifications'
import OwnerSettings from './views/OwnerSettings'
import './owner.css'

// Explicitly enable isolated development preview mode ONLY in non-production environments
if (typeof import.meta === 'undefined' || !import.meta.env?.PROD) {
  setDevelopmentPreview(true)
}

const OWNER_SECTIONS_META = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: '⌂' },
  { id: 'properties', label: 'My Properties', icon: '▦' },
  { id: 'property-details', label: 'Property Details', icon: '☵' },
  { id: 'tenants', label: 'Tenants Directory', icon: '♙' },
  { id: 'rental-income', label: 'Rental Income Analytics', icon: '◈' },
  { id: 'payments', label: 'Payments & Payouts', icon: '▤' },
  { id: 'maintenance', label: 'Maintenance Requests', icon: '⚒' },
  { id: 'reports', label: 'Reports & Statements', icon: '☷' },
  { id: 'notifications', label: 'Notifications & Alerts', icon: '◉' },
  { id: 'settings', label: 'Profile & Settings', icon: '⚙' },
]

export default function OwnerDashboard({ onBackToManager } = {}) {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    DEV_PREVIEW_DATA.portfolio[0]?.id || ''
  )
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  // Centralized section data cache & async loading state
  const [sectionData, setSectionData] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const activeRequestIdRef = useRef(0)

  const currentNav = OWNER_SECTIONS_META.find((i) => i.id === activeSection)
  const pageTitle = currentNav ? currentNav.label : 'Dashboard Overview'

  const counts = {
    properties: DEV_PREVIEW_DATA.metrics.totalProperties,
    tenants: DEV_PREVIEW_DATA.metrics.totalTenants,
    maintenance: DEV_PREVIEW_DATA.maintenanceTickets.filter((t) => t.status !== 'Resolved').length,
    notifications: DEV_PREVIEW_DATA.alerts.length,
  }

  const loadSection = useCallback(
    async (section, propertyId = selectedPropertyId, force = false) => {
      const cacheKey = section === 'property-details' ? `property-details:${propertyId}` : section

      if (!force && sectionData[cacheKey]) {
        return
      }

      const currentRequestId = ++activeRequestIdRef.current
      setLoading(true)
      setError('')

      try {
        let data
        const preview = isDevelopmentPreviewEnabled()
        switch (section) {
          case 'dashboard':
            data = await ownerService.getOverview({ preview })
            break
          case 'properties':
            data = await ownerService.getProperties({}, { preview })
            break
          case 'property-details':
            data = await ownerService.getPropertyById(propertyId, { preview })
            break
          case 'tenants':
            data = await ownerService.getTenants({ preview })
            break
          case 'rental-income':
            data = await ownerService.getRentalIncome({ preview })
            break
          case 'payments':
            data = await ownerService.getPayments({ preview })
            break
          case 'maintenance':
            data = await ownerService.getMaintenanceTickets({ preview })
            break
          case 'reports':
            data = await ownerService.getReports({ preview })
            break
          case 'notifications':
            data = await ownerService.getNotifications({ preview })
            break
          case 'settings':
            data = await ownerService.getSettings({ preview })
            break
          default:
            data = null
        }

        // Stale response guard: ensure active request ID matches
        if (activeRequestIdRef.current === currentRequestId) {
          setSectionData((prev) => ({ ...prev, [cacheKey]: data }))
          setLoading(false)
        }
      } catch (err) {
        if (activeRequestIdRef.current === currentRequestId) {
          setError(err.message || 'Failed to load section data')
          setLoading(false)
        }
      }
    },
    [sectionData, selectedPropertyId]
  )

  useEffect(() => {
    let isCancelled = false
    const timer = setTimeout(() => {
      if (!isCancelled) {
        loadSection(activeSection, selectedPropertyId)
      }
    }, 0)
    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [activeSection, selectedPropertyId, loadSection])

  function handleNavigate(section) {
    setActiveSection(section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSelectProperty(propertyId) {
    setSelectedPropertyId(propertyId)
  }

  return (
    <div className="owner-dashboard">
      <OwnerSidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        counts={counts}
        ownerName={DEV_PREVIEW_DATA.ownerProfile.name}
        ownerEmail={DEV_PREVIEW_DATA.ownerProfile.email}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onBackToManager={onBackToManager}
      />

      <div className="owner-dashboard-main">
        <OwnerTopbar
          title={pageTitle}
          ownerName={DEV_PREVIEW_DATA.ownerProfile.name}
          unreadNotifications={DEV_PREVIEW_DATA.alerts.length}
          onToggleMobileMenu={() => setIsMobileNavOpen((prev) => !prev)}
          onNavigate={handleNavigate}
          onBackToManager={onBackToManager}
        />

        <main className="owner-dashboard-content" id="owner-main-content">
          {activeSection === 'dashboard' && (
            <OwnerOverview
              data={sectionData['dashboard'] || DEV_PREVIEW_DATA}
              loading={loading && !sectionData['dashboard']}
              error={error}
              onRetry={() => loadSection('dashboard', selectedPropertyId, true)}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'properties' && (
            <OwnerProperties
              portfolio={sectionData['properties'] || DEV_PREVIEW_DATA.portfolio}
              loading={loading && !sectionData['properties']}
              error={error}
              onRetry={() => loadSection('properties', selectedPropertyId, true)}
              onSelectProperty={handleSelectProperty}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'property-details' && (
            <OwnerPropertyDetails
              portfolio={sectionData['properties'] || DEV_PREVIEW_DATA.portfolio}
              maintenanceTickets={
                sectionData[`property-details:${selectedPropertyId}`]?.maintenanceTickets ||
                DEV_PREVIEW_DATA.maintenanceTickets
              }
              selectedPropertyId={selectedPropertyId}
              loading={loading && !sectionData[`property-details:${selectedPropertyId}`]}
              error={error}
              onRetry={() => loadSection('property-details', selectedPropertyId, true)}
              onSelectProperty={handleSelectProperty}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'tenants' && (
            <OwnerTenants
              tenants={sectionData['tenants']}
              portfolio={sectionData['properties'] || DEV_PREVIEW_DATA.portfolio}
              loading={loading && !sectionData['tenants']}
              error={error}
              onRetry={() => loadSection('tenants', selectedPropertyId, true)}
              onSelectProperty={handleSelectProperty}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'rental-income' && (
            <OwnerRentalIncome
              incomeData={sectionData['rental-income']}
              portfolio={sectionData['properties'] || DEV_PREVIEW_DATA.portfolio}
              loading={loading && !sectionData['rental-income']}
              error={error}
              onRetry={() => loadSection('rental-income', selectedPropertyId, true)}
            />
          )}

          {activeSection === 'payments' && (
            <OwnerPayments
              paymentsData={sectionData['payments']}
              portfolio={sectionData['properties'] || DEV_PREVIEW_DATA.portfolio}
              loading={loading && !sectionData['payments']}
              error={error}
              onRetry={() => loadSection('payments', selectedPropertyId, true)}
            />
          )}

          {activeSection === 'maintenance' && (
            <OwnerMaintenance
              maintenanceTickets={sectionData['maintenance'] || DEV_PREVIEW_DATA.maintenanceTickets}
              loading={loading && !sectionData['maintenance']}
              error={error}
              onRetry={() => loadSection('maintenance', selectedPropertyId, true)}
            />
          )}

          {activeSection === 'reports' && (
            <OwnerReports
              reportsData={sectionData['reports']}
              portfolio={sectionData['properties'] || DEV_PREVIEW_DATA.portfolio}
              ownerProfile={sectionData['reports']?.owner || DEV_PREVIEW_DATA.ownerProfile}
              loading={loading && !sectionData['reports']}
              error={error}
              onRetry={() => loadSection('reports', selectedPropertyId, true)}
            />
          )}

          {activeSection === 'notifications' && (
            <OwnerNotifications
              alerts={sectionData['notifications'] || DEV_PREVIEW_DATA.alerts}
              loading={loading && !sectionData['notifications']}
              error={error}
              onRetry={() => loadSection('notifications', selectedPropertyId, true)}
              onNavigate={handleNavigate}
              onSelectProperty={handleSelectProperty}
            />
          )}

          {activeSection === 'settings' && (
            <OwnerSettings
              settingsData={sectionData['settings']}
              ownerProfile={sectionData['settings']?.profile || DEV_PREVIEW_DATA.ownerProfile}
              loading={loading && !sectionData['settings']}
              error={error}
              onRetry={() => loadSection('settings', selectedPropertyId, true)}
            />
          )}
        </main>

        <footer className="owner-dashboard-footer owner-no-print">
          <span>PropertySE Owner Portal · © 2026</span>
          <span className="owner-footer-note">Isolated Feature Branch: <code>feature-owner</code></span>
        </footer>
      </div>
    </div>
  )
}
