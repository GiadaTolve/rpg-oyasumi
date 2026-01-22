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

function GameLayoutDesktop({ user, onLogout }) {
    const socket = useContext(SocketContext);
    
    // --- HOOKS ---
    const [openChats, setOpenChats] = useState([]);
    const [currentMap, setCurrentMap] = useState(null);
    const [currentChildren, setCurrentChildren] = useState([]);
    const [mapId, setMapId] = useState('root');
    const [onlineUsers, setOnlineUsers] = useState([]);
    
    // Finestre
    const [isSchedaOpen, setIsSchedaOpen] = useState(false);
    const [isBancaOpen, setIsBancaOpen] = useState(false);
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const [isGuidaOpen, setIsGuidaOpen] = useState(false);
    const [isAmbientazioneOpen, setIsAmbientazioneOpen] = useState(false);
    const [isShinigamiOpen, setIsShinigamiOpen] = useState(false);
    const [isMercatoOpen, setIsMercatoOpen] = useState(false); 
    const [schedaTargetUser, setSchedaTargetUser] = useState(null);

    // Socket
    useEffect(() => {
        if(socket) {
            const handleUsers = (u) => setOnlineUsers(u);
            socket.on('update_online_list', handleUsers);
            return () => socket.off('update_online_list', handleUsers);
        }
    }, [socket]);

    // Mappa
    useEffect(() => {
        const fetchMap = async () => {
            try {
                const res = await api.get(`/game/map/${mapId}`);
                setCurrentMap(res.data.mapInfo);
                setCurrentChildren(res.data.children);
            } catch (e) { console.error(e); }
        };
        fetchMap();
    }, [mapId]);

    // Handlers
    const handleRestoreChat = (id) => {
        const c = openChats.find(x => x.id === id);
        if(c) setOpenChats([...openChats.filter(x => x.id !== id), c]);
    };

    const handleZoneClick = (loc) => {
        if (loc.type === 'CHAT') {
            if (openChats.find(c => c.id === loc.id)) handleRestoreChat(loc.id);
            else setOpenChats(prev => [...prev, loc]);
        } else if (loc.type === 'MAP') {
            setMapId(loc.id);
        }
    };

    const handleCloseChat = (id) => setOpenChats(openChats.filter(c => c.id !== id));
    const handleGoBack = () => setMapId(currentMap?.parent_id || 'root');
    const handleToggleScheda = () => setIsSchedaOpen(!isSchedaOpen);
    const handleToggleMercato = () => setIsMercatoOpen(!isMercatoOpen); 
    const handleOpenPublicScheda = (u) => { setSchedaTargetUser(u); setIsSchedaOpen(true); };

    if (!user) return <div style={{background:'#000', color:'#c9a84a', height:'100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Caricamento...</div>;

    return (
        <div className="game-container">
            <Header 
                user={user} onLogout={onLogout} 
                onToggleGuida={()=>setIsGuidaOpen(!isGuidaOpen)} 
                onToggleAmbientazione={()=>setIsAmbientazioneOpen(!isAmbientazioneOpen)} 
                onToggleShinigami={()=>setIsShinigamiOpen(!isShinigamiOpen)} 
            />
            
            <LeftSidebar 
                user={user}
                onToggleScheda={handleToggleScheda} 
                onToggleBanca={()=>setIsBancaOpen(!isBancaOpen)} 
                onToggleMessages={()=>setIsMessagingOpen(!isMessagingOpen)} 
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
            
            {/* --- FINESTRE (ORA INCLUSE) --- */}
            {isSchedaOpen && (
  <SchedaPersonaggio 
    // Usiamo schedaTargetUser perché è il nome dello stato che hai definito sopra
    key={schedaTargetUser?.id || user?.id} 
    user={user} 
    targetUser={schedaTargetUser} 
    onClose={() => {
        setIsSchedaOpen(false);
        setSchedaTargetUser(null); // Reset fondamentale quando chiudi
    }} 
    onOpenChat={handleZoneClick} // Qui usa handleZoneClick che hai già definito
  />
)}
            {isBancaOpen && <Banca user={user} onClose={()=>setIsBancaOpen(false)} />}
            {isMessagingOpen && <MessagingManager isVisible={true} onClose={()=>setIsMessagingOpen(false)} isMobile={false} />}
            
            {/* Ecco quelli che mancavano: */}
            {isGuidaOpen && <Guida onClose={()=>setIsGuidaOpen(false)} />}
            {isAmbientazioneOpen && <Ambientazione onClose={()=>setIsAmbientazioneOpen(false)} />}
            {isShinigamiOpen && <Shinigami onClose={()=>setIsShinigamiOpen(false)} />}
            {isMercatoOpen && <Mercato onClose={()=>setIsMercatoOpen(false)} />}
            
            <div className="chat-windows-area" style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:105}}>
                {openChats.map((chat, i) => (
                    <div key={chat.id} style={{pointerEvents:'auto'}}>
                        <ChatWindow chat={chat} onClose={handleCloseChat} user={user} isMobile={false} />
                    </div>
                ))}
            </div>

            <Dock isMobile={false} openChats={openChats} onRestoreChat={handleRestoreChat} />
        </div>
    );
}

export default GameLayoutDesktop;