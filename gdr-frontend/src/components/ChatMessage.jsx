import React from 'react';
import TextParser from './TextParser.jsx';

// --- STILI MESSAGGIO (Dark Fantasy) ---
const styles = {
  messageContainer: { 
    width: '100%',
    marginBottom: '20px', 
    color: '#b3b3c0', 
    position: 'relative',
    paddingLeft: '10px', // Leggero rientro
  },
  
  // HEADER: Data | Nome | Luogo
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '6px',
    fontSize: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)', // Linea sottilissima divisoria
    paddingBottom: '4px',
    width: '100%',
  },
  timestamp: {
    marginRight: '12px',
    fontSize: '10px',
    color: '#666', 
    fontFamily: "'Inter', sans-serif",
  },
  author: { 
    fontFamily: "'Cinzel', serif",
    fontWeight: '700', 
    color: '#c9a84a', // ORO
    marginRight: '10px',
    letterSpacing: '0.5px',
    fontSize: '13px',
  },
  luogoTag: {
    backgroundColor: 'rgba(162, 112, 255, 0.1)', // Viola chiarissimo
    border: '1px solid rgba(162, 112, 255, 0.3)', 
    color: '#a270ff',
    padding: '1px 6px',
    borderRadius: '2px',
    fontSize: '10px',
    fontFamily: "'Inter', sans-serif",
    textTransform: 'uppercase',
  },

  // CONTENUTO: Avatar + Testo
  content: { 
    display: 'flow-root', // Mantiene il float contenuto
  },
  
  // AVATAR: Riquadro Elegante
  avatar: { 
    width: '100px', // Un po' più piccolo per eleganza
    height: '100px', 
    borderRadius: '4px', 
    marginRight: '15px', 
    marginBottom: '5px', 
    
    // Doppio bordo (Immagine + Box Shadow)
    border: '1px solid #c9a84a', 
    boxShadow: '0 0 5px rgba(201, 168, 74, 0.3)',
    
    objectFit: 'cover', 
    float: 'left', 
  },
  
  // TESTO: Inter pulito
  text: { 
    margin: 0, 
    lineHeight: '1.6', 
    whiteSpace: 'pre-wrap', 
    wordBreak: 'break-word', 
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    color: '#7d7f7d', // Grigio quasi bianco per leggibilità
  },

  // TIPI SPECIALI
  dado: { 
    padding: '10px', 
    backgroundColor: 'rgba(20, 20, 25, 0.8)', 
    borderLeft: '3px solid #60519b', 
    color: '#a270ff', 
    fontWeight: 'bold',
    marginTop: '5px',
    borderRadius: '0 4px 4px 0'
  },

  // --- NUOVO STILE SHINIGAMI (MASTERSCREEN) ---
  masterscreenContainer: {
    width: '100%',
    marginBottom: '25px',
    padding: '20px',
    boxSizing: 'border-box',
    backgroundColor: 'rgba(20, 20, 25, 0.4)', // Sfondo scuro leggero
    border: '1px solid rgba(201, 168, 74, 0.3)', // Bordo Oro Sottile
    borderRadius: '4px',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
    position: 'relative',
  },
  masterscreenText: {
    fontFamily: "'Inter', sans-serif",
    fontStyle: 'italic',
    fontSize: '13px',
    color: '#ffe7a3', // Oro pallido per il testo
    lineHeight: '1.7',
    whiteSpace: 'pre-wrap',
    marginBottom: '15px', // Spazio per la firma
  },
  masterscreenSignature: {
    textAlign: 'right',
    fontFamily: "'Cinzel', serif",
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#c9a84a', // Oro più carico
    textTransform: 'uppercase',
    letterSpacing: '1px',
    opacity: 0.8,
  },

  globale: { 
    border: '1px solid #a270ff', 
    background: 'linear-gradient(90deg, rgba(96, 81, 155, 0.2), rgba(0,0,0,0) 50%, rgba(96, 81, 155, 0.2))',
    padding: '15px', 
    color: '#e6e0ff', 
    textAlign: 'center', 
    margin: '20px 0',
    fontFamily: "'Cinzel', serif",
  },
};

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
};

function ChatMessage({ msg }) {

// 1. MESSAGGIO GLOBALE (Admin)
if (msg.tipo === 'globale') {
  return (
    <div style={styles.globale}>
      <strong style={{color:'#a270ff', display:'block', marginBottom:'5px', fontSize:'14px'}}>
          ✦ MESSAGGIO GLOBALE ✦
      </strong>
      <p style={{margin: 0, fontWeight: 'normal', fontFamily: "'Inter', sans-serif"}}>{msg.testo}</p>
    </div>
  );
}

// 2. MESSAGGIO SHINIGAMI (Masterscreen)
// Layout completamente diverso: niente avatar, niente header standard.
if (msg.tipo === 'masterscreen') {
    return (
        <div style={styles.masterscreenContainer}>
            {/* Testo del master */}
            <div style={styles.masterscreenText}>
                <TextParser text={msg.testo} />
            </div>
            
            {/* Firma in basso a destra */}
            <div style={styles.masterscreenSignature}>
                — Shinigami ({msg.autore})
            </div>
        </div>
    );
}

// 3. MESSAGGIO STANDARD (Giocatori)
return (
  <div style={styles.messageContainer}>
      <div style={styles.header}>
          <span style={styles.timestamp}>{formatTimestamp(msg.timestamp)}</span>
          <span style={styles.author}>{msg.autore}</span>
          {msg.luogo && msg.luogo.trim() !== '' && (
              <span style={styles.luogoTag}>{msg.luogo}</span>
          )}
      </div>

      <div style={styles.content}>
          <img 
              src={msg.avatar_url || '/icone/mini_avatar.png'} 
              alt={msg.autore} 
              style={styles.avatar}
          />
          <div style={{...styles.text, ...(msg.tipo === 'dado' ? styles.dado : {})}}>
              {msg.tipo === 'dado' && '🎲 '}
              <TextParser text={msg.testo} />
          </div>
      </div>
  </div>
);
}

export default ChatMessage;