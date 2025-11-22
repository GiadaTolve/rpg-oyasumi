import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';

// --- STILI DARK ARCANE ---
const styles = {
    window: { 
        // --- MODIFICA: Grid Area ---
        gridArea: 'main-content',
        width: '100%',
        height: '100%',
        margin: 0,
        // ------------------------
        backgroundColor: 'rgba(11, 11, 17, 0.98)', 
        border: '1px solid rgba(162, 112, 255, 0.2)', 
        borderRadius: '5px', 
        display: 'flex', 
        flexDirection: 'column', 
        zIndex: 150, 
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)', 
        color: '#b3b3c0', 
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden'
    },
    
    // HEADER
    header: { 
        padding: '0 25px', height: '55px',    
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, 
    },
    title: { 
        fontFamily: "'Cinzel', serif", fontWeight: '700', color: '#c9a84a', 
        letterSpacing: '2px', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontSize: '20px', 
        textTransform: 'uppercase', margin: 0 
    },
    closeButton: { 
        background: 'none', border: 'none', color: '#b3b3c0', fontFamily: "'Cinzel', serif",
        fontSize: '24px', cursor: 'pointer', transition: 'color 0.2s', padding: '0 5px',
    },

    // CORPO PRINCIPALE (Layout 2 Colonne)
    content: { display: 'flex', flexGrow: 1, overflow: 'hidden' },
    
    // MENU LATERALE
    nav: { 
        width: '240px', flexShrink: 0, 
        borderRight: '1px solid rgba(255,255,255,0.05)', 
        padding: '20px 10px', 
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        display: 'flex', flexDirection: 'column', gap: '5px'
    },
    navButton: { 
        display: 'block', width: '100%', padding: '12px 15px', 
        background: 'transparent', border: '1px solid transparent', 
        color: '#888', borderRadius: '4px', cursor: 'pointer', textAlign: 'left',
        fontFamily: "'Cinzel', serif", fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase',
        transition: 'all 0.2s'
    },
    activeNavButton: { 
        backgroundColor: 'rgba(162, 112, 255, 0.15)', 
        color: '#c9a84a', 
        border: '1px solid rgba(162, 112, 255, 0.3)',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)'
    },

    // AREA CONTENUTO
    main: { 
        flexGrow: 1, padding: '30px 40px', overflowY: 'auto',
        backgroundImage: "url('/backgrounds/darkstone.png')", 
        backgroundRepeat: 'repeat', 
        backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(0,0,0,0.6)',
        scrollbarWidth: 'thin', scrollbarColor: '#c9a84a transparent'
    },

    // SEZIONE CONTO
    balanceContainer: {
        textAlign: 'center', padding: '30px', 
        backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(162, 112, 255, 0.2)', 
        borderRadius: '8px', marginBottom: '30px',
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
    },
    balanceLabel: { color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '10px' },
    balance: { fontFamily: "'Cinzel', serif", fontSize: '3.5em', fontWeight: 'bold', color: '#c9a84a', textShadow: '0 0 10px rgba(201, 168, 74, 0.3)' },

    // LISTA TRANSAZIONI
    historyItem: { 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', 
        fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: '5px', borderRadius: '4px'
    },
    amountIn: { color: '#4caf50', fontWeight: 'bold', fontFamily: "'Cinzel', serif" },
    amountOut: { color: '#f44336', fontWeight: 'bold', fontFamily: "'Cinzel', serif" },

    // SEZIONE LAVORO (Arubaito)
    currentJobBox: { 
        textAlign: 'center', padding: '30px', 
        background: 'linear-gradient(45deg, rgba(96, 81, 155, 0.1), rgba(0,0,0,0.2))', 
        border: '1px solid #60519b', borderRadius: '8px', marginBottom: '30px' 
    },
    jobTitle: { fontSize: '1.8em', margin: '10px 0', fontFamily: "'Cinzel', serif", color: '#e6e0ff' },
    jobList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' },
    jobCard: { 
        background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '4px', textAlign: 'center',
        transition: 'all 0.2s' 
    },
    
    // FORM
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', color: '#c9a84a', fontSize: '12px', fontFamily: "'Cinzel', serif" },
    input: { 
        width: '100%', boxSizing: 'border-box', padding: '12px', 
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
        color: '#e6e0ff', borderRadius: '4px', fontFamily: "'Inter', sans-serif" 
    },
    button: { 
        padding: '10px 25px', 
        background: 'linear-gradient(90deg, #60519b, #a270ff)', 
        color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
        fontFamily: "'Cinzel', serif", fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px',
        boxShadow: '0 0 10px rgba(162, 112, 255, 0.3)', transition: 'all 0.2s'
    },

    // TOASTER
    toaster: {
        position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)', 
        backgroundColor: 'rgba(15, 15, 20, 0.95)', color: '#e6e0ff', padding: '20px 40px', borderRadius: '8px',
        border: '1px solid #c9a84a', boxShadow: '0 0 30px rgba(0,0,0,0.8)', zIndex: 2000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
    },
    toasterMessage: { fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', margin: 0, fontFamily: "'Cinzel', serif", color: '#c9a84a' }
};

