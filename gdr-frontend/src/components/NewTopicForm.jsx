import React, { useState, useRef } from 'react';
import api from '../api';

const styles = {
    overlay: { 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 300, 
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        backdropFilter: 'blur(4px)'
    },
    formContainer: { 
        width: '700px', 
        backgroundColor: '#111', 
        border: '1px solid #a270ff', 
        borderRadius: '8px', 
        padding: '30px', 
        boxShadow: '0 0 30px rgba(162,112,255,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    headerTitle: { 
        fontFamily: "'Cinzel', serif", 
        color: '#c9a84a', 
        textAlign: 'center', 
        marginTop: 0,
        fontSize: '1.8rem',
        textShadow: '0 2px 5px black'
    },
    
    // Campi Input
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: { color: '#a270ff', fontSize: '12px', fontWeight: 'bold', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase' },
    input: { 
        width: '100%', padding: '12px', 
        background: 'rgba(255,255,255,0.05)', 
        border: '1px solid #444', 
        color: 'white', 
        boxSizing: 'border-box', 
        borderRadius: '4px',
        fontFamily: "'Inter', sans-serif",
        fontSize: '14px'
    },
    
    // Toolbar BBCode
    toolbar: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '5px',
        padding: '8px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid #444',
        borderBottom: 'none',
        borderRadius: '4px 4px 0 0',
    },
    toolBtn: {
        background: 'transparent',
        border: '1px solid #555',
        color: '#ccc',
        cursor: 'pointer',
        padding: '4px 8px',
        fontSize: '11px',
        fontWeight: 'bold',
        borderRadius: '3px',
        minWidth: '25px',
        textAlign: 'center',
        fontFamily: 'monospace',
        transition: 'all 0.2s'
    },
    
    textarea: { 
        width: '100%', 
        height: '300px', 
        padding: '10px', 
        background: 'rgba(0,0,0,0.5)', 
        border: '1px solid #444', 
        color: '#e6e0ff', 
        boxSizing: 'border-box', 
        resize: 'vertical',
        borderRadius: '0 0 4px 4px', // Attaccato alla toolbar
        fontFamily: "'Inter', sans-serif",
        lineHeight: '1.5'
    },
    
    // Bottoni Azione
    btnRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' },
    btn: { padding: '10px 25px', cursor: 'pointer', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontFamily: "'Cinzel', serif" },
    btnSubmit: { 
        background: 'linear-gradient(90deg, #60519b, #a270ff)', 
        color: 'white',
        boxShadow: '0 0 10px rgba(162, 112, 255, 0.4)'
    },
    btnCancel: { backgroundColor: '#333', color: '#bbb', border: '1px solid #555' },
    errorMsg: { color: '#ff6b6b', fontSize: '12px', textAlign: 'center' }
};

function NewTopicForm({ bachecaId, onTopicCreated, onCancel }) {
    const [titolo, setTitolo] = useState('');
    const [testo, setTesto] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const textareaRef = useRef(null);

    // Funzione generica per inserire tag
    const insertTag = (openTag, closeTag) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = testo.substring(start, end);
        
        // Inserisce i tag attorno al testo selezionato
        const newText = testo.substring(0, start) + openTag + selectedText + closeTag + testo.substring(end);
        
        setTesto(newText);
        
        // Rimette il focus e sposta il cursore alla fine dell'inserimento
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + openTag.length, end + openTag.length);
        }, 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!titolo.trim() || !testo.trim()) {
            setError("Titolo e contenuto sono obbligatori.");
            return;
        }
        
        setIsSubmitting(true);
        setError('');
        
        try {
            await api.post('/forum/topics', { bacheca_id: bachecaId, titolo, testo });
            onTopicCreated();
        } catch (err) {
            setError(err.response?.data?.message || 'Errore durante la creazione della discussione.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper per l'hover dei bottoni
    const btnHover = (e) => { e.currentTarget.style.borderColor = '#a270ff'; e.currentTarget.style.color = 'white'; };
    const btnOut = (e) => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#ccc'; };

    return (
        <div style={styles.overlay} onClick={onCancel}>
            <div style={styles.formContainer} onClick={e => e.stopPropagation()}>
                <h2 style={styles.headerTitle}>NUOVA DISCUSSIONE</h2>
                
                {error && <p style={styles.errorMsg}>{error}</p>}

                <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>TITOLO</label>
                        <input 
                            type="text" 
                            placeholder="Inserisci il titolo della discussione..." 
                            style={styles.input} 
                            value={titolo} 
                            onChange={e => setTitolo(e.target.value)} 
                            required 
                            autoFocus
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>CONTENUTO</label>
                        
                        {/* --- TOOLBAR COMPLETA --- */}
                        <div style={styles.toolbar}>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[b]', '[/b]')} title="Grassetto"><b>B</b></button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[i]', '[/i]')} title="Corsivo"><i>I</i></button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[u]', '[/u]')} title="Sottolineato"><u>U</u></button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[s]', '[/s]')} title="Barrato"><s>S</s></button>
                            
                            <span style={{borderLeft:'1px solid #444', margin:'0 5px'}}></span>
                            
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[center]', '[/center]')} title="Centrato">≡</button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[quote]', '[/quote]')} title="Citazione">""</button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[code]', '[/code]')} title="Codice">&lt;/&gt;</button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[spoiler]', '[/spoiler]')} title="Spoiler">👁️</button>
                            
                            <span style={{borderLeft:'1px solid #444', margin:'0 5px'}}></span>

                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[img]', '[/img]')} title="Immagine">IMG</button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[url=LINK]', '[/url]')} title="Link">LINK</button>
                            
                            <span style={{borderLeft:'1px solid #444', margin:'0 5px'}}></span>
                            
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[color=red]', '[/color]')} title="Colore Rosso" style={{color:'red', ...styles.toolBtn}}>A</button>
                            <button type="button" style={styles.toolBtn} onMouseEnter={btnHover} onMouseLeave={btnOut} onClick={() => insertTag('[color=#a270ff]', '[/color]')} title="Colore Viola" style={{color:'#a270ff', ...styles.toolBtn}}>A</button>
                        </div>

                        <textarea 
                            ref={textareaRef}
                            style={styles.textarea} 
                            placeholder="Scrivi qui il tuo messaggio..." 
                            value={testo} 
                            onChange={e => setTesto(e.target.value)} 
                            required 
                        />
                    </div>

                    <div style={styles.btnRow}>
                        <button type="button" style={{...styles.btn, ...styles.btnCancel}} onClick={onCancel}>ANNULLA</button>
                        <button type="submit" style={{...styles.btn, ...styles.btnSubmit}} disabled={isSubmitting}>
                            {isSubmitting ? 'PUBBLICAZIONE...' : 'PUBBLICA'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default NewTopicForm;