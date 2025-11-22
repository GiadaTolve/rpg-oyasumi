import React, { useState, useEffect } from 'react';
import api from '../api';
import MusicPlayer from './MusicPlayer'; 
import { useMessaging } from './MessagingContext'; 

// --- STILI ---
const styles = {
  // 1. GUSCIO ESTERNO (Fermo, niente scroll)
  outerContainer: {
    position: 'relative',
    height: '100%',
    width: '100%',
    overflow: 'hidden', // Fondamentale: nasconde ciò che esce, niente scroll qui
    backgroundColor: 'rgba(11, 11, 17, 0.6)', // Colore di sfondo base
  },

  // 2. BORDO FISSO (Sopra a tutto)
  fixedBorderRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0, // Incollato a destra
    width: '6px',
    backgroundImage: "url('/frames/borderframevertical.png')",
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    zIndex: 50,
    pointerEvents: 'none',
    opacity: 0.9,
  },

  // 3. CONTENUTO SCROLLABILE (L'interno vero e proprio)
  scrollableContent: {
    height: '100%',
    overflowY: 'auto', // Lo scroll avviene QUI
    padding: '15px',
    paddingRight: '20px', // Spazio extra per non finire sotto il bordo/scrollbar
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    fontFamily: "'Inter', sans-serif",
    color: '#b3b3c0',
    
    // Nasconde la scrollbar nativa per estetica (opzionale, funziona su Chrome/Safari)
    scrollbarWidth: 'thin',
    scrollbarColor: '#c9a84a rgba(0,0,0,0.3)', 
  },

  // --- ALTRI STILI (Elementi Interni) ---
  schedaWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 15px',
      borderRadius: '12px',
      border: '1px solid rgba(162, 112, 255, 0.2)', 
      background: 'linear-gradient(180deg, rgba(30, 30, 40, 0.8), rgba(10, 10, 15, 0.9))',
      boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  schedaAvatar: {
      width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover',
      border: '2px solid #c9a84a', boxShadow: '0 0 10px rgba(201, 168, 74, 0.3)',
  },
  schedaName: {
      fontFamily: "'Cinzel', serif", fontWeight: '700', fontSize: '15px', color: '#e6e0ff',
      textShadow: '0 2px 4px rgba(0,0,0,0.8)',
  },
  levelText: { fontSize: '10px', color: '#c9a84a', textTransform: 'uppercase', marginTop: '2px' },
  messageIcon: {
      width: '32px', height: '32px', cursor: 'pointer', transition: 'transform 0.2s',
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
  },
  dividerImg: { width: '100%', height: 'auto', opacity: 0.8, margin: '0' },
  
  // News Visor
  newsVisor: {
    width: '100%', height: '130px', backgroundColor: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(162, 112, 255, 0.2)', borderRadius: '8px', padding: '12px',
    boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.9)', marginBottom: '5px', flexShrink: 0,
  },
  newsHeader: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px', marginBottom: '8px',
  },
  newsLabel: { fontFamily: "'Cinzel', serif", fontSize: '12px', color: '#c9a84a', fontWeight: 'bold', letterSpacing: '1px' },
  newsDate: { fontSize: '10px', color: '#666', fontStyle: 'italic' },
  newsContentBox: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  newsText: { fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#b3b3c0', lineHeight: '1.5', textAlign: 'center', animation: 'news-fade-in-out 6s ease-in-out infinite' },

  // Menu
  menuList: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '10px' },
  menuButton: {
    position: 'relative', width: '100%', height: '50px',
    backgroundImage: "url('/buttons/bottoni-frame/readysetplay.png')",
    backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent',
    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'filter 0.2s, transform 0.2s', flexShrink: 0,
  },
  menuButtonText: {
    color: '#dcdcdc', fontSize: '13px', fontFamily: "'Cinzel', serif", fontWeight: 'bold',
    textTransform: 'uppercase', letterSpacing: '1px', textShadow: '0 2px 3px rgba(0,0,0,0.9)',
  },
};

