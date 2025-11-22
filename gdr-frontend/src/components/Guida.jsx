import React from 'react';
import ManualeBase from './ManualeBase';

function Guida({ onClose, user }) {
    return <ManualeBase titoloFinestra="GUIDA AL GIOCO" categoria="GUIDA" onClose={onClose} user={user} />;
}
export default Guida;