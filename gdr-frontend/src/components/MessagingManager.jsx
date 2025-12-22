import React, { useState, useEffect, useCallback, useContext } from 'react';
import { SocketContext } from '../SocketContext';
import ConversationList from './ConversationList';
import PrivateChatWindow from './PrivateChatWindow';
import api from '../api';

function MessagingManager({ isVisible, onClose, isMobile, targetUser, onClearTarget }) {
    const socket = useContext(SocketContext);
    
    // Inizializza direttamente con targetUser se presente (Fix apertura da Presenti)
    const [activeChatUser, setActiveChatUser] = useState(targetUser || null); 
    const [conversations, setConversations] = useState([]);

    // Stili dinamici
    const styles = {
        dockContainer: {
            position: 'fixed',
            top: isMobile ? 0 : 'auto', 
            bottom: isMobile ? '60px' : 0, 
            left: isMobile ? 0 : 'auto',
            right: isMobile ? 0 : '20px',
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? 'calc(100% - 60px)' : 'auto',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
            pointerEvents: isMobile ? 'auto' : 'none', 
            backgroundColor: isMobile ? '#050508' : 'transparent', 
        },
        windowWrapper: {
            pointerEvents: 'auto',
            boxShadow: '0 0 20px rgba(0,0,0,0.8)',
            borderRadius: isMobile ? '0' : '10px 10px 0 0',
            overflow: 'hidden',
            width: isMobile ? '100%' : '320px', 
            height: isMobile ? '100%' : '450px', 
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#111',
            border: '1px solid #333'
        }
    };

    // --- 1. GESTIONE TARGET ESTERNO (DA PRESENTI) ---
    useEffect(() => {
        if (targetUser) {
            setActiveChatUser(targetUser);
            // Salviamo questa conversazione "forzatamente" nella lista locale
            updateLocalConversations(targetUser);
            if (onClearTarget) onClearTarget();
        }
    }, [targetUser, onClearTarget]);

    // --- 2. GESTIONE CONVERSAZIONI (CON FALLBACK LOCALSTORAGE) ---
    
    // Funzione per aggiornare la lista locale (Fallback per server error)
    const updateLocalConversations = (userObj) => {
        setConversations(prev => {
            // Rimuovi se esiste già per rimetterlo in cima
            const others = prev.filter(c => c.id_utente !== userObj.id_utente);
            const newItem = {
                id_utente: userObj.id_utente,
                nome_pg: userObj.nome_pg,
                avatar_chat: userObj.avatar_chat,
                last_message: "Chat aperta",
                last_message_timestamp: new Date().toISOString(),
                unread_count: 0
            };
            const newList = [newItem, ...others];
            // Salva nel browser
            localStorage.setItem('cached_conversations', JSON.stringify(newList));
            return newList;
        });
    };

    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/pm/conversations');
            setConversations(res.data);
            // Aggiorniamo la cache se il server risponde bene
            localStorage.setItem('cached_conversations', JSON.stringify(res.data));
        } catch (error) { 
            console.warn("Server PM Error (Using Cache):", error);
            // Se il server fallisce, usiamo la cache locale
            const cached = localStorage.getItem('cached_conversations');
            if (cached) setConversations(JSON.parse(cached));
        }
    }, []);

    useEffect(() => {
        if (isVisible) fetchConversations();
    }, [isVisible, fetchConversations]);

    // Socket Listener
    useEffect(() => {
        if (!socket) return;
        const handleRefresh = () => fetchConversations();
        
        socket.on('new_private_message', handleRefresh);
        socket.on('private_message_sent', handleRefresh);
        
        return () => {
            socket.off('new_private_message', handleRefresh);
            socket.off('private_message_sent', handleRefresh);
        };
    }, [socket, fetchConversations]);

    if (!isVisible) return null;

    return (
        <div style={styles.dockContainer}>
            <div style={styles.windowWrapper}>
                {activeChatUser ? (
                    <PrivateChatWindow
                        partner={activeChatUser}
                        onBack={() => {
                            setActiveChatUser(null);
                            fetchConversations(); 
                        }} 
                        onClose={onClose} 
                        isMobile={isMobile} 
                        // Passiamo una callback per aggiornare la lista quando invii un msg
                        onMessageSent={() => updateLocalConversations(activeChatUser)}
                    />
                ) : (
                    <ConversationList
                        conversations={conversations}
                        onSelectUser={(user) => {
                            setActiveChatUser(user);
                            updateLocalConversations(user); // Metti in cima alla lista
                        }}
                        onClose={onClose}
                        isMobile={isMobile}
                    />
                )}
            </div>
        </div>
    );
}

export default MessagingManager;