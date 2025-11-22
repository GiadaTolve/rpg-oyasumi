import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

// --- STILI ---
const styles = {
  window: { position: 'absolute', width: '700px', minHeight: '650px', backgroundColor: 'rgba(11, 11, 17, 0.98)', border: '1px solid rgba(162, 112, 255, 0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', zIndex: 200, boxShadow: '0 10px 50px rgba(0, 0, 0, 0.9)', color: '#b3b3c0', fontFamily: "'Inter', sans-serif", overflow: 'hidden' },
  header: { padding: '0 20px', height: '45px', backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')", backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid rgba(162, 112, 255, 0.3)', cursor: 'move', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, fontFamily: "'Cinzel', serif", fontWeight: '700', color: '#c9a84a', letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '16px', textTransform: 'uppercase' },
  closeBtn: { background: 'none', border: 'none', color: '#b3b3c0', fontFamily: "'Cinzel', serif", fontSize: '20px', cursor: 'pointer', transition: 'color 0.2s', padding: '0 5px' },
  contentArea: { flexGrow: 1, overflowY: 'auto', padding: '20px', backgroundImage: "url('/backgrounds/darkstone.png')", backgroundRepeat: 'repeat', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0,0,0,0.8)', scrollbarWidth: 'thin', scrollbarColor: '#c9a84a transparent' },
  idPanel: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  avatarContainer: { position: 'relative', width: '180px', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: '160px', height: '160px', objectFit: 'cover', borderRadius: '50%', border: '3px solid #c9a84a', boxShadow: '0 0 20px rgba(201, 168, 74, 0.4)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', width: '100%', backgroundColor: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(162, 112, 255, 0.2)' },
  statItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '5px' },
  statLabel: { fontFamily: "'Cinzel', serif", color: '#c9a84a', fontSize: '12px' },
  statValue: { fontFamily: "'Inter', sans-serif", color: '#e6e0ff', fontWeight: 'bold' },
  genericPanel: { padding: '10px', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px', color: '#dcdcdc', textAlign: 'justify' },
  sectionTitle: { fontFamily: "'Cinzel', serif", color: '#c9a84a', fontSize: '20px', borderBottom: '1px solid #c9a84a', paddingBottom: '10px', marginBottom: '15px', textAlign: 'center' },
  footerTabs: { 
    display: 'flex', 
    borderTop: '1px solid rgba(162, 112, 255, 0.3)',
    backgroundColor: 'rgba(0,0,0,0.9)'
},
tabButton: { 
    flexGrow: 1, 
    padding: '15px', 
    backgroundColor: 'transparent', 
    
    // INVECE DI border: 'none', usiamo proprietà esplicite
    borderTop: '2px solid transparent', // Riserva lo spazio per l'active
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: '1px solid rgba(255,255,255,0.05)', 
    
    color: '#888', 
    cursor: 'pointer', 
    fontSize: '12px', 
    fontFamily: "'Cinzel', serif", 
    fontWeight: 'bold',
    transition: 'all 0.3s', 
    textTransform: 'uppercase', 
    letterSpacing: '1px'
},
activeTab: { 
    backgroundColor: 'rgba(162, 112, 255, 0.1)', 
    color: '#c9a84a', 
    // Qui sovrascriviamo solo il Top, che è già definito sopra come transparent
    borderTop: '2px solid #c9a84a' 
},
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', color: '#c9a84a', fontFamily: "'Cinzel', serif", fontSize: '12px' },
  input: { width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e6e0ff', borderRadius: '4px', fontFamily: "'Inter', sans-serif" },
  textarea: { width: '100%', minHeight: '200px', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e6e0ff', borderRadius: '4px', fontFamily: "'Inter', sans-serif", resize: 'vertical' },
  saveBtn: { backgroundColor: 'rgba(40, 167, 69, 0.2)', border: '1px solid #28a745', color: '#28a745' },
  cancelBtn: { backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid #666', color: '#bbb' }
};

function SchedaPersonaggio({ user, targetUser, onClose }) {
    const [schedaData, setSchedaData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ID');
    const [errorMsg, setErrorMsg] = useState('');
    
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedProfile, setEditedProfile] = useState({ avatar: '', avatar_chat: '', background: '' });

    const [position, setPosition] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const windowWidth = 700; const windowHeight = 650;
        setPosition({ x: (window.innerWidth - windowWidth) / 2, y: (window.innerHeight - windowHeight) / 2 });
    }, []);

    const fetchScheda = useCallback(async () => {
        try {
            setLoading(true);
            setErrorMsg('');
            
            let endpoint = '/scheda'; // Default: la mia scheda
            
            // Se c'è un targetUser, costruiamo l'URL per l'API pubblica
            if (targetUser) {
                const targetId = targetUser.id || targetUser.id_utente;
                if (targetId) {
                    endpoint = `/scheda/${targetId}`;
                } else {
                    console.warn("ID Target mancante");
                }
            }
            
            const response = await api.get(endpoint);
            setSchedaData(response.data);
            
            // Se è la mia scheda, preparo il form di edit
            const myId = user.id || user.id_utente;
            const fetchedId = response.data.id_utente || response.data.id;
            
            if (String(myId) === String(fetchedId)) {
                setEditedProfile({
                    avatar: response.data.avatar || '',
                    avatar_chat: response.data.avatar_chat || '',
                    background: response.data.background || ''
                });
            }

        } catch (error) {
            console.error("Errore fetch scheda:", error);
            setErrorMsg("Impossibile caricare i dati.");
        } finally {
            setLoading(false);
        }
    }, [targetUser, user]);

    useEffect(() => { fetchScheda(); }, [fetchScheda]);

    // --- GESTIONE MODIFICA ---
    const handleEditChange = (e) => setEditedProfile({ ...editedProfile, [e.target.name]: e.target.value });
    const handleProfileSave = async () => {
        try {
            const response = await api.put('/scheda/profilo', editedProfile);
            setSchedaData(response.data); 
            setIsEditMode(false);
        } catch (error) { alert("Errore salvataggio."); }
    };
    const handleCancelEdit = () => setIsEditMode(false);

    // --- DRAG AND DROP ---
    const handleMouseDown = useCallback((e) => { setIsDragging(true); dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }; }, [position]);
    const handleMouseMove = useCallback((e) => { if (isDragging) setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); }, [isDragging]);
    const handleMouseUp = useCallback(() => setIsDragging(false), []);
    useEffect(() => { if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp); } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); }; }, [isDragging, handleMouseMove, handleMouseUp]);
    
    if (!position) return null;

    // --- RENDER LOADING / ERROR ---
    if (loading) return <div style={{...styles.window, left: `${position.x}px`, top: `${position.y}px`, padding: '20px', justifyContent:'center', alignItems:'center'}}>Caricamento dati...</div>;
    
    if (errorMsg || !schedaData) return (
        <div style={{...styles.window, left: `${position.x}px`, top: `${position.y}px`}}>
            <div style={styles.header} onMouseDown={handleMouseDown}><span>ERRORE</span><button onClick={onClose} style={styles.closeBtn}>✕</button></div>
            <div style={{padding:'20px', textAlign:'center', color:'#ff6b6b'}}>{errorMsg || "Dati non trovati"}</div>
        </div>
    );

    // --- PERMESSI ---
    const myId = user.id || user.id_utente;
    const fetchedId = schedaData.id_utente || schedaData.id;
    const canEdit = (String(myId) === String(fetchedId)) || user.permesso === 'ADMIN';

    const renderContent = () => {
        if (isEditMode) {
            return (
                <div>
                    <div style={styles.sectionTitle}>Modifica Profilo</div>
                    <div style={styles.formGroup}><label style={styles.label}>Avatar Grande</label><input style={styles.input} type="text" name="avatar" value={editedProfile.avatar} onChange={handleEditChange} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Avatar Piccolo</label><input style={styles.input} type="text" name="avatar_chat" value={editedProfile.avatar_chat} onChange={handleEditChange} /></div>
                    <div style={styles.formGroup}><label style={styles.label}>Background</label><textarea style={styles.textarea} name="background" value={editedProfile.background} onChange={handleEditChange}></textarea></div>
                </div>
            );
        }
        if (activeTab === 'ID') {
            return (
                <div style={styles.idPanel}>
                    <div style={styles.avatarContainer}><img src={schedaData.avatar || '/placeholder_avatar_grande.jpg'} alt="Av" style={styles.avatar} /></div>
                    <div style={styles.statsGrid}>
                        <div style={styles.statItem}><span style={styles.statLabel}>LIVELLO</span><span style={styles.statValue}>{schedaData.livello}</span></div>
                        <div style={styles.statItem}><span style={styles.statLabel}>EXP</span><span style={styles.statValue}>{schedaData.exp}</span></div>
                        <div style={styles.statItem}><span style={styles.statLabel}>REM</span><span style={styles.statValue}>{schedaData.rem || 0}</span></div>
                        <div style={styles.statItem}><span style={styles.statLabel}>NOME</span><span style={styles.statValue}>{schedaData.nome_pg}</span></div>
                    </div>
                </div>
            );
        }
        if (activeTab === 'Background') return <div style={styles.genericPanel}><div style={styles.sectionTitle}>STORIA</div><p>{schedaData.background || "Nessun dato."}</p></div>;
        return <div style={styles.genericPanel}><div style={styles.sectionTitle}>{activeTab}</div><p style={{textAlign:'center'}}>In sviluppo.</p></div>;
    };

    return (
        <div style={{ ...styles.window, left: `${position.x}px`, top: `${position.y}px` }}>
            <div style={styles.header} onMouseDown={handleMouseDown}>
                <span>SCHEDA: {schedaData.nome_pg}</span>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.contentArea}>{renderContent()}</div>
            <div style={styles.footerTabs}>
                {isEditMode ? (
                    <>
                        <button style={{...styles.tabButton, ...styles.saveBtn}} onClick={handleProfileSave}>SALVA</button>
                        <button style={{...styles.tabButton, ...styles.cancelBtn}} onClick={handleCancelEdit}>ANNULLA</button>
                    </>
                ) : (
                    <>
                        <button style={activeTab === 'ID' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton} onClick={() => setActiveTab('ID')}>ID</button>
                        <button style={activeTab === 'Background' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton} onClick={() => setActiveTab('Background')}>STORIA</button>
                        <button style={activeTab === 'Skills' ? {...styles.tabButton, ...styles.activeTab} : styles.tabButton} onClick={() => setActiveTab('Skills')}>SKILLS</button>
                        {canEdit && <button style={{...styles.tabButton, color:'#a270ff'}} onClick={() => setIsEditMode(true)}>✎ EDIT</button>}
                    </>
                )}
            </div>
        </div>
    );
}

export default SchedaPersonaggio;