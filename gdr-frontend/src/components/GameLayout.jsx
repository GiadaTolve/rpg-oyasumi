import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
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
import api from '../api';

function GameLayout({ user, onLogout }) {
    // --- STATI ---
    const [openChats, setOpenChats] = useState([]);
    const [currentMap, setCurrentMap] = useState(null);
    const [currentChildren, setCurrentChildren] = useState([]);
    const [mapId, setMapId] = useState('root');
    
    // Stati Finestre
    const [isSchedaOpen, setIsSchedaOpen] = useState(false);
    const [isBancaOpen, setIsBancaOpen] = useState(false);
    const [isMessagingOpen, setIsMessagingOpen] = useState(false);
    const [isGuidaOpen, setIsGuidaOpen] = useState(false);
    const [isAmbientazioneOpen, setIsAmbientazioneOpen] = useState(false);
    const [isShinigamiOpen, setIsShinigamiOpen] = useState(false);

    const [schedaTargetUser, setSchedaTargetUser] = useState(null);

    // --- TOGGLE HANDLERS ---
    const handleToggleScheda = () => {
        if (isSchedaOpen) {
            setIsSchedaOpen(false);
            setSchedaTargetUser(null);
        } else {
            setSchedaTargetUser(null);
            setIsSchedaOpen(true);
        }
    };

    const handleOpenPublicScheda = (targetUser) => {
        setSchedaTargetUser(targetUser);
        setIsSchedaOpen(true);
    };

    const handleToggleBanca = () => setIsBancaOpen(!isBancaOpen);
    const handleToggleMessages = () => setIsMessagingOpen(!isMessagingOpen);
    const handleToggleGuida = () => setIsGuidaOpen(!isGuidaOpen);
    const handleToggleAmbientazione = () => setIsAmbientazioneOpen(!isAmbientazioneOpen);
    const handleToggleShinigami = () => setIsShinigamiOpen(!isShinigamiOpen);
    
    // --- LOGICA MAPPA ---
    useEffect(() => {
        const fetchMapData = async () => {
            try {
                const response = await api.get(`/game/map/${mapId}`);
                setCurrentMap(response.data.mapInfo);
                setCurrentChildren(response.data.children);
            } catch (error) {
                console.error("Impossibile caricare la mappa:", error);
            }
        };
        fetchMapData();
    }, [mapId]);

    const handleZoneClick = (location) => {
        if (location.type === 'CHAT') {
            if (openChats.find(chat => chat.id === location.id)) return;
            setOpenChats(prev => [...prev, location]);
        } else if (location.type === 'MAP') {
            setMapId(location.id);
        }
    };

    const handleCloseChat = (chatId) => {
        setOpenChats(openChats.filter(chat => chat.id !== chatId));
    };

    const handleGoBack = () => {
        if (currentMap && currentMap.parent_id) {
            setMapId(currentMap.parent_id);
        } else {
            setMapId('root');
        }
    };

    return (
        <div className="game-container">
            {/* HEADER */}
            <Header 
                user={user} 
                onLogout={onLogout}
                onToggleGuida={handleToggleGuida}
                onToggleAmbientazione={handleToggleAmbientazione}
                onToggleShinigami={handleToggleShinigami}
            />
            
            {/* LEFT SIDEBAR */}
            <LeftSidebar 
                onToggleScheda={handleToggleScheda} 
                onToggleBanca={handleToggleBanca}
                onToggleMessages={handleToggleMessages}
            />

            {/* MAIN CONTENT (Mappa) */}
            <main className="main-content">
                <div className="content-wrapper">
                    <Outlet context={{ 
                        map: currentMap, 
                        children: currentChildren, 
                        onZoneClick: handleZoneClick, 
                        onGoBack: handleGoBack 
                    }} />
                </div>
            </main>

            {/* RIGHT SIDEBAR */}
            <RightSidebar 
                currentMap={currentMap} 
                onOpenChat={handleZoneClick} 
                onOpenScheda={handleOpenPublicScheda} 
            />
            
            {/* --- FINESTRE MODALI --- */}
            {isSchedaOpen && (
                <SchedaPersonaggio 
                    user={user} 
                    targetUser={schedaTargetUser}
                    onClose={() => { setIsSchedaOpen(false); setSchedaTargetUser(null); }} 
                />
            )}

            {isBancaOpen && <Banca user={user} onClose={handleToggleBanca} />}
            {isGuidaOpen && <Guida onClose={handleToggleGuida} user={user} />}
            {isAmbientazioneOpen && <Ambientazione onClose={handleToggleAmbientazione} user={user} />}
            {isShinigamiOpen && <Shinigami onClose={handleToggleShinigami} />}
            
            {isMessagingOpen && <MessagingManager isVisible={isMessagingOpen} onClose={handleToggleMessages} />}

            {/* --- CHAT WINDOWS (CORRETTO: Uso Fragment <> invece di div) --- */}
            {/* Questo permette alla ChatWindow di essere figlia diretta della griglia */}
            <>
                {openChats.map(chat => (
                    <ChatWindow 
                        key={chat.id} 
                        chat={chat} 
                        onClose={handleCloseChat}
                        user={user}
                    />
                ))}
            </>
        </div>
    );
}

export default GameLayout;