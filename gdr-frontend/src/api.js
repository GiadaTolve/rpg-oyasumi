import axios from 'axios';

// Creiamo un'istanza di axios che useremo in tutta l'app
const api = axios.create({
  baseURL: 'http://localhost:3000/api' // L'indirizzo base delle nostre API
});

// Questo è l'intercettore: una funzione che si attiva PRIMA di ogni richiesta
api.interceptors.request.use(config => {
  // Recuperiamo il token dal localStorage
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