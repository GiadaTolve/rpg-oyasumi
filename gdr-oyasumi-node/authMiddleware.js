const jwt = require('jsonwebtoken');

// --- SETUP DATABASE (Necessario per leggere il ban) ---
const knex = require('knex');
const knexConfig = require('./knexfile'); // Assicurati che il percorso sia corretto
const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

const verificaToken = async (req, res, next) => {
  // 1. Recupero Token dall'Header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
  }

  try {
    // 2. Verifica Validità Token (JWT)
    const userPayload = jwt.verify(token, process.env.JWT_SECRET);

    // 3. CONTROLLO BAN SU DATABASE
    // Leggiamo lo stato aggiornato dell'utente
    const utenteDb = await db('utenti')
        .select('id_utente', 'ban_expires_at', 'ban_reason', 'ban_type')
        .where('id_utente', userPayload.id)
        .first();

    if (!utenteDb) {
        return res.status(404).json({ message: 'Utente non trovato.' });
    }

    // 4. Logica Scadenza e Tipo Ban
    if (utenteDb.ban_expires_at) {
        const now = new Date();
        const banEnd = new Date(utenteDb.ban_expires_at);

        // Se la data di scadenza è nel futuro, il ban è attivo
        if (banEnd > now) {
            
            // CASO A: BAN TOTALE (FULL)
            // L'utente non può fare nulla, nemmeno leggere.
            if (utenteDb.ban_type === 'FULL') {
                return res.status(403).json({ 
                    error: 'ACCOUNT_BANNED',
                    message: `Account bloccato fino al ${banEnd.toLocaleString('it-IT')}.`,
                    reason: utenteDb.ban_reason 
                });
            }

            // CASO B: SHADOW BAN (SHADOW)
            // L'utente può leggere (GET) ma non può modificare nulla (POST, PUT, DELETE).
            if (utenteDb.ban_type === 'SHADOW') {
                const metodiProibiti = ['POST', 'PUT', 'DELETE', 'PATCH'];
                if (metodiProibiti.includes(req.method)) {
                    return res.status(403).json({ 
                        message: `Sei in modalità SPETTATORE. Non puoi interagire fino al ${banEnd.toLocaleString('it-IT')}.`,
                        reason: utenteDb.ban_reason
                    });
                }
                // Se è una richiesta GET, lo lasciamo passare!
            }
        }
    }

    // 5. Salvataggio IP (Livello 2 Sicurezza)
    // Aggiorniamo l'IP silenziosamente senza bloccare la risposta
    const currentIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    db('utenti')
        .where('id_utente', userPayload.id)
        .update({ last_ip_address: currentIp })
        .catch(err => console.error("Errore tracciamento IP:", err)); // Log silenzioso in caso di errore

    // 6. Tutto OK: Procedi
    req.utente = userPayload; // Passiamo i dati decodificati alla rotta successiva
    next();

  } catch (err) {
    console.error("Errore Auth:", err.message);
    return res.status(403).json({ message: 'Token non valido o scaduto.' });
  }
};

module.exports = verificaToken;