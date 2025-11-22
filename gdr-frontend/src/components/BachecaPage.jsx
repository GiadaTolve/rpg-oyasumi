import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import TopicListItem from './TopicListItem';
import NewTopicForm from './NewTopicForm';

// --- STILI DARK ARCANE ---
const styles = {
    container: { 
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(11, 11, 17, 0.98)', 
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
        border: '1px solid rgba(162, 112, 255, 0.2)',
    },
    header: { 
        padding: '20px 30px',
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexShrink: 0,
    },
    titleBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    title: { 
        fontFamily: "'Cinzel', serif", 
        color: '#c9a84a', 
        fontSize: '2.2rem', 
        margin: 0,
        textShadow: '0 2px 5px rgba(0,0,0,0.8)'
    },
    desc: {
        fontFamily: "'Inter', sans-serif",
        color: '#b3b3c0',
        fontSize: '14px',
        fontStyle: 'italic'
    },
    contentArea: {
        flexGrow: 1,
        overflowY: 'auto',
        padding: '0', 
        backgroundImage: "url('/backgrounds/darkstone.png')",
        backgroundRepeat: 'repeat',
        backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(0,0,0,0.6)',
        scrollbarWidth: 'thin',
        scrollbarColor: '#c9a84a transparent'
    },
    backLink: {
        color: '#b3b3c0', 
        textDecoration: 'none', 
        fontSize: '12px', 
        fontFamily: "'Cinzel', serif",
        marginBottom: '5px',
        display: 'inline-block',
        transition: 'color 0.2s'
    },
    newPostButton: { 
        padding: '10px 20px', 
        border: '1px solid #a270ff', 
        borderRadius: '4px', 
        cursor: 'pointer', 
        backgroundColor: 'rgba(162, 112, 255, 0.15)', 
        color: '#e6e0ff', 
        fontFamily: "'Cinzel', serif",
        fontWeight: 'bold',
        transition: 'all 0.2s'
    },
    lockedMessage: { 
        padding: '15px', 
        textAlign: 'center', 
        backgroundColor: 'rgba(168, 50, 50, 0.2)', 
        borderBottom: '1px solid #a83232', 
        color: '#ff8a8a',
        fontFamily: "'Cinzel', serif"
    },
    markReadButton: {
        display: 'block', 
        margin: '30px auto', 
        padding: '10px 25px',
        backgroundColor: 'transparent', 
        color: '#888', 
        border: '1px solid #444',
        borderRadius: '4px', 
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
        fontSize: '12px',
        transition: 'all 0.2s'
    },
    loading: { textAlign: 'center', padding: '50px', color: '#666', fontStyle: 'italic' }
};

function BachecaPage({ user }) {
    const params = useParams();
    const bachecaId = params.bachecaId || params.id;

    const [bacheca, setBacheca] = useState(null);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormVisible, setIsFormVisible] = useState(false);

    const fetchBachecaData = useCallback(async () => {
        if (!bachecaId) return;
        setLoading(true);
        try {
            const response = await api.get(`/forum/bacheca/${bachecaId}/topics?t=${Date.now()}`);
            if (response.data.bacheca) {
                setBacheca(response.data.bacheca);
                setTopics(response.data.topics || []);
            }
        } catch (error) { console.error("Errore caricamento bacheca:", error); } 
        finally { setLoading(false); }
    }, [bachecaId]);

    useEffect(() => { fetchBachecaData(); }, [fetchBachecaData]);

    const handleMarkBachecaAsRead = async () => {
        try {
            setTopics(prevTopics => prevTopics.map(t => ({ ...t, has_new_posts: false })));
            await api.post('/forum/mark-all-as-read');
        } catch (error) {
            console.error("Errore mark read:", error);
            fetchBachecaData();
        }
    };

    const handleTopicCreated = () => { setIsFormVisible(false); fetchBachecaData(); };

    const handlePinToggle = async (topicId, newPinStatus) => {
        try {
            setTopics(prevTopics => {
                const updatedTopics = prevTopics.map(t => t.id === topicId ? { ...t, is_pinned: newPinStatus ? 1 : 0 } : t);
                return updatedTopics.sort((a, b) => (b.is_pinned || 0) - (a.is_pinned || 0) || new Date(b.ultimo_post_timestamp) - new Date(a.ultimo_post_timestamp));
            });
            await api.put(`/admin/forum/topics/${topicId}/pin`, { is_pinned: newPinStatus });
        } catch (error) { console.error("Errore pin:", error); fetchBachecaData(); }
    };

    const handleDeleteTopic = async (topicId) => {
        if (window.confirm('Sei sicuro di voler eliminare questa discussione?')) {
            try {
                await api.delete(`/admin/forum/topics/${topicId}`);
                setTopics(prevTopics => prevTopics.filter(t => t.id !== topicId));
            } catch (error) { console.error("Errore delete:", error); }
        }
    };
    
    if (loading) return <div style={styles.container}><p style={styles.loading}>Caricamento...</p></div>;
    if (!bacheca) return <div style={styles.container}><div style={{padding:'40px',textAlign:'center',color:'#ff6b6b'}}>Bacheca non trovata.</div></div>;
    
    const hasUnreadTopics = topics.some(t => t.has_new_posts);

    return (
        <div style={styles.container}>
            {isFormVisible && (
                <NewTopicForm 
                    bachecaId={bacheca.id} 
                    onTopicCreated={handleTopicCreated} 
                    onCancel={() => setIsFormVisible(false)} 
                />
            )}
            
            <header style={styles.header}>
                <div style={styles.titleBlock}>
                    <Link to="/forum" style={styles.backLink}>&larr; INDICE FORUM</Link>
                    <h1 style={styles.title}>{bacheca.nome}</h1>
                    <div style={styles.desc}>{bacheca.descrizione}</div>
                </div>
                
                {/* FIX: Trasformiamo in booleano puro con !! */}
                {!bacheca.is_locked && (
                    <button 
                        style={styles.newPostButton} 
                        onClick={() => setIsFormVisible(true)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(162, 112, 255, 0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(162, 112, 255, 0.15)'}
                    >
                        + NUOVO TOPIC
                    </button>
                )}
            </header>
            
            <div style={styles.contentArea}>
                {/* FIX: Usiamo il ternario per evitare lo 0 a schermo */}
                {bacheca.is_locked ? (
                    <div style={styles.lockedMessage}>⛔ QUESTA BACHECA È CHIUSA</div>
                ) : null}
                
                <div>
                    {topics.length > 0 ? (
                        topics.map(topic => (
                            <TopicListItem 
                                key={topic.id} 
                                topic={topic}
                                user={user}
                                onPinToggle={handlePinToggle}
                                onDeleteTopic={handleDeleteTopic}
                            />
                        ))
                    ) : ( 
                        <p style={styles.loading}>Nessuna discussione in questa bacheca.</p> 
                    )}
                </div>

                {hasUnreadTopics && (
                    <button 
                        style={styles.markReadButton}
                        onClick={handleMarkBachecaAsRead}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c9a84a'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#444'}
                    >
                        SEGNA TUTTO COME LETTO
                    </button>
                )}
            </div>
        </div>
    );
}

export default BachecaPage;