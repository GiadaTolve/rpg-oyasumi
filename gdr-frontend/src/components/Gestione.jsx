import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// --- STILI DARK ARCANE ---
const styles = {
  panelWrapper: { 
    width: '100%', height: '100%', 
    backgroundColor: 'rgba(11, 11, 17, 0.98)', 
    display: 'flex', 
    fontFamily: "'Inter', sans-serif", 
    borderRadius: '8px', 
    overflow: 'hidden',
    border: '1px solid rgba(162, 112, 255, 0.2)',
    boxShadow: '0 0 30px rgba(0,0,0,0.8)'
  },
  
  // NAVIGAZIONE LATERALE
  nav: { 
    width: '260px', flexShrink: 0, 
    display: 'flex', flexDirection: 'column', 
    padding: '20px 10px', gap: '8px', 
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    overflowY: 'auto'
  },
  navButton: { 
    width: '100%', padding: '12px 15px', 
    backgroundColor: 'transparent', color: '#888', 
    border: '1px solid transparent', borderRadius: '4px', 
    textAlign: 'left', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', fontSize: '12px', 
    fontFamily: "'Cinzel', serif", cursor: 'pointer', transition: 'all 0.2s' 
  },
  activeNavButton: { 
    backgroundColor: 'rgba(162, 112, 255, 0.15)', color: '#c9a84a', 
    border: '1px solid rgba(162, 112, 255, 0.3)', 
    boxShadow: '0 0 10px rgba(0,0,0,0.3)'
  },

  // CONTENUTO PRINCIPALE
  content: { 
    flexGrow: 1, padding: '30px 40px', height: '100%', boxSizing: 'border-box', overflowY: 'auto', 
    backgroundImage: "url('/backgrounds/darkstone.png')", backgroundRepeat: 'repeat', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(0,0,0,0.7)',
    scrollbarWidth: 'thin', scrollbarColor: '#c9a84a transparent'
  },
  contentTitle: { 
    fontFamily: "'Cinzel', serif", color: '#c9a84a', fontSize: '2rem', 
    borderBottom: '1px solid rgba(162, 112, 255, 0.3)', paddingBottom: '15px', marginBottom: '25px',
    textShadow: '0 2px 5px rgba(0,0,0,0.8)'
  },

  // TABELLE
  table: { width: '100%', borderCollapse: 'collapse', color: '#b3b3c0', marginTop: '20px', fontSize: '13px' },
  thTd: { borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px', textAlign: 'left' },
  tableHeader: { color: '#a270ff', textTransform: 'uppercase', fontFamily: "'Cinzel', serif", fontSize: '11px', borderBottom: '2px solid rgba(162, 112, 255, 0.2)' },
  
  // INPUT & FORM
  input: { 
    width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
    color: '#e6e0ff', borderRadius: '4px', fontFamily: "'Inter', sans-serif" 
  },
  label: { display: 'block', marginBottom: '5px', color: '#c9a84a', fontSize: '11px', fontFamily: "'Cinzel', serif" },
  formGroup: { marginBottom: '15px' },

  // BOTTONI AZIONE
  button: { 
    padding: '8px 15px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', 
    backgroundColor: 'rgba(255,255,255,0.05)', color: '#ccc', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', transition: 'all 0.2s' 
  },
  actionButton: { 
    padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', 
    background: 'linear-gradient(90deg, #60519b, #a270ff)', color: 'white', 
    fontWeight: 'bold', marginBottom: '20px', fontFamily: "'Cinzel', serif" 
  },

  // MODALI
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200, backdropFilter: 'blur(5px)' },
  modalContent: { background: '#151515', border: '1px solid #c9a84a', padding: '30px', borderRadius: '8px', width: '500px', boxShadow: '0 0 30px rgba(201, 168, 74, 0.2)' },

  // ELEMENTI VARI
  dropzoneActive: { backgroundColor: 'rgba(162, 112, 255, 0.1)', border: '1px dashed #a270ff' },
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' },
  playlistButton: { width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: '#e6e0ff', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', borderRadius: '4px' },
  activePlaylistButton: { background: 'rgba(162, 112, 255, 0.2)', borderColor: '#a270ff' },
  songList: { padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', marginTop: '5px' },
  songItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' },
};

// --- SOTTOCOMPONENTI (Logica Intatta, Stile Applicato) ---

const EditUserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...user, password: '' });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  return ( <div style={styles.modalOverlay}><div style={styles.modalContent}><h3 style={{color:'#c9a84a', marginTop:0}}>Modifica: {user.nome_pg}</h3><div style={styles.formGroup}><label style={styles.label}>Nome PG</label><input style={styles.input} type="text" name="nome_pg" value={formData.nome_pg} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}>Email</label><input style={styles.input} type="email" name="email" value={formData.email} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}>Permesso</label><select name="permesso" value={formData.permesso} onChange={handleChange} style={styles.input}><option value="PLAYER">UTENTE</option><option value="MASTER">SHINIGAMI</option><option value="MOD">MOD</option><option value="ADMIN">ADMIN</option></select></div><div style={styles.formGroup}><label style={styles.label}>Nuova Password</label><input style={styles.input} type="password" name="password" value={formData.password} onChange={handleChange} /></div><div style={{textAlign:'right', marginTop:'20px'}}><button style={{...styles.button, marginRight:'10px'}} onClick={onClose}>Annulla</button><button style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}} onClick={() => onSave(formData)}>Salva</button></div></div></div> );
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const fetchUsers = useCallback(async () => { try { const res = await api.get('/admin/users'); setUsers(res.data); } catch (e) { console.error(e); } }, []);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const handleSaveUser = async (userData) => { try { await api.put(`/admin/users/${userData.id_utente}`, userData); setEditingUser(null); fetchUsers(); } catch (e) { console.error(e); } };
  return ( <div><table style={styles.table}><thead><tr><th style={styles.tableHeader}>ID</th><th style={styles.tableHeader}>Nome PG</th><th style={styles.tableHeader}>Email</th><th style={styles.tableHeader}>Permesso</th><th style={styles.tableHeader}>Azioni</th></tr></thead><tbody>{users.map(user => (<tr key={user.id_utente}><td style={styles.thTd}>{user.id_utente}</td><td style={styles.thTd}>{user.nome_pg}</td><td style={styles.thTd}>{user.email}</td><td style={{...styles.thTd, color: user.permesso === 'ADMIN' ? '#c9a84a' : '#b3b3c0'}}>{user.permesso}</td><td style={styles.thTd}><button style={styles.button} onClick={() => setEditingUser(user)}>✎</button></td></tr>))}</tbody></table>{editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}</div> );
};

