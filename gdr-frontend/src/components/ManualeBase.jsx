import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

// --- STILI DARK ARCANE ---
const styles = {
    window: {
        gridArea: 'main-content', width: '100%', height: '100%', margin: 0,
        backgroundColor: 'rgba(11, 11, 17, 0.98)',
        border: '1px solid rgba(162, 112, 255, 0.2)', borderRadius: '5px',
        display: 'flex', flexDirection: 'column', zIndex: 150,
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)', color: '#b3b3c0',
        fontFamily: "'Inter', sans-serif", overflow: 'hidden'
    },
    header: {
        padding: '0 20px', height: '50px',
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
    },
    title: {
        fontFamily: "'Cinzel', serif", fontWeight: '700', color: '#c9a84a',
        letterSpacing: '2px', fontSize: '18px', textTransform: 'uppercase'
    },
    closeBtn: { background: 'none', border: 'none', color: '#b3b3c0', fontSize: '24px', cursor: 'pointer' },
    
    bodyContainer: { display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' },
    
    // MENU SX
    leftColumn: {
        width: '280px', backgroundColor: 'rgba(0, 0, 0, 0.3)', display: 'flex', flexDirection: 'column',
        borderRight: 'none' 
    },
    adminToolbar: {
        padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', gap: '5px', flexDirection: 'column'
    },
    menuList: {
        padding: '10px', gap: '2px', overflowY: 'auto', flexGrow: 1,
        scrollbarWidth: 'thin', scrollbarColor: '#60519b transparent'
    },
    
    menuItem: {
        padding: '10px 15px', cursor: 'pointer', borderRadius: '4px',
        fontFamily: "'Cinzel', serif", fontSize: '13px', color: '#888',
        transition: 'all 0.2s', border: '1px solid transparent',
        display: 'flex', alignItems: 'center'
    },
    menuItemActive: {
        backgroundColor: 'rgba(162, 112, 255, 0.15)', color: '#c9a84a',
        border: '1px solid rgba(162, 112, 255, 0.3)', fontWeight: 'bold'
    },
    menuItemChild: {
        paddingLeft: '35px', fontSize: '12px', color: '#a4a5b9'
    },

    verticalBorder: {
        width: '6px', backgroundImage: "url('/frames/borderframevertical.png')",
        backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', flexShrink: 0, opacity: 0.8
    },

    contentArea: {
        flexGrow: 1, padding: '40px 50px', overflowY: 'auto',
        backgroundImage: "url('/backgrounds/darkstone.png')", backgroundRepeat: 'repeat', backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(0,0,0,0.6)',
        color: '#dcdcdc', fontSize: '15px', lineHeight: '1.8', 
        position: 'relative', scrollbarWidth: 'thin', scrollbarColor: '#c9a84a transparent'
    },
    
    // EDITOR
    editorContainer: { display: 'flex', flexDirection: 'column', height: '100%', gap: '15px' },
    editorHeader: { color: '#c9a84a', fontFamily: "'Cinzel', serif", borderBottom: '1px solid #444', paddingBottom: '10px' },
    editorInput: { width: '100%', padding: '10px', background: '#222', border: '1px solid #555', color: '#c9a84a', fontFamily: "'Cinzel', serif", fontSize: '20px', boxSizing: 'border-box' },
    editorTextarea: { flexGrow: 1, width: '100%', padding: '15px', background: '#222', border: '1px solid #555', color: 'white', fontFamily: "monospace", fontSize: '14px', lineHeight: '1.6', resize: 'none', boxSizing: 'border-box' },
    editBtnContainer: { position: 'absolute', top: '15px', right: '25px', opacity: 0.6, cursor: 'pointer', background: 'rgba(0,0,0,0.5)', padding: '5px', borderRadius: '4px' },
    
    // BOTTONI
    actionBtn: { padding: '10px 25px', cursor: 'pointer', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginRight: '10px', fontFamily: "'Cinzel', serif" },
    adminBtn: {
        width: '100%', padding: '8px', backgroundColor: 'rgba(162, 112, 255, 0.1)', border: '1px solid rgba(162, 112, 255, 0.3)',
        color: '#e6e0ff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '4px',
        transition: 'all 0.2s'
    }
};

