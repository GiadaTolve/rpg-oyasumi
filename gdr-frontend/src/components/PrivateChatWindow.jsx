import React, { useState, useEffect, useRef, useContext } from 'react';
import { SocketContext } from '../SocketContext';
import api from '../api';

const styles = {
    window: {
        width: '350px',
        height: '500px',
        backgroundColor: '#111',
        // Sfondo Darkstone
        backgroundImage: "url('/backgrounds/darkstone.png')",
        backgroundRepeat: 'repeat',
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
        padding: '10px 15px',
        // Sfondo Cloudy
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#e6e0ff',
        flexShrink: 0,
    },
    headerInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
    avatar: { width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #c9a84a', objectFit: 'cover' },
    partnerName: { fontFamily: "'Cinzel', serif", fontWeight: 'bold', fontSize:'14px' },
    
    messagesArea: {
        flexGrow: 1,
        padding: '15px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: 'rgba(0,0,0,0.6)', // Velo scuro sopra la texture
        scrollbarWidth: 'thin',
        scrollbarColor: '#c9a84a transparent'
    },
    
    // BUBBLES (Stile WhatsApp Arcane)
    bubble: {
        maxWidth: '75%',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '13px',
        lineHeight: '1.4',
        position: 'relative',
        wordWrap: 'break-word',
        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
    },
    
    // VARIANTI BUBBLE
    myMsgOn: { alignSelf: 'flex-end', backgroundColor: 'rgba(96, 81, 155, 0.6)', border: '1px solid #60519b', color: 'white', borderRadius: '8px 0 8px 8px' },
    myMsgOff: { alignSelf: 'flex-end', backgroundColor: '#2a2a2a', color: '#aaa', border: '1px solid #444', borderRadius: '8px 0 8px 8px', fontStyle: 'italic' },
    
    theirMsgOn: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', color: '#e6e0ff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0 8px 8px 8px' },
    theirMsgOff: { alignSelf: 'flex-start', backgroundColor: '#111', color: '#666', border: '1px dashed #333', borderRadius: '0 8px 8px 8px', fontStyle: 'italic' },

    // INPUT AREA
    inputContainer: {
        padding: '10px',
        backgroundColor: '#151515',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    toggleRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer'
    },
    toggleLabel: { fontSize: '10px', fontWeight: 'bold', fontFamily: "'Cinzel', serif", letterSpacing:'1px' },
    toggleIndicator: { 
        width: '26px', height: '12px', borderRadius: '10px', position: 'relative', transition: 'background 0.3s',
        display: 'inline-block',
    },
    toggleKnob: {
        width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '2px', transition: 'left 0.3s',
    },

    form: { display: 'flex', gap: '8px' },
    input: {
        flexGrow: 1,
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #444',
        backgroundColor: '#222',
        color: 'white',
        fontFamily: 'inherit',
        outline: 'none',
        fontSize: '13px'
    },
    sendBtn: {
        backgroundColor: '#c9a84a',
        color: 'black',
        border: 'none',
        borderRadius: '4px',
        width: '40px', 
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '18px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 10px rgba(201, 168, 74, 0.2)'
    }
};

function PrivateChatWindow({ partner, onClose, onBack }) {
    const socket = useContext(SocketContext);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isOffGame, setIsOffGame] = useState(false);
    const messagesEndRef = useRef(null);
    
    const myId = JSON.parse(atob(localStorage.getItem('gdr_token').split('.')[1])).id;

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get(`/pm/conversation/${partner.id_utente}`);
                setMessages(res.data);
            } catch (error) { console.error(error); }
        };
        fetchHistory();
    }, [partner.id_utente]);

    useEffect(() => {
        const handleNewMessage = (message) => {
            if (message.sender_id === partner.id_utente || message.receiver_id === partner.id_utente) {
                setMessages(prev => [...prev, message]);
            }
        };
        if(socket) {
            socket.on('new_private_message', handleNewMessage);
            socket.on('private_message_sent', handleNewMessage);
            return () => {
                socket.off('new_private_message', handleNewMessage);
                socket.off('private_message_sent', handleNewMessage);
            };
        }
    }, [socket, partner.id_utente]);

    const handleSend = (e) => {
        e.preventDefault();
        if (newMessage.trim()) {
            const finalMessage = isOffGame ? `[OFF] ${newMessage}` : newMessage;
            socket.emit('send_private_message', { receiverId: partner.id_utente, text: finalMessage });
            setNewMessage('');
        }
    };

    return (
        <div style={styles.window}>
            <div style={styles.header}>
                <div style={styles.headerInfo}>
                    <button onClick={onBack} style={{background:'none', border:'none', color:'#c9a84a', cursor:'pointer', fontSize:'18px'}}>❮</button>
                    <img src={partner.avatar_chat || '/icone/mini_avatar.png'} style={styles.avatar} alt="" />
                    <span style={styles.partnerName}>{partner.nome_pg}</span>
                </div>
                <button onClick={onClose} style={{background:'none', border:'none', color:'#888', cursor:'pointer'}}>✕</button>
            </div>

            <div style={styles.messagesArea}>
                {messages.map(msg => {
                    const isMe = msg.sender_id === myId;
                    const isMsgOff = msg.text.startsWith('[OFF] ');
                    const cleanText = isMsgOff ? msg.text.replace('[OFF] ', '') : msg.text;

                    let bubbleStyle = {};
                    if (isMe) bubbleStyle = isMsgOff ? styles.myMsgOff : styles.myMsgOn;
                    else bubbleStyle = isMsgOff ? styles.theirMsgOff : styles.theirMsgOn;

                    return (
                        <div key={msg.id} style={{ ...styles.bubble, ...bubbleStyle }}>
                            {isMsgOff && <span style={{fontSize:'9px', opacity:0.7, display:'block', marginBottom:'2px', color: isMe ? '#666' : '#555'}}>OFF GAME</span>}
                            {cleanText}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <div style={styles.inputContainer}>
                <div style={styles.toggleRow} onClick={() => setIsOffGame(!isOffGame)}>
                    
                    {/* --- CORREZIONE QUI SOTTO: Unico attributo style --- */}
                    <span style={{...styles.toggleLabel, color: isOffGame ? '#aaa' : '#c9a84a'}}>
                        {isOffGame ? "OFF GAME" : "ON GAME"}
                    </span>
                    
                    <div style={{...styles.toggleIndicator, backgroundColor: isOffGame ? '#444' : '#c9a84a'}}>
                        <div style={{...styles.toggleKnob, left: isOffGame ? '2px' : '16px'}}></div>
                    </div>
                </div>

                <form onSubmit={handleSend} style={styles.form}>
                    <input
                        style={{...styles.input, fontStyle: isOffGame ? 'italic' : 'normal'}}
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={isOffGame ? "Scrivi in Off..." : "Scrivi azione..."}
                    />
                    <button type="submit" style={styles.sendBtn}>➤</button>
                </form>
            </div>
        </div>
    );
}

export default PrivateChatWindow;