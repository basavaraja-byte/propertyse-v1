/**
 * =============================================================================
 * PropertySE - Centralized Owner API Service
 * =============================================================================
 * Provides a standardized client abstraction for querying the PropertySE
 * Owner Dashboard REST endpoints (/api/owner/*).
 *
 * Security & Architecture Policies:
 * 1. Native Fetch: Uses the browser native Fetch API with robust error handling.
 * 2. Safe Parsing: Handles non-JSON, empty, and network error responses cleanly.
 * 3. Auth Token Integration: Accepts an optional Bearer token supplied by the
 *    future central authentication module. Live calls fail closed with 401
 *    (AUTH_REQUIRED) if unauthenticated.
 * 4. Explicit Preview Mode: Development preview data is strictly opt-in and
 *    never serves as a silent fallback for failed live calls.
 * =============================================================================
 */

const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

/**
 * Isolated development preview dataset.
 * Preserved from Step 3/Step 4 UI evaluations.
 */
export const DEV_PREVIEW_DATA = Object.freeze({
  isDevelopmentPreview: true,
  metrics: {
    totalProperties: 3,
    occupiedProperties: 2,
    vacantProperties: 1,
    maintenanceProperties: 0,
    totalTenants: 2,
    grossAnnualRent: 248000,
  },
  portfolio: [
    {
      id: 'prop-101',
      unitNumber: 'Flat 101',
      propertyName: 'Al Noor Tower',
      buildingNumber: 'Building A',
      status: 'Occupied',
      tenantName: 'Chandan Kumar N',
      tenantPhone: '+91 8722743739',
      tenantEmail: 'chandan@example.com',
      leaseStartDate: '2026-11-02',
      leaseEndDate: '2030-01-01',
      annualRent: 8000,
      estimatedRepairCost: 0,
      tenantReady: true,
      estimatedDaysToRent: 30,
    },
    {
      id: 'prop-102',
      unitNumber: 'Flat 102',
      propertyName: 'Al Noor Tower',
      buildingNumber: 'Building A',
      status: 'Occupied',
      tenantName: 'Misbah Khanum',
      tenantPhone: '+91 9880123456',
      tenantEmail: 'misbah@example.com',
      leaseStartDate: '2024-07-01',
      leaseEndDate: '2027-06-30',
      annualRent: 120000,
      estimatedRepairCost: 0,
      tenantReady: true,
      estimatedDaysToRent: 30,
    },
    {
      id: 'prop-105',
      unitNumber: 'Flat 105',
      propertyName: 'Al Noor Tower',
      buildingNumber: 'Building A',
      status: 'Vacant',
      tenantName: '',
      tenantPhone: '',
      tenantEmail: '',
      leaseStartDate: null,
      leaseEndDate: null,
      annualRent: 120000,
      estimatedRepairCost: 0,
      tenantReady: true,
      estimatedDaysToRent: 30,
    },
  ],
  maintenanceTickets: [
    {
      id: 'aa853c69',
      propertyId: 'prop-102',
      unitNumber: 'Flat 102',
      tenantName: 'Misbah Khanum',
      category: 'Cleaning',
      priority: 'Urgent',
      status: 'Resolved',
      description: 'Flat is very dirty, Please clean it asap',
      createdAt: '2026-10-27T09:59:39.181Z',
      updatedAt: '2026-10-27T10:00:25.630Z',
    },
  ],
  alerts: [
    {
      id: 'alert-1',
      severity: 'warning',
      title: 'Flat 105 Available for Tenancy',
      message: 'Unit 105 has been marked Vacant. Management has listed it for prospective tenants.',
      action: 'Review unit listing',
      type: 'vacancy',
      propertyId: 'prop-105',
    },
    {
      id: 'alert-2',
      severity: 'info',
      title: 'Quarterly Disbursement Forecast',
      message: 'Next automated rental reconciliation is scheduled for end of month.',
      action: 'View schedule',
      type: 'financial',
    },
  ],
  ownerProfile: {
    id: 'OWN_001',
    name: 'Rajesh Sharma',
    email: 'rajesh.owner@propertyse.com',
    phone: '+91 98765 43210',
    unitsOwned: 3,
    managementCompany: 'Sunrise Property Group',
    bankName: 'HDFC Bank',
    accountNumberMasked: '•••• •••• •••• 4892',
  },
})

