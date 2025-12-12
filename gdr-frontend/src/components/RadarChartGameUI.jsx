import React, { useMemo } from 'react';

// --- 1. DESIGN SYSTEM & CONFIGURAZIONE ---
const THEME = {
  colors: {
    primary: '#a270ff',       // Viola Neon
    primaryGlow: 'rgba(162, 112, 255, 0.5)', 
    gold: '#c9a84a',          // Oro Antico
    grid: 'rgba(162, 112, 255, 0.15)', // Griglia sottile
    textTitle: '#e0e0e0',
    textDim: '#8a8a9b',
    dot: '#ffffff'
  },
  fonts: {
    title: "'Cinzel', serif",
    body: "'Work Sans', sans-serif",
  }
};

// --- 2. HELPER MATEMATICI (Logica Pura) ---
const MathUtils = {
  // Converte coordinate polari (valore/angolo) in cartesiane (x,y)
  polarToCartesian: (centerX, centerY, radius, angleInRadians) => {
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  },

  // Calcola l'angolo per un indice specifico (parte da -90° / ore 12)
  calculateAngle: (index, totalPoints) => {
    return (index * 2 * Math.PI / totalPoints) - (Math.PI / 2);
  },

  // Normalizza il valore (0.0 -> 1.0) assicurandosi che non superi il max
  normalize: (value, max) => {
    return Math.min(Math.max(value / (max || 100), 0), 1);
  }
};

// --- 3. COMPONENTE REACT ---
const RadarChartGameUI = ({ data, size = 300 }) => {
  // Dimensioni interne
  const center = size / 2;
  const padding = 40; // Spazio per le etichette
  const radius = center - padding;
  const totalPoints = data.length;

  // --- CALCOLO GEOMETRIA (Memoizzato per performance) ---
  const chartElements = useMemo(() => {
    // 1. Punti del Poligono (Dati Utente)
    const polygonPoints = data.map((item, i) => {
      const angle = MathUtils.calculateAngle(i, totalPoints);
      const normalizedValue = MathUtils.normalize(item.value, item.max);
      const coords = MathUtils.polarToCartesian(center, center, radius * normalizedValue, angle);
      return coords; // Restituisce oggetto {x, y}
    });

    // Stringa per l'attributo 'points' dell'SVG <polygon>
    const pointsString = polygonPoints.map(p => `${p.x},${p.y}`).join(' ');

    // 2. Coordinate degli Assi e Etichette
    const axesData = data.map((item, i) => {
      const angle = MathUtils.calculateAngle(i, totalPoints);
      
      // Fine dell'asse (bordo esterno del cerchio massimo)
      const lineEnd = MathUtils.polarToCartesian(center, center, radius, angle);
      
      // Posizione Etichetta (leggermente fuori dal raggio)
      const labelPos = MathUtils.polarToCartesian(center, center, radius + 20, angle);

      return {
        id: `axis-${i}`,
        lineEnd,
        labelPos,
        label: item.label,
        value: item.value
      };
    });

    return { polygonPoints, pointsString, axesData };
  }, [data, size, radius, center, totalPoints]);

  // --- RENDERING ---
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
        
        {/* DEFINIZIONI FILTRI (Glow Effect) */}
        <defs>
          <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Gradiente Radiale per il riempimento */}
          <radialGradient id="poly-gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={THEME.colors.primary} stopOpacity="0.6" />
            <stop offset="100%" stopColor={THEME.colors.primary} stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* 1. GRIGLIA DI SFONDO (Cerchi Concentrici) */}
        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <circle
            key={`grid-${i}`}
            cx={center}
            cy={center}
            r={radius * scale}
            fill="none"
            stroke={THEME.colors.grid}
            strokeWidth="1"
            strokeDasharray="4 4" // Effetto tratteggiato tech
          />
        ))}

        {/* 2. ASSI RADIALI E ETICHETTE */}
        {chartElements.axesData.map((axis, i) => (
          <g key={axis.id}>
            {/* Linea asse */}
            <line
              x1={center}
              y1={center}
              x2={axis.lineEnd.x}
              y2={axis.lineEnd.y}
              stroke={THEME.colors.grid}
              strokeWidth="1"
            />
            
            {/* Gruppo Testo (Label + Valore) */}
            <g transform={`translate(${axis.labelPos.x}, ${axis.labelPos.y})`}>
              <text
                textAnchor="middle"
                y="-6"
                style={{
                  fill: THEME.colors.gold,
                  fontFamily: THEME.fonts.title,
                  fontSize: '11px',
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                  pointerEvents: 'none' // Evita che il testo blocchi il mouse
                }}
              >
                {axis.label}
              </text>
              <text
                textAnchor="middle"
                y="8"
                style={{
                  fill: THEME.colors.textDim,
                  fontFamily: THEME.fonts.body,
                  fontSize: '10px',
                  fontWeight: '600',
                  pointerEvents: 'none'
                }}
              >
                {axis.value}
              </text>
            </g>
          </g>
        ))}

        {/* 3. DATI (Poligono) */}
        <polygon
          points={chartElements.pointsString}
          fill="url(#poly-gradient)"
          stroke={THEME.colors.primary}
          strokeWidth="2"
          filter="url(#glow-purple)" // Applica il glow
          style={{ transition: 'all 0.5s ease-out' }} // Animazione fluida se i dati cambiano
        />

        {/* 4. VERTICI (Pallini Bianchi) */}
        {chartElements.polygonPoints.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={THEME.colors.dot}
            stroke={THEME.colors.primary}
            strokeWidth="1"
            style={{ transition: 'all 0.5s ease-out' }}
          />
        ))}

      </svg>
    </div>
  );
};

export default RadarChartGameUI;