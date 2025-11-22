import React from 'react';

const styles = {
    indicator: {
        color: '#c9a84a', // Oro
        backgroundColor: 'rgba(162, 112, 255, 0.2)', // Viola sfumato
        border: '1px solid rgba(201, 168, 74, 0.5)', // Bordo Oro sottile
        padding: '1px 6px',
        fontSize: '9px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginLeft: '8px',
        fontFamily: "'Cinzel', serif", // Font del tema
        borderRadius: '2px',
        letterSpacing: '1px',
        boxShadow: '0 0 5px rgba(201, 168, 74, 0.4)',
        animation: 'pulse-gold 2s infinite',
    },
};

function NewIndicator() {
    return (
        <>
            <style>
                {`
                    @keyframes pulse-gold {
                        0% { box-shadow: 0 0 0 0 rgba(201, 168, 74, 0.4); }
                        70% { box-shadow: 0 0 0 4px rgba(201, 168, 74, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(201, 168, 74, 0); }
                    }
                `}
            </style>
            <span style={styles.indicator}>NUOVO</span>
        </>
    );
}

export default NewIndicator;