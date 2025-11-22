import React from 'react';
import ManualeBase from './ManualeBase';

function Ambientazione({ onClose, user }) {
    return <ManualeBase titoloFinestra="LORE & AMBIENTAZIONE" categoria="AMBIENTAZIONE" onClose={onClose} user={user} />;
}
export default Ambientazione;