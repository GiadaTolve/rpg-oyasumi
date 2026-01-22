import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faDoorOpen, faPenToSquare, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

// --- CONFIGURAZIONE THEME ---
const THEME = {
  colors: {
    bgWindow: 'rgba(8, 8, 12, 0.98)', 
    primary: '#a270ff', 
    gold: '#c9a84a',    
    text: '#e0e0e0',
    textDim: '#6e6e7a',
    grid: 'rgba(162, 112, 255, 0.15)',
    danger: '#ff2a2a',  
    mpBlue: '#00e5ff', 
    panelBg: 'rgba(255, 255, 255, 0.03)', 
    panelBorder: 'rgba(255, 255, 255, 0.08)',
    success: '#4ade80'
  },
  fonts: {
    title: "'Cinzel', serif", 
    body: "'Work Sans', sans-serif",
    mono: "'Roboto Mono', monospace", 
  }
};

const STAT_MAX_VALUES = {
  reflexes: 20, velocita: 20, percezione_fisica: 20, percezione_spirituale: 20,
  lancio_sassi: 20, ingaggio: 10, movimento: 20, salto: 10
};

// --- STILI CSS-IN-JS ---
const styles = {
  dragWrapper: { position: 'absolute', display: 'flex', alignItems: 'flex-start', zIndex: 200, transition: 'transform 0.1s linear' },
  windowFrame: { 
    width: '900px', height: '970px', maxHeight: '96vh',
    backgroundColor: THEME.colors.bgWindow, border: `1px solid ${THEME.colors.grid}`, 
    boxShadow: '0 0 50px rgba(0,0,0,0.95), 0 0 15px rgba(162,112,255,0.1)', borderRadius: '2px', 
    display: 'flex', flexDirection: 'column', overflow: 'hidden', color: THEME.colors.text, fontFamily: THEME.fonts.body, position: 'relative'
  },
  sideWindow: (isOpen) => ({
    width: '900px', height: '820px', maxHeight: '95vh', marginLeft: '10px',
    backgroundColor: THEME.colors.bgWindow, border: `1px solid ${THEME.colors.gold}`, 
    boxShadow: '0 0 60px rgba(0,0,0,0.95)', borderRadius: '2px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    opacity: isOpen ? 1 : 0, transform: isOpen ? 'translateX(0)' : 'translateX(-50px) scale(0.95)', pointerEvents: isOpen ? 'auto' : 'none',
    transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', zIndex: 199 
  }),
  header: { 
    padding: '0 20px', height: '45px', backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')", 
    backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: `1px solid rgba(162, 112, 255, 0.3)`, 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, fontFamily: THEME.fonts.title, fontWeight: '700', color: THEME.colors.gold, 
    letterSpacing: '2px', fontSize: '16px', textTransform: 'uppercase' 
  },
  dragHandle: { cursor: 'move', flexGrow: 1, height: '100%', display: 'flex', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', color: '#b3b3c0', fontSize: '20px', cursor: 'pointer', padding: '0 10px' },
  editBtnHeader: { background: 'transparent', border: 'none', color: THEME.colors.gold, fontSize: '18px', cursor: 'pointer', padding: '0', marginRight: '15px', transition: 'opacity 0.2s' },
  contentArea: { 
    flexGrow: 1, overflowY: 'auto', padding: '20px', backgroundImage: "url('/backgrounds/darkstone.png')", backgroundRepeat: 'repeat', backgroundBlendMode: 'overlay', 
    backgroundColor: 'rgba(0,0,0,0.8)', scrollbarWidth: 'thin', scrollbarColor: `${THEME.colors.gold} transparent`, display: 'flex', flexDirection: 'column'
  },
  headerSection: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px', padding: '20px 40px', alignItems: 'end' },
  avatarFrame: { width: '300px', height: '400px', position: 'relative', border: `1px solid ${THEME.colors.gold}`, boxShadow: `0 5px 30px rgba(0,0,0,0.8), 0 0 20px rgba(201, 168, 74, 0.2)`, background: '#050505' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(10%) contrast(1.1)' },
  infoBlock: { display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', justifyContent: 'flex-end' },
  pgName: { fontFamily: THEME.fonts.title, fontSize: '48px', color: THEME.colors.primary, margin: 0, lineHeight: 1, textShadow: `0 0 15px ${THEME.colors.primary}` },
  pgLevel: { fontFamily: THEME.fonts.title, fontSize: '18px', color: THEME.colors.gold, letterSpacing: '4px', textTransform: 'uppercase', borderBottom: `1px solid ${THEME.colors.panelBorder}`, paddingBottom: '5px' },
  infoBar: { display: 'flex', gap: '25px', fontSize: '13px', fontFamily: THEME.fonts.mono, background: 'rgba(255,255,255,0.03)', padding: '8px 15px', borderRadius: '2px', borderLeft: `3px solid ${THEME.colors.gold}` },
  vitalContainer: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', borderTop: `1px solid ${THEME.colors.panelBorder}`, paddingTop: '15px' },
  vitalRow: { display: 'flex', alignItems: 'center', gap: '15px' },
  vitalLabel: { width: '40px', fontSize: '10px', color: '#888', letterSpacing: '1px', textAlign: 'right' },
  vitalTrack: { flexGrow: 1, height: '6px', background: 'rgba(255,255,255,0.1)', position: 'relative' },
  vitalFill: (color, width) => ({ height: '100%', width: width || '100%', background: color, boxShadow: `0 0 10px ${color}` }),
  vitalVal: { fontSize: '12px', fontFamily: THEME.fonts.mono, width: '40px', textAlign: 'left', color: '#fff' },
  contentBody: { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '30px', padding: '30px 40px', flexGrow: 1, overflowY: 'auto' },
  radarWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', padding: '15px' },
  radarLabel: { fontFamily: THEME.fonts.title, color: THEME.colors.gold, fontSize: '13px', marginTop: '10px', letterSpacing: '3px', opacity: 0.8 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' },
  miniStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' },
  miniStatModule: { background: 'linear-gradient(180deg, rgba(40,40,50,0.6) 0%, rgba(10,10,15,0.8) 100%)', border: `1px solid ${THEME.colors.panelBorder}`, borderRadius: '2px', padding: '8px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', minWidth: '0' },
  miniStatName: { fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' },
  miniStatNum: { fontSize: '20px', fontFamily: THEME.fonts.title, color: '#fff', fontWeight: 'bold', lineHeight: '1', margin: '3px 0' },
  miniStatBar: { width: '80%', height: '3px', background: '#333' },
  miniStatFill: { width: '100%', height: '100%', background: THEME.colors.gold },
  miniPlusBtn: { width: '100%', height: '14px', background: 'rgba(162, 112, 255, 0.1)', border: `1px solid ${THEME.colors.primary}`, color: THEME.colors.primary, fontSize: '10px', lineHeight: '1', cursor: 'pointer', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  footer: { display: 'flex', background: '#050505', borderTop: `1px solid ${THEME.colors.panelBorder}`, height: '55px', flexShrink: 0 },
  tabBtn: (active) => ({ flex: 1, padding: '15px', background: active ? 'linear-gradient(180deg, rgba(201, 168, 74, 0.1) 0%, transparent 100%)' : 'transparent', border: 'none', color: active ? THEME.colors.gold : '#666', fontFamily: THEME.fonts.title, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', borderTop: active ? `2px solid ${THEME.colors.gold}` : '2px solid transparent', transition: 'all 0.3s' }),
  sectionTitle: { fontFamily: THEME.fonts.title, color: THEME.colors.gold, fontSize: '16px', borderBottom: `1px solid ${THEME.colors.gold}`, paddingBottom: '5px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  secStatsContainer: { display: 'flex', flexDirection: 'column', gap: '8px' },
  secRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', color: '#aaa', position: 'relative' }, 
  genericText: { padding: '20px', lineHeight: '1.6', fontSize: '14px', color: '#ccc', whiteSpace: 'pre-wrap' },
  input: { width: '100%', padding: '10px', background: THEME.colors.inputBg, border: `1px solid ${THEME.colors.grid}`, color: '#fff', marginBottom: '10px' },
  textarea: { width: '100%', minHeight: '300px', padding: '10px', background: THEME.colors.inputBg, border: `1px solid ${THEME.colors.grid}`, color: '#fff', fontFamily: THEME.fonts.body, resize: 'vertical' },
  btnSave: { padding: '10px', background: THEME.colors.gold, border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: '10px' },
  resetBtn: { background: 'transparent', border: 'none', color: THEME.colors.danger, cursor: 'pointer', fontSize: '10px', opacity: 0.7, marginLeft: 'auto' },
  gridSlot: { width: '60px', height: '60px', border: `1px solid ${THEME.colors.panelBorder}`, background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#333' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px', padding: '10px' },
  
  // --- NUOVI STILI PER BAN SYSTEM ---
  banTab: {
    position: 'absolute', left: '-28px', top: '120px', width: '30px', height: '100px',
    backgroundColor: THEME.colors.danger, border: `1px solid ${THEME.colors.danger}`, borderRadius: '4px 0 0 4px', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)', 
    fontFamily: THEME.fonts.title, fontWeight: 'bold', color: '#000', zIndex: 198, boxShadow: '-5px 0 15px rgba(255, 42, 42, 0.3)', transition: 'left 0.2s',
  },
  unbanTab: { backgroundColor: THEME.colors.success, borderColor: THEME.colors.success, boxShadow: '-5px 0 15px rgba(74, 222, 128, 0.3)' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(2px)'
  },
  modalBox: {
    backgroundColor: '#0a0a0f', border: `1px solid ${THEME.colors.danger}`, padding: '30px', width: '400px',
    boxShadow: `0 0 30px ${THEME.colors.danger}40`, display: 'flex', flexDirection: 'column', gap: '15px'
  },
  logTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
  logHead: { borderBottom: `1px solid ${THEME.colors.gold}`, color: THEME.colors.gold, textAlign: 'left', padding: '5px' },
  logCell: { borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 5px', color: '#ccc' },
  planciaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  statBox: { background: 'rgba(255, 255, 255, 0.03)', border: `1px solid ${THEME.colors.panelBorder}`, borderRadius: '2px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '65px' },
  statBoxLabel: { fontSize: '10px', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' },
  statBoxValue: { fontFamily: THEME.fonts.mono, fontSize: '16px', color: THEME.colors.gold, fontWeight: 'bold' },
  damageGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  damageBox: { background: 'linear-gradient(180deg, rgba(60, 20, 20, 0.6) 0%, rgba(20, 10, 10, 0.8) 100%)', border: `1px solid ${THEME.colors.danger}`, borderRadius: '2px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  damageLabel: { fontSize: '11px', color: '#ffaaaa', letterSpacing: '1px', marginBottom: '5px', fontWeight: 'bold' },
  damageValue: { fontFamily: THEME.fonts.title, fontSize: '20px', color: '#fff', textShadow: '0 0 10px rgba(255, 0, 0, 0.5)' },
  tooltipBox: { position: 'absolute', bottom: '100%', right: '0', backgroundColor: 'rgba(10, 10, 15, 0.98)', border: `1px solid ${THEME.colors.gold}`, padding: '10px', borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.8)', zIndex: 1000, minWidth: '150px', pointerEvents: 'none', display: 'block' },
  tooltipRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#bbb', marginBottom: '3px' },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', color: THEME.colors.gold, marginBottom: '5px', fontSize: '12px', letterSpacing: '1px' },
  input: { width: '100%', padding: '10px', background: THEME.colors.inputBg, border: `1px solid ${THEME.colors.grid}`, color: '#fff', marginBottom: '10px' },
  textarea: { width: '100%', minHeight: '300px', padding: '10px', background: THEME.colors.inputBg, border: `1px solid ${THEME.colors.grid}`, color: '#fff', fontFamily: THEME.fonts.body, resize: 'vertical' },
  btnSave: { padding: '10px', background: THEME.colors.gold, border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', width: '100%', marginTop: '10px' },
  resetBtn: { background: 'transparent', border: 'none', color: THEME.colors.danger, cursor: 'pointer', fontSize: '10px', opacity: 0.7, marginLeft: 'auto' },
  gridSlot: { width: '60px', height: '60px', border: `1px solid ${THEME.colors.panelBorder}`, background: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#333' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: '10px', padding: '10px' },
  
  // --- STILE BOTTONE ENTRA IN CASA ---
  btnHouse: {
      width: '100%', padding: '20px', marginTop: '20px',
      background: 'linear-gradient(135deg, #a270ff 0%, #7c4dff 100%)', border: `1px solid ${THEME.colors.primary}`,
      color: '#fff', fontFamily: THEME.fonts.title, fontSize: '16px', letterSpacing: '2px',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
      boxShadow: '0 0 20px rgba(162, 112, 255, 0.3)', transition: 'all 0.3s'
  },
  // STILE ADMIN BUTTON
  btnAdminHouse: {
      background: 'linear-gradient(135deg, #ff2a2a 0%, #990000 100%)',
      border: `1px solid ${THEME.colors.danger}`,
      boxShadow: '0 0 20px rgba(255, 42, 42, 0.3)'
  },
  houseImage: {
      width: '100%', height: '200px', objectFit: 'cover', borderRadius: '4px', marginBottom: '15px',
      border: `1px solid ${THEME.colors.gold}`
  }
};

const RadarChartGameUI = ({ data, size = 300 }) => {
  const center = size / 2; const radius = (size / 2) - 40; const angleSlice = (Math.PI * 2) / data.length;
  const getPoint = (val, i, max) => { const norm = Math.min(Math.max(val / (max || 20), 0), 1); const angle = (i * angleSlice) - (Math.PI / 2); return { x: center + (radius * norm) * Math.cos(angle), y: center + (radius * norm) * Math.sin(angle) }; };
  const polyPoints = data.map((d, i) => { const p = getPoint(d.value, i, d.max); return `${p.x},${p.y}`; }).join(' ');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><radialGradient id="radarGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.5"/><stop offset="100%" stopColor={THEME.colors.primary} stopOpacity="0.0"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {[0.25, 0.5, 0.75, 1].map((s, i) => <circle key={i} cx={center} cy={center} r={radius * s} fill="none" stroke={THEME.colors.grid} strokeWidth="1" strokeDasharray="4 4" />)}
      {data.map((_, i) => { const angle = (i * angleSlice) - (Math.PI / 2); return <line key={i} x1={center} y1={center} x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} stroke={THEME.colors.grid} strokeWidth="1" />; })}
      <polygon points={polyPoints} fill="url(#radarGlow)" stroke={THEME.colors.primary} strokeWidth="2" filter="url(#glow)" />
      {data.map((d, i) => { const angle = (i * angleSlice) - (Math.PI / 2); const lx = center + (radius + 20) * Math.cos(angle); const ly = center + (radius + 20) * Math.sin(angle); return (<g key={i}><text x={lx} y={ly} fill={THEME.colors.gold} fontSize="9" fontFamily={THEME.fonts.title} textAnchor="middle" alignmentBaseline="middle">{d.label}</text><text x={lx} y={ly + 10} fill="#fff" fontSize="9" fontFamily={THEME.fonts.mono} textAnchor="middle" alignmentBaseline="middle">{d.value.toFixed(1)}</text></g>); })}
    </svg>
  );
};

// --- COMPONENTE PRINCIPALE ---
function SchedaPersonaggio({ user, datiScheda, onClose, targetUser, onOpenChat }) {
    const [fullData, setFullData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState(null); 
    const [pendingUpdates, setPendingUpdates] = useState({});
    const [isEditMode, setIsEditMode] = useState(false);
    
    // Inizializzazione State per Edit
    const [editedProfile, setEditedProfile] = useState({ avatar: '', avatar_chat: '', background: '', cognome: '' });
    // Stato per Edit Casa
    const [editedHouse, setEditedHouse] = useState({ image: '', desc: '' });

    const [hoverLancio, setHoverLancio] = useState(false);
    
    // BAN SYSTEM STATE
    const [showBanModal, setShowBanModal] = useState(false);
    const [banDays, setBanDays] = useState(1);
    const [banReason, setBanReason] = useState("");
    const [banType, setBanType] = useState("FULL");
    const [sanctionsLog, setSanctionsLog] = useState([]);
    
    // OSPITI E CASA
    const [houseInfo, setHouseInfo] = useState(null);
    const [houseGuests, setHouseGuests] = useState([]);
    const [guestKeys, setGuestKeys] = useState([]);
    const [inviteName, setInviteName] = useState("");

    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [hasBeenDragged, setHasBeenDragged] = useState(false);

    useEffect(() => {
        if (hasBeenDragged) return;
        const handlePosition = () => {
            const width = 900 + (activeSection ? 910 : 0);
            const height = 970;
            setPosition({ x: Math.max(10, (window.innerWidth - width) / 2), y: Math.max(10, (window.innerHeight - height) / 2) + 60 });
        };
        handlePosition();
        window.addEventListener('resize', handlePosition);
        return () => window.removeEventListener('resize', handlePosition);
    }, [activeSection, hasBeenDragged]);

    const fetchScheda = useCallback(async () => {
        setLoading(true);
        // IMPORTANTE: Reset dei dati precedenti per evitare l'effetto "flash" del vecchio utente
        setFullData(null); 
        setIsEditMode(false);
        setPendingUpdates({});
    
        try {
            let data = datiScheda;
            if (!data) {
                if (targetUser && targetUser.id !== user?.id) {
                    const res = await api.get(`/scheda/${targetUser.id}`);
                    data = res.data;
                } else {
                    const res = await api.get('/scheda');
                    data = res.data;
                }
            }
            setFullData(data);
            
            // Inizializza i campi di edit con i NUOVI dati
            if (user && user.id === data.id_utente) {
                setEditedProfile({ 
                    avatar: data.avatar || '', 
                    avatar_chat: data.avatar_chat || '', 
                    background: data.background || '',
                    cognome: data.cognome || ''
                });
                setEditedHouse({
                    image: data.house_custom_image || '',
                    desc: data.house_custom_desc || ''
                });
            }
        } catch (err) { 
            console.error(err); 
        } finally { 
            setLoading(false); 
        }
    }, [datiScheda, user, targetUser]); // targetUser deve essere qui per triggerare il ricaricamento

    useEffect(() => { fetchScheda(); }, [fetchScheda]);

    const isMyProfile = !datiScheda && (!targetUser || (user && targetUser.id === user.id));
    const isStaff = user && (user.permesso === 'ADMIN' || user.permesso === 'MOD');
    const isBanned = fullData?.ban_expires_at && new Date(fullData.ban_expires_at) > new Date();

    // FETCH INFO CASA COMPLETA (Solo se apro il tab CASA)
    useEffect(() => {
        if (activeSection === 'CASA') {
            const fetchData = async () => {
                try {
                    // A. Se è la mia casa, scarico i dati completi
                    if (fullData?.housing_id && isMyProfile) {
                        const resHouse = await api.get('/housing/my-house');
                        setHouseInfo(resHouse.data);
                        const resGuests = await api.get('/housing/guests');
                        setHouseGuests(resGuests.data);
                        const resKeys = await api.get('/housing/guest-access');
                        setGuestKeys(resKeys.data);
                    }
                    // B. Se NON è la mia casa (sto guardando un altro) ma ho i permessi ADMIN e lui ha una casa
                    else if (fullData?.housing_id && isStaff) {
                        // Per gli admin, i dati base sono già in fullData grazie alla nuova API pubblica
                        // fullData.house_chat_id è presente se sono admin
                    }
                } catch (e) { console.error("Errore dati casa:", e); }
            };
            fetchData();
        }
    }, [activeSection, fullData, isMyProfile, isStaff]);

    useEffect(() => {
        if (activeSection === 'LOG' && isStaff && fullData) {
            const fetchLogs = async () => {
                try {
                    const res = await api.get(`/admin/users/${fullData.id_utente}/sanctions`);
                    setSanctionsLog(res.data);
                } catch (e) { console.error("Errore log sanzioni", e); }
            };
            fetchLogs();
        }
    }, [activeSection, fullData, isStaff]);

    const handleBanUser = async () => {
        if (!banReason) return alert("Inserisci una motivazione.");
        try { await api.post(`/admin/users/${fullData.id_utente}/ban`, { days: banDays, reason: banReason, type: banType }); alert(`Bannato.`); setShowBanModal(false); fetchScheda(); } catch (error) { alert("Errore ban: " + error.response?.data?.message); }
    };
    const handleUnbanUser = async () => { if(confirm("Rimuovere ban?")) { try { await api.post(`/admin/users/${fullData.id_utente}/unban`); alert("Ban rimosso."); fetchScheda(); } catch (error) { alert("Errore."); } } };

    // --- NUOVO: SALVA CASA ---
    const handleHouseSave = async () => {
        try {
            await api.put('/housing/customize', { 
                customImage: editedHouse.image, 
                customDesc: editedHouse.desc 
            });
            fetchScheda(); // Ricarica per vedere i cambiamenti
            setIsEditMode(false);
        } catch (e) { alert("Errore salvataggio casa"); }
    };

    const handleInvite = async () => {
        if (!inviteName) return;
        try { await api.post('/housing/invite', { guestName: inviteName }); alert(`Chiavi date a ${inviteName}`); setInviteName(""); const res = await api.get('/housing/guests'); setHouseGuests(res.data); } catch (e) { alert(e.response?.data?.message || "Errore"); }
    };
    const handleRevoke = async (guestId) => { if(!confirm("Ritirare le chiavi?")) return; try { await api.post('/housing/revoke', { guestId }); setHouseGuests(prev => prev.filter(g => g.id_utente !== guestId)); } catch (e) { alert("Errore revoca"); } };

    // --- APRI CHAT CASA (MIA O ADMIN) ---
    const handleEnterHouse = () => {
        // Se sono io: uso houseInfo.house_chat_id
        // Se sono admin (su altro profilo): uso fullData.house_chat_id
        const chatId = isMyProfile ? houseInfo?.house_chat_id : fullData?.house_chat_id;
        const houseName = isMyProfile ? (houseInfo?.name || "Casa") : (fullData?.house_name || "Casa Utente");

        if (!chatId) return alert("Errore: Chiave non trovata.");
        
        onOpenChat({
            type: 'CHAT',
            id: chatId,
            name: `Abitazione: ${houseName}`
        });
    };

    const handleEnterGuestHouse = (house) => {
        onOpenChat({ type: 'CHAT', id: house.house_chat_id, name: `Casa di ${house.owner_name}` });
    };

    const handleEditHouseChange = (e) => setEditedHouse({...editedHouse, [e.target.name]: e.target.value});

    const statsAttualiDB = (fullData?.forza || 1) + (fullData?.costituzione || 1) + (fullData?.destrezza || 1) + (fullData?.mente || 1) + (fullData?.empatia || 1);
    const maxPuntiDisponibili = 25 + ((fullData?.livello || 1) - 1) * 5;
    const puntiSpesiSessione = Object.keys(pendingUpdates).reduce((acc, k) => acc + (pendingUpdates[k] - (fullData[k]||1)), 0);
    const puntiRimanenti = maxPuntiDisponibili - (statsAttualiDB + puntiSpesiSessione);
    const stats = { forza: pendingUpdates.forza || fullData?.forza || 1, costituzione: pendingUpdates.costituzione || fullData?.costituzione || 1, destrezza: pendingUpdates.destrezza || fullData?.destrezza || 1, mente: pendingUpdates.mente || fullData?.mente || 1, empatia: pendingUpdates.empatia || fullData?.empatia || 1 };
    const calcolaDerivate = (s) => { const lancioBase = (s.forza * 0.7) + (s.destrezza * 0.3); return { stat_body: 1 * ((s.forza * 0.5) + (s.costituzione * 2)), stat_kotodama: 3 * ((s.mente * 0.6) + (s.empatia * 0.4)), reflexes: 1 * ((s.mente * 0.4) + (s.destrezza * 0.6)), velocita: 1 * ((s.forza * 0.4) + (s.destrezza * 0.6)), movimento: 0.5 * ((s.forza * 0.5) + (s.costituzione * 0.6)), salto: 0.4 * ((s.forza * 0.5) + (s.costituzione * 0.6)), lancio: 0.45 * lancioBase, lancio_base_calc: lancioBase, peso_trasportabile: 2 * ((s.forza * 0.6) + (s.costituzione * 0.4)), ingaggio: 0.1 * ((s.forza * 0.4) + (s.destrezza * 0.6)), percezione_sensi: 1 * ((s.mente * 0.9) + (s.costituzione * 0.4)), percezione_spirituale: 1 * ((s.mente * 0.9) + (s.empatia * 0.4)), danno_cac: 1 * ((s.forza * 0.3) + (s.destrezza * 0.2)), danno_cad: 1 * ((s.forza * 0.2) + (s.destrezza * 0.3)) }; };
    const derivate = calcolaDerivate(stats);
    const radarData = [ { label: 'RIFLESSI', value: derivate.reflexes, max: STAT_MAX_VALUES.reflexes }, { label: 'VELOCITÀ', value: derivate.velocita, max: STAT_MAX_VALUES.velocita }, { label: 'MOVIM.', value: derivate.movimento, max: STAT_MAX_VALUES.movimento }, { label: 'INGAGGIO', value: derivate.ingaggio, max: STAT_MAX_VALUES.ingaggio }, { label: 'SPIRITO', value: derivate.percezione_spirituale, max: STAT_MAX_VALUES.percezione_spirituale }, { label: 'FISICO', value: derivate.percezione_sensi, max: STAT_MAX_VALUES.percezione_fisica } ];
    const handleSaveStats = async () => { if (Object.keys(pendingUpdates).length === 0) return; const d = calcolaDerivate(stats); const payload = { ...pendingUpdates, ...d }; delete payload.lancio_base_calc; try { await api.post('/scheda/aggiorna-stat', { updates: payload, cost: 0 }); fetchScheda(); setPendingUpdates({}); } catch (e) { alert("Errore salvataggio"); } };
    const handleProfileSave = async () => { try { await api.put('/scheda/profilo', editedProfile); fetchScheda(); setIsEditMode(false); } catch(e) { alert("Errore salvataggio"); }};
    const handleEditChange = (e) => setEditedProfile({ ...editedProfile, [e.target.name]: e.target.value });
    const handleAdminReset = async () => { if(confirm("Reset?")) { try { await api.put(`/admin/reset-stats/${fullData.id_utente}`); fetchScheda(); setPendingUpdates({}); } catch (e) { alert("Errore"); } } };
    const onMouseDown = (e) => { setIsDragging(true); dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }; };
    const onMouseMove = useCallback((e) => { if (!isDragging) return; setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); }, [isDragging]);
    const onMouseUp = useCallback(() => { if (!isDragging) return; setIsDragging(false); setHasBeenDragged(true); }, [isDragging]);
    useEffect(() => { if (isDragging) { window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp); } return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); }; }, [isDragging, onMouseMove, onMouseUp]);

    if (!fullData) return null;

    const renderSidePanel = () => {
        let content = null;
        switch(activeSection) {
            case 'BACKGROUND': 
                content = (
                    <div style={styles.genericText}>
                        {isEditMode ? (
                            <>
                                <div style={styles.formGroup}><label style={styles.label}>COGNOME</label><input style={styles.input} name="cognome" value={editedProfile.cognome} onChange={handleEditChange} /></div>
                                <div style={styles.formGroup}><label style={styles.label}>LINK AVATAR</label><input style={styles.input} name="avatar" value={editedProfile.avatar} onChange={handleEditChange} /></div>
                                <div style={styles.formGroup}><label style={styles.label}>LINK AVATAR CHAT</label><input style={styles.input} name="avatar_chat" value={editedProfile.avatar_chat} onChange={handleEditChange} /></div>
                                <div style={styles.formGroup}><label style={styles.label}>STORIA</label><textarea style={styles.textarea} name="background" value={editedProfile.background} onChange={handleEditChange} /></div>
                                <button style={styles.btnSave} onClick={handleProfileSave}>SALVA MODIFICHE</button>
                            </>
                        ) : ( <div>{fullData.background || "Nessun dato presente nell'archivio storico."}</div> )}
                    </div>
                ); 
                break;
            case 'SKILL TREE': content = (<div style={{padding:'20px', textAlign:'center', color:'#666'}}><p>Analisi neurale...</p><div style={styles.inventoryGrid}>{[...Array(12)].map((_, i) => <div key={i} style={styles.gridSlot}>🔒</div>)}</div></div>); break;
            case 'INVENTARIO': content = (<div style={styles.inventoryGrid}>{[...Array(20)].map((_, i) => <div key={i} style={styles.gridSlot}>{i+1}</div>)}</div>); break;
            case 'LOG': 
                content = (
                    <div style={styles.genericText}>
                        {isStaff && (
                            <div style={{marginBottom:'20px', borderBottom:`1px solid ${THEME.colors.danger}`, paddingBottom:'10px'}}>
                                <h4 style={{color:THEME.colors.danger, margin:'0 0 10px 0'}}>ARCHIVIO SANZIONI (ADMIN ONLY)</h4>
                                {sanctionsLog.length === 0 ? <p style={{fontSize:'12px'}}>Nessuna sanzione registrata.</p> : (
                                    <table style={styles.logTable}><thead><tr><th style={styles.logHead}>Data</th><th style={styles.logHead}>Admin</th><th style={styles.logHead}>Tipo</th><th style={styles.logHead}>Motivo</th></tr></thead><tbody>{sanctionsLog.map(log => (<tr key={log.id}><td style={styles.logCell}>{new Date(log.created_at).toLocaleDateString()}</td><td style={styles.logCell}>{log.admin_name}</td><td style={styles.logCell}>{log.type} ({log.days}gg)</td><td style={styles.logCell}>{log.reason}</td></tr>))}</tbody></table>
                                )}
                            </div>
                        )}
                        <p>Nessuna altra attività recente registrata.</p>
                    </div>
                ); 
                break;
            
            // --- TAB CASA AGGIORNATO ---
            case 'CASA':
                content = (
                    <div style={{padding:'20px', color:'#e0e0e0', display:'flex', flexDirection:'column', gap:'20px'}}>
                        
                        {/* SEZIONE 1: VISTA PROPRIETARIO / ADMIN */}
                        {fullData.housing_id && (
                            <div style={{textAlign:'center', borderBottom:`1px solid ${THEME.colors.border}`, paddingBottom:'20px'}}>
                                
                                {/* FOTO CASA CUSTOM (Se esiste) o ICONA */}
                                {fullData.house_custom_image ? (
                                    <img src={fullData.house_custom_image} style={styles.houseImage} alt="Casa" />
                                ) : (
                                    <FontAwesomeIcon icon={faHouse} size="3x" style={{color:THEME.colors.gold, marginBottom:'10px'}} />
                                )}

                                <h2 style={{fontFamily:THEME.fonts.title, color:THEME.colors.primary, margin:'0'}}>
                                    {houseInfo?.name || fullData.house_name}
                                </h2>
                                <p style={{fontSize:'12px', color:'#888'}}>Residenza Privata</p>

                                {/* DESCRIZIONE CUSTOM */}
                                <p style={{fontSize:'13px', fontStyle:'italic', color:'#b3b3c0', margin:'15px 0'}}>
                                    {fullData.house_custom_desc || "Un luogo sicuro dove riposare."}
                                </p>
                                
                                {/* BOTTONE ENTRA (Proprietario o Admin) */}
                                {(isMyProfile || isStaff) && (
                                    <button 
                                        style={isStaff && !isMyProfile ? styles.btnAdminHouse : styles.btnHouse}
                                        onClick={handleEnterHouse}
                                    >
                                        <FontAwesomeIcon icon={isStaff && !isMyProfile ? faShieldHalved : faDoorOpen} style={{marginRight:'10px'}} /> 
                                        {isStaff && !isMyProfile ? "IRRUZIONE (STAFF)" : "ENTRA A CASA"}
                                    </button>
                                )}

                                {/* --- EDIT MODE (Solo Proprietario) --- */}
                                {isEditMode && isMyProfile && (
                                    <div style={{marginTop:'15px', background:'rgba(0,0,0,0.3)', padding:'10px', borderRadius:'4px'}}>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>FOTO CASA (URL)</label>
                                            <input 
                                                style={styles.input} 
                                                name="image" 
                                                value={editedHouse.image} 
                                                onChange={handleEditHouseChange} 
                                                placeholder="https://..." 
                                            />
                                        </div>
                                        <div style={styles.formGroup}>
                                            <label style={styles.label}>DESCRIZIONE</label>
                                            <textarea 
                                                style={styles.textarea} 
                                                name="desc" 
                                                value={editedHouse.desc} 
                                                onChange={handleEditHouseChange} 
                                                placeholder="Descrivi la tua dimora..." 
                                            />
                                        </div>
                                        <button style={styles.btnSave} onClick={handleHouseSave}>SALVA MODIFICHE CASA</button>
                                    </div>
                                )}

                                {/* GESTIONE OSPITI (Solo Proprietario) */}
                                {isMyProfile && houseGuests && (
                                    <div style={{marginTop:'20px', textAlign:'left', background:'rgba(0,0,0,0.2)', padding:'10px', borderRadius:'4px'}}>
                                        <h4 style={{fontSize:'12px', color:THEME.colors.gold, marginBottom:'10px'}}>GESTIONE OSPITI</h4>
                                        <div style={{display:'flex', gap:'5px', marginBottom:'10px'}}>
                                            <input style={{...styles.input, marginBottom:0, padding:'5px'}} placeholder="Nome Giocatore" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                                            <button onClick={handleInvite} style={{...styles.btnSave, width:'auto', marginTop:0, fontSize:'10px'}}>INVITA</button>
                                        </div>
                                        <div style={{maxHeight:'100px', overflowY:'auto'}}>
                                            {houseGuests.map(g => (
                                                <div key={g.id_utente} style={{display:'flex', justifyContent:'space-between', fontSize:'11px', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                                                    <span>{g.nome_pg}</span>
                                                    <button onClick={() => handleRevoke(g.id_utente)} style={{background:'none', border:'none', color:THEME.colors.danger, cursor:'pointer'}}>X</button>
                                                </div>
                                            ))}
                                            {houseGuests.length === 0 && <span style={{fontSize:'10px', color:'#666'}}>Nessun ospite.</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SEZIONE 2: CHIAVI RICEVUTE (Solo se sono io) */}
                        {isMyProfile && (
                            <div style={{textAlign:'left'}}>
                                <h4 style={{fontSize:'12px', color:THEME.colors.primary, borderBottom:`1px solid ${THEME.colors.primary}`, paddingBottom:'5px', marginBottom:'10px'}}>CHIAVI RICEVUTE 🔑</h4>
                                {guestKeys.length > 0 ? (
                                    <div style={styles.inventoryGrid}>
                                        {guestKeys.map((k, i) => (
                                            <div 
                                                key={i} 
                                                style={{...styles.gridSlot, width:'100%', aspectRatio:'auto', height:'40px', justifyContent:'space-between', padding:'0 10px', cursor:'pointer'}}
                                                onClick={() => handleEnterGuestHouse(k)}
                                                title={`Entra nella casa di ${k.owner_name}`}
                                            >
                                                <span style={{fontSize:'11px', color:'#fff'}}>Casa di {k.owner_name}</span>
                                                <FontAwesomeIcon icon={faDoorOpen} style={{color:THEME.colors.gold}} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{fontSize:'11px', color:'#666', fontStyle:'italic'}}>Non possiedi chiavi di altre abitazioni.</p>
                                )}
                            </div>
                        )}
                    </div>
                );
                break;
            default: return null;
        }
        return (<div style={styles.sideWindow(true)}><div style={styles.header}><span>{activeSection}</span><button onClick={() => setActiveSection(null)} style={styles.closeBtn}>✕</button></div><div style={styles.contentArea}>{content}</div></div>);
    };

    const hpPercent = Math.min(100, (fullData.hp / (derivate.stat_body || 1)) * 100);
    const mpPercent = Math.min(100, (fullData.mp / (derivate.stat_kotodama || 1)) * 100);

    const tabs = ['BACKGROUND', 'SKILL TREE', 'INVENTARIO', 'LOG'];
    if (fullData.housing_id) tabs.splice(1, 0, 'CASA'); 

    return (
        <div style={{ ...styles.dragWrapper, left: `${position.x}px`, top: `${position.y}px` }}>
            {isStaff && !isMyProfile && (isBanned ? (<div style={{...styles.banTab, ...styles.unbanTab}} onClick={handleUnbanUser}>SBANNA</div>) : (<div style={styles.banTab} onClick={() => setShowBanModal(true)}>BAN</div>))}
            
            {showBanModal && (<div style={styles.modalOverlay}><div style={styles.modalBox}><div style={styles.modalTitle}>PROCEDURA DI BAN</div><div><label style={styles.label}>TIPO DI SANZIONE</label><select style={styles.input} value={banType} onChange={(e) => setBanType(e.target.value)}><option value="FULL">BAN TOTALE</option><option value="SHADOW">SHADOW BAN</option></select></div><div><label style={styles.label}>DURATA (Giorni)</label><input type="number" style={styles.input} value={banDays} onChange={(e) => setBanDays(e.target.value)} min="1" /></div><div><label style={styles.label}>MOTIVAZIONE</label><textarea style={{...styles.textarea, minHeight: '100px'}} value={banReason} onChange={(e) => setBanReason(e.target.value)} /></div><div style={{display:'flex', gap:'10px'}}><button style={{...styles.btnSave, background: THEME.colors.danger, color:'#fff'}} onClick={handleBanUser}>CONFERMA</button><button style={{...styles.btnSave, background: 'transparent', border:'1px solid #666', color:'#ccc'}} onClick={() => setShowBanModal(false)}>ANNULLA</button></div></div></div>)}

            <div style={styles.windowFrame}>
                <div style={styles.header}>
                    <div style={styles.dragHandle} onMouseDown={onMouseDown}>{isMyProfile && <button style={{...styles.editBtnHeader, opacity: isEditMode ? 1 : 0.6}} onClick={() => { setIsEditMode(!isEditMode); if (!activeSection) setActiveSection('BACKGROUND'); }} title="Modifica">✎</button>} SCHEDA: {fullData.nome_pg} {fullData.cognome}</div>
                    <button onClick={onClose} style={styles.closeBtn}>✕</button>
                </div>
                <div style={{...styles.contentArea, padding: 0}}>
                    <div style={styles.headerSection}>
                        <div style={styles.avatarFrame}><img src={fullData.avatar || '/placeholder_avatar.png'} style={styles.avatarImg} alt="Av" /></div>
                        <div style={styles.infoBlock}>
                            <div><h1 style={styles.pgName}>{fullData.nome_pg} {fullData.cognome}</h1><div style={styles.pgLevel}>Livello {fullData.livello} - {fullData.grado}</div><div style={styles.infoBar}><span style={{color: THEME.colors.gold}}>PUNTI STAT: {Math.max(0, puntiRimanenti)}</span><span style={{color: THEME.colors.primary}}>EXP: {fullData.exp}</span>{isStaff && <button onClick={handleAdminReset} style={styles.resetBtn}>RESET</button>}</div></div>
                            <div style={styles.miniStatsGrid}>{[{k:'forza',l:'Forza'},{k:'costituzione',l:'Costit.'},{k:'destrezza',l:'Destr.'},{k:'mente',l:'Mente'},{k:'empatia',l:'Empatia'}].map(s => { const val = stats[s.k]; return (<div key={s.k} style={styles.miniStatModule}><span style={styles.miniStatName}>{s.l}</span><span style={styles.miniStatNum}>{val}</span><div style={styles.miniStatBar}><div style={styles.miniStatFill} /></div>{(isMyProfile && puntiRimanenti > 0) && <button style={styles.miniPlusBtn} onClick={()=>setPendingUpdates(p=>({...p, [s.k]: val+1}))}>+</button>}</div>); })}</div>
                            {Object.keys(pendingUpdates).length > 0 && <button style={styles.btnSave} onClick={handleSaveStats}>CONFERMA</button>}
                            <div style={styles.vitalContainer}><div style={styles.vitalRow}><span style={styles.vitalLabel}>BODY</span><div style={styles.vitalTrack}><div style={styles.vitalFill('#71717a', `${hpPercent}%`)} /></div><span style={styles.vitalVal}>{fullData.hp}/{derivate.stat_body.toFixed(0)}</span></div><div style={styles.vitalRow}><span style={styles.vitalLabel}>KOTO</span><div style={styles.vitalTrack}><div style={styles.vitalFill(THEME.colors.primary, `${mpPercent}%`)} /></div><span style={styles.vitalVal}>{fullData.mp}/{derivate.stat_kotodama.toFixed(0)}</span></div></div>
                        </div>
                    </div>
                    <div style={styles.contentBody}>
                        <div style={styles.radarWrapper}><RadarChartGameUI data={radarData} size={300} /><div style={styles.radarLabel}>ANALISI SPETTRALE</div></div>
                        <div style={styles.rightCol}>
                             <div style={styles.sectionTitle}>DATI FISICI</div>
                             <div style={styles.planciaGrid}><div style={styles.statBox}><span style={styles.statBoxLabel}>PESO [PT]</span><span style={styles.statBoxValue}>{derivate.peso_trasportabile.toFixed(1)} <span style={{fontSize:'10px', color:'#666'}}>kg</span></span></div><div style={{...styles.statBox, cursor: 'help', position: 'relative'}} onMouseEnter={() => setHoverLancio(true)} onMouseLeave={() => setHoverLancio(false)}><span style={styles.statBoxLabel}>LANCIO [LAN]</span><span style={styles.statBoxValue}>{derivate.lancio.toFixed(1)} <span style={{fontSize:'10px', color:'#666'}}>m</span></span>{hoverLancio && (<div style={styles.tooltipBox}><div style={{...styles.tooltipRow, color: THEME.colors.gold, fontWeight:'bold', borderBottom:`1px solid ${THEME.colors.panelBorder}`}}>GITTATA LANCIO</div><div style={styles.tooltipRow}><span>Piccole:</span> <span>{(derivate.lancio_base_calc * 0.6).toFixed(1)} m</span></div><div style={styles.tooltipRow}><span>Medie:</span> <span>{(derivate.lancio_base_calc * 0.45).toFixed(1)} m</span></div><div style={styles.tooltipRow}><span>Grandi:</span> <span>{(derivate.lancio_base_calc * 0.3).toFixed(1)} m</span></div><div style={styles.tooltipRow}><span>Giganti:</span> <span>{(derivate.lancio_base_calc * 0.15).toFixed(1)} m</span></div></div>)}</div><div style={styles.statBox}><span style={styles.statBoxLabel}>MOVIMENTO [MOV]</span><span style={styles.statBoxValue}>{derivate.movimento.toFixed(1)} <span style={{fontSize:'10px', color:'#666'}}>m</span></span></div><div style={styles.statBox}><span style={styles.statBoxLabel}>SALTO [JUMP]</span><span style={styles.statBoxValue}>{derivate.salto.toFixed(1)} <span style={{fontSize:'10px', color:'#666'}}>m</span></span></div></div>
                             <div style={styles.damageGrid}><div style={styles.damageBox}><span style={styles.damageLabel}>MISCHIA [CAC]</span><span style={styles.damageValue}>{derivate.danno_cac.toFixed(1)}</span></div><div style={styles.damageBox}><span style={styles.damageLabel}>DISTANZA [CAD]</span><span style={styles.damageValue}>{derivate.danno_cad.toFixed(1)}</span></div></div>
                        </div>
                    </div>
                </div>
                <div style={styles.footer}>{tabs.map(tab => (<button key={tab} style={styles.tabBtn(activeSection === tab)} onClick={() => setActiveSection(activeSection === tab ? null : tab)}>{tab}</button>))}</div>
            </div>
            {activeSection && renderSidePanel()}
        </div>
    );
}

export default SchedaPersonaggio;