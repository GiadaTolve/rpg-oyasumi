import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../SocketContext';
import WeatherWidget from './WeatherWidget';
import api from '../api';
import UserLocationModal from './UserLocationModal'; 

const styles = {
    // 1. GUSCIO ESTERNO (Fermo)
    outerContainer: {
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'rgba(11, 11, 17, 0.6)', // Sfondo base coerente
    },

    // 2. BORDO FISSO A SINISTRA
    fixedBorderLeft: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0, // Ancorato a sinistra
        width: '6px',
        backgroundImage: "url('/frames/borderframevertical.png')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        transform: 'scaleX(-1)', // Specchiato per simmetria rispetto all'altro lato
        zIndex: 50,
        pointerEvents: 'none',
        opacity: 0.9,
    },

    // 3. CONTENUTO SCROLLABILE
    scrollableContent: {
        height: '100%',
        overflowY: 'auto',
        padding: '15px',
        paddingLeft: '20px', // Spazio extra per il bordo sinistro
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        fontFamily: "'Inter', sans-serif",
        color: '#b3b3c0',
        scrollbarWidth: 'thin',
        scrollbarColor: '#c9a84a rgba(0,0,0,0.3)', 
    },

    // --- WIDGET CONTENITORE (Meteo + Calendario) ---
    widgetBox: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(162, 112, 255, 0.2)',
        borderRadius: '8px',
    },

    // Bottone Calendario Custom (Sostituisce l'iconcina vecchia)
    calendarBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px',
        background: 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: '#c9a84a', // Gold
        fontFamily: "'Cinzel', serif",
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1px',
    },
    calendarIcon: {
        width: '16px',
        height: '16px',
        filter: 'drop-shadow(0 0 2px #c9a84a)',
    },

    // --- PANNELLO EVENTI (A comparsa) ---
    eventsPanel: {
        backgroundColor: 'rgba(20, 20, 25, 0.95)',
        border: '1px solid #60519b',
        borderRadius: '6px',
        padding: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.8)',
        transition: 'all 0.3s ease-in-out',
        maxHeight: '500px',
        opacity: 1,
        marginBottom: '10px',
        overflow: 'hidden',
    },
    eventsPanelHidden: {
        maxHeight: '0',
        opacity: 0,
        padding: '0 15px', // Mantieni padding orizzontale per evitare scatti
        border: 'none',
        marginBottom: '0',
    },
    eventsTitle: {
        fontFamily: "'Cinzel', serif",
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#e6e0ff',
        marginBottom: '5px',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)',
        paddingBottom: '5px',
    },
    eventText: {
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#dcdcdc',
    },
    noEventsText: {
        fontSize: '11px',
        fontStyle: 'italic',
        color: '#888',
        textAlign: 'center',
    },

    // --- DIVISORE ---
    dividerImg: {
        width: '100%',
        height: 'auto',
        opacity: 0.8,
        margin: '5px 0',
    },

    // --- LISTA PRESENTI (Stile Visore News) ---
    onlineBox: {
        width: '100%',
        flex: 1, // Prende lo spazio rimanente
        minHeight: '200px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(162, 112, 255, 0.2)',
        borderRadius: '8px',
        padding: '12px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
    },
    onlineHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '6px',
        marginBottom: '10px',
        cursor: 'pointer', // Header CLICCABILE
        transition: 'background 0.2s',
        borderRadius: '4px',
    },
    onlineLabel: {
        fontFamily: "'Cinzel', serif",
        fontSize: '12px',
        color: '#c9a84a', // Gold
        fontWeight: 'bold',
        letterSpacing: '1px',
    },
    onlineCount: {
        fontSize: '10px',
        color: '#888',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: '2px 6px',
        borderRadius: '4px',
    },
    userList: {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
    },
    userListItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.02)',
        color: '#b3b3c0',
        fontSize: '12px',
        transition: 'color 0.2s',
        cursor: 'pointer',
    },
    userDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: '#a270ff', // Viola status
        boxShadow: '0 0 5px #a270ff',
    }
};

