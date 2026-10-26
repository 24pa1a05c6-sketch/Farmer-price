import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor: Attach stored token in Authorization header as fallback to cookies
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('kisansetu_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (res.data?.token) {
      localStorage.setItem('kisansetu_token', res.data.token);
    }
    return res;
  },
  register: async (payload) => {
    const res = await api.post('/auth/register', payload);
    if (res.data?.token) {
      localStorage.setItem('kisansetu_token', res.data.token);
    }
    return res;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('kisansetu_token');
    }
  },
  me: () => api.get('/auth/me')
};

export const priceService = {
  getPrices: (params) => api.get('/prices', { params }),
  getLatest: (params) => api.get('/prices/latest', { params }),
  getHistory: (params) => api.get('/prices/history', { params }),
  compareBestMarkets: (payload) => api.post('/prices/compare', payload),
  createObservation: (payload) => api.post('/prices', payload),
  importCsvRows: (payload) => api.post('/prices/import', payload)
};

export const alertService = {
  getAlerts: () => api.get('/alerts'),
  createAlert: (payload) => api.post('/alerts', payload),
  updateAlert: (id, payload) => api.put(`/alerts/${id}`, payload),
  deleteAlert: (id) => api.delete(`/alerts/${id}`)
};

export default api;
