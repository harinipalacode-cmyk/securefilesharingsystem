const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('secureshare_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('secureshare_token', token);
  } else {
    localStorage.removeItem('secureshare_token');
  }
}

export async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = options.headers ? { ...options.headers } : {};

  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  // If not FormData, default to application/json
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // If not on login endpoint, could be expired token
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      setAuthToken(null);
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  // Handle file download
  const contentType = response.headers.get('content-type');
  if (response.ok && options.responseType === 'blob') {
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition');
    let filename = 'download';
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const matches = /filename="?([^"]+)"?/.exec(disposition);
      if (matches && matches[1]) filename = matches[1];
    }
    return { blob, filename, sha256: response.headers.get('x-integrity-sha256') };
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = data.error || data.detail || (typeof data === 'object' ? JSON.stringify(data) : 'An error occurred');
    const err = new Error(errorMessage);
    err.data = data;
    err.status = response.status;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login/', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => apiRequest('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => apiRequest('/auth/logout/', { method: 'POST' }),
  getMe: () => apiRequest('/auth/me/'),
  setActiveOrg: (orgId) => apiRequest('/auth/active-org/', { method: 'POST', body: JSON.stringify({ organization_id: orgId }) }),
  getUsers: (search = '') => apiRequest(`/auth/users/?search=${encodeURIComponent(search)}`),

  // Organizations
  getOrganizations: (verifiedOnly = false) => apiRequest(`/organizations/?verified=${verifiedOnly}`),
  getOrganization: (id) => apiRequest(`/organizations/${id}/`),
  createOrganization: (data) => apiRequest('/organizations/', { method: 'POST', body: JSON.stringify(data) }),
  getOrgMembers: (orgId) => apiRequest(`/organizations/${orgId}/members/`),
  addOrgMember: (orgId, data) => apiRequest(`/organizations/${orgId}/members/`, { method: 'POST', body: JSON.stringify(data) }),
  verifyOrganization: (orgId, notes = '') => apiRequest(`/organizations/${orgId}/verify/`, { method: 'POST', body: JSON.stringify({ notes }) }),

  // Documents
  getDocuments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/documents/?${query}`);
  },
  getDocument: (id) => apiRequest(`/documents/${id}/`),
  uploadDocument: (formData) => apiRequest('/documents/', { method: 'POST', body: formData }),
  updateDocument: (id, data) => apiRequest(`/documents/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveDocument: (id) => apiRequest(`/documents/${id}/`, { method: 'DELETE' }),
  downloadDocument: (id, versionId = null) => {
    const url = `/documents/${id}/download/${versionId ? `?version_id=${versionId}` : ''}`;
    return apiRequest(url, { method: 'GET', responseType: 'blob' });
  },
  uploadNewVersion: (id, formData) => apiRequest(`/documents/${id}/versions/`, { method: 'POST', body: formData }),
  verifyIntegrity: (id) => apiRequest(`/documents/${id}/integrity-check/`, { method: 'POST' }),

  // Sharing
  getShares: (view = 'received', status = '') => apiRequest(`/sharing/?view=${view}&status=${status}`),
  getShare: (id) => apiRequest(`/sharing/${id}/`),
  createShare: (data) => apiRequest('/sharing/', { method: 'POST', body: JSON.stringify(data) }),
  acceptShare: (id) => apiRequest(`/sharing/${id}/accept/`, { method: 'POST' }),
  rejectShare: (id) => apiRequest(`/sharing/${id}/reject/`, { method: 'POST' }),
  revokeShare: (id, reason = '') => apiRequest(`/sharing/${id}/revoke/`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getAccessRequests: () => apiRequest('/sharing/requests/'),
  createAccessRequest: (data) => apiRequest('/sharing/requests/', { method: 'POST', body: JSON.stringify(data) }),
  reviewAccessRequest: (id, decision, notes = '') => apiRequest(`/sharing/requests/${id}/review/`, { method: 'POST', body: JSON.stringify({ decision, notes }) }),

  // Approvals
  getApprovals: (status = '') => apiRequest(`/approvals/?status=${status}`),
  decideApproval: (id, decision, notes = '') => apiRequest(`/approvals/${id}/decide/`, { method: 'POST', body: JSON.stringify({ decision, notes }) }),

  // Security Center
  getSecurityAlerts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/security/alerts/?${query}`);
  },
  resolveSecurityAlert: (id, notes = '') => apiRequest(`/security/alerts/${id}/resolve/`, { method: 'POST', body: JSON.stringify({ notes }) }),
  getSecurityMetrics: () => apiRequest('/security/metrics/'),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/audit/?${query}`);
  },

  // Notifications
  getNotifications: (unreadOnly = false) => apiRequest(`/notifications/?unread=${unreadOnly}`),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read/`, { method: 'POST' }),
  markAllNotificationsRead: () => apiRequest('/notifications/mark-all-read/', { method: 'POST' }),
  getUnreadCount: () => apiRequest('/notifications/unread-count/'),
};
