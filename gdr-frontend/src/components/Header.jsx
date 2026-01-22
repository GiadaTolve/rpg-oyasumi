import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../api';

function Header({ user, onLogout, onToggleGuida, onToggleAmbientazione, onToggleShinigami }) {
  const [activeBanner, setActiveBanner] = useState(null);
  const location = useLocation(); // Per gestire lo stato attivo se serve

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const response = await api.get('/active-banner');
        setActiveBanner(response.data);
      } catch (error) { console.error(error); }
    };
    fetchBanner();
  }, []);

  return (
    <header className="game-header">
      {activeBanner ? (
        <a href={activeBanner.link_url || '#'} target="_blank" rel="noopener noreferrer" className="event-banner-container">
          <img src={activeBanner.image_url} alt={activeBanner.title} className="event-banner-image" />
          <span className="event-banner-title">{activeBanner.title}</span>
        </a>
      ) : (
        <div style={{ width: '300px' }}></div>
      )}

      <div className="title-container">
        <div className="gold-title-effect">Oyasumi</div>
        <p className="header-motto">LA REALTA' E' SOLO UN SOGNO CHE SANGUINA.</p>
      </div>

      <div className="header-actions">
        {/* Usiamo Link con la classe header-btn per uniformità */}
        <Link to="/" className="header-btn">Mappa</Link>
        <button onClick={onToggleGuida} className="header-btn">Guida</button>
        <button onClick={onToggleAmbientazione} className="header-btn">Ambientazione</button>
        <Link to="/forum" className="header-btn">Forum</Link>
        
        {/* Solo Staff */}
        {(['MASTER', 'MOD', 'ADMIN'].includes(user?.permesso)) && (
          <>
            <button onClick={onToggleShinigami} className="header-btn">Shinigami</button>
            <Link to="/gestione" className="header-btn">Gestione</Link>
          </>
        )}
        
        <button onClick={onLogout} className="header-btn" style={{color: '#ff8a8a'}}>Logout</button>
      </div>
    </header>
  );
}

export default Header;