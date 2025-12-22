import React, { useState, useEffect, useRef, useContext } from 'react';
import { SocketContext } from '../SocketContext';
import api from '../api';

// Funzione helper orario
const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

function PrivateChatWindow({ partner, onBack, onClose, isMobile }) {
    const socket = useContext(SocketContext);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    // --- 1. RECUPERO MESSAGGI ---
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await api.get(`/pm/conversation/${partner.id_utente}`);
                setMessages(res.data);
            } catch (e) {
                console.error("Errore chat privata:", e);
            }
        };
        fetchMessages();
    }, [partner.id_utente]);

    // --- 2. SOCKET LISTENER ---
    useEffect(() => {
        const handleNewMsg = (msg) => {
            // Aggiungi solo se il messaggio appartiene a QUESTA conversazione
            if (
                (msg.sender_id === partner.id_utente) || 
                (msg.receiver_id === partner.id_utente && msg.sender_id !== partner.id_utente) // Caso raro loopback
            ) {
                setMessages(prev => [...prev, msg]);
            }
        };
        // Ascolta anche i MIEI messaggi inviati per aggiornare la UI istantaneamente
        const handleMySentMsg = (msg) => {
            if (msg.receiver_id === partner.id_utente) {
                setMessages(prev => [...prev, msg]);
            }
        }

        if(socket) {
            socket.on('new_private_message', handleNewMsg);
            socket.on('private_message_sent', handleMySentMsg);
            return () => {
                socket.off('new_private_message', handleNewMsg);
                socket.off('private_message_sent', handleMySentMsg);
            };
        }
    }, [socket, partner.id_utente]);

    // --- 3. AUTO SCROLL ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- 4. INVIO ---
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        
        socket.emit('send_private_message', { 
            receiverId: partner.id_utente, 
            text: newMessage 
        });
        
        setNewMessage("");
        
        // AGGIORNAMENTO LISTA FORZATO (Feedback istantaneo)
        // Se mi hai passato la funzione, la chiamo
        if (onMessageSent) onMessageSent(); 
    };
    // =================================================================================
    // STILI DINAMICI (DESKTOP vs MOBILE)
    // =================================================================================
    
    // Stile Base Desktop
    const desktopStyles = {
        container: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#1e1e24', color: '#bfc0d1' },
        header: { padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
        messagesArea: { flexGrow: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
        inputArea: { padding: '10px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex' },
        input: { flexGrow: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: 'rgba(0,0,0,0.3)', color: 'white', marginRight: '5px' },
        btn: { padding: '8px 15px', borderRadius: '4px', border: 'none', backgroundColor: '#60519b', color: 'white', cursor: 'pointer' },
        
        // Bolle Messaggi
        myMsg: { alignSelf: 'flex-end', backgroundColor: '#3a3a45', padding: '8px 12px', borderRadius: '8px 8px 0 8px', maxWidth: '80%', fontSize: '13px' },
        theirMsg: { alignSelf: 'flex-start', backgroundColor: '#2a2930', padding: '8px 12px', borderRadius: '8px 8px 8px 0', maxWidth: '80%', fontSize: '13px', border: '1px solid #444' }
    };

    // Stile "WhatsApp Dark" per Mobile
    const mobileStyles = {
        container: { 
            display: 'flex', flexDirection: 'column', height: '100%', 
            backgroundColor: '#0b0b0b', // Sfondo Chat scuro (stile whatsapp dark)
            backgroundImage: "url('/backgrounds/chat-pattern.png')", // Opzionale: pattern leggero se vuoi
            backgroundBlendMode: 'overlay'
        },
        header: { 
            padding: '10px 15px', 
            backgroundColor: '#1f1f22', // Header scuro distinto
            borderBottom: '1px solid #333', 
            display: 'flex', alignItems: 'center', gap: '15px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 10
        },
        messagesArea: { 
            flexGrow: 1, padding: '15px', overflowY: 'auto', 
            display: 'flex', flexDirection: 'column', gap: '12px' 
        },
        inputArea: { 
            padding: '10px 15px', 
            backgroundColor: '#1f1f22', 
            borderTop: '1px solid #333', 
            display: 'flex', alignItems: 'center', gap: '10px',
            position: 'sticky', bottom: 0 
        },
        input: { 
            flexGrow: 1, padding: '12px', borderRadius: '20px', 
            border: 'none', backgroundColor: '#2a2a2e', color: 'white', fontSize: '15px'
        },
        btn: { 
            width: '45px', height: '45px', borderRadius: '50%', border: 'none', 
            backgroundColor: '#c9a84a', color: '#000', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
        },

        // Bolle Stile App
        myMsg: { 
            alignSelf: 'flex-end', 
            backgroundColor: '#c9a84a', // Colore Oro/Accento per i miei messaggi
            color: '#000', // Testo scuro su sfondo oro
            padding: '10px 15px', 
            borderRadius: '15px 15px 0 15px', 
            maxWidth: '75%', 
            fontSize: '14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            position: 'relative'
        },
        theirMsg: { 
            alignSelf: 'flex-start', 
            backgroundColor: '#2a2a2e', // Colore Grigio scuro per gli altri
            color: '#fff', 
            padding: '10px 15px', 
            borderRadius: '15px 15px 15px 0', 
            maxWidth: '75%', 
            fontSize: '14px',
            border: '1px solid #333',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }
    };

    const styles = isMobile ? mobileStyles : desktopStyles;

    // --- RENDER ---
    return (
        <div style={styles.container}>
            {/* HEADER */}
            <div style={styles.header}>
                {/* Tasto Indietro (Solo Mobile o se richiesto) */}
                <button 
                    onClick={onBack} 
                    style={{
                        background: 'none', border: 'none', color: isMobile ? '#c9a84a' : '#888', 
                        fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center'
                    }}
                >
                    {isMobile ? '⬅' : '◀'}
                </button>
                
                {/* Info Utente */}
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <img 
                        src={partner.avatar_chat || '/icone/mini_avatar.png'} 
                        alt="" 
                        style={{width:'35px', height:'35px', borderRadius:'50%', objectFit:'cover', border: isMobile ? '1px solid #c9a84a' : 'none'}} 
                    />
                    <span style={{fontWeight:'bold', fontSize: isMobile ? '16px' : '14px', color: isMobile ? '#fff' : '#e6e0ff'}}>
                        {partner.nome_pg}
                    </span>
                </div>

                {/* Tasto Chiudi (Solo Desktop) */}
                {!isMobile && onClose && (
                    <button onClick={onClose} style={{background:'none', border:'none', color:'#888', cursor:'pointer', marginLeft:'auto'}}>✕</button>
                )}
            </div>

            {/* MESSAGGI */}
            <div style={styles.messagesArea}>
                {messages.map((msg, i) => {
                    const isMe = msg.sender_id !== partner.id_utente;
                    return (
                        <div key={i} style={isMe ? styles.myMsg : styles.theirMsg}>
                            <div style={{wordBreak: 'break-word'}}>{msg.text}</div>
                            <div style={{
                                fontSize:'9px', 
                                textAlign:'right', 
                                marginTop:'4px', 
                                opacity: 0.7,
                                color: isMe ? '#222' : '#888' // Colore ora adattato allo sfondo
                            }}>
                                {formatTime(msg.timestamp)}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <form style={styles.inputArea} onSubmit={handleSend}>
                <input 
                    type="text" 
                    placeholder="Scrivi un messaggio..." 
                    style={styles.input}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" style={styles.btn}>➤</button>
            </form>
        </div>
    );
}

export default PrivateChatWindow;