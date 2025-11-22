import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { SocketContext } from '../SocketContext.jsx';
import api from '../api.js';
import ChatMessage from './ChatMessage.jsx';
import ShinigamiPanel from './ShinigamiPanel.jsx';

// --- STILI DARK ARCANE ---
const styles = {
  window: { 
    // --- POSIZIONAMENTO GRID (Fondamentale) ---
    gridArea: 'main-content',
    width: '100%', 
    height: '100%',
    margin: 0,
    // ----------------------------------------
    backgroundColor: 'rgba(11, 11, 17, 0.98)', 
    border: '1px solid rgba(162, 112, 255, 0.2)', 
    borderRadius: '5px', 
    display: 'flex', 
    flexDirection: 'column', 
    zIndex: 100, // Livello base (sopra la mappa, sotto le modali)
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)', 
    color: '#b3b3c0', 
    fontFamily: "'Inter', sans-serif",
    overflow: 'hidden' 
  },

  // HEADER
  header: { 
    padding: '0 20px', height: '50px',    
    backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
    backgroundSize: 'cover', backgroundPosition: 'center',
    borderBottom: '1px solid rgba(162, 112, 255, 0.3)', 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, 
  },
  headerTitle: {
    fontFamily: "'Cinzel', serif", fontWeight: '700', color: '#c9a84a', 
    letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '16px',
    textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '10px'
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#b3b3c0', fontFamily: "'Cinzel', serif",
    fontSize: '20px', cursor: 'pointer', transition: 'color 0.2s', padding: '0 5px',
  },

  // LAYOUT INTERNO
  mainContent: { display: 'flex', flexGrow: 1, height: '100%', overflow: 'hidden' },
  
  // COLONNA SX (Info)
  leftColumn: { 
    width: '260px', flexShrink: 0, padding: '20px', 
    borderRight: '1px solid rgba(255,255,255,0.05)', 
    display: 'flex', flexDirection: 'column', 
    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
    overflowY: 'auto' 
  },
  
  // COLONNA DX (Messaggi)
  rightColumn: { 
    flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', 
    backgroundColor: 'transparent' 
  },
  messages: { 
    flexGrow: 1, padding: '20px 40px', overflowY: 'auto', 
    backgroundImage: "url('/backgrounds/darkstone.png')", backgroundRepeat: 'repeat', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0,0,0,0.6)',
    scrollbarWidth: 'thin', scrollbarColor: '#c9a84a transparent'
  },

  // INPUT AREA
  inputArea: { 
    padding: '15px 20px', 
    borderTop: '1px solid rgba(162, 112, 255, 0.2)', 
    backgroundColor: 'rgba(15, 15, 20, 0.95)', 
    flexShrink: 0, position: 'relative' 
  },
  form: { display: 'flex', gap: '10px', alignItems: 'flex-start' },
  luogoInput: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#c9a84a',
    padding: '10px', borderRadius: '4px', fontFamily: "'Cinzel', serif", fontSize: '12px', width: '150px',
    height: '40px', boxSizing: 'border-box', textAlign: 'center'
  },
  messageInput: {
    flexGrow: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e6e0ff',
    padding: '10px', borderRadius: '4px', resize: 'none', fontFamily: "'Inter', sans-serif", fontSize: '14px', 
    boxSizing: 'border-box', height: '40px', lineHeight: '1.4'
  },
  button: {
    padding: '0 25px', border: 'none', borderRadius: '4px', cursor: 'pointer',
    background: 'linear-gradient(90deg, #60519b, #a270ff)', color: 'white',
    fontFamily: "'Cinzel', serif", fontWeight: 'bold', fontSize: '12px', height: '40px', 
    boxSizing: 'border-box', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '1px',
    boxShadow: '0 0 10px rgba(162, 112, 255, 0.3)'
  },

  // BARRA STRUMENTI (Sotto l'input)
  bottomBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingLeft: '160px' }, // paddingLeft allinea con input
  toolsLeft: { display: 'flex', gap: '8px' },
  
  iconButton: {
    backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', width: '30px', height: '30px',
    padding: '0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', transition: 'all 0.2s ease',
  },
  icon: { width: '18px', height: '18px', filter: 'invert(0.7)' },

  // ELEMENTI SIDEBAR
  chatImage: { 
    width: '100%', height: '140px', objectFit: 'cover', borderRadius: '4px', marginBottom: '15px',
    border: '1px solid rgba(162, 112, 255, 0.3)', filter: 'sepia(0.2) brightness(0.9)',
  },
  descriptionBox: { fontSize: '12px', color: '#b3b3c0', flexGrow: 1, lineHeight: '1.6', fontStyle: 'italic', marginBottom: '15px' },
  
  toolButton: {
      width: '100%', padding: '10px', marginBottom: '15px',
      background: 'linear-gradient(90deg, rgba(201, 168, 74, 0.1), rgba(201, 168, 74, 0.05))',
      border: '1px solid #c9a84a', borderRadius: '4px', color: '#c9a84a',
      fontFamily: "'Cinzel', serif", fontWeight: 'bold', fontSize: '11px', cursor: 'pointer',
      textTransform: 'uppercase', letterSpacing: '1px', transition: 'all 0.3s ease',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  },
  
  presentiBox: { 
    backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '4px', marginTop: 'auto',
    border: '1px solid rgba(255,255,255,0.05)', 
  },
  presentiTitle: { color: '#c9a84a', fontSize: '11px', fontFamily: "'Cinzel', serif", borderBottom:'1px solid rgba(255,255,255,0.1)', paddingBottom:'5px', marginBottom:'5px', fontWeight:'bold' },
  presentiList: { listStyle: 'none', padding: 0, margin: 0, fontFamily: "'Inter', sans-serif", color: '#b3b3c0', fontSize: '12px' },
  
  charCounter: { fontSize: '10px', color: '#555', fontFamily: 'monospace' },

  // MENU DADI
  diceDropdownContainer: { position: 'relative' },
  diceDropdownMenu: { 
    position: 'absolute', bottom: '110%', left: 0, backgroundColor: '#1a1a1a', border: '1px solid #c9a84a',
    borderRadius: '4px', padding: '5px', display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 110, boxShadow: '0 0 10px rgba(0,0,0,0.8)'
  },
  diceButton: {
    width: '100px', padding: '8px', cursor: 'pointer', backgroundColor: 'transparent', border: 'none',
    color: '#c9a84a', fontFamily: "'Cinzel', serif", fontSize: '12px', textAlign: 'left',
  },
};

