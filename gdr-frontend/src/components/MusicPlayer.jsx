import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

// --- STILI AGGIORNATI (Fix Background) ---
const styles = {
    playerContainer: {
        marginTop: '15px',
        padding: '10px', 
        
        // --- FIX BACKGROUND ---
        // Sovrapponiamo un velo nero al 60% sopra l'immagine per scurirla senza nasconderla
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        
        border: '1px solid rgba(162, 112, 255, 0.2)',
        borderRadius: '8px',
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    
    // Cover Art (Ridotta altezza)
    coverWrapper: {
        position: 'relative',
        width: '100%',
        height: '90px', 
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    coverArt: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        filter: 'brightness(0.9)', // Leggermente più luminosa
    },
    coverFrame: {
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.9) 100%)',
        pointerEvents: 'none',
    },

    // Titolo Canzone
    titleContainer: {
        position: 'absolute',
        bottom: '4px',
        left: '0',
        width: '100%',
        textAlign: 'center',
        padding: '0 5px',
        boxSizing: 'border-box',
    },
    songTitle: {
        fontFamily: "'Cinzel', serif",
        fontSize: '11px', 
        color: '#e6e0ff',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        textShadow: '0 2px 4px rgba(0,0,0,1)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },

    // Controlli Player
    controlsBox: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '12px',
        paddingTop: '2px',
    },
    controlBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    ctrlIcon: {
        width: '18px', 
        height: '18px',
        // Filtro per rendere le icone grigio/viola chiaro
        filter: 'invert(80%) sepia(10%) saturate(200%) hue-rotate(220deg) brightness(95%) contrast(90%)', 
        transition: 'filter 0.2s ease, transform 0.2s ease',
    },
    
    playIcon: {
        width: '28px', 
        height: '28px',
        // Filtro Oro per il play
        filter: 'invert(76%) sepia(34%) saturate(646%) hue-rotate(356deg) brightness(98%) contrast(88%) drop-shadow(0 0 5px rgba(201, 168, 74, 0.5))',
    },

    // Playlist Dropdown
    playlistSelect: {
        width: '100%',
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        color: '#c9a84a', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '4px',
        fontSize: '10px',
        fontFamily: "'Cinzel', serif",
        cursor: 'pointer',
        outline: 'none',
        marginTop: '2px',
    },
};


const MusicPlayer = () => {
    const [playlists, setPlaylists] = useState([]);
    const [currentPlaylist, setCurrentPlaylist] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(() => localStorage.getItem('oyasumi-player-muted') !== 'false');
    const audioRef = useRef(null);

    useEffect(() => { 
        api.get('/playlists').then(res => { 
            setPlaylists(res.data); 
            if (res.data.length > 0) { 
                api.get(`/playlists/${res.data[0].id}/songs`).then(songRes => setCurrentPlaylist(songRes.data)); 
            } 
        }); 
    }, []);

    useEffect(() => { 
        if (audioRef.current) audioRef.current.muted = isMuted; 
        localStorage.setItem('oyasumi-player-muted', isMuted); 
    }, [isMuted]);

    useEffect(() => { 
        if (currentPlaylist.length > 0 && audioRef.current) { 
            audioRef.current.load(); 
            if (isPlaying) audioRef.current.play().catch(e => console.warn("Autoplay:", e.message)); 
        } 
    }, [currentTrackIndex, currentPlaylist]);

    const playNext = () => { if (currentPlaylist.length) setCurrentTrackIndex(prev => (prev + 1) % currentPlaylist.length); };
    const playPrev = () => { if (currentPlaylist.length) setCurrentTrackIndex(prev => (prev - 1 + currentPlaylist.length) % currentPlaylist.length); };
    const togglePlay = () => { 
        const newIsPlaying = !isPlaying;
        if (newIsPlaying) audioRef.current.play().catch(e => console.error("Play error:", e));
        else audioRef.current.pause();
        setIsPlaying(newIsPlaying);
    };
    const handlePlaylistChange = (e) => { 
        const pid = e.target.value; 
        setIsPlaying(false); 
        setCurrentTrackIndex(0); 
        api.get(`/playlists/${pid}/songs`).then(res => setCurrentPlaylist(res.data)); 
    };

    const currentTrack = currentPlaylist[currentTrackIndex];
    const getSrc = () => {
        if (!currentTrack) return null;
        if (currentTrack.source_type === 'youtube') {
            const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
            const match = currentTrack.url.match(regex);
            return match ? `/api/youtube-stream/${match[1]}` : null;
        }
        return currentTrack.url;
    };

    return (
        <div style={styles.playerContainer}>
            <audio ref={audioRef} src={getSrc()} onEnded={playNext} controls={false} />
            
            {/* COVER ART + TITOLO */}
            <div style={styles.coverWrapper}>
                <img 
                    src={currentTrack?.cover_image_url || '/placeholder.jpg'} 
                    alt="cover" 
                    style={styles.coverArt} 
                />
                <div style={styles.coverFrame}>
                    <div style={styles.titleContainer}>
                        <div style={styles.songTitle}>
                            {currentTrack?.title || 'SILENZIO'}
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLLI */}
            <div style={styles.controlsBox}>
                <button style={styles.controlBtn} onClick={playPrev} title="Precedente">
                    <img src="/musica/previous.png" alt="Prev" style={styles.ctrlIcon} 
                         onMouseEnter={e => e.target.style.filter = "brightness(1.5) drop-shadow(0 0 5px white)"}
                         onMouseLeave={e => e.target.style.filter = styles.ctrlIcon.filter}
                    />
                </button>

                <button style={styles.controlBtn} onClick={togglePlay} title={isPlaying ? "Pausa" : "Riproduci"}>
                    <img 
                        src={isPlaying ? "/musica/pause.png" : "/musica/play.png"} 
                        alt="Play" 
                        style={styles.playIcon} 
                        onMouseEnter={e => e.target.style.transform = "scale(1.1)"}
                        onMouseLeave={e => e.target.style.transform = "scale(1)"}
                    />
                </button>

                <button style={styles.controlBtn} onClick={playNext} title="Successiva">
                    <img src="/musica/next.png" alt="Next" style={styles.ctrlIcon}
                         onMouseEnter={e => e.target.style.filter = "brightness(1.5) drop-shadow(0 0 5px white)"}
                         onMouseLeave={e => e.target.style.filter = styles.ctrlIcon.filter}
                    />
                </button>
                
                <button style={{...styles.controlBtn, marginLeft:'10px'}} onClick={() => setIsMuted(!isMuted)} title="Muto/Unmute">
                    <img src={isMuted ? "/musica/mute.png" : "/musica/volumeup.png"} alt="Vol" 
                         style={{...styles.ctrlIcon, width:'14px', height:'14px', opacity: 0.7}}
                         onMouseEnter={e => e.target.style.opacity = 1}
                         onMouseLeave={e => e.target.style.opacity = 0.7}
                    />
                </button>
            </div>

            {playlists.length > 0 && (
                <select onChange={handlePlaylistChange} style={styles.playlistSelect}>
                    {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            )}
        </div>
    );
};

export default MusicPlayer;