const LogViewer = () => {
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedChat, setSelectedChat] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [logs, setLogs] = useState([]);
  useEffect(() => { const fetchRooms = async () => { try { const res = await api.get('/admin/chat-rooms'); setChatRooms(res.data); if (res.data.length > 0) setSelectedChat(res.data[0].id); } catch (e) { console.error(e); } }; fetchRooms(); }, []);
  const fetchLogs = useCallback(async () => { if (!selectedChat || !selectedDate) return; try { const res = await api.get('/admin/logs', { params: { chatId: selectedChat, date: selectedDate } }); setLogs(res.data); } catch (e) { console.error(e); setLogs([]); } }, [selectedChat, selectedDate]);
  return ( <div><div style={{...styles.filterContainer, display:'flex', gap:'15px', alignItems:'end', marginBottom:'20px'}}><div style={{flexGrow:1}}><label style={styles.label}>Chat Room</label><select style={styles.input} value={selectedChat} onChange={e => setSelectedChat(e.target.value)}>{chatRooms.map(room => (<option key={room.id} value={room.id}>{room.name}</option>))}</select></div><div><label style={styles.label}>Data</label><input style={styles.input} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div><button style={{...styles.button, height:'42px', backgroundColor:'#a270ff', color:'white', border:'none'}} onClick={fetchLogs}>FILTRA</button></div><table style={styles.table}><thead><tr><th style={styles.tableHeader}>Ora</th><th style={styles.tableHeader}>Autore</th><th style={styles.tableHeader}>Tipo</th><th style={styles.tableHeader}>Testo</th></tr></thead><tbody>{logs.length > 0 ? logs.map(log => (<tr key={log.id}><td style={styles.thTd}>{new Date(log.timestamp).toLocaleTimeString()}</td><td style={{...styles.thTd, color:'#c9a84a'}}>{log.autore}</td><td style={styles.thTd}>{log.tipo}</td><td style={styles.thTd}>{log.testo}</td></tr>)) : (<tr><td colSpan="4" style={{...styles.thTd, textAlign: 'center', fontStyle:'italic'}}>Nessun log trovato.</td></tr>)}</tbody></table></div> );
};

