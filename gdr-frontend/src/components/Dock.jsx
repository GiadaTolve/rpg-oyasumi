import React from 'react';
import { useNavigate } from 'react-router-dom';

// Icone SVG (Mappa, Chat/Messaggi, Presenti, Home/Tu)
const Icons = {
  Home: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
  Map: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>,
  Msg: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
  Users: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  ChatWin: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
};

function Dock({ 
  isMobile, 
  openChats, 
  onRestoreChat, 
  // Props Mobile
  onTabChange, 
  activeTab 
}) {
  
  const dockStyle = {
    position: 'fixed', bottom: 0, left: 0, width: '100%', height: isMobile ? '60px' : '50px',
    backgroundColor: '#1a1a1a', borderTop: '2px solid #31323e',
    display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-around' : 'flex-start',
    padding: isMobile ? '0' : '0 20px', zIndex: 2000, gap: isMobile ? '0' : '15px'
  };

  const itemStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    color: isActive ? '#c9a84a' : '#bfc0d1', // Oro se attivo
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: isMobile ? '0.7rem' : '0.9rem', padding: '5px',
    flex: isMobile ? 1 : 'none', // Mobile: tasti equamente distribuiti
    height: '100%'
  });

  const iconStyle = { width: '20px', height: '20px', marginBottom: '4px' };

  if (isMobile) {
    return (
      <div style={dockStyle}>
        <button style={itemStyle(activeTab === 'HOME')} onClick={() => onTabChange('HOME')}>
          <div style={iconStyle}><Icons.Home /></div>
          <span>Tu</span>
        </button>
        <button style={itemStyle(activeTab === 'MAPPA')} onClick={() => onTabChange('MAPPA')}>
          <div style={iconStyle}><Icons.Map /></div>
          <span>Mappa</span>
        </button>
        <button style={itemStyle(activeTab === 'MESSAGGI')} onClick={() => onTabChange('MESSAGGI')}>
          <div style={iconStyle}><Icons.Msg /></div>
          <span>Messaggi</span>
        </button>
        <button style={itemStyle(activeTab === 'PRESENTI')} onClick={() => onTabChange('PRESENTI')}>
          <div style={iconStyle}><Icons.Users /></div>
          <span>Presenti</span>
        </button>
      </div>
    );
  }

  // DESKTOP RESTA INVARIATO
  return (
    <div style={dockStyle}>
      <div style={{marginRight: '15px', fontWeight: 'bold', color: '#60519b'}}>DOCK</div>
      {openChats.map(chat => (
        <button key={chat.id} onClick={() => onRestoreChat(chat.id)} 
                style={{...itemStyle(false), flexDirection: 'row', background: '#2A2930', borderRadius: '5px', padding: '5px 15px', border: '1px solid #60519b'}}>
           <div style={{...iconStyle, width: '16px', height: '16px', marginRight: '8px', marginBottom: 0}}><Icons.ChatWin /></div>
           {chat.name}
        </button>
      ))}
    </div>
  );
}

export default Dock;