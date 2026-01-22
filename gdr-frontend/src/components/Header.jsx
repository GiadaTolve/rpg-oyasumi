import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function Header({ user, onLogout, onToggleGuida, onToggleAmbientazione, onToggleShinigami }) {
  const [activeBanner, setActiveBanner] = useState(null);

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await api.get('/active-banner');
        setActiveBanner(response.data);
      } catch (error) {
        console.error("Errore nel caricare il banner:", error);
      }
    };

    fetchBanner();
  }, []);

  return (
    <header className="game-header">
      {/* --- BANNER EVENTO --- */}
      {activeBanner ? (
        <a href={activeBanner.link_url || '#'} target="_blank" rel="noopener noreferrer" className="event-banner-container">
          <img src={activeBanner.image_url} alt={activeBanner.title} className="event-banner-image" />
          <span className="event-banner-title">{activeBanner.title}</span>
        </a>
      ) : (
        <div style={{ width: '300px' }}></div> 
      )}

      {/* --- TITOLO CENTRALE --- */}
      <div className="title-container">
        <div className="gold-title-effect">Oyasumi</div>
        <p className="header-motto">LA REALTA' E' SOLO UN SOGNO CHE SANGUINA.</p>
      </div>

      {/* --- AZIONI HEADER (TUTTI STILIZZATI COME BOTTONI) --- */}
      <div className="header-actions">
        {/* Link Mappa: ora usa la classe header-btn per non sembrare un hyperlink */}
        <Link to="/" className="header-btn">
          Mappa
        </Link>
        
        {/* Guida e Ambientazione (Bottoni per finestre flottanti) */}
        <button onClick={onToggleGuida} className="header-btn">
          Guida
        </button>
        <button onClick={onToggleAmbientazione} className="header-btn">
          Ambientazione
        </button>

        {/* Link Forum: stilizzato come bottone */}
        <Link to="/forum" className="header-btn">
          Forum
        </Link>
        
        {/* Sezione Staff */}
        {(['MASTER', 'MOD', 'ADMIN'].includes(user?.permesso)) && (
          <>
            <button onClick={onToggleShinigami} className="header-btn">
              Shinigami
            </button>
            <Link to="/gestione" className="header-btn">
              Gestione
            </Link>
          </>
        )}
        
        {/* Logout con stile rosso per pericolo */}
        <button onClick={onLogout} className="header-btn" style={{ borderColor: 'rgba(255, 42, 42, 0.4)', color: '#ff8a8a' }}>
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;