const LocationEditorModal = ({ location, onSave, onCancel }) => {
  const [formData, setFormData] = useState(location);
  const handleChange = (e) => { const { name, value } = e.target; const finalValue = ['pos_x', 'pos_y'].includes(name) ? Number(value) : value; setFormData(prev => ({ ...prev, [name]: finalValue })); };
  return ( <div style={styles.modalOverlay} onClick={onCancel}><div style={styles.modalContent} onClick={e => e.stopPropagation()}><h3 style={{color:'#c9a84a', marginTop:0}}>{location.id ? 'Modifica' : 'Nuova'} Location</h3><form onSubmit={(e)=>{e.preventDefault(); onSave(formData)}}><div style={styles.formGroup}><label style={styles.label}>Nome</label><input style={styles.input} type="text" name="name" value={formData.name} onChange={handleChange} required /></div><div style={styles.formGroup}><label style={styles.label}>URL Immagine</label><input style={styles.input} type="text" name="image_url" value={formData.image_url || ''} onChange={handleChange} /></div>{formData.type === 'MAP' && (<div style={styles.formGroup}><label style={styles.label}>Prefettura</label><input style={styles.input} type="text" name="prefecture" value={formData.prefecture || ''} onChange={handleChange} /></div>)}<div style={styles.formGroup}><label style={styles.label}>Descrizione</label><textarea style={{...styles.input, minHeight: '80px'}} name="description" value={formData.description || ''} onChange={handleChange}></textarea></div><div style={{display:'flex', gap:'10px'}}><div style={{flex:1}}><label style={styles.label}>Pos X %</label><input style={styles.input} type="number" name="pos_x" value={formData.pos_x} onChange={handleChange} /></div><div style={{flex:1}}><label style={styles.label}>Pos Y %</label><input style={styles.input} type="number" name="pos_y" value={formData.pos_y} onChange={handleChange} /></div></div><div style={{textAlign:'right', marginTop:'20px'}}><button type="submit" style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}}>Salva</button></div></form></div></div> );
};

const LocationCreator = ({ parentId, onCreate }) => {
    const [formData, setFormData] = useState({ name: '', type: 'CHAT', imageUrl: '', description: '', posX: 50, posY: 50, prefecture: '' });
    const handleChange = (e) => setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    const handleSubmit = (e) => { e.preventDefault(); onCreate({ parent_id: parentId, ...formData }); setFormData({ name: '', type: 'CHAT', imageUrl: '', description: '', posX: 50, posY: 50, prefecture: '' }); };
    return ( <form onSubmit={handleSubmit} style={{padding: '15px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', border:'1px solid rgba(255,255,255,0.1)'}}><div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}><select name="type" value={formData.type} onChange={handleChange} style={{...styles.input, width: '100px'}}><option value="MAP">Mappa</option><option value="CHAT">Chat</option></select><input style={{...styles.input, flexGrow: 1}} type="text" name="name" placeholder="Nome Nuova Zona" value={formData.name} onChange={handleChange} required /><button type="submit" style={{...styles.button, backgroundColor:'#a270ff', color:'white', border:'none'}}>CREA</button></div></form> );
};

