import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import api from '../api';

// --- STILI DARK ARCANE ---
const styles = {
  container: {
    padding: '30px',
    color: '#b3b3c0',
    fontFamily: "'Inter', sans-serif",
    height: '100%',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: '#c9a84a transparent'
  },

  // --- NUOVO HEADER (Stile Modale) ---
  headerBar: {
    width: '100%',
    height: '50px', // Altezza fissa simile alle modali
    // Background Cloudy con velo scuro
    backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    
    borderBottom: '1px solid rgba(162, 112, 255, 0.3)', // Bordo viola
    borderRadius: '4px', // Leggero arrotondamento
    marginBottom: '30px', // Spazio sotto l'header
    
    display: 'flex',
    justifyContent: 'center', // Centra orizzontalmente
    alignItems: 'center',     // Centra verticalmente
    
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)', // Ombra per stacco
  },

  headerTitle: {
    fontFamily: "'Cinzel', serif",
    fontWeight: '700',
    color: '#c9a84a', // Oro
    fontSize: '18px', // Dimensione contenuta (non enorme)
    letterSpacing: '2px',
    textTransform: 'uppercase',
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
    margin: 0, // Rimuove i margini di default del <p>
  },
  
  // SEZIONE
  sectionContainer: {
    marginBottom: '40px',
    backgroundColor: 'rgba(11, 11, 17, 0.6)',
    border: '1px solid rgba(162, 112, 255, 0.2)',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
  },
  sectionHeader: {
    backgroundColor: 'rgba(162, 112, 255, 0.1)',
    padding: '15px 20px',
    borderBottom: '1px solid rgba(162, 112, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  sectionTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.2rem',
    color: '#e6e0ff',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: 0
  },
  sectionIcon: {
    color: '#c9a84a',
    fontSize: '1.2rem'
  },

  // BACHECA
  boardRow: {
    display: 'grid',
    gridTemplateColumns: '50px 1fr 150px 250px',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    transition: 'background 0.2s',
    cursor: 'pointer', 
    alignItems: 'center'
  },
  boardIcon: {
    fontSize: '24px',
    color: '#666',
    display: 'flex',
    justifyContent: 'center'
  },
  boardIconNew: {
    color: '#c9a84a',
    filter: 'drop-shadow(0 0 5px rgba(201, 168, 74, 0.5))'
  },
  boardInfo: {
    paddingRight: '20px'
  },
  boardTitle: {
    fontFamily: "'Cinzel', serif",
    fontSize: '16px',
    color: '#c9a84a',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  boardDesc: {
    fontSize: '12px',
    color: '#888',
    lineHeight: '1.4'
  },
  statsBox: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666'
  },
  lastPostBox: {
    fontSize: '11px',
    color: '#888',
    textAlign: 'right'
  },
  lastPostAuthor: {
    color: '#a270ff',
    fontWeight: 'bold'
  },
  loading: { textAlign: 'center', padding: '50px', color: '#666', fontStyle: 'italic' }
};

function Forum() {
  const [forumData, setForumData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchForum = async () => {
      try {
        setLoading(true);
        const response = await api.get('/forum'); 
        setForumData(response.data);
      } catch (err) {
        console.error("Errore caricamento forum:", err);
        setError("Impossibile caricare la struttura del forum.");
      } finally {
        setLoading(false);
      }
    };

    fetchForum();
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return 'Nessun messaggio';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  if (loading) return <div style={styles.loading}>Apertura archivi...</div>;
  if (error) return <div style={{...styles.loading, color: '#ff4d4d'}}>{error}</div>;

  return (
    <div style={styles.container}>
      
      {/* --- HEADER MODIFICATO --- */}
      <div style={styles.headerBar}>
        <p style={styles.headerTitle}>ARCHIVI DI OYASUMI</p>
      </div>

      {forumData.map(sezione => (
        <div key={sezione.id} style={styles.sectionContainer}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>✦</span>
            <h2 style={styles.sectionTitle}>{sezione.nome}</h2>
          </div>

          <div>
            {sezione.bacheche.map(bacheca => (
              <div 
                key={bacheca.id} 
                style={styles.boardRow}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                
                // Navigazione funzionante
                onClick={() => navigate(`/forum/bacheca/${bacheca.id}`)} 
              >
                <div style={styles.boardIcon}>
                    {bacheca.has_new_posts ? (
                        <span style={styles.boardIconNew} title="Nuovi Messaggi">⬤</span>
                    ) : (
                        <span title="Nessun nuovo messaggio">○</span>
                    )}
                </div>

                <div style={styles.boardInfo}>
                  <div style={styles.boardTitle}>{bacheca.nome}</div>
                  <div style={styles.boardDesc}>{bacheca.descrizione}</div>
                </div>

                <div style={styles.statsBox}>
                  <div>{bacheca.topic_count || 0}</div>
                  <div style={{fontSize:'10px', textTransform:'uppercase'}}>Discussioni</div>
                </div>

                <div style={styles.lastPostBox}>
                  {bacheca.last_post_timestamp ? (
                      <>
                        <div>{formatDate(bacheca.last_post_timestamp)}</div>
                        <div>da <span style={styles.lastPostAuthor}>{bacheca.last_post_author}</span></div>
                      </>
                  ) : (
                      <span>--</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Forum;