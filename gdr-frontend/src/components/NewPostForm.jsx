import React, { useRef } from 'react';

const styles = {
    form: { marginTop: '10px', padding: '0' },
    bbcodePanel: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '5px', display: 'flex', gap: '5px', borderBottom: 'none' },
    bbcodeButton: { background: 'transparent', border: '1px solid #666', color: '#bbb', cursor: 'pointer', padding: '2px 8px', fontSize:'11px' },
    textarea: { 
        width: '100%', boxSizing: 'border-box', padding: '10px', 
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
        color: '#e6e0ff', fontFamily: "'Inter', sans-serif", fontSize: '13px', minHeight: '100px' 
    },
    button: { 
        marginTop: '10px', padding: '10px 20px', border: '1px solid #a270ff', borderRadius: '4px', cursor: 'pointer', 
        backgroundColor: 'rgba(162, 112, 255, 0.2)', color: '#e6e0ff', fontWeight: 'bold', fontFamily: "'Cinzel', serif" 
    },
};

function NewPostForm({ text, setText, isSubmitting, error, onSubmit }) {
    const textareaRef = useRef(null);
    const applyBBCode = (tag) => {
        const textarea = textareaRef.current;
        const start = textarea.selectionStart; const end = textarea.selectionEnd;
        const newText = `${text.substring(0, start)}[${tag}]${text.substring(start, end)}[/${tag}]${text.substring(end)}`;
        setText(newText); textarea.focus();
    };

    return (
        <form onSubmit={onSubmit} style={styles.form}>
            {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
            <div style={styles.bbcodePanel}>
                <button type="button" style={styles.bbcodeButton} onClick={() => applyBBCode('b')}><b>B</b></button>
                <button type="button" style={styles.bbcodeButton} onClick={() => applyBBCode('i')}><i>I</i></button>
                <button type="button" style={styles.bbcodeButton} onClick={() => applyBBCode('quote')}>QUOTE</button>
            </div>
            <textarea ref={textareaRef} style={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi la tua risposta..." required />
            <button type="submit" style={styles.button} disabled={isSubmitting}>{isSubmitting ? 'INVIO...' : 'INVIA RISPOSTA'}</button>
        </form>
    );
}
export default NewPostForm;