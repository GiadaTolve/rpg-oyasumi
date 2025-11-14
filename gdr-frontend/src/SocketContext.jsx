import React, { createContext, useEffect } from 'react';
import { io } from 'socket.io-client';

// 1. Determina l'URL del server WebSocket
// Legge la variabile VITE_API_URL (es. https://rpg-oyasumi.onrender.com/api)
let socketURL = import.meta.env.VITE_API_URL;

if (socketURL) {
  // Dobbiamo rimuovere '/api' dall'URL per la connessione WebSocket
  // https://rpg-oyasumi.onrender.com/api -> https://rpg-oyasumi.onrender.com
  socketURL = socketURL.replace('/api', '');
} else {
  // Se la variabile non c'è, siamo in locale
  socketURL = 'http://localhost:3000';
}

// 2. Creiamo l'istanza del socket con l'URL corretto
const socket = io(socketURL, {
  autoConnect: false, // Non si connette finché non glielo diciamo noi
  reconnection: true,
});

// 3. Creiamo e esportiamo il contesto
export const SocketContext = React.createContext(socket);

// 4. Creiamo il "Provider" che gestirà la connessione
export function SocketProvider({ children }) {
  
  useEffect(() => {
    // Questo si assicura che il token venga letto *dopo* che l'utente ha fatto il login
    // e lo passa al server per l'autenticazione del socket
    socket.auth = { token: localStorage.getItem('gdr_token') };
    socket.connect(); // Ora che abbiamo il token, connettiti.

    // Funzione di pulizia: si disconnette quando il componente viene smontato
    return () => {
      socket.disconnect();
    };
  }, []); // L'array vuoto [] significa "esegui solo una volta, al montaggio"

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}