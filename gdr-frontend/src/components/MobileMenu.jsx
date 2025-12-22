import React from 'react';
import { Link } from 'react-router-dom';

function MobileMenu({ 
  isOpen, 
  onClose, 
  user, 
  onLogout, 
  // Dati per la "Mappa a Tendina"
  currentMapName,
  mapChildren, 
  onZoneClick,
  onGoBack,
  // Toggle per le finestre
  onToggleGuida,
  onToggleAmbientazione,
  onToggleShinigami
}) {
  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed', top: 0, left: 0, width: '100%', height: 'calc(100% - 60px)', // Lascia spazio al Dock
      backgroundColor: 'rgba(5, 5, 8, 0.98)', zIndex: 900,
      display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box',
      overflowY: 'auto', backdropFilter: 'blur(5px)'
    },
    section: { marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' },
    title: { 
      fontFamily: "'Cinzel', serif", color: '#c9a84a', fontSize: '18px', 
      marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' 
    },
    btnGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
    bigBtn: {
      padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(162, 112, 255, 0.2)',
      borderRadius: '8px', color: '#b3b3c0', fontFamily: "'Inter', sans-serif", fontSize: '14px',
      cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '5px'
    },
    locationBtn: {
      width: '100%', padding: '12px', marginBottom: '8px', textAlign: 'left',
      backgroundColor: 'rgba(96, 81, 155, 0.1)', border: '1px solid rgba(96, 81, 155, 0.3)',
      color: '#e6e0ff', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
    },
    backBtn: {
      width: '100%', padding: '10px', marginBottom: '15px', backgroundColor: '#2a2930',
      border: '1px solid #555', color: '#fff', borderRadius: '4px', cursor: 'pointer'
    },
    closeBtn: {
      position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none',
      color: '#fff', fontSize: '24px', cursor: 'pointer'
    }
  };

  return (
    <div style={styles.overlay}>
      <button style={styles.closeBtn} onClick={onClose}>✕</button>
      
      <div style={{marginTop: '20px'}}>
        {/* SEZIONE 1: MAPPA A TENDINA (Spostamento Rapido) */}
        <div style={styles.section}>
          <div style={styles.title}>📍 Posizione: {currentMapName || 'Root'}</div>
          
          <button style={styles.backBtn} onClick={() => { onGoBack(); onClose(); }}>
            ⬅ Torna Indietro
          </button>

          <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
            {mapChildren && mapChildren.length > 0 ? (
               mapChildren.map(child => (
                 <button 
                    key={child.id} 
                    style={styles.locationBtn}
                    onClick={() => { onZoneClick(child); onClose(); }} // Chiude il menu dopo il click
                 >
                    <span>{child.type === 'CHAT' ? '💬' : '🗺️'} {child.name}</span>
                    <span style={{fontSize:'10px', opacity:0.6}}>INTRA</span>
                 </button>
               ))
            ) : (
               <div style={{fontStyle:'italic', color:'#666'}}>Nessuna zona qui.</div>
            )}
          </div>
        </div>

        {/* SEZIONE 2: MENU DI GIOCO */}
        <div style={styles.section}>
          <div style={styles.title}>Menu Principale</div>
          <div style={styles.btnGrid}>
            <Link to="/forum" style={styles.bigBtn} onClick={onClose}>
                <span>📜</span> Forum
            </Link>
            <button style={styles.bigBtn} onClick={() => { onToggleGuida(); onClose(); }}>
                <span>📖</span> Guida
            </button>
            <button style={styles.bigBtn} onClick={() => { onToggleAmbientazione(); onClose(); }}>
                <span>🌍</span> Lore
            </button>
            
            {['MASTER', 'ADMIN', 'MOD'].includes(user?.permesso) && (
                <button style={styles.bigBtn} onClick={() => { onToggleShinigami(); onClose(); }}>
                    <span>💀</span> Shinigami
                </button>
            )}
            
            {['MASTER', 'ADMIN', 'MOD'].includes(user?.permesso) && (
                <Link to="/gestione" style={styles.bigBtn} onClick={onClose}>
                    <span>⚙️</span> Gestione
                </Link>
            )}
          </div>
        </div>

        {/* SEZIONE 3: SISTEMA */}
        <div>
           <button 
             style={{...styles.bigBtn, width: '100%', borderColor: '#ff4444', color: '#ff4444'}} 
             onClick={onLogout}
           >
             🚪 LOGOUT
           </button>
        </div>
      </div>
    </div>
  );
}

export default MobileMenu;