import React, { useState, useEffect } from 'react';
import api from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHouse, 
    faBriefcase, 
    faHeart, 
    faFileSignature, 
    faCoins, 
    faCity,
    faCheckCircle,
    faDoorOpen,
    faBan
} from '@fortawesome/free-solid-svg-icons';

const THEME = {
  colors: {
    gold: '#c9a84a',
    primary: '#a270ff',
    bgCard: 'rgba(255, 255, 255, 0.03)',
    border: 'rgba(255, 255, 255, 0.1)',
    success: '#4ade80',
    danger: '#ff2a2a',
    textDim: '#b3b3c0'
  },
  fonts: {
    title: "'Cinzel', serif",
    body: "'Work Sans', sans-serif",
  }
};

const styles = {
  container: {
    padding: '20px',
    color: '#fff',
    height: '100%',
    overflowY: 'auto'
  },
  title: {
    fontFamily: THEME.fonts.title,
    color: THEME.colors.gold,
    fontSize: '24px',
    marginBottom: '10px',
    textAlign: 'center',
    borderBottom: `1px solid ${THEME.colors.border}`,
    paddingBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '15px'
  },
  subTitle: {
      textAlign: 'center',
      color: '#888',
      marginBottom: '25px',
      fontSize: '13px',
      fontStyle: 'italic'
  },
  // --- NUOVO STILE PER IL PANNELLO LASCIA CASA ---
  leavePanel: {
    background: 'rgba(20, 0, 0, 0.6)',
    border: `1px solid ${THEME.colors.danger}`,
    borderRadius: '4px',
    padding: '15px',
    marginBottom: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 0 15px rgba(255, 0, 0, 0.1)'
  },
  leaveText: {
      fontSize: '14px',
      color: '#ffcccc'
  },
  btnLeave: {
      padding: '10px 20px',
      background: THEME.colors.danger,
      color: '#fff',
      border: 'none',
      borderRadius: '2px',
      cursor: 'pointer',
      fontFamily: THEME.fonts.title,
      fontWeight: 'bold',
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
  },
  // ----------------------------------------------
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  card: {
    background: THEME.colors.bgCard,
    border: `1px solid ${THEME.colors.border}`,
    borderRadius: '4px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    position: 'relative',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: `1px solid ${THEME.colors.border}`,
    paddingBottom: '10px',
    marginBottom: '5px'
  },
  houseName: {
    fontFamily: THEME.fonts.title,
    color: THEME.colors.primary,
    fontSize: '18px',
    margin: 0,
    lineHeight: '1.2'
  },
  costBox: {
      textAlign: 'right'
  },
  cost: {
    color: THEME.colors.gold,
    fontWeight: 'bold',
    fontFamily: "'Roboto Mono', monospace",
    display: 'block'
  },
  costLabel: {
      fontSize: '10px',
      color: '#666',
      textTransform: 'uppercase'
  },
  desc: {
    fontSize: '13px',
    color: THEME.colors.textDim,
    lineHeight: '1.5',
    flexGrow: 1,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    marginTop: '5px',
    padding: '12px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '4px',
    border: `1px solid ${THEME.colors.border}`
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 'bold'
  },
  btnRent: {
    padding: '12px',
    marginTop: '10px',
    background: 'linear-gradient(45deg, #a270ff, #7c4dff)',
    border: 'none',
    borderRadius: '2px',
    color: '#fff',
    fontFamily: THEME.fonts.title,
    cursor: 'pointer',
    fontSize: '14px',
    letterSpacing: '1px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  btnRentDisabled: {
    background: '#222',
    color: '#555',
    cursor: 'not-allowed',
    border: '1px solid #333'
  },
  // Stile speciale per il bottone "Contratto Firmato"
  btnOwned: {
      marginTop: '10px',
      padding: '12px',
      background: 'rgba(74, 222, 128, 0.1)',
      border: `1px solid ${THEME.colors.success}`,
      color: THEME.colors.success,
      fontFamily: THEME.fonts.title,
      fontSize: '13px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      cursor: 'default'
  }
};