// Module-level in-memory token storage (never written to localStorage or window)
let activeAuthToken = null

// Configurable development preview mode flag
let devPreviewEnabled = false

/**
 * Configure whether development preview mode is enabled.
 * Must be explicitly enabled in non-production environments.
 *
 * @param {boolean} enabled
 */
export function setDevelopmentPreview(enabled) {
  // Production safety guard: Never allow development preview mode to be enabled in production builds
  const isProduction =
    typeof import.meta !== 'undefined' && Boolean(import.meta.env?.PROD)
  if (isProduction && enabled) {
    devPreviewEnabled = false
    return
  }
  devPreviewEnabled = Boolean(enabled)
}

/**
 * Check whether development preview mode is active.
 *
 * @returns {boolean}
 */
export function isDevelopmentPreviewEnabled() {
  return devPreviewEnabled
}

/**
 * Retrieve the isolated development preview dataset.
 *
 * @returns {object} Deep clone of DEV_PREVIEW_DATA
 */
export function getPreviewData() {
  return JSON.parse(JSON.stringify(DEV_PREVIEW_DATA))
}

/**
 * Configure the active Bearer token for future Owner API requests.
 *
 * @param {string|null} token
 */
export function setAuthToken(token) {
  activeAuthToken = typeof token === 'string' && token.trim() ? token.trim() : null
}

/**
 * Retrieve the current active authentication token.
 *
 * @returns {string|null}
 */
export function getAuthToken() {
  return activeAuthToken
}

/**
 * Clear the active authentication token.
 */
export function clearAuthToken() {
  activeAuthToken = null
}

/**
 * Format a standardized error object from an HTTP or network failure.
 *
 * @param {string} message
 * @param {number} status
 * @param {string} code
 * @param {any} raw
 * @returns {Error & { status: number, code: string, raw: any }}
 */
function createApiError(message, status = 500, code = 'API_ERROR', raw = null) {
  const error = new Error(message)
  error.status = status
  error.code = code
  error.raw = raw
  return error
}

/**
 * Core HTTP request handler for the Owner API.
 *
 * @param {string} endpoint - Relative path (e.g., '/owner/overview')
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.headers]
 * @param {any} [options.body]
 * @param {object} [options.params] - URL query parameters
 * @param {string} [options.token] - Explicit token override
 * @param {boolean} [options.preview] - Explicit request for preview data
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body = null,
    params = null,
    token = null,
    preview = false,
  } = options

  // Handle explicit preview requests without network calls
  if (preview || (devPreviewEnabled && !token && !activeAuthToken)) {
    return handlePreviewRequest(endpoint, params)
  }

  // Resolve authorization token
  const effectiveToken = token || activeAuthToken

  // Fail closed if unauthenticated for a live API request
  if (!effectiveToken) {
    throw createApiError(
      'Authentication required: Please sign in to access the owner portal.',
      401,
      'AUTH_REQUIRED'
    )
  }

  // Build full URL with query parameters
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  let url = `${API_BASE_URL}${cleanEndpoint}`

  if (params && typeof params === 'object') {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val))
      }
    })
    const qs = searchParams.toString()
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs
    }
  }

  // Assemble request headers
  const requestHeaders = {
    Accept: 'application/json',
    Authorization: `Bearer ${effectiveToken}`,
    ...headers,
  }

  let requestBody = body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json'
    requestBody = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
    })
  } catch (networkError) {
    throw createApiError(
      `Network error connecting to PropertySE API: ${networkError.message}`,
      0,
      'NETWORK_ERROR',
      networkError
    )
  }

  // Safely parse JSON or handle plain-text / HTML responses
  const contentType = response.headers.get('content-type') || ''
  let responseData

  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json()
    } catch (parseError) {
      throw createApiError(
        'Failed to parse server JSON response.',
        response.status,
        'PARSE_ERROR',
        parseError
      )
    }
  } else {
    // Non-JSON response (e.g. proxy HTML error)
    const text = await response.text().catch(() => '')
    responseData = { message: text || `HTTP ${response.status} ${response.statusText}` }
  }

  // Reject on non-2xx status codes
  if (!response.ok) {
    const message =
      responseData?.message ||
      responseData?.error ||
      `Owner API request failed with status ${response.status}`

    const code =
      responseData?.code ||
      (response.status === 401
        ? 'UNAUTHORIZED'
        : response.status === 403
        ? 'FORBIDDEN'
        : response.status === 404
        ? 'NOT_FOUND'
        : 'API_ERROR')

    throw createApiError(message, response.status, code, responseData)
  }

  return responseData
}

/**
 * Route explicit preview requests to the isolated DEV_PREVIEW_DATA mock.
 */
