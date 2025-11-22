import React, { useState, useEffect } from 'react';
import api from '../api';

const styles = {
    container: {
        width: '350px',
        height: '500px',
        // Sfondo Darkstone
        backgroundImage: "url('/backgrounds/darkstone.png')",
        backgroundRepeat: 'repeat',
        backgroundColor: 'rgba(11, 11, 17, 0.98)',
        border: '1px solid rgba(162, 112, 255, 0.3)',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 -5px 20px rgba(0,0,0,0.5)',
        overflow: 'hidden'
    },
    header: {
        padding: '15px',
        // Sfondo Cloudy
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#c9a84a', // Oro
        fontFamily: "'Cinzel', serif",
        fontWeight: 'bold',
        fontSize: '14px',
        letterSpacing: '1px'
    },
    searchContainer: {
        padding: '15px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(0,0,0,0.2)',
        position: 'relative' // Per il dropdown
    },
    searchInput: {
        width: '100%',
        padding: '10px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#e6e0ff',
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
        fontSize: '13px'
    },
    list: {
        flexGrow: 1,
        overflowY: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#60519b transparent'
    },
    // Riga Conversazione
    conversationItem: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 15px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    avatar: {
        width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover',
        border: '2px solid #c9a84a', marginRight: '12px',
        boxShadow: '0 0 5px rgba(0,0,0,0.5)'
    },
    info: { flexGrow: 1, overflow: 'hidden' },
    name: { 
        color: '#e6e0ff', fontWeight: 'bold', fontSize: '13px', marginBottom: '3px',
        fontFamily: "'Cinzel', serif"
    },
    preview: { color: '#888', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    unreadBadge: {
        backgroundColor: '#a270ff', color: 'white', fontSize: '10px', fontWeight:'bold',
        padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', boxShadow: '0 0 5px #a270ff'
    },
    
    // Dropdown Suggerimenti
    suggestions: {
        position: 'absolute',
        top: '55px', left: '15px', right: '15px',
        backgroundColor: '#1a1a1a', 
        border: '1px solid #c9a84a', 
        borderRadius: '4px',
        zIndex: 100,
        maxHeight: '200px', 
        overflowY: 'auto',
        boxShadow: '0 5px 15px rgba(0,0,0,0.8)'
    },
    suggestionItem: {
        padding: '10px', cursor: 'pointer', borderBottom: '1px solid #333', color: '#ccc', fontSize: '13px',
        display: 'flex', alignItems: 'center', gap: '10px'
    },
    closeBtn: { background: 'none', border: 'none', color: '#b3b3c0', cursor: 'pointer', fontSize: '16px' }
};

function ConversationList({ conversations, onSelectUser, onClose }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);

    useEffect(() => {
        if (searchTerm.length < 1) { // Ora cerca anche con 1 lettera
            setSuggestions([]);
            return;
        }
        const timeoutId = setTimeout(async () => {
            try {
                const res = await api.get(`/users/find?name=${searchTerm}`);
                // Il server ora restituisce un array (grazie al fix di prima)
                setSuggestions(Array.isArray(res.data) ? res.data : [res.data]); 
            } catch (e) {
                setSuggestions([]);
            }
        }, 300); // Debounce leggermente più veloce
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <span>MESSAGGI</span>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.searchContainer}>
                <input 
                    type="text" 
                    placeholder="Cerca PG (es. 'Bo' per Botan)..." 
                    style={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {/* Lista Suggerimenti Ricerca */}
                {suggestions.length > 0 && (
                    <div style={styles.suggestions}>
                        {suggestions.map(user => (
                            <div 
                                key={user.id_utente} 
                                style={styles.suggestionItem}
                                onClick={() => {
                                    onSelectUser(user);
                                    setSearchTerm('');
                                    setSuggestions([]);
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <img src={user.avatar_chat || '/icone/mini_avatar.png'} style={{width:'24px', height:'24px', borderRadius:'50%'}} alt=""/>
                                {user.nome_pg}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={styles.list}>
                {conversations.map(conv => (
                    <div 
                        key={conv.id_utente} 
                        style={styles.conversationItem}
                        onClick={() => onSelectUser(conv)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(162, 112, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <img src={conv.avatar_chat || '/icone/mini_avatar.png'} alt="Av" style={styles.avatar} />
                        <div style={styles.info}>
                            <div style={styles.name}>{conv.nome_pg}</div>
                            <div style={styles.preview}>
                                {conv.last_message?.includes('[OFF]') ? '🔒 ' : ''}
                                {conv.last_message?.replace('[OFF] ', '')}
                            </div>
                        </div>
                        {conv.unread_count > 0 && <span style={styles.unreadBadge}>{conv.unread_count}</span>}
                    </div>
                ))}
                {conversations.length === 0 && (
                    <div style={{padding:'30px', color:'#666', textAlign:'center', fontSize:'12px', fontStyle:'italic'}}>
                        Nessuna pergamena trovata.
                    </div>
                )}
            </div>
        </div>
    );
}

export default ConversationList;