const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

// ── Config ───────────────────────────────────────────────────────────────────
export const config = {
  get: () => request('/config'),
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export const chat = {
  intake: (sessionId, message) =>
    request('/chat/intake', { method: 'POST', body: { sessionId, message } }),
  clearSession: (sessionId) =>
    request(`/chat/session/${sessionId}`, { method: 'DELETE' }),
}

// ── Offers ────────────────────────────────────────────────────────────────────
export const offers = {
  create: (offerData, agentId) =>
    request('/offers', { method: 'POST', body: { offerData, agentId } }),
  list: (agentId, params = {}) =>
    request(`/offers?agent_id=${agentId}&${new URLSearchParams(params)}`),
  get: (id) => request(`/offers/${id}`),
  update: (id, data) => request(`/offers/${id}`, { method: 'PATCH', body: data }),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documents = {
  preview: async (offerData) => {
    const res = await fetch(`${BASE}/documents/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerData }),
    })
    if (!res.ok) throw new Error('Preview failed')
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  },
  generate: (offerId, offerData) =>
    request('/documents/generate', { method: 'POST', body: { offerId, offerData } }),
  send: (offerId, offerData, signers, ccEmails, agentName, agentEmail, smtpUser, smtpPass, mode = 'email') =>
    request('/documents/send', { method: 'POST', body: { offerId, offerData, signers, ccEmails, agentName, agentEmail, smtpUser, smtpPass, mode } }),
  testEmail: (smtpUser, smtpPass) =>
    request('/documents/test-email', { method: 'POST', body: { smtpUser, smtpPass } }),
}

// ── Scripts ───────────────────────────────────────────────────────────────────
export const scripts = {
  generate: (offerId, offerData, agentName) =>
    request('/scripts/generate', { method: 'POST', body: { offerId, offerData, agentName } }),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clients = {
  list: (agentId) => request(`/clients?agent_id=${agentId}`),
  create: (data) => request('/clients', { method: 'POST', body: data }),
}
