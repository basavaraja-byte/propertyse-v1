const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Cannot reach the backend. Check that the API server is running.')
  }

  let data = {}
  try { data = await response.json() } catch { /* non-JSON response */ }
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`)
  }
  return data
}

export const workerApi = {
  getTickets(companyId) {
    return request(`/maintenance-tickets?companyId=${encodeURIComponent(companyId)}`)
  },
  acceptTicket(id, payload) {
    return request(`/maintenance-tickets/${encodeURIComponent(id)}/accept`, {
      method: 'PATCH', body: JSON.stringify(payload),
    })
  },
  updateStatus(id, payload) {
    return request(`/maintenance-tickets/${encodeURIComponent(id)}/status`, {
      method: 'PATCH', body: JSON.stringify(payload),
    })
  },
  getNotes(id, companyId) {
    return request(`/maintenance-tickets/${encodeURIComponent(id)}/notes?companyId=${encodeURIComponent(companyId)}`)
  },
  addNote(id, payload) {
    return request(`/maintenance-tickets/${encodeURIComponent(id)}/notes`, {
      method: 'POST', body: JSON.stringify(payload),
    })
  },
}