const LocationNode = ({ node, index, onCreate, onDelete, onEdit }) => {
    const [showCreator, setShowCreator] = useState(false);
    return ( <Draggable draggableId={String(node.id)} index={index}>{(provided, snapshot) => (<div ref={provided.innerRef} {...provided.draggableProps} style={{ padding: '15px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '10px', borderRadius:'4px', backgroundColor: snapshot.isDragging ? '#333' : (node.type === 'MAP' ? 'rgba(162, 112, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'), ...provided.draggableProps.style }}><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'}}><span {...provided.dragHandleProps} style={{fontWeight: 'bold', cursor: 'grab', color: node.type === 'MAP' ? '#c9a84a' : '#e6e0ff'}}>{node.name} <span style={{fontSize:'10px', color:'#666', textTransform:'uppercase'}}>{node.type}</span></span><div style={{display: 'flex', gap: '5px'}}><button onClick={() => onEdit(node)} style={styles.button}>✎</button><button onClick={() => setShowCreator(!showCreator)} style={styles.button}>{showCreator ? '-' : '+'}</button><button onClick={() => onDelete(node.id)} style={{...styles.button, borderColor: '#ff4d4d', color:'#ff4d4d'}}>✕</button></div></div>{showCreator && <LocationCreator parentId={node.id} onCreate={(data) => { onCreate(data); setShowCreator(false); }} />}{node.type === 'MAP' && (<Droppable droppableId={String(node.id)} type="LOCATION" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>{(dropProvided, dropSnapshot) => (<div ref={dropProvided.innerRef} {...dropProvided.droppableProps} style={{ padding: '10px', marginTop: '10px', minHeight: '40px', borderLeft:'2px solid rgba(255,255,255,0.05)', transition: 'background-color 0.2s ease', backgroundColor: dropSnapshot.isDraggingOver ? 'rgba(162, 112, 255, 0.1)' : 'transparent' }}>{node.children && node.children.map((child, childIndex) => (<LocationNode key={child.id} node={child} index={childIndex} onCreate={onCreate} onDelete={onDelete} onEdit={onEdit} />))}{dropProvided.placeholder}</div>)}</Droppable>)}</div>)}</Draggable> );
};

const MapManagement = () => {
    const [locations, setLocations] = useState([]);
    const [editingLocation, setEditingLocation] = useState(null);
    const buildTree = (list) => { const map = {}; const roots = []; if (!list) return roots; list.forEach(item => { map[item.id] = { ...item, children: [] }; }); list.forEach(item => { if (item.parent_id !== null && map[item.parent_id]) { map[item.parent_id].children.push(map[item.id]); } else { roots.push(map[item.id]); } }); return roots; };
    const fetchLocations = useCallback(async () => { try { const res = await api.get('/admin/locations'); setLocations(res.data); } catch (e) { console.error(e); } }, []);
    useEffect(() => { fetchLocations(); }, [fetchLocations]);
    const onDragEnd = async (result) => { const { destination, source, draggableId } = result; if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return; const locationId = draggableId; const newParentId = destination.droppableId === 'root-dropzone' ? null : destination.droppableId; try { await api.put(`/admin/locations/${locationId}/parent`, { newParentId }); fetchLocations(); } catch (error) { alert("Spostamento fallito."); } };
    const handleCreate = async (data) => { try { await api.post('/admin/locations', data); fetchLocations(); } catch (e) { console.error(e); } };
    const handleDelete = async (id) => { if (window.confirm("Sei sicuro? Cancellando una mappa elimini anche tutte le chat al suo interno.")) { try { await api.delete(`/admin/locations/${id}`); fetchLocations(); } catch(e) { console.error(e); } } };
    const handleSave = async (data) => { try { await api.put(`/admin/locations/${data.id}`, data); setEditingLocation(null); fetchLocations(); } catch (e) { console.error(e); } };
    const tree = buildTree(locations);
    return ( <DragDropContext onDragEnd={onDragEnd}><div>{editingLocation && <LocationEditorModal location={editingLocation} onSave={handleSave} onCancel={() => setEditingLocation(null)} />}<LocationCreator parentId={null} onCreate={handleCreate} /><div style={{marginTop:'20px'}}><Droppable droppableId="root-dropzone" type="LOCATION" isDropDisabled={false} isCombineEnabled={false} ignoreContainerClipping={false}>{(provided, snapshot) => (<div ref={provided.innerRef} {...provided.droppableProps} style={{ padding: '20px', border: '1px dashed rgba(255,255,255,0.1)', minHeight: '200px', backgroundColor: snapshot.isDraggingOver ? 'rgba(162, 112, 255, 0.05)' : 'transparent' }}>{tree.map((node, index) => ( <LocationNode key={node.id} node={node} index={index} onCreate={handleCreate} onDelete={handleDelete} onEdit={setEditingLocation} /> ))}{provided.placeholder}</div>)}</Droppable></div></div></DragDropContext> );
};

const SezioneEditor = ({ sezione, onSave, onCancel }) => {
  const [formData, setFormData] = useState(sezione.id ? sezione : { nome: '', descrizione: '', ordine: 0 }); const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value }); const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  return (<div style={styles.modalOverlay}><div style={styles.modalContent} onClick={e => e.stopPropagation()}><h3 style={{color:'#c9a84a', marginTop:0}}>{sezione.id ? 'Modifica' : 'Nuova'} Sezione</h3><form onSubmit={handleSubmit}><div style={styles.formGroup}><label style={styles.label}>Nome</label><input style={styles.input} type="text" name="nome" value={formData.nome} onChange={handleChange} required /></div><div style={styles.formGroup}><label style={styles.label}>Descrizione</label><input style={styles.input} type="text" name="descrizione" value={formData.descrizione || ''} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}>Ordine</label><input style={styles.input} type="number" name="ordine" value={formData.ordine} onChange={handleChange} /></div><div style={{textAlign:'right'}}><button type="button" style={{...styles.button, marginRight:'10px'}} onClick={onCancel}>Annulla</button><button type="submit" style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}}>Salva</button></div></form></div></div>);
};

const BachecaEditor = ({ bacheca, sezioniDisponibili, onSave, onCancel }) => {
  const [formData, setFormData] = useState(bacheca.id ? bacheca : { nome: '', descrizione: '', ordine: 0, sezione_id: sezioniDisponibili[0]?.id }); const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value }); const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
  return (<div style={styles.modalOverlay}><div style={styles.modalContent} onClick={e => e.stopPropagation()}><h3 style={{color:'#c9a84a', marginTop:0}}>{bacheca.id ? 'Modifica' : 'Nuova'} Bacheca</h3><form onSubmit={handleSubmit}><div style={styles.formGroup}><label style={styles.label}>Sezione</label><select name="sezione_id" value={formData.sezione_id} onChange={handleChange} style={styles.input} required>{sezioniDisponibili.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div><div style={styles.formGroup}><label style={styles.label}>Nome</label><input style={styles.input} type="text" name="nome" value={formData.nome} onChange={handleChange} required /></div><div style={styles.formGroup}><label style={styles.label}>Descrizione</label><input style={styles.input} type="text" name="descrizione" value={formData.descrizione || ''} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}>Ordine</label><input style={styles.input} type="number" name="ordine" value={formData.ordine} onChange={handleChange} /></div><div style={{textAlign:'right'}}><button type="button" style={{...styles.button, marginRight:'10px'}} onClick={onCancel}>Annulla</button><button type="submit" style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}}>Salva</button></div></form></div></div>);
};