function HousingMarket({ user, onPurchaseSuccess }) {
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resMarket = await api.get('/housing/market');
                setHouses(resMarket.data);
            } catch (error) {
                console.error("Errore caricamento case:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleRent = async (house) => {
        if (!confirm(`Vuoi davvero affittare: ${house.name}? \nCosto iniziale: ${house.cost_rem} REM`)) return;

        try {
            const res = await api.post('/housing/rent', { houseId: house.id });
            alert(res.data.message);
            // Ricarichiamo la pagina per aggiornare lo stato utente (soldi e casa posseduta)
            window.location.reload(); 
        } catch (error) {
            alert("Errore affitto: " + (error.response?.data?.message || "Errore sconosciuto"));
        }
    };

    // --- NUOVA FUNZIONE PER LASCIARE CASA ---
    const handleLeaveHouse = async () => {
        if(!confirm("ATTENZIONE: Sei sicuro di voler lasciare la tua abitazione?\nPerderai l'accesso alla chat privata e le personalizzazioni.")) return;

        try {
            const res = await api.post('/housing/leave');
            alert(res.data.message);
            // Ricarichiamo la pagina per aggiornare lo stato (l'utente non avrà più casa)
            window.location.reload();
        } catch (error) {
            alert("Errore: " + (error.response?.data?.message || "Impossibile lasciare la casa."));
        }
    };

    if (loading) return <div style={{padding:'20px', color:'#fff', textAlign:'center'}}><FontAwesomeIcon icon={faCity} spin /> Caricamento listino...</div>;

    // Verifica se l'utente ha una casa (controlliamo se housing_id ha un valore valido)
    const hasHouse = !!user.housing_id; 

    return (
        <div style={styles.container}>
            <div style={styles.title}>
                <FontAwesomeIcon icon={faCity} />
                OYASUMI ESTATE AGENCY
            </div>
            <p style={styles.subTitle}>
                "Un tetto sicuro è il primo passo verso il potere. Scegli con saggezza."
            </p>

            {/* --- PANNELLO LASCIA IMMOBILE (Visibile solo se hai una casa) --- */}
            {hasHouse && (
                <div style={styles.leavePanel}>
                    <div style={styles.leaveText}>
                        <strong>Proprietà Attiva:</strong> Risiedi attualmente in una struttura.<br/>
                        Per cambiare abitazione, devi prima rescindere il contratto attuale.
                    </div>
                    <button style={styles.btnLeave} onClick={handleLeaveHouse}>
                        <FontAwesomeIcon icon={faDoorOpen} />
                        LASCIA IMMOBILE
                    </button>
                </div>
            )}

            <div style={styles.grid}>
                {houses.map(house => {
                    const canAfford = user.rem >= house.cost_rem;
                    const isSalary = house.cost_type === 'DAILY_SALARY';
                    
                    // Controllo se è QUESTA la casa che possiedo
                    const isMyHouse = user.housing_id === house.id;
                    
                    // Determiniamo lo stato del bottone
                    let buttonLabel = "";
                    let isDisabled = false;
                    let isOwnedStyle = false;

                    if (isMyHouse) {
                        // CASO 1: È casa mia
                        buttonLabel = isSalary ? "ASSEGNATO" : "CONTRATTO FIRMATO";
                        isOwnedStyle = true;
                        isDisabled = true;
                    } else if (hasHouse) {
                        // CASO 2: Ho già una casa (ma non è questa) -> Non posso comprare
                        buttonLabel = "NON DISPONIBILE";
                        isDisabled = true;
                    } else {
                        // CASO 3: Non ho case -> Posso comprare (se ho soldi)
                        buttonLabel = isSalary ? "ASSEGNAZIONE" : "FIRMA CONTRATTO";
                        isDisabled = !canAfford && !isSalary; // Disabilita solo se mancano soldi
                    }
                    
                    return (
                        <div key={house.id} style={{
                            ...styles.card,
                            borderColor: isMyHouse ? THEME.colors.success : THEME.colors.border,
                            boxShadow: isMyHouse ? `0 0 15px ${THEME.colors.success}40` : 'none'
                        }}>
                            <div style={styles.cardHeader}>
                                <h3 style={styles.houseName}>{house.name}</h3>
                                <div style={styles.costBox}>
                                    <span style={styles.cost}>
                                        {house.cost_rem} <FontAwesomeIcon icon={faCoins} style={{fontSize:'10px'}} />
                                    </span>
                                    <span style={styles.costLabel}>
                                        {isSalary ? 'DETRAZIONE STIPENDIO' : 'CANONE MENSILE'}
                                    </span>
                                </div>
                            </div>
                            
                            <div style={styles.desc}>{house.description}</div>
                            
                            <div style={styles.statsRow}>
                                <div style={styles.statItem} title="Slot Inventario Bonus">
                                    <FontAwesomeIcon icon={faBriefcase} style={{color:THEME.colors.gold}} />
                                    <span>+{house.bonus_slots} Slot</span>
                                </div>
                                <div style={styles.statItem} title="Bonus Punti Ferita">
                                    <FontAwesomeIcon icon={faHeart} style={{color:THEME.colors.danger}} />
                                    <span>+{house.bonus_hp} PF</span>
                                </div>
                            </div>

                            {/* LOGICA RENDER BOTTONE */}
                            {isOwnedStyle ? (
                                <div style={styles.btnOwned}>
                                    <FontAwesomeIcon icon={faCheckCircle} />
                                    {buttonLabel}
                                </div>
                            ) : (
                                <button 
                                    style={{
                                        ...styles.btnRent, 
                                        ...( isDisabled ? styles.btnRentDisabled : {}) 
                                    }}
                                    onClick={() => !isDisabled && handleRent(house)}
                                    disabled={isDisabled}
                                >
                                    <FontAwesomeIcon icon={isDisabled ? faBan : faFileSignature} />
                                    {buttonLabel}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default HousingMarket;