function ChatWindow({ chat, onClose, user }) {
  const socket = useContext(SocketContext);
  const [locationDetails, setLocationDetails] = useState(null);
  const [masterNotes, setMasterNotes] = useState('');
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [currentLuogo, setCurrentLuogo] = useState("");
  
  const [showDiceMenu, setShowDiceMenu] = useState(false);
  const [globalGifKey, setGlobalGifKey] = useState(0);
  const [isShinigamiPanelOpen, setIsShinigamiPanelOpen] = useState(false);
  const [activeQuest, setActiveQuest] = useState(null);

  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const fetchLocationDetails = async () => { try { const response = await api.get(`/locations/${chat.id}`); setLocationDetails(response.data); setMasterNotes(response.data.master_notes || ''); } catch (error) { console.error("Errore recupero dettagli location", error); } };
    const fetchHistory = async () => { try { const response = await api.get(`/chat/${chat.id}/history`); setMessages(response.data); } catch (error) { console.error("Impossibile caricare la cronologia", error); } };
    fetchLocationDetails(); fetchHistory();
    socket.emit('join_chat', chat.id);
    const handleNewMessage = (data) => { if (data.tipo === 'globale' || data.chatId === chat.id) setMessages(prev => [...prev, data]); };
    const handleRoomUsersUpdate = (users) => setUsersInRoom(users);
    socket.on('new_message', handleNewMessage);
    socket.on('room_users_update', handleRoomUsersUpdate);
    return () => { socket.emit('leave_chat', chat.id); socket.off('new_message', handleNewMessage); socket.off('room_users_update', handleRoomUsersUpdate); };
  }, [socket, chat.id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) { container.scrollTop = container.scrollHeight; }
  }, [messages]);

  const handleSendMessage = (messageType) => {
    if (currentMessage.trim() === "") return;
    const finalMessageType = (activeQuest && ['MASTER', 'ADMIN'].includes(user.permesso) && messageType === 'azione') ? 'masterscreen' : messageType;
    const messageData = { chatId: chat.id, testo: currentMessage, tipo: finalMessageType, luogo: currentLuogo, quest_id: activeQuest ? activeQuest.questId : null };
    socket.emit('send_message', messageData);
    setCurrentMessage("");
  };

  const handleFormSubmit = (e) => { e.preventDefault(); handleSendMessage('azione'); };
  const handleSaveNotes = async () => { try { await api.put(`/chats/${chat.id}/notes`, { master_notes: masterNotes }); alert('Note salvate!'); } catch (error) { console.error("Errore salvataggio note", error); } };
  
  const handleDiceRoll = (diceType) => { socket.emit('roll_dice', { chatId: chat.id, diceType: diceType }); setShowDiceMenu(false); };
  const handleGlobalClick = () => { handleSendMessage('globale'); setGlobalGifKey(prevKey => prevKey + 1); };
  const handleQuestStart = (questData) => { setActiveQuest(questData); setIsShinigamiPanelOpen(false); };
  const handleQuestEnd = () => { setActiveQuest(null); };

  const handleToolClick = () => { alert("Funzionalità Skill/Oggetti in arrivo!"); };

  return (
    // NOTA: La posizione è gestita da gridArea in styles.window
    <div style={styles.window}>
      {isShinigamiPanelOpen && <ShinigamiPanel onClose={() => setIsShinigamiPanelOpen(false)} participants={usersInRoom} user={user} activeQuest={activeQuest} onQuestStart={handleQuestStart} onQuestEnd={handleQuestEnd} />}
      
      <div style={styles.header}>
        <div style={styles.headerTitle}>
             <span style={{color:'#60519b'}}>💬</span>
             {locationDetails?.name || chat.name}
             {activeQuest && <span style={{color:'#ff4d4d', fontSize:'10px', border:'1px solid #ff4d4d', padding:'2px 5px', borderRadius:'3px'}}>QUEST ATTIVA</span>}
        </div>
        <button style={styles.closeBtn} onClick={() => onClose(chat.id)}>✕</button>
      </div>

      <div style={styles.mainContent}>
        {/* COLONNA SX */}
        <div style={styles.leftColumn}>
          <img src={locationDetails?.image_url || '/placeholder.jpg'} alt={locationDetails?.name} style={styles.chatImage} />
          <div style={styles.descriptionBox}>{locationDetails?.description || 'Nessuna descrizione.'}</div>
          
          <button style={styles.toolButton} onClick={handleToolClick}>
              <span>✦ SKILL & ITEMS</span>
          </button>

          {['MASTER', 'ADMIN'].includes(user.permesso) && (
             <div style={{marginBottom:'15px', display:'flex', flexDirection:'column', gap:'5px'}}>
                <textarea 
                    style={{...styles.messageInput, height:'60px', fontSize:'11px'}} 
                    value={masterNotes} onChange={(e) => setMasterNotes(e.target.value)} 
                    placeholder="Note Master..."
                />
                <button onClick={handleSaveNotes} style={{...styles.button, height:'25px', fontSize:'10px', padding:'0'}}>SALVA NOTE</button>
             </div>
          )}
          
          <div style={styles.presentiBox}>
              <div style={styles.presentiTitle}>PRESENTI ({usersInRoom.length})</div>
              <ul style={styles.presentiList}>
                  {usersInRoom.map(u => <li key={u.id}>• {u.nome_pg}</li>)}
              </ul>
          </div>
        </div>

         {/* COLONNA DX (Chat & Input) */}
         <div style={styles.rightColumn}>
          <div style={styles.messages} ref={messagesContainerRef}>
            {messages.map((msg, i) => <ChatMessage key={i} msg={msg} />)}
          </div>
          
          <div style={styles.inputArea}>
            <form onSubmit={handleFormSubmit} style={styles.form}>
                <input
                    type="text" placeholder="Luogo..." style={styles.luogoInput}
                    value={currentLuogo} onChange={(e) => setCurrentLuogo(e.target.value)}
                />
                <textarea 
                    placeholder="Scrivi la tua azione..." style={styles.messageInput} 
                    value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleFormSubmit(e); } }}
                    rows="1"
                />
                <button type="submit" style={styles.button}>INVIA</button>
            </form>
            
            <div style={styles.bottomBar}>
              <div style={styles.toolsLeft}>
                  {/* DADI */}
                  <div style={styles.diceDropdownContainer}>
                    <button style={styles.iconButton} onClick={() => setShowDiceMenu(!showDiceMenu)} title="Dadi">
                        <img src="/buttons/chat/dice-cube.png" alt="Dadi" style={styles.icon} />
                    </button>
                    {showDiceMenu && (
                      <div style={styles.diceDropdownMenu}>
                        <button style={styles.diceButton} onClick={() => handleDiceRoll(6)}>D6</button>
                        <button style={styles.diceButton} onClick={() => handleDiceRoll(10)}>D10</button>
                        <button style={styles.diceButton} onClick={() => handleDiceRoll(20)}>D20</button>
                        <button style={styles.diceButton} onClick={() => handleDiceRoll(100)}>D100</button>
                      </div>
                    )}
                  </div>
                  
                  {/* SHINIGAMI */}
                  {['MASTER', 'ADMIN'].includes(user.permesso) && (
                    <button style={styles.iconButton} title="Shinigami" onClick={() => setIsShinigamiPanelOpen(true)}>
                        <img src="/buttons/chat/shinigamitool.png" alt="Shinigami" style={styles.icon} />
                    </button>
                  )}
                  
                  {/* GLOBALE */}
                  {user.permesso === 'ADMIN' && (
                    <button style={styles.iconButton} title="Globale" onClick={handleGlobalClick}>
                        <img src="/buttons/chat/mondalmessage.png" key={globalGifKey} alt="Globale" style={styles.icon} />
                    </button>
                  )}
              </div>
              <span style={styles.charCounter}>{currentMessage.length} CARATTERI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;