function handlePreviewRequest(endpoint, params) {
  const clean = endpoint.replace(/^\/owner\/?/, '')

  switch (clean) {
    case 'overview':
      return Promise.resolve({
        summary: {
          totalProperties: DEV_PREVIEW_DATA.metrics.totalProperties,
          occupiedUnits: DEV_PREVIEW_DATA.metrics.occupiedProperties,
          vacantUnits: DEV_PREVIEW_DATA.metrics.vacantProperties,
          maintenanceUnits: DEV_PREVIEW_DATA.metrics.maintenanceProperties,
          occupancyRate: Math.round(
            (DEV_PREVIEW_DATA.metrics.occupiedProperties /
              DEV_PREVIEW_DATA.metrics.totalProperties) *
              100
          ),
          monthlyExpectedRent: Math.round(DEV_PREVIEW_DATA.metrics.grossAnnualRent / 12),
          annualExpectedRent: DEV_PREVIEW_DATA.metrics.grossAnnualRent,
          activeTenantsCount: DEV_PREVIEW_DATA.metrics.totalTenants,
          openTicketsCount: DEV_PREVIEW_DATA.maintenanceTickets.filter(
            (t) => t.status !== 'Resolved'
          ).length,
        },
        recentProperties: DEV_PREVIEW_DATA.portfolio.slice(0, 5),
        isDevelopmentPreview: true,
      })

    case 'properties': {
      let list = [...DEV_PREVIEW_DATA.portfolio]
      if (params?.status && params.status !== 'All') {
        list = list.filter((p) => p.status === params.status)
      }
      if (params?.search) {
        const q = String(params.search).toLowerCase()
        list = list.filter(
          (p) =>
            p.propertyName.toLowerCase().includes(q) ||
            p.unitNumber.toLowerCase().includes(q) ||
            p.tenantName.toLowerCase().includes(q)
        )
      }
      return Promise.resolve(list)
    }

    case 'tenants':
      return Promise.resolve(
        DEV_PREVIEW_DATA.portfolio
          .filter((p) => p.tenantName)
          .map((p) => ({
            propertyId: p.id,
            unitNumber: p.unitNumber,
            propertyName: p.propertyName,
            fullName: p.tenantName,
            phone: p.tenantPhone,
            email: p.tenantEmail,
            leaseStartDate: p.leaseStartDate,
            leaseEndDate: p.leaseEndDate,
            monthlyRent: Math.round(p.annualRent / 12),
          }))
      )

    case 'financials/income':
      return Promise.resolve({
        projections: {
          totalPotentialAnnual: DEV_PREVIEW_DATA.metrics.grossAnnualRent,
          totalPotentialMonthly: Math.round(DEV_PREVIEW_DATA.metrics.grossAnnualRent / 12),
        },
        unitsBreakdown: DEV_PREVIEW_DATA.portfolio,
      })

    case 'financials/payments':
      return Promise.resolve({
        payoutAccount: {
          bankName: DEV_PREVIEW_DATA.ownerProfile.bankName,
          accountNumberMasked: DEV_PREVIEW_DATA.ownerProfile.accountNumberMasked,
          isConfigured: true,
        },
        schedule: 'Monthly (1st of each month)',
        gatewayStatus: 'Payment gateway integration pending - no historical payouts recorded',
        transactions: [],
      })

    case 'maintenance':
      return Promise.resolve(DEV_PREVIEW_DATA.maintenanceTickets)

    case 'reports':
      return Promise.resolve({
        generatedAt: new Date().toISOString(),
        owner: DEV_PREVIEW_DATA.ownerProfile,
        portfolioMetrics: DEV_PREVIEW_DATA.metrics,
        units: DEV_PREVIEW_DATA.portfolio,
      })

    case 'notifications':
      return Promise.resolve(DEV_PREVIEW_DATA.alerts)

    case 'settings':
      return Promise.resolve({
        profile: DEV_PREVIEW_DATA.ownerProfile,
        payoutAccount: {
          bankName: DEV_PREVIEW_DATA.ownerProfile.bankName,
          accountNumberMasked: DEV_PREVIEW_DATA.ownerProfile.accountNumberMasked,
          isConfigured: true,
        },
        preferences: {
          emailNotifications: true,
          smsAlerts: false,
          monthlyReports: true,
        },
      })

    default:
      // Match /properties/:id
      if (clean.startsWith('properties/')) {
        const id = clean.split('/')[1]
        const property = DEV_PREVIEW_DATA.portfolio.find((p) => p.id === id)
        if (!property) {
          throw createApiError('Property not found in portfolio.', 404, 'NOT_FOUND')
        }
        return Promise.resolve({
          property,
          maintenanceTickets: DEV_PREVIEW_DATA.maintenanceTickets.filter(
            (t) => t.propertyId === id
          ),
        })
      }
      throw createApiError(`Unknown preview endpoint: ${endpoint}`, 404, 'NOT_FOUND')
  }
}