// --- COMPONENTS ---
const NewsVisor = () => {
    const [topics, setTopics] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    useEffect(() => {
      const fetchTopics = async () => {
        try { const response = await api.get(`/forum/bacheca/1/latest-topics`); setTopics(response.data); } 
        catch (error) { console.error("Errore news:", error); }
      };
      fetchTopics();
    }, []);
    useEffect(() => {
      if (topics.length === 0) return;
      const timer = setInterval(() => { setCurrentIndex(prevIndex => (prevIndex + 1) % topics.length); }, 6000);
      return () => clearInterval(timer);
    }, [topics]);
    const currentTopic = topics[currentIndex];
    const formatDate = (iso) => { if(!iso) return ''; const d = new Date(iso); return `${d.getDate()}/${d.getMonth()+1} - ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`; }
    return (
      <div style={styles.newsVisor}>
        {currentTopic ? (
            <>
                <div style={styles.newsHeader}>
                    <span style={styles.newsLabel}>NEWS DAL GIOCO</span>
                    <span style={styles.newsDate}>{formatDate(currentTopic.timestamp_creazione)}</span>
                </div>
                <div style={styles.newsContentBox}>
                    <div key={currentIndex} style={styles.newsText}>
                        <strong style={{color: '#e6e0ff', display:'block', marginBottom:'4px'}}>{currentTopic.titolo}</strong>
                        <span style={{fontStyle: 'italic', fontSize: '11px'}}>{currentTopic.anteprima || "..."}</span>
                    </div>
                </div>
            </>
        ) : ( <div style={{...styles.newsContentBox, color: '#666'}}>In attesa di segnale...</div> )}
      </div>
    );
};

const MenuButton = ({ label, onClick }) => { 
    return ( 
        <button style={styles.menuButton} onClick={onClick}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3) drop-shadow(0 0 5px #a270ff)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'scale(1)'; }}
        > 
            <span style={styles.menuButtonText}>{label}</span>
        </button> 
    ); 
}; 

// --- MAIN COMPONENT ---
function LeftSidebar({ onToggleScheda, onToggleMessages, onToggleBanca }) { 
    const { isFlashing } = useMessaging(); 
    const [schedaBreve, setSchedaBreve] = useState(null); 

    useEffect(() => { 
        const fetchSchedaBreve = async () => { 
            try { const response = await api.get('/scheda'); setSchedaBreve(response.data); } 
            catch (err) { console.error("Errore scheda:", err); } 
        }; 
        fetchSchedaBreve(); 
    }, []); 

    if (!schedaBreve) { return <aside style={styles.outerContainer}>Caricamento...</aside>; } 

    const handleMessageClick = (e) => { e.stopPropagation(); onToggleMessages(); };

    return ( 
        // 1. GUSCIO ESTERNO (Fermo)
        <aside style={styles.outerContainer}> 
            
            {/* 2. BORDO DESTRO FISSO */}
            <div style={styles.fixedBorderRight}></div>

            {/* 3. CONTENUTO CHE SCROLLA */}
            <div style={styles.scrollableContent}>
                
                {/* BOX PROFILO */}
                <div style={styles.schedaWrapper} onClick={onToggleScheda} title="Scheda Personaggio"> 
                    <div style={styles.userInfo}>
                        <img src={schedaBreve.avatar_chat || '/icone/mini_avatar.png'} alt="Avatar" style={styles.schedaAvatar} /> 
                        <div>
                            <div style={styles.schedaName}>{schedaBreve.nome_pg}</div>
                            <div style={styles.levelText}>Livello {schedaBreve.livello}</div>
                        </div>
                    </div>
                    <img src={isFlashing ? "/buttons/bottoni-icone/icons.newmessage.png" : "/buttons/bottoni-icone/icons.message.png"}
                        alt="Messaggi"
                        style={{ ...styles.messageIcon, animation: isFlashing ? 'gold-pulse 1.5s infinite' : 'none' }}
                        onClick={handleMessageClick} title="Messaggi Privati"
                    />
                </div> 

                <img src="/frames/interrompilinea.png" alt="divider" style={styles.dividerImg} />

                <NewsVisor />
                <MusicPlayer /> 

                <div style={styles.menuList}> 
                    <MenuButton label="Banca" onClick={onToggleBanca} /> 
                    <MenuButton label="Mercato" /> 
                    <MenuButton label="Skills" /> 
                    <MenuButton label="Grimorio" /> 
                    <MenuButton label="Bestiario" /> 
                </div> 
            </div>
        </aside> 
      ); 
} 

export default LeftSidebar;