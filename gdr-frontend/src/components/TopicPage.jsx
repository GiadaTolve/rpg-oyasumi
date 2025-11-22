import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import NewPostForm from './NewPostForm';
import BBCodeParser from './BBCodeParser';

const styles = {
    container: {
        width: '100%', height: '100%',
        backgroundColor: 'rgba(11, 11, 17, 0.98)',
        borderRadius: '8px',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0,0,0,0.8)',
        border: '1px solid rgba(162, 112, 255, 0.2)',
    },
    header: { 
        padding: '15px 30px',
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover', backgroundPosition: 'center',
        borderBottom: '1px solid rgba(162, 112, 255, 0.3)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
    },
    title: { 
        fontFamily: "'Cinzel', serif", color: '#c9a84a', fontSize: '2rem', margin: 0, 
        textShadow: '0 2px 5px rgba(0,0,0,0.8)' 
    },
    backLink: { color: '#b3b3c0', textDecoration: 'none', fontSize: '12px', fontFamily: "'Cinzel', serif", display: 'block', marginBottom: '5px' },
    
    postsList: {
        flexGrow: 1, overflowY: 'auto', padding: '0 20px',
        backgroundImage: "url('/backgrounds/darkstone.png')", backgroundRepeat: 'repeat', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0,0,0,0.6)',
        scrollbarWidth: 'thin', scrollbarColor: '#c9a84a transparent'
    },
    
    // SINGOLO POST
    post: { 
        display: 'flex', 
        border: '1px solid rgba(255,255,255,0.05)', 
        padding: '20px', 
        backgroundColor: 'rgba(20, 20, 25, 0.7)', 
        margin: '20px 0', 
        borderRadius: '4px' 
    },
    postAuthor: { width: '160px', flexShrink: 0, textAlign: 'center', paddingRight: '20px', borderRight: '1px solid rgba(255,255,255,0.05)' },
    authorName: { fontFamily: "'Cinzel', serif", color: '#c9a84a', fontWeight: 'bold', fontSize: '14px' },
    roleLabel: { fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Inter', sans-serif" },
    avatar: { width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', border: '2px solid #60519b' },
    
    postContent: { flexGrow: 1, paddingLeft: '20px', display: 'flex', flexDirection: 'column' },
    postMeta: { fontSize: '11px', color: '#666', marginBottom: '15px', borderBottom: '1px dashed #444', paddingBottom: '5px' },
    postBody: { 
        whiteSpace: 'pre-wrap', lineHeight: '1.6', flexGrow: 1, fontFamily: "'Inter', sans-serif", color: '#dcdcdc', fontSize: '14px' 
    },
    postFooter: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' },
    
    iconButton: {
        background: 'transparent', border: '1px solid #444', padding: '6px', borderRadius: '4px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
    },
    icon: { width: '16px', height: '16px', filter: 'invert(0.7)' },
    
    replyFormContainer: {
        flexShrink: 0, padding: '20px', borderTop: '1px solid rgba(162, 112, 255, 0.2)', backgroundColor: 'rgba(15, 15, 20, 0.95)',
    },
    lockedMessage: { padding: '15px', textAlign: 'center', backgroundColor: 'rgba(168, 50, 50, 0.2)', border: '1px solid #a83232', color: '#ff8a8a', fontFamily: "'Cinzel', serif" },
};

function TopicPage({ user }) {
    const { topicId } = useParams();
    const [topic, setTopic] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const replyFormRef = useRef(null);

    const fetchTopicData = useCallback(async () => {
        try {
            const response = await api.get(`/forum/topic/${topicId}`);
            setTopic(response.data);
            api.post(`/forum/topics/${topicId}/mark-as-read`).catch(() => {});
        } catch (error) { console.error("Errore topic:", error); setTopic(null); }
    }, [topicId]);

    useEffect(() => { fetchTopicData(); }, [fetchTopicData]);

    const handleLockToggle = async () => {
        if (!topic) return;
        try {
            const newLockStatus = !topic.is_locked;
            await api.put(`/admin/forum/topics/${topic.id}/lock`, { is_locked: newLockStatus });
            setTopic(prev => ({ ...prev, is_locked: newLockStatus }));
        } catch (error) { alert("Errore blocco."); }
    };
    
    const formatDate = (dateString) => new Date(dateString).toLocaleString('it-IT');
    
    const handleLike = async (postId) => {
        try {
            const newPosts = topic.posts.map(p => {
                if (p.id === postId) { return { ...p, user_has_liked: !p.user_has_liked, like_count: p.user_has_liked ? p.like_count - 1 : p.like_count + 1 }; }
                return p;
            });
            setTopic(prev => ({ ...prev, posts: newPosts }));
            await api.post(`/forum/posts/${postId}/like`);
        } catch (error) { fetchTopicData(); }
    };
    
    const handleQuote = (author, text) => {
        const quotedText = `[quote=${author}]${text}[/quote]\n\n`;
        setReplyText(prev => prev + quotedText);
        replyFormRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleSubmitReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setIsSubmitting(true); setSubmitError('');
        try {
            await api.post('/forum/posts', { topic_id: topicId, testo: replyText });
            setReplyText(''); fetchTopicData();
        } catch (err) { setSubmitError('Errore invio.'); } 
        finally { setIsSubmitting(false); }
    };

    const handleDeletePost = async (postId) => {
        if (window.confirm('Eliminare questo post?')) {
            try {
                await api.delete(`/admin/forum/posts/${postId}`);
                setTopic(prev => ({ ...prev, posts: prev.posts.filter(p => p.id !== postId) }));
            } catch (error) { alert('Errore eliminazione.'); }
        }
    };

    if (!topic) return <div style={styles.container}><p style={{margin: 'auto', color:'#666'}}>Caricamento...</p></div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <Link to={`/forum/bacheca/${topic.bacheca_id}`} style={styles.backLink}>&larr; TORNA ALLA BACHECA</Link>
                    <h1 style={styles.title}>{topic.titolo}</h1>
                </div>
                {user.permesso === 'ADMIN' && (
                    <button style={styles.iconButton} onClick={handleLockToggle} title={topic.is_locked ? 'Sblocca' : 'Blocca'}>
                        <img src={topic.is_locked ? '/icone/ui-forum/unlocked.png' : '/icone/ui-forum/locked.png'} alt="Lock" style={styles.icon} />
                    </button>
                )}
            </div>

            <div style={styles.postsList}>
                {topic.posts && topic.posts.map(post => (
                    <div key={post.id} style={styles.post}>
                        <div style={styles.postAuthor}>
                            <div style={styles.authorName}>{post.autore_nome}</div>
                            <div style={styles.roleLabel}>{post.autore_permesso}</div>
                            <img src={post.autore_avatar_url || '/icone/mini_avatar.png'} alt="Avatar" style={styles.avatar}/>
                        </div>
                        <div style={styles.postContent}>
                            <div style={styles.postMeta}>Pubblicato il {formatDate(post.timestamp_creazione)}</div>
                            <div style={styles.postBody}><BBCodeParser text={post.testo} /></div>
                            <div style={styles.postFooter}>
                                {user.permesso === 'ADMIN' && (
                                    <button style={styles.iconButton} onClick={() => handleDeletePost(post.id)} title="Elimina">
                                        <img src="/icone/ui-forum/trash.png" alt="Del" style={styles.icon} />
                                    </button>
                                )}
                                <button style={styles.iconButton} onClick={() => handleQuote(post.autore_nome, post.testo)} title="Cita">
                                    <img src="/icone/ui-forum/quotes.png" alt="Quote" style={styles.icon} />
                                </button>
                                <button 
                                    style={{...styles.iconButton, borderColor: post.user_has_liked ? '#a270ff' : '#444'}}
                                    onClick={() => handleLike(post.id)} title="Like"
                                >
                                    <img src="/icone/ui-forum/like.png" alt="Like" style={styles.icon} />
                                    <span style={{marginLeft:'5px', fontSize:'12px', color: post.user_has_liked ? '#a270ff' : '#888'}}>{post.like_count}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={styles.replyFormContainer} ref={replyFormRef}>
                {topic.is_locked ? (
                    <div style={styles.lockedMessage}>DISCUSSIONE CHIUSA</div>
                ) : (
                    <NewPostForm
                        topicId={topicId} text={replyText} setText={setReplyText} isSubmitting={isSubmitting}
                        setIsSubmitting={setIsSubmitting} error={submitError} setError={setSubmitError} onSubmit={handleSubmitReply}
                    />
                )}
            </div>
        </div>
    );
}

export default TopicPage;