// =============================================================================
// PUBLIC OWNER API SERVICE METHODS
// =============================================================================

/**
 * 1. Fetch High-level Portfolio Overview and KPIs
 * @param {object} [options]
 * @returns {Promise<{ summary: object, recentProperties: Array }>}
 */
export async function getOverview(options = {}) {
  return request('/owner/overview', { method: 'GET', ...options })
}

/**
 * 2. Fetch Owner Portfolio Properties with optional filters
 * @param {object} [filters]
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getProperties(filters = {}, options = {}) {
  const { status, search, ...restOptions } = options
  const params = {
    status: filters.status || status,
    search: filters.search || search,
  }
  return request('/owner/properties', { method: 'GET', params, ...restOptions })
}

/**
 * 3. Fetch Single Property Specification and Maintenance Logs
 * @param {string} propertyId
 * @param {object} [options]
 * @returns {Promise<{ property: object, maintenanceTickets: Array }>}
 */
export async function getPropertyById(propertyId, options = {}) {
  if (!propertyId) {
    throw createApiError('propertyId is required.', 400, 'BAD_REQUEST')
  }
  return request(`/owner/properties/${encodeURIComponent(propertyId)}`, {
    method: 'GET',
    ...options,
  })
}

/**
 * 4. Fetch Directory of Active Residents / Tenants
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getTenants(options = {}) {
  return request('/owner/tenants', { method: 'GET', ...options })
}

/**
 * 5. Fetch Rental Income Projections and Yield Analysis
 * @param {object} [options]
 * @returns {Promise<{ projections: object, unitsBreakdown: Array }>}
 */
export async function getRentalIncome(options = {}) {
  return request('/owner/financials/income', { method: 'GET', ...options })
}

/**
 * 6. Fetch Payout Coordinates and Disbursement History
 * @param {object} [options]
 * @returns {Promise<{ payoutAccount: object|null, schedule: string, transactions: Array }>}
 */
export async function getPayments(options = {}) {
  return request('/owner/financials/payments', { method: 'GET', ...options })
}

/**
 * 7. Fetch Maintenance Work Orders and Status Logs
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getMaintenanceTickets(options = {}) {
  return request('/owner/maintenance', { method: 'GET', ...options })
}

/**
 * 8. Fetch Executive Portfolio Statement Data for Reports
 * @param {object} [options]
 * @returns {Promise<{ generatedAt: string, owner: object, portfolioMetrics: object, units: Array }>}
 */
export async function getReports(options = {}) {
  return request('/owner/reports', { method: 'GET', ...options })
}

/**
 * 9. Fetch Lease Expirations and Vacancy Notifications
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function getNotifications(options = {}) {
  return request('/owner/notifications', { method: 'GET', ...options })
}

/**
 * 10. Fetch Authenticated Owner Profile and Preferences
 * @param {object} [options]
 * @returns {Promise<{ profile: object, payoutAccount: object|null, preferences: object }>}
 */
export async function getSettings(options = {}) {
  return request('/owner/settings', { method: 'GET', ...options })
}

// Default export consolidating all methods
const ownerService = {
  DEV_PREVIEW_DATA,
  setDevelopmentPreview,
  isDevelopmentPreviewEnabled,
  getPreviewData,
  setAuthToken,
  getAuthToken,
  clearAuthToken,
  getOverview,
  getProperties,
  getPropertyById,
  getTenants,
  getRentalIncome,
  getPayments,
  getMaintenanceTickets,
  getReports,
  getNotifications,
  getSettings,
}

export default ownerService
