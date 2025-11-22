import React from 'react';
import { useOutletContext } from 'react-router-dom';
import './Map.css';

function MapContent() {
  const { map, children, onZoneClick, onGoBack } = useOutletContext();

  if (!map) return <div className="map-loading">Caricamento...</div>;

  const isRootMap = !map.parent_id || map.id === 'root';

  // =====================================================
  // ROOT MAP (Invariata)
  // =====================================================
  if (isRootMap) {
      return (
          <div className="root-map-container" style={{ backgroundImage: `url(${map.image_url || '/maps/map.png'})` }}>
              {children.map(child => (
                  <div 
                      key={child.id}
                      className="map-pin-wrapper"
                      style={{ left: `${child.pos_x}%`, top: `${child.pos_y}%` }}
                      onClick={() => onZoneClick(child)}
                  >
                      <img src="/icone/map-pin.png" alt="📍" className="pin-icon" />
                      <div className="glass-label">{child.name}</div>
                  </div>
              ))}
          </div>
      );
  }

  // =====================================================
  // SUB MAP (Interni) - Layout Aggiornato
  // =====================================================
  return (
      <div className="sub-map-wrapper">
          
          {/* CORNICE ESTERNA */}
          <div className="outer-border-frame"></div>

          {/* CONTENUTO */}
          <div className="sub-map-content">
            
              {/* Pulsante Indietro */}
              <button onClick={onGoBack} className="floating-back-btn">
                  &larr; INDIETRO
              </button>

              <div className="map-grid">
                  
                  {/* --- SINISTRA: Immagine + Frame + Profondità --- */}
                  <div className="col-image">
                      <div className="depth-wrapper"> {/* Wrapper per l'effetto profondità */}
                          <div className="image-frame-container">
                              <img 
                                  src={map.image_url || '/maps/kessen.map.png'} 
                                  alt={map.name} 
                                  className="location-image" 
                              />
                              <div className="location-frame-overlay"></div>
                          </div>
                      </div>
                  </div>

                  {/* --- CENTRO: Divisori e Testo --- */}
                  <div className="col-info">
                      {/* Titolo (Opzionale, sta meglio se c'è) */}
                      <h2 className="info-title">{map.name}</h2>

                      {/* Divisore SOPRA */}
                      <img src="/frames/interrompilinea.png" className="divider-img" alt="divider top" />
                      
                      {/* Testo Descrizione */}
                      <div className="info-desc-box">
                          {map.description || "Nessuna descrizione disponibile per questo luogo onirico."}
                      </div>

                      {/* Divisore SOTTO (Ribaltato) */}
                      <img src="/frames/interrompilinea.png" className="divider-img flipped" alt="divider bottom" />
                  </div>

                  {/* --- DESTRA: Elenco Chat --- */}
                  <div className="col-nav">
                      <div className="nav-list">
                        {children.length > 0 ? (
                            children.map(child => (
                                <div 
                                    key={child.id} 
                                    className="nav-button" 
                                    onClick={() => onZoneClick(child)}
                                >
                                    <span className="nav-text">
                                        {child.type === 'CHAT' ? '' : '✦'} {child.name}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-text">Nessuna zona qui.</div>
                        )}
                      </div>
                  </div>

              </div>
          </div>
      </div>
  );
}

export default MapContent;