function ManualeBase({ titoloFinestra, categoria, user, onClose }) {
    const [pagine, setPagine] = useState([]);
    const [tree, setTree] = useState([]);
    const [activePage, setActivePage] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Stati Editor (usati sia per Modifica che per Creazione)
    const [isEditing, setIsEditing] = useState(false);
    const [isCreating, setIsCreating] = useState(false); // true = sto creando nuova pagina
    const [creationMode, setCreationMode] = useState(null); // 'ROOT' o 'CHILD'
    
    const [editTitle, setEditTitle] = useState('');
    const [editBody, setEditBody] = useState('');

    // ALBERO
    const buildTree = (list) => {
        const map = {};
        const roots = [];
        list.forEach(item => { map[item.id] = { ...item, children: [] }; });
        list.forEach(item => {
            if (item.parent_id && map[item.parent_id]) {
                map[item.parent_id].children.push(map[item.id]);
            } else {
                roots.push(map[item.id]);
            }
        });
        return roots;
    };

    const fetchPagine = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(`/manuale/${categoria}`);
            const rawData = response.data;
            setPagine(rawData);
            setTree(buildTree(rawData));
            if (rawData.length > 0 && !activePage) {
                const firstRoot = rawData.find(p => !p.parent_id);
                setActivePage(firstRoot || rawData[0]);
            }
        } catch (error) { console.error("Errore manuale:", error); }
        finally { setLoading(false); }
    }, [categoria, activePage]);

    useEffect(() => { fetchPagine(); }, [fetchPagine]);

    // --- AZIONI ADMIN ---

    // Avvia Creazione
    const startCreating = (mode) => {
        setIsCreating(true);
        setIsEditing(true); // Usiamo lo stesso pannello editor
        setCreationMode(mode); // 'ROOT' o 'CHILD'
        setEditTitle('');
        setEditBody('');
    };

    // Avvia Modifica
    const startEditing = () => {
        setIsCreating(false);
        setCreationMode(null);
        setIsEditing(true);
        setEditTitle(activePage.titolo);
        setEditBody(activePage.testo);
    };

    // Salva (Gestisce sia Creazione che Modifica)
    const handleSave = async () => {
        if (!editTitle.trim()) return alert("Il titolo è obbligatorio.");

        try {
            if (isCreating) {
                // LOGICA CREAZIONE (POST)
                const parentId = creationMode === 'CHILD' ? activePage.id : null;
                // Calcola un ordine fittizio (ultimo + 1), opzionale
                
                const response = await api.post('/manuale', {
                    categoria: categoria.toUpperCase(),
                    titolo: editTitle,
                    testo: editBody,
                    parent_id: parentId,
                    ordine: 99 // Metto in fondo per default
                });
                
                // Aggiorna UI
                const newPage = response.data;
                setActivePage(newPage); // Vai alla nuova pagina
                // Ricarica tutto per rifare l'albero
                const resList = await api.get(`/manuale/${categoria}`);
                setPagine(resList.data);
                setTree(buildTree(resList.data));

            } else {
                // LOGICA MODIFICA (PUT)
                await api.put(`/manuale/page/${activePage.id}`, { titolo: editTitle, testo: editBody });
                const updatedPage = { ...activePage, titolo: editTitle, testo: editBody };
                setActivePage(updatedPage);
                setPagine(prev => prev.map(p => p.id === updatedPage.id ? updatedPage : p));
            }
            
            setIsEditing(false);
            setIsCreating(false);
        } catch (e) { 
            console.error(e); 
            alert("Errore salvataggio. Controlla console."); 
        }
    };

    const canEdit = ['MASTER', 'ADMIN', 'MOD'].includes(user?.permesso);

    // Render Item Menu
    const renderMenuItem = (page, isChild = false) => {
        const isActive = activePage?.id === page.id;
        const itemStyle = { ...(isChild ? styles.menuItemChild : {}), ...styles.menuItem, ...(isActive ? styles.menuItemActive : {}) };
        return (
            <React.Fragment key={page.id}>
                <div style={itemStyle} onClick={() => { setActivePage(page); setIsEditing(false); setIsCreating(false); }}>
                    {isChild && <span style={{marginRight:'5px'}}>↳</span>}
                    {page.titolo}
                </div>
                {page.children && page.children.length > 0 && (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '2px'}}>
                        {page.children.map(child => renderMenuItem(child, true))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    return (
        <div style={styles.window}>
            <div style={styles.header}>
                <span style={styles.title}>{titoloFinestra}</span>
                <button onClick={onClose} style={styles.closeBtn}>✕</button>
            </div>

            <div style={styles.bodyContainer}>
                
                {/* COLONNA SX: MENU + TOOLBAR ADMIN */}
                <div style={styles.leftColumn}>
                    {canEdit && (
                        <div style={styles.adminToolbar}>
                            <button style={styles.adminBtn} onClick={() => startCreating('ROOT')}>
                                + NUOVO CAPITOLO
                            </button>
                            <button 
                                style={{...styles.adminBtn, opacity: activePage ? 1 : 0.5}} 
                                onClick={() => activePage && startCreating('CHILD')}
                                disabled={!activePage}
                            >
                                + SOTTO-SEZIONE
                            </button>
                        </div>
                    )}
                    
                    <div style={styles.menuList}>
                        {loading ? <div style={{padding:'10px'}}>Caricamento...</div> : 
                         tree.map(rootPage => renderMenuItem(rootPage, false))
                        }
                    </div>
                </div>

                <div style={styles.verticalBorder}></div>

                {/* COLONNA DX: CONTENUTO */}
                <div style={styles.contentArea}>
                    {isEditing ? (
                        <div style={styles.editorContainer}>
                            <div style={styles.editorHeader}>
                                {isCreating 
                                    ? (creationMode === 'ROOT' ? 'CREAZIONE NUOVO CAPITOLO' : `NUOVA SOTTO-SEZIONE DI: ${activePage?.titolo}`) 
                                    : 'MODIFICA PAGINA'}
                            </div>
                            <input style={styles.editorInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Titolo (es. 1. Introduzione)" />
                            <textarea 
                                style={styles.editorTextarea} 
                                value={editBody} 
                                onChange={e => setEditBody(e.target.value)} 
                                placeholder="Testo della pagina... Puoi usare HTML (<b>, <br>...)"
                            />
                            <div>
                                <button style={{...styles.actionBtn, backgroundColor:'#28a745', color:'white'}} onClick={handleSave}>SALVA</button>
                                <button style={{...styles.actionBtn, backgroundColor:'#555', color:'white'}} onClick={() => { setIsEditing(false); setIsCreating(false); }}>ANNULLA</button>
                            </div>
                        </div>
                    ) : (
                        activePage ? (
                            <>
                                <h2 style={{marginTop:0, color:'#e6e0ff', fontFamily:"'Cinzel', serif", borderBottom:'1px solid #60519b', paddingBottom:'10px', fontSize:'28px'}}>
                                    {activePage.titolo}
                                </h2>
                                <div style={{marginBottom:'30px'}} dangerouslySetInnerHTML={{ __html: activePage.testo }} />
                                
                                {canEdit && (
                                    <div style={styles.editBtnContainer} title="Modifica Pagina" onClick={startEditing}>
                                        <span style={{fontSize: '24px'}}>⚙️</span>
                                    </div>
                                )}
                            </>
                        ) : ( <div style={{textAlign:'center', marginTop:'50px', color:'#666'}}>Seleziona una pagina o creane una nuova.</div> )
                    )}
                </div>
            </div>
        </div>
    );
}

export default ManualeBase;