const BachecheManager = ({ sezioniDisponibili }) => {
  const [bacheche, setBacheche] = useState([]); const [editingBacheca, setEditingBacheca] = useState(null);
  const fetchBacheche = useCallback(async () => { try { const res = await api.get('/admin/forum/bacheche'); setBacheche(res.data); } catch (e) { console.error(e) } }, []); useEffect(() => { fetchBacheche() }, [fetchBacheche]);
  const handleSave = async (data) => { const url = data.id ? `/admin/forum/bacheche/${data.id}` : '/admin/forum/bacheche'; const method = data.id ? 'put' : 'post'; try { await api[method](url, data); setEditingBacheca(null); fetchBacheche(); } catch (e) { alert('Errore'); } };
  const handleDelete = async (id) => { if(window.confirm('Sei sicuro?')) { await api.delete(`/admin/forum/bacheche/${id}`); fetchBacheche(); } };
  return (<div>{editingBacheca && <BachecaEditor bacheca={editingBacheca} sezioniDisponibili={sezioniDisponibili} onSave={handleSave} onCancel={() => setEditingBacheca(null)} />}<button style={styles.actionButton} onClick={() => setEditingBacheca({})}>+ Nuova Bacheca</button><table style={styles.table}><thead><tr><th style={styles.tableHeader}>Nome</th><th style={styles.tableHeader}>Sezione</th><th style={styles.tableHeader}>Azioni</th></tr></thead><tbody>{bacheche.map(b => <tr key={b.id}><td style={styles.thTd}>{b.nome}</td><td style={styles.thTd}>{b.sezione_nome}</td><td style={styles.thTd}><button style={styles.button} onClick={() => setEditingBacheca(b)}>✎</button><button style={{...styles.button, marginLeft: '10px', borderColor:'#ff4d4d'}} onClick={() => handleDelete(b.id)}>✕</button></td></tr>)}</tbody></table></div>);
};

const SezioniManager = ({ sezioni, onUpdate }) => {
  const [editingSezione, setEditingSezione] = useState(null);
  const handleSave = async (data) => { const url = data.id ? `/admin/forum/sezioni/${data.id}` : '/admin/forum/sezioni'; const method = data.id ? 'put' : 'post'; try { await api[method](url, data); setEditingSezione(null); onUpdate(); } catch (e) { alert('Errore'); } };
  const handleDelete = async (id) => { if(window.confirm('Sei sicuro?')) { await api.delete(`/admin/forum/sezioni/${id}`); onUpdate(); } };
  return (<div>{editingSezione && <SezioneEditor sezione={editingSezione} onSave={handleSave} onCancel={() => setEditingSezione(null)} />}<button style={styles.actionButton} onClick={() => setEditingSezione({})}>+ Nuova Sezione</button><table style={styles.table}><thead><tr><th style={styles.tableHeader}>Nome</th><th style={styles.tableHeader}>Descrizione</th><th style={styles.tableHeader}>Azioni</th></tr></thead><tbody>{sezioni.map(s => <tr key={s.id}><td style={styles.thTd}>{s.nome}</td><td style={styles.thTd}>{s.descrizione}</td><td style={styles.thTd}><button style={styles.button} onClick={() => setEditingSezione(s)}>✎</button><button style={{...styles.button, marginLeft: '10px', borderColor:'#ff4d4d'}} onClick={() => handleDelete(s.id)}>✕</button></td></tr>)}</tbody></table></div>);
};

const ForumManagement = () => {
  const [activeTab, setActiveTab] = useState('bacheche'); const [sezioni, setSezioni] = useState([]);
  const fetchSezioni = useCallback(async () => { try { const res = await api.get('/admin/forum/sezioni'); setSezioni(res.data); } catch (e) { console.error(e); } }, []); useEffect(() => { fetchSezioni(); }, [fetchSezioni]);
  const getTabButtonStyle = (tabName) => ({ ...styles.button, backgroundColor: activeTab === tabName ? '#a270ff' : 'transparent', color: activeTab === tabName ? 'white' : '#888', border: 'none', fontSize:'14px' });
  return (<div><div style={styles.tabsContainer}><button style={getTabButtonStyle('bacheche')} onClick={() => setActiveTab('bacheche')}>BACHECHE</button><button style={getTabButtonStyle('sezioni')} onClick={() => setActiveTab('sezioni')}>SEZIONI</button></div>{activeTab === 'bacheche' ? <div key="bacheche-manager"><BachecheManager sezioniDisponibili={sezioni} /></div> : <div key="sezioni-manager"><SezioniManager sezioni={sezioni} onUpdate={fetchSezioni} /></div>}</div>);
};

