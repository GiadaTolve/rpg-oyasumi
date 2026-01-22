import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: baseURL
});

// Intercettore dinamico
api.interceptors.request.use(config => {
  // Leggiamo SEMPRE dal localStorage prima di partire
  const token = localStorage.getItem('gdr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

export default api;