function RightSidebar({ currentMap, onOpenChat, onOpenScheda }) { 
    const socket = useContext(SocketContext);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [showEvents, setShowEvents] = useState(false);
    const [dailyEvent, setDailyEvent] = useState(null);
    
    // Stato per la modale "Lista Completa"
    const [showFullList, setShowFullList] = useState(false);

    useEffect(() => {
        const handleUserListUpdate = (users) => setOnlineUsers(users);
        // Controllo di sicurezza se il socket è connesso
        if(socket) {
            socket.on('update_online_list', handleUserListUpdate);
            return () => socket.off('update_online_list', handleUserListUpdate);
        }
    }, [socket]);

    useEffect(() => {
        const fetchDailyEvent = async () => {
            try {
                const response = await api.get('/daily-event');
                setDailyEvent(response.data);
            } catch (error) {
                console.error("Errore evento:", error);
            }
        };
        fetchDailyEvent();
    }, []);

    const handleToggleCalendar = () => {
        setShowEvents(prev => !prev);
    };

    const calendarIconUrl = "/buttons/bottoni-icone/icons.message.png"; 

    return (
        <aside style={styles.outerContainer}>
            
            {/* BORDO SINISTRO FISSO */}
            <div style={styles.fixedBorderLeft}></div>

            {/* MODALE LISTA COMPLETA (Apre se showFullList è true) */}
            {showFullList && (
                <UserLocationModal 
                    onlineUsers={onlineUsers} 
                    onClose={() => setShowFullList(false)} 
                    onJoinChat={onOpenChat} 
                />
            )}

            <div style={styles.scrollableContent}>
                
                {/* 1. WIDGET BOX */}
                <div style={styles.widgetBox}>
                    <WeatherWidget currentMap={currentMap} onToggleCalendar={null} />
                    
                    <button 
                        style={styles.calendarBtn} 
                        onClick={handleToggleCalendar}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#c9a84a';
                            e.currentTarget.style.background = 'rgba(201, 168, 74, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                        }}
                    >
                        <img src={calendarIconUrl} alt="Cal" style={styles.calendarIcon} />
                        <span>Diario Eventi</span>
                    </button>
                </div>

                {/* PANNELLO EVENTI */}
                <div style={showEvents ? styles.eventsPanel : {...styles.eventsPanel, ...styles.eventsPanelHidden}}>
                    {dailyEvent ? (
                        <>
                            <div style={styles.eventsTitle}>{dailyEvent.title}</div>
                            <p style={styles.eventText}>{dailyEvent.description}</p>
                        </>
                    ) : (
                        <p style={styles.noEventsText}>Nessun evento speciale oggi.</p>
                    )}
                </div>

                {/* DIVISORE */}
                <img src="/frames/interrompilinea.png" alt="divider" style={styles.dividerImg} />

                {/* 2. LISTA PRESENTI */}
                <div style={styles.onlineBox}>
                    {/* HEADER CLICCABILE: Apre la lista locazioni */}
                    <div 
                        style={styles.onlineHeader} 
                        onClick={() => setShowFullList(true)}
                        title="Clicca per vedere le posizioni"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <span style={styles.onlineLabel}>PRESENTI 🔍</span>
                        <span style={styles.onlineCount}>{onlineUsers.length}</span>
                    </div>
                    
                    {/* LISTA UTENTI: Cliccare apre la scheda */}
                    <ul style={styles.userList}>
                        {onlineUsers.map(user => (
                            <li 
                                key={user.id} 
                                style={styles.userListItem}
                                onClick={() => onOpenScheda(user)} // Apre la scheda pubblica
                                onMouseEnter={(e) => e.currentTarget.style.color = '#e6e0ff'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#b3b3c0'}
                                title="Clicca per aprire la Scheda"
                            >
                                <span style={styles.userDot}></span>
                                {user.nome_pg}
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </aside>
    );
}

export default RightSidebar;