const JOBS = [
    { name: 'Fioraio/a a Ikebukuro', dailyPay: 90 }, { name: 'Tecnico di Pachinko', dailyPay: 110 },
    { name: 'Addetto/a pulizie di Shibuya', dailyPay: 95 }, { name: 'Cuoco/a di ramen', dailyPay: 100 },
    { name: 'Commesso/a in un konbini', dailyPay: 85 }, { name: 'Guardia in un love hotel', dailyPay: 120 },
    { name: 'Manutentore/trice di distributori', dailyPay: 105 }, { name: 'Corriere notturno', dailyPay: 115 },
    { name: 'Host/Hostess a Kabukicho', dailyPay: 130 }, { name: 'Operatore/trice sala giochi', dailyPay: 90 },
];

const Toaster = ({ message, onHide }) => {
    useEffect(() => { const timer = setTimeout(onHide, 3000); return () => clearTimeout(timer); }, [onHide]);
    return ( <div style={styles.toaster}><p style={styles.toasterMessage}>{message}</p></div> );
};

function Banca({ user, onClose }) {
    const [activeTab, setActiveTab] = useState('conto');
    const [accountData, setAccountData] = useState({ rem: 0, job: null, last_salary_collection: null });
    const [history, setHistory] = useState([]);
    const [transferData, setTransferData] = useState({ receiverName: '', amount: '', reason: '' });
    
    const [toaster, setToaster] = useState({ show: false, message: '' });

    // Rimossa useEffect per la posizione e gli stati del drag

    const fetchAccountData = useCallback(async () => {
        try {
            const schedaRes = await api.get('/scheda');
            const historyRes = await api.get('/bank/history');
            setAccountData(schedaRes.data);
            setHistory(historyRes.data);
        } catch (error) { console.error("Errore banca:", error); }
    }, []);

    useEffect(() => { fetchAccountData(); }, [fetchAccountData]);
    
    const showToaster = (message) => { setToaster({ show: true, message }); };
    
    const handleSetJob = async (jobName) => { 
        if (window.confirm(`Vuoi davvero lavorare come ${jobName}?`)) { 
            try { 
                const response = await api.post('/bank/set-job', { jobName }); 
                showToaster(response.data.message); fetchAccountData(); 
            } catch (error) { showToaster(error.response?.data?.message || "Errore."); } 
        } 
    };
    
    const handleCollectSalary = async () => { 
        try { 
            const response = await api.post('/bank/collect-salary');
            showToaster(response.data.message); fetchAccountData(); 
        } catch (error) { showToaster(error.response?.data?.message || "Errore."); } 
    };
    
    const handleTransferChange = (e) => setTransferData({ ...transferData, [e.target.name]: e.target.value });
    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/bank/transfer', { ...transferData, amount: parseInt(transferData.amount, 10) });
            showToaster(response.data.message);
            setTransferData({ receiverName: '', amount: '', reason: '' });
            fetchAccountData(); 
        } catch (error) { showToaster(error.response?.data?.message || "Errore."); }
    };

    const today = new Date().toISOString().split('T')[0];
    const hasCollectedToday = accountData.last_salary_collection === today;

    return (
        <>
            <div style={styles.window}>
                <div style={styles.header}>
                    <h2 style={styles.title}>TESORERIA DI OYASUMI</h2>
                    <button style={styles.closeButton} onClick={onClose}>×</button>
                </div>
                
                <div style={styles.content}>
                    <nav style={styles.nav}>
                        <button style={activeTab === 'conto' ? {...styles.navButton, ...styles.activeNavButton} : styles.navButton} onClick={() => setActiveTab('conto')}>CONTO CORRENTE</button>
                        <button style={activeTab === 'operazioni' ? {...styles.navButton, ...styles.activeNavButton} : styles.navButton} onClick={() => setActiveTab('operazioni')}>BONIFICI</button>
                        <button style={activeTab === 'arubaito' ? {...styles.navButton, ...styles.activeNavButton} : styles.navButton} onClick={() => setActiveTab('arubaito')}>ARUBAITO (LAVORO)</button>
                    </nav>
                    
                    <main style={styles.main}>
                        {/* TAB CONTO */}
                        {activeTab === 'conto' && ( 
                            <div> 
                                <div style={styles.balanceContainer}>
                                    <div style={styles.balanceLabel}>SALDO DISPONIBILE</div>
                                    <div style={styles.balance}>{accountData.rem} REM</div> 
                                </div>
                                <h3 style={{color: '#a270ff', borderBottom: '1px solid rgba(162, 112, 255, 0.3)', paddingBottom: '10px', fontFamily: "'Cinzel', serif"}}>STORICO MOVIMENTI</h3> 
                                <div> 
                                    {history.length > 0 ? history.map(tx => ( 
                                        <div key={tx.id} style={styles.historyItem}> 
                                            <div> 
                                                <p style={{margin: '0 0 2px 0', color: '#e6e0ff', fontWeight:'bold'}}>{tx.reason}</p> 
                                                <p style={{margin: 0, fontSize: '11px', color: '#888'}}> 
                                                    {tx.sender_id === user.id ? `A: ${tx.receiver_name}` : `Da: ${tx.sender_name || 'Sistema'}`} • {new Date(tx.timestamp).toLocaleDateString()}
                                                </p> 
                                            </div> 
                                            <div style={tx.receiver_id === user.id ? styles.amountIn : styles.amountOut}> 
                                                {tx.receiver_id === user.id ? '+' : '-'}{tx.amount} 
                                            </div> 
                                        </div> 
                                    )) : <div style={{textAlign:'center', padding:'20px', color:'#666'}}>Nessun movimento recente.</div>} 
                                </div> 
                            </div> 
                        )}

                        {/* TAB OPERAZIONI */}
                        {activeTab === 'operazioni' && ( 
                            <div> 
                                <h3 style={{color: '#a270ff', fontFamily: "'Cinzel', serif", borderBottom: '1px solid rgba(162, 112, 255, 0.3)', paddingBottom: '10px'}}>INVIA DENARO</h3> 
                                <form onSubmit={handleTransferSubmit} style={{marginTop: '20px'}}> 
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>DESTINATARIO (NOME PG)</label>
                                        <input type="text" name="receiverName" value={transferData.receiverName} onChange={handleTransferChange} style={styles.input} placeholder="Es. Kagetsu" required />
                                    </div> 
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>IMPORTO (REM)</label>
                                        <input type="number" name="amount" value={transferData.amount} onChange={handleTransferChange} style={styles.input} min="1" placeholder="0" required />
                                    </div> 
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>CAUSALE</label>
                                        <input type="text" name="reason" value={transferData.reason} onChange={handleTransferChange} style={styles.input} placeholder="Es. Pagamento cena" required />
                                    </div> 
                                    <div style={{textAlign:'right'}}>
                                        <button type="submit" style={styles.button}>ESEGUI BONIFICO</button> 
                                    </div>
                                </form> 
                            </div> 
                        )}

                        {/* TAB LAVORO */}
                        {activeTab === 'arubaito' && (
                            <div>
                                <h3 style={{color: '#a270ff', fontFamily: "'Cinzel', serif", borderBottom: '1px solid rgba(162, 112, 255, 0.3)', paddingBottom: '10px'}}>ARUBAITO & STIPENDIO</h3>
                                {accountData.job ? (
                                    <div style={styles.currentJobBox}>
                                        <p style={{ margin: 0, color: '#888', fontSize:'12px', textTransform:'uppercase', letterSpacing:'1px' }}>ATTUALMENTE IMPIEGATO COME</p>
                                        <h4 style={styles.jobTitle}>{accountData.job}</h4>
                                        <button style={{...styles.button, backgroundColor: hasCollectedToday ? '#333' : '#28a745', opacity: hasCollectedToday ? 0.5 : 1}} onClick={handleCollectSalary} disabled={hasCollectedToday}>
                                            {hasCollectedToday ? 'PAGA GIORNALIERA GIÀ RITIRATA' : 'RITIRA STIPENDIO (90 REM)'}
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p style={{marginBottom:'20px', color:'#ccc'}}>Seleziona un impiego per iniziare a guadagnare Rem. Attenzione: la scelta è vincolante.</p>
                                        <div style={styles.jobList}>
                                            {JOBS.map(job => ( 
                                                <div key={job.name} style={styles.jobCard}> 
                                                    <h5 style={{margin: '0 0 5px 0', color:'#e6e0ff', fontSize:'14px'}}>{job.name}</h5> 
                                                    <p style={{fontSize: '11px', color: '#a4a5b9', marginBottom:'10px'}}>Paga: {job.dailyPay} Rem</p> 
                                                    <button style={{...styles.button, fontSize:'10px', padding:'5px 15px'}} onClick={() => handleSetJob(job.name)}>SCEGLI</button> 
                                                </div> 
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {toaster.show && <Toaster message={toaster.message} onHide={() => setToaster({ show: false, message: '' })} />}
        </>
    );
}

export default Banca;