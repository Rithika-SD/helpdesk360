const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('helpdesk_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error(`Unable to connect to HelpDesk API at ${API_BASE}. Please verify the backend server is running.`);
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { error: await response.text() };
  }

  if (!response.ok) {
    if (response.status === 401 && endpoint !== '/auth/login') {
      localStorage.removeItem('helpdesk_token');
      localStorage.removeItem('helpdesk_user');
      window.dispatchEvent(new Event('auth-expired'));
    }
    const message = data.error || (data.details ? Object.values(data.details).join(' ') : 'An unexpected error occurred.');
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Tickets
  getTickets: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.category) params.set('category', filters.category);
    if (filters.sort) params.set('sort', filters.sort);
    const queryString = params.toString();
    return request(`/tickets${queryString ? `?${queryString}` : ''}`);
  },
  getTicket: (id) => request(`/tickets/${id}`),
  createTicket: (payload) => request('/tickets', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  assignTicket: (ticketId, assignedTo) => request(`/tickets/${ticketId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ assigned_to: assignedTo })
  }),
  updateTicketStatus: (ticketId, status) => request(`/tickets/${ticketId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  getTicketHistory: (ticketId) => request(`/tickets/${ticketId}/history`),

  // Technicians
  getTechnicians: () => request('/technicians'),

  // Dashboard
  getStats: () => request('/dashboard/stats')
};
