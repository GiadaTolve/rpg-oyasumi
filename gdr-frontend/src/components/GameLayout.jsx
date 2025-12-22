import React, { useState, useEffect, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { SocketContext } from '../SocketContext';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import ChatWindow from './ChatWindow';
import SchedaPersonaggio from './SchedaPersonaggio';
import Banca from './Banca';
import Guida from './Guida';
import Ambientazione from './Ambientazione';
import Shinigami from './Shinigami';
import MessagingManager from './MessagingManager';
import Mercato from './Mercato'; 
import Dock from './Dock'; 
import api from '../api';

// --- ICONE SVG PER IL MOBILE ---
const Icons = {
    Pin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>,
    Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    Chat: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    MapZone: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>,
    Money: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    Home: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
    Logout: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
    Mail: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
};

function GameLayout({ user, onLogout }) {
    const socket = useContext(SocketContext);
    
    // =========================================================
    // 1. HOOKS E STATI
    // =========================================================

    // Responsive & Tab Mobile
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
    const [activeMobileTab, setActiveMobileTab] = useState('HOME');

    // Dati Gioco
    const [openChats, setOpenChats] = useState([]);
    const [currentMap, setCurrentMap] = useState(null);
    const [currentChildren, setCurrentChildren] = useState([]);
    const [mapId, setMapId] = useState('root');
    const [onlineUsers, setOnlineUsers] = useState([]);

    // Finestre Desktop
    const [isSchedaOpen, setIsSchedaOpen] = useState(false);
    const [isBancaOpen, setIsBancaOpen] = useState(false);
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const [isGuidaOpen, setIsGuidaOpen] = useState(false);
    const [isAmbientazioneOpen, setIsAmbientazioneOpen] = useState(false);
    const [isShinigamiOpen, setIsShinigamiOpen] = useState(false);
    const [isMercatoOpen, setIsMercatoOpen] = useState(false); 
    const [schedaTargetUser, setSchedaTargetUser] = useState(null);

    // Target per chat privata (da Mobile "Presenti")
    const [targetPrivateUser, setTargetPrivateUser] = useState(null);

    // --- EFFECTS ---
    
    // Resize Listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Socket: Lista Presenti
    useEffect(() => {
        if(socket) {
            const handleUsers = (u) => setOnlineUsers(u);
            socket.on('update_online_list', handleUsers);
            return () => socket.off('update_online_list', handleUsers);
        }
    }, [socket]);

    // Fetch Mappa
    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const response = await api.get(`/game/map/${mapId}`);
                setCurrentMap(response.data.mapInfo);
                setCurrentChildren(response.data.children);
            } catch (error) { console.error("Errore mappa:", error); }
        };
        fetchMapData();
    }, [mapId]);

    // =========================================================
    // 2. HANDLERS
    // =========================================================

    const handleRestoreChat = (chatId) => {
        const chatToRestore = openChats.find(c => c.id === chatId);
        if (!chatToRestore) return;
        setOpenChats([...openChats.filter(c => c.id !== chatId), chatToRestore]);
    };

    const handleZoneClick = (location) => {
        if (location.type === 'CHAT') {
            if (openChats.find(chat => chat.id === location.id)) {
                handleRestoreChat(location.id);
            } else {
                setOpenChats(prev => [...prev, location]);
            }
        } else if (location.type === 'MAP') {
            setMapId(location.id);
        }
    };

    const handleCloseChat = (chatId) => setOpenChats(openChats.filter(chat => chat.id !== chatId));
    const handleGoBack = () => setMapId(currentMap?.parent_id || 'root');
    
    // Toggle Desktop
    const handleToggleScheda = () => setIsSchedaOpen(!isSchedaOpen);
    const handleToggleMercato = () => setIsMercatoOpen(!isMercatoOpen); 
    const handleOpenPublicScheda = (targetUser) => { setSchedaTargetUser(targetUser); setIsSchedaOpen(true); };

    // Azioni Rapide Mobile
    const handleCollectSalary = async () => {
        try { const res = await api.post('/bank/collect-salary'); alert(res.data.message); } 
        catch (e) { alert(e.response?.data?.message || "Errore stipendio."); }
    };

    const handleEnterHouse = async () => {
        try {
            const res = await api.get('/housing/my-house');
            const houseChat = { id: res.data.house_chat_id, type: 'CHAT', name: res.data.name || 'Casa Mia' };
            // Su mobile apre la chat full screen, su desktop la aggiunge
            if (isMobile) {
                setOpenChats([houseChat]); 
            } else {
                handleZoneClick(houseChat);
            }
        } catch (e) { alert("Non hai una casa."); }
    };

    // Apertura Chat Privata da lista (Mobile)
    const handleOpenPrivateChatMobile = (targetUser) => {
        const mappedUser = { id_utente: targetUser.id, nome_pg: targetUser.nome_pg, avatar_chat: targetUser.avatar_chat };
        setTargetPrivateUser(mappedUser);
        setActiveMobileTab('MESSAGGI');
    };


    // =========================================================
    // 3. RENDER CONTENT MOBILE
    // =========================================================
    
    // Stili Mobile
    const mobileContainerStyle = { padding: '20px', paddingBottom: '90px', background: '#050508', minHeight: '100vh', color: '#b3b3c0', fontFamily: "'Inter', sans-serif" };
    const mobileHeaderStyle = { textAlign: 'center', color: '#c9a84a', fontFamily: "'Cinzel', serif", fontSize: '20px', marginBottom: '25px', borderBottom: '1px solid rgba(201, 168, 74, 0.2)', paddingBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '1px' };
    const mobileCardStyle = { padding: '15px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#e6e0ff', borderRadius: '4px', display: 'flex', alignItems: 'center', marginBottom: '10px', transition: 'all 0.2s', cursor: 'pointer' };
    const actionBtnStyle = (color) => ({ padding: '15px', background: `rgba(${color}, 0.1)`, border: `1px solid rgb(${color})`, color: `rgb(${color})`, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: "'Cinzel', serif", textTransform: 'uppercase' });

    const renderMobileContent = () => {
        // 1. Chat Aperta (Full Screen)
        if (openChats.length > 0) {
            const activeChat = openChats[openChats.length - 1];
            return (
                <div style={{width:'100%', height:'100%', position:'fixed', top:0, left:0, zIndex:2000}}>
                    <ChatWindow key={activeChat.id} chat={activeChat} onClose={handleCloseChat} user={user} isMobile={true} />
                </div>
            );
        }

        // 2. Tabs
        switch (activeMobileTab) {
            case 'MAPPA':
                return (
                    <div style={mobileContainerStyle}>
                        <div style={mobileHeaderStyle}><span style={{color:'#a270ff'}}><Icons.Pin /></span> {currentMap?.name || 'Mappa'}</div>
                        {currentMap?.parent_id && <button onClick={handleGoBack} style={{...mobileCardStyle, justifyContent:'center', color:'#fff', background:'#2a2930', marginBottom:'20px'}}><span style={{marginRight:'8px'}}><Icons.Back /></span> INDIETRO</button>}
                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                            {currentChildren.map(child => (
                                <div key={child.id} onClick={() => handleZoneClick(child)} style={mobileCardStyle}>
                                    <span style={{marginRight:'15px', color: child.type === 'CHAT' ? '#a270ff' : '#c9a84a'}}>{child.type === 'CHAT' ? <Icons.Chat /> : <Icons.MapZone />}</span>
                                    <div><div style={{fontWeight:'bold', fontSize:'15px', color:'#fff'}}>{child.name}</div><div style={{fontSize:'11px', color:'#888', marginTop:'2px'}}>{child.type === 'CHAT' ? 'Entra in Chat' : 'Esplora Zona'}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'MESSAGGI':
                return <MessagingManager isVisible={true} onClose={() => setActiveMobileTab('HOME')} isMobile={true} targetUser={targetPrivateUser} onClearTarget={() => setTargetPrivateUser(null)} />;

            case 'PRESENTI':
                return (
                    <div style={mobileContainerStyle}>
                        <div style={mobileHeaderStyle}>Presenti ({onlineUsers.length})</div>
                        {onlineUsers.map(u => (
                            <div key={u.id} style={{...mobileCardStyle, justifyContent:'space-between'}}>
                                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                                    <img src={u.avatar_chat || '/icone/mini_avatar.png'} style={{width:'40px', height:'40px', borderRadius:'50%', objectFit:'cover', border:'1px solid #444'}} alt="" />
                                    <span style={{fontWeight:'bold', fontSize:'14px'}}>{u.nome_pg}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenPrivateChatMobile(u); }} style={{background:'none', border:'none', cursor:'pointer', color:'#c9a84a'}}><Icons.Mail /></button>
                            </div>
                        ))}
                    </div>
                );

            case 'HOME':
            default:
                return (
                    <div style={{...mobileContainerStyle, textAlign:'center'}}>
                        <div style={{marginTop:'30px', marginBottom:'20px'}}>
                            <img src={user?.avatar_chat || '/icone/mini_avatar.png'} style={{width:'110px', height:'110px', borderRadius:'50%', border:'2px solid #c9a84a', padding:'3px', objectFit:'cover'}} alt="" />
                            <h2 style={{color: '#c9a84a', fontFamily: "'Cinzel', serif", margin:'15px 0 5px 0', fontSize:'24px'}}>{user?.nome_pg}</h2>
                            <span style={{fontSize:'12px', color:'#888', letterSpacing:'1px'}}>{user?.permesso}</span>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'25px'}}>
                            <div style={{background:'#1a1a1a', padding:'15px', borderRadius:'6px', border:'1px solid #333'}}><div style={{fontSize:'10px', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Livello</div><div style={{fontSize:'20px', fontWeight:'bold', color:'#e6e0ff', fontFamily:"'Cinzel', serif"}}>{user?.livello || 1}</div></div>
                            <div style={{background:'#1a1a1a', padding:'15px', borderRadius:'6px', border:'1px solid #333'}}><div style={{fontSize:'10px', color:'#888', marginBottom:'5px', textTransform:'uppercase'}}>Rem (¥)</div><div style={{fontSize:'20px', fontWeight:'bold', color:'#c9a84a', fontFamily:"'Cinzel', serif"}}>{user?.rem || 0}</div></div>
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'30px'}}>
                             <button onClick={handleCollectSalary} style={actionBtnStyle('201, 168, 74')}><Icons.Money /> Ritira Stipendio</button>
                             <button onClick={handleEnterHouse} style={actionBtnStyle('162, 112, 255')}><Icons.Home /> Entra in Casa</button>
                        </div>
                        <button onClick={onLogout} style={{width:'100%', padding:'15px', background:'rgba(255, 68, 68, 0.1)', border:'1px solid #ff4444', color:'#ff4444', borderRadius:'6px', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}><Icons.Logout /> DISCONNETTI</button>
                    </div>
                );
        }
    };


    // =========================================================
    // 4. SAFETY CHECK
    // =========================================================
    if (!user) {
        return <div style={{width:'100vw', height:'100vh', background:'#050508', display:'flex', justifyContent:'center', alignItems:'center', color:'#c9a84a'}}>Caricamento...</div>;
    }

    // =========================================================
    // 5. RENDER FINALE (DESKTOP / MOBILE SWITCH)
    // =========================================================
    return (
        <div className="game-container">
            {/* --- DESKTOP VIEW --- */}
            {!isMobile && (
                <>
                    <Header 
                        user={user} onLogout={onLogout}
                        onToggleGuida={() => setIsGuidaOpen(!isGuidaOpen)}
                        onToggleAmbientazione={() => setIsAmbientazioneOpen(!isAmbientazioneOpen)}
                        onToggleShinigami={() => setIsShinigamiOpen(!isShinigamiOpen)}
                    />
                    
                    <LeftSidebar 
                        user={user}
                        onToggleScheda={handleToggleScheda} 
                        onToggleBanca={() => setIsBancaOpen(!isBancaOpen)}
                        onToggleMessages={() => setIsMessagingOpen(!isMessagingOpen)}
                        onToggleMercato={handleToggleMercato}
                    />
                    
                    <main className="main-content">
                        <div className="content-wrapper">
                            <Outlet context={{ map: currentMap, children: currentChildren, onZoneClick: handleZoneClick, onGoBack: handleGoBack }} />
                        </div>
                    </main>
                    
                    <RightSidebar 
                        user={user}
                        currentMap={currentMap} 
                        onOpenChat={handleZoneClick} 
                        onOpenScheda={handleOpenPublicScheda} 
                    />
                    
                    {/* MODALI DESKTOP (TUTTI CON user={user}!) */}
                    {isSchedaOpen && <SchedaPersonaggio user={user} targetUser={schedaTargetUser} onClose={() => setIsSchedaOpen(false)} onOpenChat={handleZoneClick} />}
                    {isBancaOpen && <Banca user={user} onClose={() => setIsBancaOpen(false)} />}
                    {isMessagingOpen && <MessagingManager isVisible={true} onClose={() => setIsMessagingOpen(false)} isMobile={false} />}
                    
                    {/* Le modali che chiedevi */}
                    {isGuidaOpen && <Guida user={user} onClose={()=>setIsGuidaOpen(false)} />}
                    {isAmbientazioneOpen && <Ambientazione user={user} onClose={()=>setIsAmbientazioneOpen(false)} />}
                    {isShinigamiOpen && <Shinigami user={user} onClose={()=>setIsShinigamiOpen(false)} />}
                    {isMercatoOpen && <Mercato user={user} onClose={()=>setIsMercatoOpen(false)} />}

                    {/* Chat Windows Desktop */}
                    <div className="chat-windows-area" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:105}}>
                        {openChats.map((chat, index) => (
                            <div key={chat.id} style={{pointerEvents:'auto', width:'100%', height:'100%'}}>
                                <ChatWindow chat={chat} onClose={handleCloseChat} user={user} isMobile={false} />
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* --- MOBILE VIEW --- */}
            {isMobile && (
                <div style={{width:'100%', height:'100%', overflow:'hidden', position:'relative', background:'#050508'}}>
                    {renderMobileContent()}
                </div>
            )}

            {/* Dock comune */}
            <Dock 
                isMobile={isMobile}
                openChats={openChats}
                onRestoreChat={handleRestoreChat}
                onTabChange={setActiveMobileTab} 
                activeTab={activeMobileTab}
            />
        </div>
    );
}

export default GameLayout;