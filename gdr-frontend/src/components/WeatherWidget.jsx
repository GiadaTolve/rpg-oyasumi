import React, { useState, useEffect } from 'react';
import api from '../api';

const styles = {
    // --- STILE RINNOVATO (Background Cloudy + Frame) ---
    widget: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: "'Inter', sans-serif",
        color: '#bfc0d1',
        position: 'relative',
        
        // Background Cloudy con velo scuro
        backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.8)), url('/backgrounds/cloudy.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        
        // Cornice e Spaziatura
        border: '1px solid rgba(162, 112, 255, 0.2)',
        borderRadius: '8px',
        padding: '10px',
        boxSizing: 'border-box', // Importante per non sbordare col padding
        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)', // Ombra interna per profondità
        marginBottom: '5px', // Spazio sotto se necessario
    },

    dateTime: {
        textAlign: 'center',
        textTransform: 'uppercase',
        fontSize: '10px',
        color: '#c9a84a', // Gold
        fontFamily: "'Cinzel', serif",
        marginBottom: '8px',
        letterSpacing: '1px',
        width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.1)', // Linea più visibile
        paddingBottom: '5px',
    },

    weatherInfo: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '15px',
        width: '100%',
        paddingBottom: '5px',
    },
    
    weatherIcon: {
        width: '42px', // Leggermente più grande per importanza
        height: '42px',
        filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))',
    },
    
    temp: {
        fontSize: '26px', // Un po' più grande
        fontWeight: 'bold',
        fontFamily: "'Cinzel', serif",
        color: '#e6e0ff',
        textShadow: '0 0 10px rgba(162, 112, 255, 0.5)',
    },

    // Bottone Calendario (Renderizzato solo se serve)
    calendarButton: {
        position: 'absolute',
        top: '35px', 
        right: '10px',
        background: 'none',
        border: 'none',
        padding: '0',
        cursor: 'pointer',
        opacity: 0.7,
        transition: 'transform 0.2s ease, opacity 0.2s',
    },
    calendarIcon: {
        width: '20px',
        height: '20px',
        filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))',
    },
};

function WeatherWidget({ currentMap, onToggleCalendar }) { 
    const [weather, setWeather] = useState(null);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    
    useEffect(() => {
        const locationToFetch = currentMap?.prefecture || 'Tokyo';
        const fetchWeather = async () => {
            try {
                const response = await api.get(`/weather?location=${locationToFetch}`);
                setWeather(response.data);
            } catch (error) {
                setWeather(null);
            }
        };
        fetchWeather();
    }, [currentMap]);

    const formattedDate = time.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    return (
        <div style={styles.widget}>
            <div style={styles.dateTime}>{formattedDate} - {formattedTime}</div>
            
            {weather ? (
                <div style={styles.weatherInfo}>
                    <img src={`/meteo/${weather.icon}`} alt={weather.description} style={styles.weatherIcon} />
                    <div style={styles.temp}>{weather.temp}°C</div>
                </div>
            ) : (
                <div style={{...styles.weatherInfo, fontSize: '11px', fontStyle: 'italic'}}>
                    Caricamento meteo...
                </div>
            )}
            
            {onToggleCalendar && (
                <button 
                    style={styles.calendarButton} 
                    onClick={onToggleCalendar} 
                    title="Eventi del giorno"
                >
                    <img src="/meteo/calendar.png" alt="Calendario" style={styles.calendarIcon} />
                </button>
            )}
        </div>
    );
}

export default WeatherWidget;