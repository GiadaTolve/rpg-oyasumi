import React, { useState } from 'react';
import HousingMarket from './HousingMarket';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faShop, 
    faHammer, 
    faHouse, 
    faXmark,
    faSackDollar
} from '@fortawesome/free-solid-svg-icons';

const THEME = {
    colors: {
        bg: 'rgba(8, 8, 12, 0.98)',
        gold: '#c9a84a',
        border: 'rgba(162, 112, 255, 0.3)',
        tabActive: 'rgba(162, 112, 255, 0.1)',
        text: '#e0e0e0'
    },
    fonts: {
        title: "'Cinzel', serif",
    }
};

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, backdropFilter: 'blur(5px)'
    },
    window: {
        width: '1100px',
        height: '850px',
        maxHeight: '95vh',
        backgroundColor: THEME.colors.bg,
        border: `1px solid ${THEME.colors.border}`,
        boxShadow: '0 0 50px rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column',
        borderRadius: '4px', overflow: 'hidden'
    },
    header: {
        height: '70px',
        borderBottom: `1px solid ${THEME.colors.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 30px',
        backgroundImage: "linear-gradient(to right, #050505, #1a1a20)",
    },
    title: {
        fontFamily: THEME.fonts.title,
        color: THEME.colors.gold,
        fontSize: '22px',
        letterSpacing: '2px',
        display: 'flex', alignItems: 'center', gap: '15px',
        textShadow: '0 0 10px rgba(201, 168, 74, 0.3)'
    },
    wallet: {
        fontSize: '14px',
        color: '#fff',
        fontFamily: "'Roboto Mono', monospace",
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '8px 15px',
        borderRadius: '4px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', gap: '8px'
    },
    closeBtn: {
        background: 'none', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer',
        transition: 'color 0.2s'
    },
    // TABS
    tabsContainer: {
        display: 'flex',
        borderBottom: `1px solid ${THEME.colors.border}`,
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingLeft: '20px'
    },
    tab: (active) => ({
        padding: '18px 30px',
        background: active ? 'linear-gradient(to top, rgba(162, 112, 255, 0.1), transparent)' : 'transparent',
        border: 'none',
        borderBottom: active ? `2px solid ${THEME.colors.gold}` : '2px solid transparent',
        color: active ? THEME.colors.gold : '#888',
        fontFamily: THEME.fonts.title,
        fontSize: '13px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '10px',
        transition: 'all 0.2s',
        outline: 'none'
    }),
    contentArea: {
        flexGrow: 1,
        overflow: 'hidden',
        position: 'relative',
        background: "url('/backgrounds/darkstone.png') repeat" // Assicurati di avere uno sfondo o rimuovi questa riga
    }
};

function Mercato({ user, onClose }) {
    // Gestiamo le TAB: GENERAL (Oggetti), WEAPONS (Armi), HOUSING (Case)
    const [activeTab, setActiveTab] = useState('HOUSING'); // Default su Housing per testare subito

    return (
        <div style={styles.overlay}>
            <div style={styles.window}>
                {/* HEADER */}
                <div style={styles.header}>
                    <div style={styles.title}>
                        <FontAwesomeIcon icon={faShop} />
                        MARKETPLACE
                    </div>
                    
                    {/* PORTAFOGLIO UTENTE (Visibile sempre) */}
                    <div style={styles.wallet}>
                        <FontAwesomeIcon icon={faSackDollar} style={{color: THEME.colors.gold}} />
                        {user.rem} REM
                    </div>

                    <button style={styles.closeBtn} onClick={onClose} title="Chiudi">
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>

                {/* TABS DI NAVIGAZIONE */}
                <div style={styles.tabsContainer}>
                    <button 
                        style={styles.tab(activeTab === 'GENERAL')} 
                        onClick={() => setActiveTab('GENERAL')}
                    >
                        <FontAwesomeIcon icon={faShop} /> EMPORIO
                    </button>
                    
                    <button 
                        style={styles.tab(activeTab === 'WEAPONS')} 
                        onClick={() => setActiveTab('WEAPONS')}
                    >
                        <FontAwesomeIcon icon={faHammer} /> ARMERIA
                    </button>
                    
                    <button 
                        style={styles.tab(activeTab === 'HOUSING')} 
                        onClick={() => setActiveTab('HOUSING')}
                    >
                        <FontAwesomeIcon icon={faHouse} /> IMMOBILIARE
                    </button>
                </div>

                {/* AREA CONTENUTO */}
                <div style={styles.contentArea}>
                    
                    {activeTab === 'GENERAL' && (
                        <div style={{padding:'40px', textAlign:'center', color:'#666', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
                            <FontAwesomeIcon icon={faShop} size="3x" style={{marginBottom:'20px', opacity:0.3}} />
                            <h3>EMPORIO GENERALE</h3>
                            <p>Stiamo rifornendo gli scaffali. Torna più tardi per pozioni e materiali.</p>
                        </div>
                    )}

                    {activeTab === 'WEAPONS' && (
                        <div style={{padding:'40px', textAlign:'center', color:'#666', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'}}>
                            <FontAwesomeIcon icon={faHammer} size="3x" style={{marginBottom:'20px', opacity:0.3}} />
                            <h3>ARMERIA</h3>
                            <p>I fabbri stanno lavorando alle nuove lame. Attendi l'apertura.</p>
                        </div>
                    )}

                    {activeTab === 'HOUSING' && (
                        <HousingMarket 
                            user={user} 
                            onPurchaseSuccess={() => {
                                // Qui potremmo forzare un aggiornamento dei dati utente per vedere i soldi scendere
                                // Per ora ci affidiamo al fatto che al prossimo ricaricamento saranno aggiornati
                                console.log("Transazione completata.");
                            }} 
                        />
                    )}

                </div>
            </div>
        </div>
    );
}

export default Mercato;