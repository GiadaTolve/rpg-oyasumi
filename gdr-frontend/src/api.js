import axios from 'axios';

// 1. Legge la variabile d'ambiente VITE_API_URL (che imposteremo su Render).
// 2. Se NON la trova (perché siamo in locale), usa 'http://localhost:3000/api'.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Creiamo un'istanza di axios che useremo in tutta l'app
const api = axios.create({
  baseURL: baseURL // Ora usa l'URL dinamico
});

// Questo è l'intercettore: una funzione che si attiva PRIMA di ogni richiesta
api.interceptors.request.use(config => {
  // Recuperiamo il token dal localStorage (il tuo 'gdr_token' è corretto)
  const token = localStorage.getItem('gdr_token');

  // Se il token esiste, lo aggiungiamo all'header 'Authorization'
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, error => {
  return Promise.reject(error);
});

export default api;