const BannerManagement = () => {
  const [banners, setBanners] = useState([]);
  const [editingBanner, setEditingBanner] = useState(null);
  const fetchBanners = useCallback(async () => { try { const response = await api.get('/admin/banners'); setBanners(response.data); } catch (error) { console.error(error); } }, []);
  useEffect(() => { fetchBanners(); }, [fetchBanners]);
  const handleSave = async (bannerData) => { const data = { ...bannerData, is_active: bannerData.is_active ? 1 : 0 }; const method = data.id ? 'put' : 'post'; const url = data.id ? `/admin/banners/${data.id}` : '/admin/banners'; try { await api[method](url, data); setEditingBanner(null); fetchBanners(); } catch (error) { alert("Errore."); } };
  const handleDelete = async (id) => { if (window.confirm("Sei sicuro?")) { try { await api.delete(`/admin/banners/${id}`); fetchBanners(); } catch (error) { alert("Errore."); } } };
  return ( <div><button style={styles.actionButton} onClick={() => setEditingBanner({})}>+ Nuovo Banner</button><table style={styles.table}><thead><tr><th style={styles.tableHeader}>Titolo</th><th style={styles.tableHeader}>Attivo</th><th style={styles.tableHeader}>Azioni</th></tr></thead><tbody>{banners.map(b => (<tr key={b.id}><td style={styles.thTd}>{b.title}</td><td style={styles.thTd}>{b.is_active ? 'Sì' : 'No'}</td><td style={styles.thTd}><button style={styles.button} onClick={() => setEditingBanner(b)}>✎</button><button style={{...styles.button, marginLeft: '10px', borderColor:'#ff4d4d'}} onClick={() => handleDelete(b.id)}>✕</button></td></tr>))}</tbody></table>{editingBanner && <BannerEditorModal banner={editingBanner} onSave={handleSave} onCancel={() => setEditingBanner(null)} />}</div> );
};

const BannerEditorModal = ({ banner, onSave, onCancel }) => {
  const [formData, setFormData] = useState(banner.id ? banner : { title: 'Banner', image_url: '/placeholder.jpg', is_active: false });
  const handleChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({...prev, [name]: type === 'checkbox' ? checked : value })); };
  return ( <div style={styles.modalOverlay}><div style={styles.modalContent}><h3 style={{color:'#c9a84a', marginTop:0}}>{banner.id ? 'Modifica' : 'Nuovo'} Banner</h3><form onSubmit={(e)=>{e.preventDefault(); onSave(formData)}}><div style={styles.formGroup}><label style={styles.label}>Titolo</label><input style={styles.input} type="text" name="title" value={formData.title} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}>URL Immagine</label><input style={styles.input} type="text" name="image_url" value={formData.image_url} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}>Link</label><input style={styles.input} type="text" name="link_url" value={formData.link_url || ''} onChange={handleChange} /></div><div style={styles.formGroup}><label style={styles.label}><input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} /> Attivo</label></div><div style={{textAlign:'right'}}><button type="button" style={{...styles.button, marginRight:'10px'}} onClick={onCancel}>Annulla</button><button type="submit" style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}}>Salva</button></div></form></div></div> );
};

const DailyEventModal = ({ event, onSave, onCancel }) => {
  const [formData, setFormData] = useState(event || { event_date: '', title: '', description: '' });
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  return ( <div style={styles.modalOverlay} onClick={onCancel}><div style={styles.modalContent} onClick={e => e.stopPropagation()}><h3 style={{color:'#c9a84a', marginTop:0}}>{event ? 'Modifica' : 'Nuovo'} Evento</h3><form onSubmit={(e)=>{e.preventDefault(); onSave(formData)}}><div style={styles.formGroup}><label style={styles.label}>Data</label><input style={styles.input} type="date" name="event_date" value={formData.event_date} onChange={handleChange} required /></div><div style={styles.formGroup}><label style={styles.label}>Titolo</label><input style={styles.input} type="text" name="title" value={formData.title} onChange={handleChange} required /></div><div style={styles.formGroup}><label style={styles.label}>Descrizione</label><textarea style={{...styles.input, minHeight: '100px'}} name="description" value={formData.description} onChange={handleChange} required></textarea></div><div style={{textAlign:'right'}}><button type="button" style={{...styles.button, marginRight:'10px'}} onClick={onCancel}>Annulla</button><button type="submit" style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}}>Salva</button></div></form></div></div> );
};

