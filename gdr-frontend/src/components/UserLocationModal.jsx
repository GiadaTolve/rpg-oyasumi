import React, { useMemo } from 'react';
import api from '../api';

const styles = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 2000,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(4px)',
    },
    modal: {
        width: '500px',
        maxHeight: '80vh', // Altezza massima
        backgroundColor: 'rgba(15, 15, 20, 0.98)',
        border: '1px solid #c9a84a',
        borderRadius: '8px',
        padding: '25px',
        boxShadow: '0 0 30px rgba(201, 168, 74, 0.2)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', sans-serif", color: '#b3b3c0',
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute', top: '10px', right: '15px',
        background: 'none', border: 'none', color: '#b3b3c0', fontSize: '24px', cursor: 'pointer',
    },
    title: {
        fontFamily: "'Cinzel', serif", fontSize: '22px', color: '#c9a84a', 
        textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px',
        textTransform: 'uppercase', letterSpacing: '2px',
    },
    scrollArea: {
        overflowY: 'auto',
        paddingRight: '10px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#a270ff transparent',
    },
    
    // Gruppo Luogo
    locationGroup: { marginBottom: '20px' },
    locationHeader: {
        fontFamily: "'Cinzel', serif",
        fontSize: '16px',
        color: '#e6e0ff', // Viola chiaro
        fontWeight: 'bold',
        cursor: 'pointer',
        padding: '8px',
        backgroundColor: 'rgba(162, 112, 255, 0.1)',
        border: '1px solid rgba(162, 112, 255, 0.3)',
        borderRadius: '4px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.2s',
    },
    userList: {
        listStyle: 'none', padding: '0 0 0 15px', margin: '10px 0 0 0',
        borderLeft: '2px solid rgba(255,255,255,0.05)',
    },
    userItem: {
        padding: '4px 0',
        fontSize: '14px',
        color: '#b3b3c0',
        display: 'flex', alignItems: 'center', gap: '8px',
    },
    avatarMini: {
        width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #555'
    }
};

function UserLocationModal({ onlineUsers, onClose, onJoinChat }) {
    
    // Raggruppa gli utenti per Location
    const groupedUsers = useMemo(() => {
        const groups = {};
        
        onlineUsers.forEach(user => {
            // Se l'utente ha una location, usa quella, altrimenti "In Viaggio"
            const locName = user.location ? user.location.name : "In Esplorazione (Mappa)";
            const locId = user.location ? user.location.id : null;
            const isChat = user.location ? (user.location.type === 'CHAT') : false;

            if (!groups[locName]) {
                groups[locName] = {
                    id: locId,
                    name: locName,
                    isChat: isChat,
                    users: []
                };
            }
            groups[locName].users.push(user);
        });
        
        return Object.values(groups); // Ritorna array di gruppi
    }, [onlineUsers]);

    // Gestisce il click sul nome del luogo
    const handleLocationClick = async (group) => {
        if (group.isChat && group.id) {
            // Recupera info complete e apre la chat
            try {
                const response = await api.get(`/locations/${group.id}`);
                onJoinChat(response.data);
                onClose(); // Chiudi la modale
            } catch (e) { console.error("Errore join:", e); }
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button style={styles.closeBtn} onClick={onClose}>×</button>
                <div style={styles.title}>Lista Presenti</div>
                
                <div style={styles.scrollArea}>
                    {groupedUsers.map((group, index) => (
                        <div key={index} style={styles.locationGroup}>
                            {/* Header del Luogo (Cliccabile se è una chat) */}
                            <div 
                                style={{
                                    ...styles.locationHeader, 
                                    cursor: group.isChat ? 'pointer' : 'default',
                                    borderColor: group.isChat ? '#a270ff' : '#444',
                                    opacity: group.isChat ? 1 : 0.7
                                }}
                                onClick={() => handleLocationClick(group)}
                                onMouseEnter={(e) => { if(group.isChat) e.currentTarget.style.backgroundColor = 'rgba(162, 112, 255, 0.2)'; }}
                                onMouseLeave={(e) => { if(group.isChat) e.currentTarget.style.backgroundColor = 'rgba(162, 112, 255, 0.1)'; }}
                            >
                                <span>{group.isChat ? '📍' : '🗺️'} {group.name}</span>
                                <span style={{fontSize:'12px', opacity: 0.7}}>{group.users.length}</span>
                            </div>

                            {/* Lista Utenti nel Luogo */}
                            <ul style={styles.userList}>
                                {group.users.map(u => (
                                    <li key={u.id} style={styles.userItem}>
                                        <img src={u.avatar_chat || '/icone/mini_avatar.png'} style={styles.avatarMini} alt="" />
                                        {u.nome_pg}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    
                    {groupedUsers.length === 0 && (
                        <div style={{textAlign: 'center', fontStyle: 'italic'}}>Nessuno online... (sei solo?)</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UserLocationModal;