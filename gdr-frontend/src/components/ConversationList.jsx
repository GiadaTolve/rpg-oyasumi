import React, { useState } from 'react';
import api from '../api';

// --- 1. SET DI ICONE SVG (Dark Arcane Style) ---
const Icons = {
    Search: () => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    ),
    Plus: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    ),
    Close: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    ),
    Ghost: () => (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 16.2v.8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2"></path>
            <path d="M15 16.2v.8a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2"></path>
            <circle cx="12" cy="13" r="5"></circle>
        </svg>
    )
};

// Funzione helper orario
const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
};

function ConversationList({ conversations, onSelectUser, onClose, isMobile }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]); 
    const [searchTimeout, setSearchTimeout] = useState(null);

    // --- LOGICA DI RICERCA (Invariata) ---
    const handleSearchInput = (e) => {
        const text = e.target.value;
        setSearchTerm(text);

        if (text.length < 2) {
            setSuggestions([]);
            return;
        }

        if (searchTimeout) clearTimeout(searchTimeout);
        
        const timeoutId = setTimeout(async () => {
            try {
                const res = await api.get(`/users/find?name=${text}`);
                const results = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
                const existingIds = conversations.map(c => c.id_utente);
                const newPeople = results.filter(u => !existingIds.includes(u.id_utente));
                setSuggestions(newPeople);
            } catch (err) {
                setSuggestions([]);
            }
        }, 300);

        setSearchTimeout(timeoutId);
    };

    const filteredExisting = conversations.filter(c => 
        c.nome_pg.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- 2. STILI DESKTOP (Minimal Dark) ---
    const desktopStyles = {
        container: {
            width: '100%', height: '100%', backgroundColor: '#1e1e24',
            display: 'flex', flexDirection: 'column', color: '#bfc0d1', fontFamily: "'Inter', sans-serif",
        },
        header: {
            padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px'
        },
        titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
        title: { fontFamily: "'Cinzel', serif", color: '#c9a84a', margin: 0, fontSize: '14px', textTransform: 'uppercase' },
        closeBtn: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex', alignItems: 'center' },
        list: { flexGrow: 1, overflowY: 'auto' },
        item: {
            display: 'flex', alignItems: 'center', padding: '10px 15px', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s'
        },
        avatar: { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', marginRight: '12px', border: '1px solid #444' },
        // Input Desktop
        searchWrapper: { position: 'relative', width: '100%' },
        searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' },
        searchInput: {
            width: '100%', padding: '8px 8px 8px 35px', backgroundColor: 'rgba(0,0,0,0.3)', 
            border: '1px solid #333', color: '#fff', borderRadius: '4px', fontSize: '12px', boxSizing: 'border-box'
        },
        sectionTitle: { padding: '10px 15px 2px', fontSize: '10px', color: '#c9a84a', opacity: 0.8 },
        unreadBadge: { backgroundColor: '#a270ff', color: 'white', fontSize: '9px', padding: '1px 5px', borderRadius: '8px', marginLeft: '5px' }
    };

    // --- 3. STILI MOBILE (Dark Arcane App) ---
    const mobileStyles = {
        container: {
            width: '100%', height: '100%', backgroundColor: '#050508',
            display: 'flex', flexDirection: 'column', color: '#e0e0e0', fontFamily: "'Inter', sans-serif",
        },
        header: {
            padding: '20px', borderBottom: '1px solid #c9a84a30', backgroundColor: '#0a0a0f', // Nero leggermente più chiaro con bordo oro spento
            display: 'flex', flexDirection: 'column', gap: '15px', position: 'sticky', top: 0, zIndex: 10,
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
        },
        titleRow: { display: 'flex', justifyContent: 'center', width: '100%' },
        title: { 
            fontFamily: "'Cinzel', serif", color: '#c9a84a', margin: 0, fontSize: '20px', 
            textTransform: 'uppercase', fontWeight: '700', letterSpacing: '2px', textShadow: '0 0 10px rgba(201, 168, 74, 0.3)' 
        },
        closeBtn: { display: 'none' },
        
        // Input Mobile
        searchWrapper: { position: 'relative', width: '100%' },
        searchIcon: { position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#c9a84a' },
        searchInput: {
            width: '100%', padding: '12px 12px 12px 45px', 
            backgroundColor: '#15151a', border: '1px solid #333',
            color: '#e6e0ff', borderRadius: '20px', fontSize: '14px', boxSizing: 'border-box', outline: 'none',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.5)'
        },

        list: { flexGrow: 1, overflowY: 'auto', paddingBottom: '90px' }, // Extra padding per il FAB
        
        // Item Mobile
        item: {
            display: 'flex', alignItems: 'center', padding: '15px 20px', cursor: 'pointer',
            borderBottom: '1px solid #1a1a1a', height: '80px', boxSizing: 'border-box',
            backgroundColor: 'transparent'
        },
        avatar: { 
            width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', marginRight: '15px', 
            border: '2px solid #c9a84a' // Bordo ORO importante
        },
        sectionTitle: { 
            padding: '20px 20px 5px', fontSize: '12px', color: '#a270ff', 
            fontFamily: "'Cinzel', serif", textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' 
        },
        unreadBadge: {
            backgroundColor: '#c9a84a', color: '#000', fontSize: '11px', padding: '2px 8px', 
            borderRadius: '12px', marginLeft: '5px', fontWeight: 'bold', boxShadow: '0 0 5px rgba(201, 168, 74, 0.5)'
        },
        
        // FAB (Floating Action Button)
        fab: {
            position: 'fixed', bottom: '80px', right: '20px', width: '55px', height: '55px',
            background: 'linear-gradient(135deg, #c9a84a, #8a6e1c)', // Gradiente ORO
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(201, 168, 74, 0.4)', zIndex: 20, cursor: 'pointer', border: '1px solid #ffe7a3',
            color: '#000'
        }
    };

    const styles = isMobile ? mobileStyles : desktopStyles;

    // Helper Renderer
    const renderUserItem = (user, isSuggestion = false) => {
        return (
            <div 
                key={user.id_utente} 
                style={{...styles.item, backgroundColor: isSuggestion ? 'rgba(162, 112, 255, 0.05)' : 'transparent'}}
                onClick={() => onSelectUser({ id_utente: user.id_utente, nome_pg: user.nome_pg })}
            >
                <img 
                    src={user.avatar_chat || '/icone/mini_avatar.png'} 
                    alt={user.nome_pg} 
                    style={styles.avatar}
                />
                <div style={{flexGrow: 1, overflow: 'hidden'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems: 'center'}}>
                        <span style={{
                            fontWeight: 'bold', 
                            color: isSuggestion ? '#a270ff' : (isMobile ? '#fff' : '#e6e0ff'), // Viola se suggerimento
                            fontSize: isMobile ? '16px' : '13px'
                        }}>
                            {user.nome_pg}
                        </span>
                        {!isSuggestion && <span style={{fontSize: '11px', color: '#666'}}>{formatTime(user.last_message_timestamp)}</span>}
                    </div>
                    {!isSuggestion && (
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: '4px'}}>
                            <span style={{fontSize: isMobile ? '13px' : '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px'}}>
                                {user.last_message || <em style={{opacity:0.6}}>Nessun messaggio</em>}
                            </span>
                            {parseInt(user.unread_count) > 0 && (
                                <span style={styles.unreadBadge}>{user.unread_count}</span>
                            )}
                        </div>
                    )}
                    {isSuggestion && <div style={{fontSize:'12px', color:'#c9a84a', fontStyle:'italic'}}>Tocca per iniziare...</div>}
                </div>
            </div>
        );
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.titleRow}>
                    <h3 style={styles.title}>MESSAGGI</h3>
                    {!isMobile && onClose && (
                        <button style={styles.closeBtn} onClick={onClose}>
                            <Icons.Close />
                        </button>
                    )}
                </div>
                
                {/* Search Bar con Icona */}
                <div style={styles.searchWrapper}>
                    <span style={styles.searchIcon}><Icons.Search /></span>
                    <input 
                        type="text" 
                        placeholder="Cerca o inizia chat..." 
                        style={styles.searchInput}
                        value={searchTerm}
                        onChange={handleSearchInput}
                    />
                </div>
            </div>

            <div style={styles.list}>
                {/* 1. SUGGERIMENTI RICERCA */}
                {suggestions.length > 0 && (
                    <>
                        <div style={styles.sectionTitle}>NUOVI CONTATTI</div>
                        {suggestions.map(u => renderUserItem(u, true))}
                    </>
                )}

                {/* 2. CONVERSAZIONI */}
                {filteredExisting.length > 0 && (
                    <>
                        {suggestions.length > 0 && <div style={styles.sectionTitle}>CONVERSAZIONI ATTIVE</div>}
                        {filteredExisting.map(u => renderUserItem(u, false))}
                    </>
                )}

                {/* 3. VUOTO */}
                {suggestions.length === 0 && filteredExisting.length === 0 && (
                    <div style={{padding: '50px 20px', textAlign: 'center', color: '#444', display:'flex', flexDirection:'column', alignItems:'center', gap:'10px'}}>
                        <Icons.Ghost />
                        <span style={{fontSize:'14px', fontStyle:'italic'}}>
                            {searchTerm ? 'Nessun fantasma trovato...' : 'Il vuoto cosmico...'}
                        </span>
                    </div>
                )}
            </div>

            {/* FAB (Floating Action Button) - Solo Mobile */}
            {isMobile && (
                <button style={styles.fab} onClick={() => document.querySelector('input[type="text"]').focus()}>
                    <Icons.Plus />
                </button>
            )}
        </div>
    );
}

export default ConversationList;