const DailyEventsManagement = ({ events, onEdit, onDelete, onNew }) => {
  return ( <div><button style={styles.actionButton} onClick={onNew}>+ Nuovo Evento</button><table style={styles.table}><thead><tr><th style={styles.tableHeader}>Data</th><th style={styles.tableHeader}>Titolo</th><th style={styles.tableHeader}>Azioni</th></tr></thead><tbody>{events && events.length > 0 ? ( events.map(event => (<tr key={event.id}><td style={styles.thTd}>{event.event_date}</td><td style={styles.thTd}>{event.title}</td><td style={styles.thTd}><button style={styles.button} onClick={() => onEdit(event)}>✎</button><button style={{...styles.button, marginLeft: '10px', borderColor:'#ff4d4d'}} onClick={() => onDelete(event.id)}>✕</button></td></tr>)) ) : ( <tr><td colSpan="3" style={{textAlign: 'center', padding:'20px', fontStyle:'italic'}}>Nessun evento.</td></tr> )}</tbody></table></div> );
};

const SongEditorModal = ({ song, onSave, onCancel, playlists }) => {
  const isEditing = !!song.id;
  const [formData, setFormData] = useState(isEditing ? song : { playlist_id: playlists[0]?.id || '', title: '', source_type: 'youtube', url: '', cover_image_url: '' });
  const handleChange = e => setFormData({...formData, [e.target.name]: e.target.value});
  return ( <div style={styles.modalOverlay}><div style={styles.modalContent}><h3 style={{color:'#c9a84a', marginTop:0}}>{isEditing ? 'Modifica' : 'Aggiungi'} Canzone</h3><form onSubmit={(e)=>{e.preventDefault(); onSave(formData)}}><div style={styles.formGroup}><label style={styles.label}>Playlist</label><select name="playlist_id" value={formData.playlist_id} onChange={handleChange} style={styles.input}>{playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div><div style={styles.formGroup}><label style={styles.label}>Titolo</label><input style={styles.input} type="text" name="title" value={formData.title} onChange={handleChange} required/></div><div style={styles.formGroup}><label style={styles.label}>Tipo</label><select name="source_type" value={formData.source_type} onChange={handleChange} style={styles.input}><option value="youtube">YouTube</option></select></div><div style={styles.formGroup}><label style={styles.label}>URL Video</label><input style={styles.input} type="text" name="url" value={formData.url} onChange={handleChange} required/></div><div style={styles.formGroup}><label style={styles.label}>URL Copertina</label><input style={styles.input} type="text" name="cover_image_url" value={formData.cover_image_url || ''} onChange={handleChange} /></div><div style={{textAlign:'right'}}><button type="button" style={{...styles.button, marginRight:'10px'}} onClick={onCancel}>Annulla</button><button type="submit" style={{...styles.button, backgroundColor:'#c9a84a', color:'black', border:'none'}}>Salva</button></div></form></div></div> );
};

const MusicManagement = () => {
  const [playlists, setPlaylists] = useState([]);
  const [songsByPlaylist, setSongsByPlaylist] = useState({});
  const [editingSong, setEditingSong] = useState(null);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const fetchPlaylistsAndSongs = useCallback(async () => { try { const pls = await api.get('/playlists'); setPlaylists(pls.data); const sgs = {}; for (const p of pls.data) { const res = await api.get(`/playlists/${p.id}/songs`); sgs[p.id] = res.data; } setSongsByPlaylist(sgs); } catch (e) { console.error(e); } }, []);
  useEffect(() => { fetchPlaylistsAndSongs(); }, [fetchPlaylistsAndSongs]);
  const handleAddPlaylist = async () => { const n = prompt("Nome Playlist:"); if (n) { await api.post('/admin/playlists', { name: n }); fetchPlaylistsAndSongs(); } };
  const handleSaveSong = async (d) => { const m = d.id ? 'put' : 'post'; const u = d.id ? `/admin/songs/${d.id}` : '/admin/songs'; try { await api[m](u, d); setEditingSong(null); fetchPlaylistsAndSongs(); } catch(e) { alert("Errore."); } };
  const handleDeleteSong = async (id) => { if(window.confirm("Sicuro?")) { await api.delete(`/admin/songs/${id}`); fetchPlaylistsAndSongs(); } };
  const togglePlaylist = (id) => setActivePlaylistId(p => (p === id ? null : id));
  return (
      <div>
          {editingSong && <SongEditorModal song={editingSong} onSave={handleSaveSong} onCancel={() => setEditingSong(null)} playlists={playlists} />}
          <div style={{display: 'flex', gap: '15px', marginBottom:'20px'}}><button style={styles.actionButton} onClick={handleAddPlaylist}>+ Playlist</button><button style={styles.actionButton} onClick={() => setEditingSong({})}>+ Canzone</button></div>
          <div style={{marginTop: '20px'}}><h3 style={{color:'#e6e0ff', fontFamily:"'Cinzel', serif"}}>LIBRERIA MUSICALE</h3>{playlists.map(p => (<div key={p.id}><button style={activePlaylistId === p.id ? {...styles.playlistButton, ...styles.activePlaylistButton} : styles.playlistButton} onClick={() => togglePlaylist(p.id)}><span>{p.name}</span><span>{activePlaylistId === p.id ? '▼' : '▶'}</span></button>{activePlaylistId === p.id && (<div style={styles.songList}>{songsByPlaylist[p.id]?.length > 0 ? (songsByPlaylist[p.id].map(s => (<div key={s.id} style={styles.songItem}><span>{s.title}</span><div><button style={styles.button} onClick={() => setEditingSong(s)}>✎</button><button style={{...styles.button, marginLeft:'5px', borderColor:'#ff4d4d'}} onClick={() => handleDeleteSong(s.id)}>✕</button></div></div>))) : ( <p style={{padding:'10px', color:'#666', fontStyle:'italic'}}>Nessuna canzone.</p> )}</div>)}</div>))}</div>
      </div>
  );
};

// --- COMPONENTE PRINCIPALE: GESTIONE ---
function Gestione({ user }) {
  const getVisibleModules = () => {
    const allModules = [
      { id: 'users', label: 'Utenti', roles: ['ADMIN','MOD'] },
      { id: 'maps', label: 'Mappe', roles: ['ADMIN', 'MASTER'] },
      { id: 'logs', label: 'Log Chat', roles: ['ADMIN', 'MASTER', 'MOD'] },
      { id: 'forum', label: 'Forum', roles: ['ADMIN', 'MOD'] },
      { id: 'banners', label: 'Banner', roles: ['ADMIN', 'MOD'] },
      { id: 'music', label: 'Musica', roles: ['ADMIN', 'MOD'] },
      { id: 'events', label: 'Eventi', roles: ['ADMIN', 'MOD'] }
    ];
    return allModules.filter(module => module.roles.includes(user?.permesso));
  };

  const visibleModules = getVisibleModules();
  const [activeModule, setActiveModule] = useState(visibleModules[0]?.id || null);
  
  const [dailyEvents, setDailyEvents] = useState([]);
  const [selectedDailyEvent, setSelectedDailyEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const fetchDailyEvents = useCallback(async () => { try { const response = await api.get('/admin/daily-events'); setDailyEvents(response.data); } catch (err) { console.error(err); } }, []);
  useEffect(() => { if (activeModule === 'events') { fetchDailyEvents(); } }, [activeModule, fetchDailyEvents]);
  const handleSaveDailyEvent = async (eventData) => { const isEditing = !!eventData.id; const method = isEditing ? 'put' : 'post'; const url = isEditing ? `/admin/daily-events/${eventData.id}` : '/admin/daily-events'; try { await api[method](url, eventData); fetchDailyEvents(); setShowEventModal(false); } catch (err) { alert(err.response?.data?.message || "Errore."); } };
  const handleDeleteDailyEvent = async (eventId) => { if (window.confirm("Sei sicuro?")) { try { await api.delete(`/admin/daily-events/${eventId}`); fetchDailyEvents(); } catch (err) { alert("Errore."); } } };

  const renderModule = () => {
    if (!visibleModules.find(m => m.id === activeModule)) return null;
    switch (activeModule) {
      case 'users': return (<div><h2 style={styles.contentTitle}>Gestione Utenti</h2><UserManagement /></div>);
      case 'logs': return (<div><h2 style={styles.contentTitle}>Visualizzatore Log</h2><LogViewer /></div>);
      case 'maps': return (<div><h2 style={styles.contentTitle}>Gestione Mappe</h2><MapManagement /></div>);
      case 'forum': return (<div><h2 style={styles.contentTitle}>Gestione Forum</h2><ForumManagement /></div>);
      case 'banners': return (<div><h2 style={styles.contentTitle}>Gestione Banner</h2><BannerManagement /></div>);
      case 'music': return (<div><h2 style={styles.contentTitle}>Gestione Musica</h2><MusicManagement /></div>);
      case 'events': return (<div><h2 style={styles.contentTitle}>Gestione Eventi</h2><DailyEventsManagement events={dailyEvents} onNew={() => { setSelectedDailyEvent(null); setShowEventModal(true); }} onEdit={(event) => { setSelectedDailyEvent(event); setShowEventModal(true); }} onDelete={handleDeleteDailyEvent} /></div>);
      default: return null;
    }
  };

  return (
    <div style={styles.panelWrapper}>
      <nav style={styles.nav}>
        {visibleModules.map(module => (
          <button key={module.id} style={activeModule === module.id ? {...styles.navButton, ...styles.activeNavButton} : styles.navButton} onClick={() => setActiveModule(module.id)}>
            {module.label}
          </button>
        ))}
      </nav>
      <main style={styles.content}>
        {renderModule()}
      </main>
      {showEventModal && <DailyEventModal event={selectedDailyEvent} onSave={handleSaveDailyEvent} onCancel={() => setShowEventModal(false)} />}
    </div>
  );
}

export default Gestione;