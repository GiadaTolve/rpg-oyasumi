import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { SocketContext } from './SocketContext.jsx';
import { MessagingProvider } from './components/MessagingContext';
import AuthPage from './components/AuthPage.jsx';
import GameLayout from './components/GameLayout.jsx';
import Gestione from './components/Gestione.jsx';
import MapContent from './components/MapContent.jsx';
import Forum from './components/Forum.jsx';
import BachecaPage from './components/BachecaPage.jsx'; 
import TopicPage from './components/TopicPage.jsx';   
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('gdr_token'));
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // Stato per gestire il caricamento iniziale
  const socket = useContext(SocketContext);

  const handleLogout = () => {
    localStorage.removeItem('gdr_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const decodedUser = jwtDecode(token);
          setUser(decodedUser);
          
          // Configura e connetti il socket
          socket.auth = { token };
          if (!socket.connected) {
            socket.connect();
          }
        } catch (error) {
          console.error("Token non valido, logout in corso:", error);
          handleLogout();
        }
      }
      // Una volta finito il controllo (sia che ci sia il token sia che no), rimuoviamo il loading
      setIsAuthChecking(false);
    };

    initializeAuth();

    return () => {
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, [token, socket]);

  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('gdr_token', newToken);
    setToken(newToken);
  };

  // Fondamentale: durante il refresh, se stiamo ancora leggendo il token, 
  // non renderizziamo le rotte per evitare redirect errati alla login.
  if (isAuthChecking) {
    return (
      <div style={{ 
        backgroundColor: '#050508', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#a270ff',
        fontFamily: "'Cinzel', serif"
      }}>
        CARICAMENTO...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          {!token ? (
            <Route path="*" element={<AuthPage onLoginSuccess={handleLoginSuccess} />} />
          ) : (
            <Route 
              path="/" 
              element={
                <MessagingProvider>
                  <GameLayout user={user} onLogout={handleLogout} />
                </MessagingProvider>
              }
            >
              {/* Contenuto di default: Mappa */}
              <Route index element={<MapContent />} />
              
              {/* Pannello Gestione: Accesso solo per Staff */}
              <Route path="gestione" element={
                (['MOD', 'ADMIN', 'MASTER'].includes(user?.permesso)) ? 
                  <Gestione user={user} /> : 
                  <Navigate to="/" replace />
              } />

              {/* --- SISTEMA FORUM --- */}
              <Route path="forum" element={<Forum />} />
              <Route path="forum/bacheca/:bachecaId" element={<BachecaPage user={user} />} />
              <Route path="forum/topic/:topicId" element={<TopicPage user={user} />} />
              
              {/* Fallback per rotte inesistenti (quando loggato) */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;