const jwt = require('jsonwebtoken');

// --- SETUP DATABASE (Necessario per leggere il ban) ---
const knex = require('knex');
const knexConfig = require('./knexfile');
const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

// =====================================================
// ROTTE PUBBLICHE (NON RICHIEDONO TOKEN)
// =====================================================
const publicRoutes = [
    '/', 
    '/api/login',
    '/api/register',
    '/api/manuale',
    '/api/active-banner'
];

const verificaToken = async (req, res, next) => {

    // =================================================
    // 0. BYPASS PER ROTTE PUBBLICHE
    // =================================================
    if (publicRoutes.includes(req.path)) {
        return next();
    }

    // =================================================
    // 1. RECUPERO TOKEN
    // =================================================
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
    }

    try {
        // =================================================
        // 2. VERIFICA TOKEN JWT
        // =================================================
        const userPayload = jwt.verify(token, process.env.JWT_SECRET);

        // =================================================
        // 3. CONTROLLO BAN SU DATABASE
        // =================================================
        const utenteDb = await db('utenti')
            .select('id_utente', 'ban_expires_at', 'ban_reason', 'ban_type')
            .where('id_utente', userPayload.id)
            .first();

        if (!utenteDb) {
            return res.status(404).json({ message: 'Utente non trovato.' });
        }

        if (utenteDb.ban_expires_at) {
            const now = new Date();
            const banEnd = new Date(utenteDb.ban_expires_at);

            if (banEnd > now) {

                // 🔴 BAN TOTALE
                if (utenteDb.ban_type === 'FULL') {
                    return res.status(403).json({
                        error: 'ACCOUNT_BANNED',
                        message: `Account bloccato fino al ${banEnd.toLocaleString('it-IT')}.`,
                        reason: utenteDb.ban_reason
                    });
                }

                // 🟡 SHADOW BAN
                if (utenteDb.ban_type === 'SHADOW') {
                    const forbiddenMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
                    if (forbiddenMethods.includes(req.method)) {
                        return res.status(403).json({
                            message: `Sei in modalità SPETTATORE fino al ${banEnd.toLocaleString('it-IT')}.`,
                            reason: utenteDb.ban_reason
                        });
                    }
                }
            }
        }

        // =================================================
        // 4. TRACK IP (NON BLOCCANTE)
        // =================================================
        const currentIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        db('utenti')
            .where('id_utente', userPayload.id)
            .update({ last_ip_address: currentIp })
            .catch(err => console.error("Errore tracciamento IP:", err));

        // =================================================
        // 5. OK → PASSA ALLA ROUTE
        // =================================================
        req.utente = userPayload;
        next();

    } catch (err) {
        console.error("Errore Auth:", err.message);
        return res.status(403).json({ message: 'Token non valido o scaduto.' });
    }
};

module.exports = verificaToken;
