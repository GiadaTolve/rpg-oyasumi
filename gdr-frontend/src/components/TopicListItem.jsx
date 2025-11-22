import React from 'react';
import { Link } from 'react-router-dom';
import NewIndicator from './NewIndicator'; 

const styles = {
    listItem: { 
        display: 'grid',
        gridTemplateColumns: '50px 1fr 120px 220px',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        padding: '15px 10px',
        transition: 'background 0.2s',
        backgroundColor: 'rgba(0,0,0,0.2)', 
    },
    iconCol: { display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' },
    mainInfoCol: { paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '4px' },
    topicTitleLink: { 
        color: '#e6e0ff', textDecoration: 'none', fontSize: '16px', fontWeight: 'bold',
        fontFamily: "'Cinzel', serif", display: 'flex', alignItems: 'center', gap: '8px',
        transition: 'color 0.2s'
    },
    metaInfo: { fontSize: '11px', color: '#888', fontFamily: "'Inter', sans-serif" },
    authorName: { color: '#c9a84a', fontWeight: 'bold' },
    statsCol: { textAlign: 'center', fontSize: '12px', color: '#666', fontFamily: "'Inter', sans-serif" },
    lastPostCol: { textAlign: 'right', fontSize: '11px', color: '#888', fontFamily: "'Inter', sans-serif", paddingRight: '10px' },
    lastPostAuthor: { color: '#a270ff', fontWeight: 'bold' },
    adminActions: { display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '5px' },
    iconButton: {
        background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', padding: '4px',
        borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s',
    },
    iconImg: { width: '14px', height: '14px', filter: 'invert(0.7)' },
};

function TopicListItem({ topic, user, onPinToggle, onDeleteTopic }) {
    const formatDate = (dateString) => {
        if(!dateString) return '--';
        return new Date(dateString).toLocaleString('it-IT', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
    };

    return (
        <div 
            style={styles.listItem}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(162, 112, 255, 0.05)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)'}
        >
            <div style={styles.iconCol}>
                {topic.is_pinned ? '📌' : (topic.is_locked ? '🔒' : (topic.has_new_posts ? '⬤' : '📄'))}
            </div>

            <div style={styles.mainInfoCol}>
                <Link 
                    to={`/forum/topic/${topic.id}`} 
                    style={styles.topicTitleLink}
                    onMouseEnter={(e) => e.target.style.color = '#c9a84a'}
                    onMouseLeave={(e) => e.target.style.color = '#e6e0ff'}
                >
                    {topic.titolo}
                    
                    {/* FIX: Usiamo il ternario per evitare lo 0 */}
                    {topic.has_new_posts ? <NewIndicator /> : null}
                </Link>
                <div style={styles.metaInfo}>
                    Iniziato da <span style={styles.authorName}>{topic.autore_nome}</span> • {formatDate(topic.timestamp_creazione)}
                </div>
            </div>

            <div style={styles.statsCol}>
                <div style={{fontSize:'14px', color:'#e6e0ff'}}>{Math.max(0, topic.post_count - 1)}</div>
                <div>RISPOSTE</div>
            </div>

            <div style={styles.lastPostCol}>
                <div>{formatDate(topic.ultimo_post_timestamp)}</div>
                <div>di <span style={styles.lastPostAuthor}>{topic.ultimo_post_autore || 'N/A'}</span></div>
                
                {user.permesso === 'ADMIN' && (
                    <div style={styles.adminActions}>
                        <button 
                            style={styles.iconButton}
                            onClick={() => onPinToggle(topic.id, !topic.is_pinned)}
                            title={topic.is_pinned ? 'Togli Pin' : 'Fissa in alto'}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c9a84a'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        >
                            📌
                        </button>
                        <button
                            style={styles.iconButton}
                            onClick={() => onDeleteTopic(topic.id)}
                            title="Elimina"
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ff4d4d'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TopicListItem;