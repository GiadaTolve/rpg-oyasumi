import React, { useState, useEffect, useCallback, useContext } from 'react';
import { SocketContext } from '../SocketContext';
import ConversationList from './ConversationList';
import PrivateChatWindow from './PrivateChatWindow';
import api from '../api';

const styles = {
    dockContainer: {
        position: 'fixed',
        bottom: 0,
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '10px',
        pointerEvents: 'none', // Lascia cliccare il gioco sotto se non sei sopra la chat
    },
    // Wrapper che rende cliccabile la finestra
    windowWrapper: {
        pointerEvents: 'auto',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
        borderRadius: '10px 10px 0 0',
        overflow: 'hidden',
    }
};

function MessagingManager({ isVisible, onClose }) {
    const socket = useContext(SocketContext);
    const [conversations, setConversations] = useState([]);
    const [activeChatUser, setActiveChatUser] = useState(null); 
    const [isMinimized, setIsMinimized] = useState(false);

    // Carica lista conversazioni
    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/pm/conversations');
            setConversations(res.data);
        } catch (error) {
            console.error("Errore PM:", error);
        }
    }, []);

    useEffect(() => {
        if (isVisible) fetchConversations();
    }, [isVisible, fetchConversations]);

    // Ascolta nuovi messaggi per aggiornare la lista o la chat aperta
    useEffect(() => {
        const handleNewMessage = (message) => {
            // Se arriva un messaggio, ricarica la lista per mostrarlo in cima
            fetchConversations(); 
        };
        if(socket) {
            socket.on('new_private_message', handleNewMessage);
            socket.on('private_message_sent', handleNewMessage);
            return () => {
                socket.off('new_private_message', handleNewMessage);
                socket.off('private_message_sent', handleNewMessage);
            };
        }
    }, [socket, fetchConversations]);

    if (!isVisible) return null;

    return (
        <div style={styles.dockContainer}>
            <div style={styles.windowWrapper}>
                {activeChatUser ? (
                    <PrivateChatWindow
                        partner={activeChatUser}
                        onBack={() => setActiveChatUser(null)} // Torna alla lista
                        onClose={onClose} // Chiude tutto
                    />
                ) : (
                    <ConversationList
                        conversations={conversations}
                        onSelectUser={(user) => setActiveChatUser(user)}
                        onClose={onClose}
                    />
                )}
            </div>
        </div>
    );
}

export default MessagingManager;