require('dotenv').config();

// =====================================================
// --- 1. IMPORT E IMPOSTAZIONI GLOBALI ---
// =====================================================

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const verificaToken = require('./authMiddleware');
const ytdl = require('ytdl-core');
const axios = require('axios');
const knex = require('knex');
const knexConfig = require('./knexfile');
const path = require('path');

// =====================================================
// --- 2. AMBIENTE & DATABASE ---
// =====================================================

const environment = process.env.NODE_ENV || 'development';

if (!knexConfig[environment]) {
    throw new Error(`❌ Configurazione Knex mancante per ambiente: ${environment}`);
}

const db = knex(knexConfig[environment]);

// =====================================================
// --- 3. EXPRESS & HTTP SERVER ---
// =====================================================

const app = express();
const port = process.env.PORT || 10000;
const httpServer = http.createServer(app);

// =====================================================
// --- 4. CORS (RENDER SAFE) ---
// =====================================================

const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.includes(origin)) {
            return callback(new Error('CORS bloccato'), false);
        }
        return callback(null, true);
    },
    credentials: true
};

// =====================================================
// --- 5. SOCKET.IO ---
// =====================================================

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        credentials: true
    }
});

// =====================================================
// --- 6. MIDDLEWARE BASE ---
// =====================================================

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// (NOTA: Qui ho rimosso il blocco duplicato del frontend che avevi messo per sbaglio)

// =====================================================
// --- PERMESSI ---
// =====================================================

const verificaAdmin = (req, res, next) => {
    if (!req.utente) {
        return res.status(401).json({ message: 'Non autenticato.' });
    }
    if (req.utente.permesso === 'ADMIN') return next();
    return res.status(403).json({ message: 'Accesso negato: Admin richiesto.' });
};

const verificaMod = (req, res, next) => {
    if (!req.utente) {
        return res.status(401).json({ message: 'Non autenticato.' });
    }
    if (['MOD', 'ADMIN'].includes(req.utente.permesso)) return next();
    return res.status(403).json({ message: 'Accesso negato: Moderatore richiesto.' });
};

const verificaMaster = (req, res, next) => {
    if (!req.utente) {
        return res.status(401).json({ message: 'Non autenticato.' });
    }
    if (['MASTER', 'MOD', 'ADMIN'].includes(req.utente.permesso)) return next();
    return res.status(403).json({ message: 'Accesso negato: Master richiesto.' });
};


// Espone db e io (utile per moduli futuri)
app.set('db', db);
app.set('io', io);

// =====================================================
// --- 7. STATO IN-MEMORY ---
// =====================================================

let onlineUsers = {};
let userSockets = new Map();

// =====================================================
// --- 8. HELPER FUNCTIONS ---
// =====================================================

function calculateLevel(exp) {
    if (!exp || exp < 100) return 1;
    const level = Math.floor((-5 + Math.sqrt(225 + 4 * exp)) / 10);
    return Math.min(level, 50);
}

// =====================================================
// --- 9. SERVIZIO AFFITTI ---
// =====================================================

const checkRentDue = async (userId) => {
    try {
        const user = await db('utenti')
            .join('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select(
                'utenti.id_utente',
                'utenti.rent_due_date',
                'housing_types.cost_rem',
                'housing_types.cost_type',
                'housing_types.name'
            )
            .where('utenti.id_utente', userId)
            .first();

        if (!user || !user.rent_due_date || user.cost_type === 'DAILY_SALARY') return;

        const now = new Date();
        const dueDate = new Date(user.rent_due_date);

        if (now > dueDate) {
            const lastMsg = await db('private_messages')
                .where({ receiver_id: userId, sender_id: 0 })
                .andWhere('text', 'like', '%AFFITTO SCADUTO%')
                .orderBy('timestamp', 'desc')
                .first();

            if (!lastMsg || (Date.now() - new Date(lastMsg.timestamp)) > 86400000) {
                await db('private_messages').insert({
                    sender_id: 0,
                    receiver_id: userId,
                    text: `⚠️ AFFITTO SCADUTO ⚠️\nIl canone per "${user.name}" (${user.cost_rem} REM) è scaduto.`,
                    is_read: 0
                });

                console.log(`[HOUSING] Sollecito affitto inviato a user ${userId}`);
            }
        }
    } catch (err) {
        console.error('Errore controllo affitti:', err);
    }
};

// =====================================================
// --- 10. API PUBBLICHE (LOGIN / REGISTER) ---
// =====================================================

// AUTH: REGISTRAZIONE
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, nome_pg, playerPreferences } = req.body;
        
        if (!email || !password || !nome_pg) {
            return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUserId = await db.transaction(async (trx) => {
            const [userIdResult] = await trx('utenti')
                .insert({
                    email,
                    password: hashedPassword,
                    nome_pg,
                    preferenze_gioco: playerPreferences
                })
                .returning('id_utente');

            const userId = (typeof userIdResult === 'object') ? userIdResult.id_utente : userIdResult;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'oyasumi.staff@gmail.com',
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailOptions = {
                from: '"Oyasumi Staff" <oyasumi.staff@gmail.com>',
                to: email,
                subject: `Benvenuto in Oyasumi, ${nome_pg}`,
                html: `
                    <div style="background-color: #050508; color: #bfc0d1; padding: 20px; font-family: sans-serif; border: 1px solid #31323e;">
                        <h1 style="color: #a270ff; border-bottom: 2px solid #c9a84a; padding-bottom: 10px;">Benvenuto, Sognatore.</h1>
                        <p>La tua registrazione su <strong>Oyasumi</strong> è stata completata con successo.</p>
                        <p>Il tuo personaggio, <strong>${nome_pg}</strong>, è ora pronto per esplorare la realtà che sanguina.</p>
                    </div>
                `
            };

            transporter.sendMail(mailOptions).catch(err => {
                console.error("⚠️ Errore silente invio mail:", err.message);
            });

            return userId; 
        });

        res.status(201).json({ 
            message: 'Utente registrato con successo!', 
            userId: newUserId 
        });

    } catch (errore) {
        console.error("❌ Errore durante il processo di registrazione:", errore);
        if (errore.code === '23505' || errore.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Questa email è già stata utilizzata.' });
        }
        res.status(500).json({ message: 'Errore interno del server durante la registrazione.' });
    }
});

// SETUP ITEMS (Rotta Temporanea)
app.get('/api/setup-items', async (req, res) => {
    try {
        console.log("📦 Inizio setup inventario...");

        if (!(await db.schema.hasTable('oggetti'))) {
            await db.schema.createTable('oggetti', (table) => {
                table.increments('id').primary();
                table.string('nome').notNullable();
                table.string('descrizione');
                table.string('icona'); 
                table.string('tipo').defaultTo('GENERICO');
                table.float('peso').defaultTo(0);
            });
            console.log("✅ Tabella 'oggetti' creata.");
        }

        if (!(await db.schema.hasTable('inventario'))) {
            await db.schema.createTable('inventario', (table) => {
                table.increments('id').primary();
                table.integer('user_id').unsigned().references('id_utente').inTable('utenti').onDelete('CASCADE');
                table.integer('item_id').unsigned().references('id').inTable('oggetti').onDelete('CASCADE');
                table.integer('quantita').defaultTo(1);
            });
            console.log("✅ Tabella 'inventario' creata.");
        }

        await db.transaction(async (trx) => {
            const oggettiBase = [
                { id: 1, nome: 'Pozione Curativa', descrizione: 'Restituisce 10 PF', icona: 'https://i.imgur.com/Xq7tX1h.png', tipo: 'CONSUMABILE' },
                { id: 2, nome: 'Katana Arrugginita', descrizione: 'Vecchia lama.', icona: 'https://i.imgur.com/2b3m4zL.png', tipo: 'ARMA' },
                { id: 3, nome: 'Chiave Dorata', descrizione: 'Apre qualcosa...', icona: 'https://i.imgur.com/8QzXy9A.png', tipo: 'CHIAVE' }
            ];

            for (const obj of oggettiBase) {
                const exists = await trx('oggetti').where('id', obj.id).first();
                if (!exists) {
                    await trx('oggetti').insert(obj);
                }
            }

            const primoUtente = await trx('utenti').orderBy('id_utente', 'asc').first();
            
            if (primoUtente) {
                const invExists = await trx('inventario').where({ user_id: primoUtente.id_utente, item_id: 1 }).first();
                if (!invExists) {
                    await trx('inventario').insert({ user_id: primoUtente.id_utente, item_id: 1, quantita: 5 });
                    console.log(`🎁 Assegnate 5 Pozioni a ${primoUtente.nome_pg}`);
                }
            }
        });

        res.send("<h1>📦 Oggetti e Inventario Configurati!</h1><p>Tabelle create e oggetti di test assegnati al primo utente.</p>");

    } catch (error) {
        console.error("❌ ERRORE SETUP ITEMS:", error);
        res.status(500).send("Errore: " + error.message);
    }
});

// AUTH: LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email e password sono obbligatorie.' });

        const utente = await db('utenti').where({ email }).first();

        if (!utente) return res.status(401).json({ message: 'Credenziali non valide.' });

        const passwordCorrisponde = await bcrypt.compare(password, utente.password);
        if (!passwordCorrisponde) return res.status(401).json({ message: 'Credenziali non valide.' });

        const payload = { id: utente.id_utente, nome_pg: utente.nome_pg, permesso: utente.permesso };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        checkRentDue(utente.id_utente);
        res.status(200).json({ message: 'Login effettuato con successo!', token });
    } catch (errore) {
        console.error('Errore nel login:', errore);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

// =====================================================
// --- API PROTETTE (RICHIEDONO VERIFICATOKEN) ---
// =====================================================

// RICERCA UTENTI
app.get('/api/users/find', verificaToken, async (req, res) => {
    const { name } = req.query;
    const myId = req.utente.id;

    if (!name) return res.status(400).json({ message: 'Il nome del personaggio è richiesto.' });

    try {
        const users = await db('utenti')
            .select('id_utente', 'nome_pg', 'avatar_chat')
            .whereRaw('LOWER(nome_pg) LIKE LOWER(?)', [`${name}%`])
            .andWhere('id_utente', '!=', myId)
            .limit(5); 

        res.json(users); 

    } catch (error) {
        console.error("Errore nella ricerca dell'utente:", error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

// API MANUALE
app.get('/api/manuale', async (req, res) => {
    try {
        res.json({ content: "Manuale in caricamento..." }); 
    } catch (e) {
        res.status(500).json({ message: "Errore manuale." });
    }
});

// SCHEDA PERSONAGGIO
app.get('/api/scheda', verificaToken, async (req, res) => {
    try {
      const scheda = await db('utenti').where('id_utente', req.utente.id).first();
      
      if (!scheda) return res.status(404).json({ message: 'Scheda non trovata.' });
  
      const livello = calculateLevel(scheda.exp_accumulata);
      delete scheda.password;
      const schedaCompleta = { ...scheda, livello: livello };
      
      res.status(200).json(schedaCompleta);
    } catch (errore) {
      console.error("Errore recupero scheda:", errore);
      res.status(500).json({ message: 'Errore interno del server.' });
    }
});
  
// [GET] SCHEDA PUBBLICA 
app.get('/api/scheda/:id', verificaToken, async (req, res) => {
    try {
        const targetId = req.params.id;
        const requesterPerm = req.utente.permesso; 
        const isStaff = ['ADMIN', 'MOD', 'MASTER'].includes(requesterPerm);

        const scheda = await db('utenti')
            .leftJoin('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select(
                'utenti.*',
                'housing_types.name as house_name',
                'housing_types.id as house_type_id'
            )
            .where('utenti.id_utente', targetId)
            .first();
      
        if (!scheda) return res.status(404).json({ message: 'Scheda non trovata.' });
  
        delete scheda.password;
        delete scheda.email; 
        
        if (!isStaff && req.utente.id !== scheda.id_utente) {
            delete scheda.house_chat_id; 
        }
        
        if (typeof calculateLevel === 'function') {
            scheda.livello = calculateLevel(scheda.exp_accumulata);
        } else {
             if (scheda.exp_accumulata < 100) scheda.livello = 1;
             else scheda.livello = Math.min(Math.floor((-5 + Math.sqrt(225 + 4 * scheda.exp_accumulata)) / 10), 50);
        }
      
        res.status(200).json(scheda);

    } catch (errore) {
        console.error("Errore recupero scheda pubblica:", errore);
        res.status(500).json({ message: 'Errore interno.' });
    }
});

// [POST] BAN UTENTE 
app.post('/api/admin/users/:id/ban', verificaToken, verificaMod, async (req, res) => {
    const targetUserId = req.params.id;
    const { days, reason, type } = req.body; 
    const adminName = req.utente.nome_pg; 

    if (!days || !reason) return res.status(400).json({ message: "Dati mancanti." });

    const banType = type === 'SHADOW' ? 'SHADOW' : 'FULL';

    try {
        const banDate = new Date();
        banDate.setDate(banDate.getDate() + parseInt(days));

        await db.transaction(async (trx) => {
            await trx('utenti').where('id_utente', targetUserId).update({
                ban_expires_at: banDate,
                ban_reason: reason,
                ban_type: banType
            });

            await trx('user_sanctions').insert({
                user_id: targetUserId,
                admin_name: adminName,
                type: banType,
                days: parseInt(days),
                reason: reason
            });
        });

        if (banType === 'FULL') {
            const socketId = userSockets.get(Number(targetUserId));
            if (socketId) io.sockets.sockets.get(socketId)?.disconnect(true);
        }

        res.json({ message: `Utente punito (${banType}) per ${days} giorni.` });
    } catch (error) {
        console.error("Errore ban:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

// [POST] UNBAN UTENTE 
app.post('/api/admin/users/:id/unban', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('utenti').where('id_utente', req.params.id).update({
            ban_expires_at: null,
            ban_reason: null,
            ban_type: null
        });
        res.json({ message: "Ban rimosso con successo." });
    } catch (error) {
        console.error("Errore unban:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

// [GET] RECUPERA STORICO SANZIONI
app.get('/api/admin/users/:id/sanctions', verificaToken, verificaMod, async (req, res) => {
    try {
        const history = await db('user_sanctions')
            .where('user_id', req.params.id)
            .orderBy('created_at', 'desc');
        res.json(history);
    } catch (error) {
        console.error("Errore recupero sanzioni:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

// [POST] AGGIORNA STATISTICHE 
app.post('/api/scheda/aggiorna-stat', verificaToken, async (req, res) => {
    const { updates } = req.body;
    const userId = req.utente.id;

    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ message: "Dati invalidi per l'aggiornamento." });
    }

    const validStats = [
      'forza', 'destrezza', 'costituzione', 'mente', 'empatia',
      'reflexes', 'velocita', 'percezione_sensi', 'percezione_spirituale',
      'movimento', 'salto', 'lancio', 'peso_trasportabile', 'ingaggio', 
      'danno_cac', 'danno_cad',
      'stat_body', 'stat_kotodama',
      'hp', 'mp'
    ];

    try {
        const schedaAggiornata = await db.transaction(async (trx) => {
            const datiDaSalvare = {};
            
            for (const stat in updates) {
                if (validStats.includes(stat)) {
                    datiDaSalvare[stat] = Math.round(Number(updates[stat]));
                }
            }

            if (Object.keys(datiDaSalvare).length === 0) {
                return await trx('utenti').where({ id_utente: userId }).first();
            }

            await trx('utenti').where({ id_utente: userId }).update(datiDaSalvare);

            const schedaDb = await trx('utenti').where({ id_utente: userId }).first();
            delete schedaDb.password;
            
            if (typeof calculateLevel === 'function') {
                schedaDb.livello = calculateLevel(schedaDb.exp_accumulata);
            }
            
            return schedaDb;
        });

        res.status(200).json(schedaAggiornata);

    } catch (error) {
        console.error("Errore aggiornamento statistiche:", error);
        res.status(500).json({ message: "Errore interno durante il salvataggio." });
    }
});

// AGGIORNAMENTO PROFILO
const gestisciAggiornamentoProfilo = async (req, res) => {
    console.log("📩 Tentativo aggiornamento profilo per:", req.utente.nome_pg);
    
    const { avatar, avatar_chat, background, cognome } = req.body;
    const userId = req.utente.id;

    try {
        await db('utenti')
            .where('id_utente', userId)
            .update({ 
                avatar, 
                avatar_chat, 
                background,
                cognome 
            });

        const schedaAggiornata = await db('utenti').where('id_utente', userId).first();
        
        if (schedaAggiornata) {
            delete schedaAggiornata.password;
            if (typeof calculateLevel === 'function') {
                schedaAggiornata.livello = calculateLevel(schedaAggiornata.exp_accumulata);
            }
            res.status(200).json(schedaAggiornata);
        } else {
            res.status(404).json({ message: "Utente non trovato nel DB." });
        }

    } catch (error) {
        console.error("❌ Errore critico salvataggio profilo:", error);
        res.status(500).json({ message: "Errore interno durante il salvataggio." });
    }
};

app.put('/api/scheda/profilo', verificaToken, gestisciAggiornamentoProfilo);
app.post('/api/scheda/profilo', verificaToken, gestisciAggiornamentoProfilo);

// BANNER 
app.get(['/api/active-event', '/api/active-banner'], async (req, res) => {
    try {
        const event = await db('events')
            .where({ is_active: 1 })
            .first();
        res.json(event || null);
    } catch (e) {
        console.error("Errore evento attivo:", e);
        res.status(500).json({ message: "Errore recupero evento attivo." });
    }
});

// CHAT HISTORY
app.get('/api/chat/:chatId/history', verificaToken, async (req, res) => {
    try {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const history = await db('chat_log')
            .select('autore', 'permesso', 'testo', 'tipo', 'timestamp', 'luogo')
            .where('chat_id', req.params.chatId)
            .andWhere('timestamp', '>=', twoHoursAgo)
            .orderBy('timestamp', 'asc');
        res.json(history);
    } catch (error) {
        console.error("Errore recupero cronologia chat:", error);
        res.status(500).json({ message: "Errore nel recupero della cronologia chat." });
    }
});

// METEO
app.get('/api/weather', verificaToken, async (req, res) => {
    const { location } = req.query;
    if (!location) return res.status(400).json({ message: 'Prefettura non specificata.' });

    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location},JP&appid=${apiKey}&units=metric&lang=it`;

    try {
        const response = await axios.get(url);
        const data = response.data;
        res.json({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: 'sun.png' 
        });
    } catch (error) {
        res.status(500).json({ message: 'Impossibile recuperare i dati meteo.' });
    }
});

// ADMIN ROUTES 
app.get('/api/admin/users', verificaToken, verificaMod, async (req, res) => {
    const users = await db('utenti').select('id_utente', 'email', 'nome_pg', 'permesso');
    res.json(users);
});

app.put('/api/admin/users/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { nome_pg, email, permesso, password } = req.body;

    try {
        const updateData = { nome_pg, email, permesso };

        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedCount = await db('utenti')
            .where({ id_utente: id })
            .update(updateData);

        if (updatedCount === 0) {
            return res.status(404).json({ message: "Utente non trovato nel database." });
        }
        res.json({ message: "Dati utente aggiornati correttamente!" });

    } catch (error) {
        console.error("❌ ERRORE CRITICO AGGIORNAMENTO UTENTE:", error);
        res.status(500).json({ 
            message: "Errore interno del server durante il salvataggio.",
            error: error.message 
        });
    }
});

// =====================================================
// --- BLOCCO 1: ADMIN BANNERS (CRUD COMPLETO) ---
// =====================================================

app.get('/api/admin/banners', verificaToken, verificaMod, async (req, res) => {
    try {
        const banners = await db('event_banners')
            .select('*')
            .orderBy('id', 'desc');
        res.status(200).json(Array.isArray(banners) ? banners : []);
    } catch (error) {
        console.error("❌ Errore GET admin banners:", error);
        res.status(500).json({ message: "Errore recupero banners." });
    }
});


app.post('/api/admin/banners', verificaToken, verificaMod, async (req, res) => {
    const { title, image_url, link_url, is_active } = req.body;

    try {
        await db.transaction(async (trx) => {
            if (is_active) {
                await trx('event_banners').update({ is_active: 0 });
            }
            await trx('event_banners').insert({
                title, image_url, link_url, is_active: is_active ? 1 : 0
            });
        });
        res.json({ message: "Banner creato con successo." });
    } catch (error) {
        console.error("Errore POST admin banner:", error);
        res.status(500).json({ message: "Errore creazione banner." });
    }
});

app.put('/api/admin/banners/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { title, image_url, link_url, is_active } = req.body;

    try {
        await db.transaction(async (trx) => {
            if (is_active) {
                await trx('event_banners')
                    .whereNot('id', id)
                    .update({ is_active: 0 });
            }
            await trx('event_banners')
                .where({ id })
                .update({ title, image_url, link_url, is_active: is_active ? 1 : 0 });
        });
        res.json({ message: "Banner aggiornato." });
    } catch (error) {
        console.error("Errore PUT admin banner:", error);
        res.status(500).json({ message: "Errore aggiornamento banner." });
    }
});

app.delete('/api/admin/banners/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    try {
        await db('event_banners').where({ id }).del();
        res.json({ message: "Banner eliminato." });
    } catch (error) {
        console.error("Errore DELETE admin banner:", error);
        res.status(500).json({ message: "Errore eliminazione banner." });
    }
});

// =====================================================
// --- ADMIN MAPPE ---
// =====================================================

app.get('/api/admin/locations', verificaToken, verificaMod, async (req, res) => {
    try {
        const locations = await db('locations').select('*').orderBy('id', 'asc');
        res.json(locations);
    } catch (error) {
        console.error("❌ Errore GET admin locations:", error);
        res.status(500).json({ message: "Errore recupero locations." });
    }
});

app.post('/api/admin/locations', verificaToken, verificaMod, async (req, res) => {
    const { name, type, parent_id, image_url, description, pos_x, pos_y, prefecture } = req.body;

    try {
        const [idResult] = await db('locations')
            .insert({
                name, type, parent_id: parent_id ?? null,
                image_url: image_url ?? null, description: description ?? null,
                pos_x: pos_x ?? null, pos_y: pos_y ?? null, prefecture: prefecture ?? null
            })
            .returning('id');

        const newId = typeof idResult === 'object' ? idResult.id : idResult;
        res.status(201).json({ id: newId });
    } catch (error) {
        console.error("❌ Errore CREATE location:", error);
        res.status(500).json({ message: "Errore creazione location." });
    }
});

app.put('/api/admin/locations/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { name, image_url, description, pos_x, pos_y, prefecture, type, parent_id } = req.body;

    try {
        const updateData = {
            name, image_url, description,
            pos_x: pos_x ? Number(pos_x) : null, pos_y: pos_y ? Number(pos_y) : null,
            prefecture, type, parent_id: parent_id || null
        };

        const result = await db('locations').where({ id }).update(updateData);

        if (result === 0) return res.status(404).json({ message: "Location non trovata." });
        res.json({ message: "Modifiche salvate con successo!" });

    } catch (error) {
        console.error("❌ ERRORE AGGIORNAMENTO MAPPA:", error);
        res.status(500).json({ message: "Errore durante il salvataggio della mappa." });
    }
});

app.put('/api/admin/locations/:id/parent', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { newParentId } = req.body;

    try {
        await db('locations').where({ id }).update({ parent_id: newParentId ?? null });
        res.json({ message: "Parent aggiornato." });
    } catch (error) {
        console.error("❌ Errore cambio parent:", error);
        res.status(500).json({ message: "Errore spostamento location." });
    }
});

app.delete('/api/admin/locations/:id', verificaToken, verificaAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db('locations').where({ id }).del();
        res.json({ message: "Location eliminata." });
    } catch (error) {
        console.error("❌ Errore DELETE location:", error);
        res.status(500).json({ message: "Errore eliminazione location." });
    }
});

// =====================================================
// --- ADMIN FORUM ---
// =====================================================

app.get('/api/admin/forum/sezioni', verificaToken, verificaMod, async (req, res) => {
    try {
        const sezioni = await db('forum_sezioni').orderBy('ordine', 'asc');
        res.json(sezioni);
    } catch (e) {
        console.error("Errore get sezioni:", e);
        res.status(500).json({ message: "Errore recupero sezioni." });
    }
});


app.post('/api/admin/forum/sezioni', verificaToken, verificaMod, async (req, res) => {
    const { titolo, descrizione, ordine } = req.body;
    try {
        await db('forum_sezioni').insert({ titolo, descrizione, ordine: ordine ?? 0 });
        res.status(201).json({ message: "Sezione creata." });
    } catch (e) {
        console.error("Errore crea sezione:", e);
        res.status(500).json({ message: "Errore creazione sezione." });
    }
});

app.put('/api/admin/forum/sezioni/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_sezioni').where({ id: req.params.id }).update(req.body);
        res.json({ message: "Sezione aggiornata." });
    } catch (e) {
        console.error("Errore update sezione:", e);
        res.status(500).json({ message: "Errore aggiornamento sezione." });
    }
});

app.delete('/api/admin/forum/sezioni/:id', verificaToken, verificaAdmin, async (req, res) => {
    try {
        await db('forum_sezioni').where({ id: req.params.id }).del();
        res.json({ message: "Sezione eliminata." });
    } catch (e) {
        console.error("Errore delete sezione:", e);
        res.status(500).json({ message: "Errore eliminazione sezione." });
    }
});

app.get('/api/admin/forum/bacheche', verificaToken, verificaMod, async (req, res) => {
    try {
        const bacheche = await db('forum_bacheche').orderBy('ordine', 'asc');
        res.json(bacheche);
    } catch (e) {
        console.error("Errore get bacheche:", e);
        res.status(500).json({ message: "Errore recupero bacheche." });
    }
});

app.post('/api/admin/forum/bacheche', verificaToken, verificaMod, async (req, res) => {
    const { sezione_id, titolo, descrizione, ordine } = req.body;
    try {
        await db('forum_bacheche').insert({ sezione_id, titolo, descrizione, ordine: ordine ?? 0 });
        res.status(201).json({ message: "Bacheca creata." });
    } catch (e) {
        console.error("Errore crea bacheca:", e);
        res.status(500).json({ message: "Errore creazione bacheca." });
    }
});

app.put('/api/admin/forum/bacheche/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_bacheche').where({ id: req.params.id }).update(req.body);
        res.json({ message: "Bacheca aggiornata." });
    } catch (e) {
        console.error("Errore update bacheca:", e);
        res.status(500).json({ message: "Errore aggiornamento bacheca." });
    }
});

app.delete('/api/admin/forum/bacheche/:id', verificaToken, verificaAdmin, async (req, res) => {
    try {
        await db('forum_bacheche').where({ id: req.params.id }).del();
        res.json({ message: "Bacheca eliminata." });
    } catch (e) {
        console.error("Errore delete bacheca:", e);
        res.status(500).json({ message: "Errore eliminazione bacheca." });
    }
});

app.get('/api/admin/forum/topics', verificaToken, verificaMod, async (req, res) => {
    try {
        const topics = await db('forum_topics').orderBy('ultimo_post_timestamp', 'desc');
        res.json(topics);
    } catch (e) {
        console.error("Errore get topics admin:", e);
        res.status(500).json({ message: "Errore recupero topics." });
    }
});

app.delete('/api/admin/forum/topics/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db.transaction(async (trx) => {
            await trx('forum_posts').where({ topic_id: req.params.id }).del();
            await trx('forum_topics').where({ id: req.params.id }).del();
        });
        res.json({ message: "Topic eliminato." });
    } catch (e) {
        console.error("Errore delete topic:", e);
        res.status(500).json({ message: "Errore eliminazione topic." });
    }
});

app.delete('/api/admin/forum/posts/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_posts').where({ id: req.params.id }).del();
        res.json({ message: "Post eliminato." });
    } catch (e) {
        console.error("Errore delete post:", e);
        res.status(500).json({ message: "Errore eliminazione post." });
    }
});

// =====================================================
// --- ADMIN EVENTI ---
// =====================================================


app.get('/api/admin/events', verificaToken, verificaMod, async (req, res) => {
    try {
        const events = await db('events').orderBy('data_inizio', 'desc');
        res.json(events);
    } catch (e) {
        console.error("Errore get events:", e);
        res.status(500).json({ message: "Errore recupero eventi." });
    }
});

app.post('/api/admin/events', verificaToken, verificaMod, async (req, res) => {
    const { titolo, descrizione, data_inizio, data_fine } = req.body;
    if (!titolo || !data_inizio) {
        return res.status(400).json({ message: "Titolo e data inizio obbligatori." });
    }
    try {
        await db('events').insert({ titolo, descrizione, data_inizio, data_fine, is_active: 0 });
        res.status(201).json({ message: "Evento creato." });
    } catch (e) {
        console.error("Errore crea evento:", e);
        res.status(500).json({ message: "Errore creazione evento." });
    }
});

app.put('/api/admin/events/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('events').where({ id: req.params.id }).update(req.body);
        res.json({ message: "Evento aggiornato." });
    } catch (e) {
        console.error("Errore update evento:", e);
        res.status(500).json({ message: "Errore aggiornamento evento." });
    }
});

app.put('/api/admin/events/:id/activate', verificaToken, verificaMod, async (req, res) => {
    try {
        await db.transaction(async (trx) => {
            await trx('events').update({ is_active: 0 });
            await trx('events').where({ id: req.params.id }).update({ is_active: 1 });
        });
        res.json({ message: "Evento attivato (unico attivo)." });
    } catch (e) {
        console.error("Errore attiva evento:", e);
        res.status(500).json({ message: "Errore attivazione evento." });
    }
});

app.delete('/api/admin/events/:id', verificaToken, verificaAdmin, async (req, res) => {
    try {
        await db('events').where({ id: req.params.id }).del();
        res.json({ message: "Evento eliminato." });
    } catch (e) {
        console.error("Errore delete evento:", e);
        res.status(500).json({ message: "Errore eliminazione evento." });
    }
});



// MAPPE DI GIOCO
app.get('/api/game/map/:mapId', verificaToken, async (req, res) => {
    try {
        let map;
        if (req.params.mapId === 'root') {
            map = await db('locations').whereNull('parent_id').andWhere('type', 'MAP').first();
        } else {
            map = await db('locations').where({ id: req.params.mapId, type: 'MAP' }).first();
        }
        
        if (!map) return res.status(404).json({ message: 'Mappa non trovata.' });
        
        const children = await db('locations').where('parent_id', map.id);
        res.json({ mapInfo: map, children: children });
    } catch (error) {
        console.error("Errore recupero mappa:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.get('/api/locations/:id', verificaToken, async (req, res) => {
    const location = await db('locations').where('id', req.params.id).first();
    if (location) res.json(location);
    else res.status(404).json({ message: 'Location non trovata.' });
});

// --- QUEST SYSTEM ---
app.get('/api/quests/trame', verificaToken, verificaMaster, async (req, res) => {
    const trame = await db('quests').select('id', 'name').where('type', 'TRAMA').whereNull('parent_quest_id');
    res.json(trame);
});

app.post('/api/quests', verificaToken, verificaMaster, async (req, res) => {
    // ... Logica creazione quest ...
    res.json({ message: 'Quest creata' });
});

// =================================================================
// --- BLOCCO API FORUM (COMPLETO) ---
// =================================================================

app.get('/api/forum', verificaToken, async (req, res) => {
    try {
      const userId = req.utente.id;
  
      // 1. SEZIONI
      const sezioni = await db('forum_sezioni')
        .select('id', 'nome', 'descrizione', 'ordine')
        .orderBy('ordine', 'asc');
  
      // 2. BACHECHE + METADATI
      const bacheche = await db('forum_bacheche as b')
        .select(
          'b.id', 'b.sezione_id', 'b.nome', 'b.descrizione', 'b.ordine', 'b.is_locked',
          db.raw('(SELECT COUNT(*) FROM forum_topics t WHERE t.bacheca_id = b.id) AS topic_count'),
          db.raw(`(SELECT MAX(ultimo_post_timestamp) FROM forum_topics t WHERE t.bacheca_id = b.id) AS last_post_timestamp`),
          db.raw(`(SELECT u.nome_pg FROM forum_topics t JOIN forum_posts p ON p.topic_id = t.id JOIN utenti u ON u.id_utente = p.autore_id WHERE t.bacheca_id = b.id ORDER BY p.timestamp_creazione DESC LIMIT 1) AS last_post_author`),
          db.raw(`(SELECT EXISTS (SELECT 1 FROM forum_topics t LEFT JOIN forum_topic_reads r ON r.topic_id = t.id AND r.user_id = ? WHERE t.bacheca_id = b.id AND t.ultimo_post_timestamp > COALESCE(r.last_read_timestamp, TIMESTAMP '1970-01-01'))) AS has_new_posts`, [userId])
        )
        .orderBy('b.ordine', 'asc');
  
      // 3. STRUTTURA GERARCHICA
      const forumData = sezioni.map(sezione => ({
        ...sezione,
        bacheche: bacheche.filter(b => b.sezione_id === sezione.id)
      }));
  
      res.json(forumData);
  
    } catch (error) {
      console.error('❌ ERRORE /api/forum:', error.message);
      res.status(500).json({ message: 'Errore interno forum', error: error.message });
    }
  });

  


app.get('/api/forum/bacheca/:bachecaId/topics', verificaToken, async (req, res) => {
    try {
        const { bachecaId } = req.params;
        const { id: userId } = req.utente;
        const bacheca = await db('forum_bacheche').where('id', bachecaId).first();
        const topics = await db('forum_topics as t')
            .join('utenti as u', 't.autore_id', 'u.id_utente')
            .select([
                't.*', 'u.nome_pg as autore_nome',
                db.raw('(SELECT COUNT(p.id) FROM forum_posts p WHERE p.topic_id = t.id) as post_count'),
                db.raw(`(t.ultimo_post_timestamp > COALESCE((SELECT r.last_read_timestamp FROM forum_topic_reads r WHERE r.topic_id = t.id AND r.user_id = ?), '1970-01-01 00:00:00')) as has_new_posts`, [userId])
            ])
            .where('t.bacheca_id', bachecaId)
            .orderBy('t.is_pinned', 'desc')
            .orderBy('t.ultimo_post_timestamp', 'desc');
        res.json({ bacheca, topics });
    } catch (error) { res.status(500).json({ message: "Errore." }); }
});

app.get('/api/forum/topic/:topicId', verificaToken, async (req, res) => {
    try {
        const { topicId } = req.params;
        const { id: userId } = req.utente;
        const topic = await db('forum_topics as t').join('utenti as u', 't.autore_id', 'u.id_utente').select('t.*', 'u.nome_pg as autore_nome').where('t.id', topicId).first();
        if (!topic) return res.status(404).json({ message: 'Discussione non trovata.' });

        const posts = await db('forum_posts as p')
    .join('utenti as u', 'p.autore_id', 'u.id_utente')
    .select(
        'p.*', 'u.nome_pg as autore_nome', 'u.permesso as autore_permesso',
        db.raw("COALESCE(u.avatar_chat, '/icone/mini_avatar.png') as autore_avatar_url"),
        db.raw('(SELECT COUNT(*)::int FROM forum_post_likes WHERE post_id = p.id) as like_count'),          
        db.raw('EXISTS(SELECT 1 FROM forum_post_likes WHERE post_id = p.id AND user_id = ?) as user_has_liked', [userId]),
    )
    .where('p.topic_id', topicId)
    .orderBy('p.timestamp_creazione', 'asc');

    await db('forum_topic_reads')
        .insert({ user_id: userId, topic_id: topicId, last_read_timestamp: db.fn.now() })
        .onConflict(['user_id', 'topic_id'])
        .merge({ last_read_timestamp: db.fn.now() });

        res.json({ ...topic, posts });
    } catch (error) { res.status(500).json({ message: "Errore." }); }
});

// CRUD Topics/Posts 
app.post('/api/forum/topics', verificaToken, async (req, res) => {
    const { bacheca_id, titolo, testo } = req.body;
    const autore_id = req.utente.id;
    try {
        const [topicIdResult] = await db.transaction(async (trx) => {
            const [topicId] = await trx('forum_topics').insert({ bacheca_id, autore_id, titolo }).returning('id');
            await trx('forum_posts').insert({ topic_id: (typeof topicId === 'object' ? topicId.id : topicId), autore_id, testo });
            return [topicId];
        });
        res.status(201).json({ message: 'Discussione creata!' });
    } catch (e) { res.status(500).json({ message: "Errore." }); }
});

app.post('/api/forum/posts', verificaToken, async (req, res) => {
    const { topic_id, testo } = req.body;
    const autore_id = req.utente.id;
    try {
        await db.transaction(async (trx) => {
            await trx('forum_posts').insert({ topic_id, autore_id, testo });
            await trx('forum_topics').where('id', topic_id).update({ ultimo_post_timestamp: db.fn.now() });
        });
        res.status(201).json({ message: 'Risposta inviata!' });
    } catch (e) { res.status(500).json({ message: "Errore." }); }
});


// [POST] SEGNA INTERA BACHECA COME LETTA
app.post('/api/forum/mark-all-as-read', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    try {
        const topics = await db('forum_topics').select('id');
        if (topics.length === 0) return res.json({ message: 'Nessun topic da segnare.' });

        const readsToInsert = topics.map(t => ({
            user_id: userId,
            topic_id: t.id,
            last_read_timestamp: db.fn.now()
        }));

        await db('forum_topic_reads')
            .insert(readsToInsert)
            .onConflict(['user_id', 'topic_id'])
            .merge();

        res.json({ message: 'Tutto il forum segnato come letto.' });
    } catch (error) {
        console.error("Errore mark all read:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

// TOGGLE LIKE
app.post('/api/forum/posts/:postId/like', verificaToken, async (req, res) => {
    const postId = Number(req.params.postId);
    const userId = req.utente.id;
    if (!postId) return res.status(400).json({ message: "Post non valido." });

    try {
        const existingLike = await db('forum_post_likes').where({ post_id: postId, user_id: userId }).first();
        if (existingLike) {
            await db('forum_post_likes').where({ post_id: postId, user_id: userId }).del();
            return res.json({ liked: false });
        } else {
            await db('forum_post_likes').insert({ post_id: postId, user_id: userId });
            return res.json({ liked: true });
        }
    } catch (error) {
        console.error("Errore toggle like:", error);
        res.status(500).json({ message: "Errore gestione like." });
    }
});

// =================================================================
// --- HOUSING SYSTEM ---
// =================================================================

app.get('/api/housing/market', verificaToken, async (req, res) => {
    try {
        const houses = await db('housing_types').select('*').orderBy('cost_rem', 'asc');
        res.json(houses);
    } catch (e) { res.status(500).json({ message: "Errore market." }); }
});

app.post('/api/housing/rent', verificaToken, async (req, res) => {
    const { houseId } = req.body;
    const userId = req.utente.id;

    try {
        await db.transaction(async (trx) => {
            const house = await trx('housing_types').where('id', houseId).first();
            const user = await trx('utenti').where('id_utente', userId).first();

            if (!house) throw new Error("Abitazione non valida.");
            if (user.housing_id) throw new Error("Hai già un'abitazione! Disdici prima quella attuale.");

            if (house.cost_type === 'MONTHLY') {
                if (user.rem < house.cost_rem) throw new Error("Fondi insufficienti per il primo mese/caparra.");
                await trx('utenti').where('id_utente', userId).decrement('rem', house.cost_rem);
                await trx('transactions').insert({
                    sender_id: userId, receiver_id: null, amount: house.cost_rem, reason: `Affitto iniziale: ${house.name}`
                });
            }

            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + 30);
            const houseChatId = `house_${userId}_${Date.now()}`;

            await trx('utenti').where('id_utente', userId).update({
                housing_id: house.id,
                rent_due_date: nextDueDate,
                house_chat_id: houseChatId,
            });
        });
        res.json({ message: "Abitazione acquisita con successo! Benvenuto a casa." });
    } catch (error) {
        console.error("Errore acquisto casa:", error);
        res.status(400).json({ message: error.message || "Errore interno." });
    }
});

app.get('/api/housing/my-house', verificaToken, async (req, res) => {
    try {
        const user = await db('utenti')
            .join('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select('housing_types.name', 'utenti.house_chat_id', 'utenti.rent_due_date', 'housing_types.cost_rem')
            .where('utenti.id_utente', req.utente.id)
            .first();
        if (!user || !user.house_chat_id) return res.status(404).json({ message: "Non hai una casa." });
        res.json(user);
    } catch (e) { res.status(500).json({ message: "Errore." }); }
});

app.post('/api/housing/pay-rent', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    try {
        await db.transaction(async (trx) => {
            const user = await trx('utenti')
                .join('housing_types', 'utenti.housing_id', 'housing_types.id')
                .select('utenti.rem', 'utenti.rent_due_date', 'housing_types.cost_rem', 'housing_types.name')
                .where('utenti.id_utente', userId)
                .first();

            if (!user) throw new Error("Nessuna casa da pagare.");
            if (user.rem < user.cost_rem) throw new Error("Fondi insufficienti.");

            await trx('utenti').where('id_utente', userId).decrement('rem', user.cost_rem);
            const newDate = new Date(user.rent_due_date);
            newDate.setDate(newDate.getDate() + 30);
            await trx('utenti').where('id_utente', userId).update({ rent_due_date: newDate });
            await trx('transactions').insert({ sender_id: userId, amount: user.cost_rem, reason: `Affitto mensile: ${user.name}` });
        });
        res.json({ message: "Affitto pagato. Grazie!" });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.post('/api/housing/invite', verificaToken, async (req, res) => {
    const { guestName } = req.body;
    const userId = req.utente.id;
    try {
        const myHouse = await db('utenti').select('housing_id').where('id_utente', userId).first();
        if (!myHouse || !myHouse.housing_id) return res.status(400).json({ message: "Non hai una casa." });

        const guest = await db('utenti').select('id_utente').where(db.raw('LOWER(nome_pg) = LOWER(?)', [guestName])).first();
        if (!guest) return res.status(404).json({ message: "Giocatore non trovato." });
        if (guest.id_utente === userId) return res.status(400).json({ message: "Hai già le chiavi di casa tua." });

        await db('housing_guests').insert({
            housing_id: myHouse.housing_id,
            owner_id: userId,
            guest_id: guest.id_utente
        });
        res.json({ message: `Hai dato le chiavi di casa a ${guestName}.` });
    } catch (e) {
        if (e.code === '23505' || e.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ message: "Questo giocatore ha già le chiavi." });
        }
        console.error(e);
        res.status(500).json({ message: "Errore invito." });
    }
});

app.post('/api/housing/revoke', verificaToken, async (req, res) => {
    const { guestId } = req.body;
    const userId = req.utente.id;
    try {
        await db('housing_guests').where({ owner_id: userId, guest_id: guestId }).del();
        res.json({ message: "Chiavi ritirate." });
    } catch (e) { res.status(500).json({ message: "Errore revoca." }); }
});

app.get('/api/housing/guests', verificaToken, async (req, res) => {
    try {
        const guests = await db('housing_guests')
            .join('utenti', 'housing_guests.guest_id', 'utenti.id_utente')
            .select('utenti.id_utente', 'utenti.nome_pg', 'housing_guests.created_at')
            .where('housing_guests.owner_id', req.utente.id);
        res.json(guests);
    } catch (e) { res.status(500).json({ message: "Errore lista ospiti." }); }
});

app.get('/api/housing/guest-access', verificaToken, async (req, res) => {
    try {
        const houses = await db('housing_guests')
            .join('utenti', 'housing_guests.owner_id', 'utenti.id_utente')
            .join('housing_types', 'housing_guests.housing_id', 'housing_types.id')
            .select('utenti.nome_pg as owner_name', 'housing_types.name as house_name', 'utenti.house_chat_id')
            .where('housing_guests.guest_id', req.utente.id);
        res.json(houses);
    } catch (e) { res.status(500).json({ message: "Errore recupero chiavi." }); }
});

app.post('/api/housing/leave', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    try {
        const user = await db('utenti').where('id_utente', userId).first();
        if (!user.housing_id) return res.status(400).json({ message: "Non possiedi alcuna abitazione da lasciare." });

        await db.transaction(async (trx) => {
            await trx('utenti').where('id_utente', userId).update({
                housing_id: null, house_chat_id: null, rent_due_date: null,
                house_custom_image: null, house_custom_desc: null
            });
            await trx('housing_guests').where('owner_id', userId).del();
        });
        res.json({ message: "Hai rescisso il contratto e lasciato l'abitazione." });
    } catch (error) {
        console.error("Errore lascia immobile:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.put('/api/housing/customize', verificaToken, async (req, res) => {
    const { customImage, customDesc } = req.body;
    try {
        await db('utenti').where('id_utente', req.utente.id).update({ house_custom_image: customImage, house_custom_desc: customDesc });
        res.json({ message: "Dati abitazione aggiornati." });
    } catch (e) {
        console.error("Errore salvataggio casa:", e);
        res.status(500).json({ message: "Errore aggiornamento." });
    }
});

app.get('/api/housing/chat/:chatId', verificaToken, async (req, res) => {
    try {
        const { chatId } = req.params;
        const houseData = await db('utenti')
            .join('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select(
                'housing_types.name as type_name', 'housing_types.description as default_desc',
                'utenti.nome_pg as owner_name', 'utenti.house_custom_image', 'utenti.house_custom_desc'
            )
            .where('utenti.house_chat_id', chatId)
            .first();

        if (!houseData) return res.status(404).json({ message: "Casa non trovata." });

        res.json({
            name: houseData.type_name,
            description: houseData.house_custom_desc || houseData.default_desc,
            image_url: houseData.house_custom_image || null,
            owner: houseData.owner_name
        });
    } catch (e) {
        console.error("Errore recupero dettagli chat casa:", e);
        res.status(500).json({ message: "Errore interno." });
    }
});

// HOUSING INVENTORY
app.get('/api/housing/house-inventory/:chatId', verificaToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.utente.id;

    try {
        const houseOwner = await db('utenti').where('house_chat_id', chatId).first();
        if (!houseOwner) return res.status(404).json({ message: "Questa non è una casa." });

        const isOwner = houseOwner.id_utente === userId;
        const isAdmin = ['ADMIN', 'MOD'].includes(req.utente.permesso);
        let isGuest = false;

        if (!isOwner && !isAdmin) {
            const guestRecord = await db('housing_guests').where({ housing_id: houseOwner.housing_id, guest_id: userId }).first();
            if (guestRecord) isGuest = true;
        }

        if (!isOwner && !isGuest && !isAdmin) return res.status(403).json({ message: "Non hai le chiavi per frugare qui." });

        const items = await db('inventario')
            .join('oggetti', 'inventario.item_id', 'oggetti.id') 
            .select('inventario.id as inv_id', 'oggetti.nome', 'oggetti.icona', 'inventario.quantita')
            .where('inventario.user_id', houseOwner.id_utente);

        res.json({ ownerName: houseOwner.nome_pg, items, isOwner });
    } catch (e) {
        console.error("Errore inventario casa:", e);
        res.json({ ownerName: "Sconosciuto", items: [] }); 
    }
});

// HOUSING STEAL
app.post('/api/housing/steal', verificaToken, async (req, res) => {
    const { invItemId, targetChatId } = req.body; 
    const thiefId = req.utente.id;

    try {
        await db.transaction(async (trx) => {
            const houseOwner = await trx('utenti').where('house_chat_id', targetChatId).first();
            if (!houseOwner) throw new Error("Casa non trovata.");
            if (houseOwner.id_utente === thiefId) throw new Error("Non puoi rubare a te stesso!");

            const itemToSteal = await trx('inventario').where('id', invItemId).first();
            if (!itemToSteal || itemToSteal.user_id !== houseOwner.id_utente) throw new Error("L'oggetto non è più qui.");

            if (itemToSteal.quantita > 1) {
                await trx('inventario').where('id', invItemId).decrement('quantita', 1);
            } else {
                await trx('inventario').where('id', invItemId).del();
            }

            const existingItem = await trx('inventario').where({ user_id: thiefId, item_id: itemToSteal.item_id }).first();
            if (existingItem) {
                await trx('inventario').where('id', existingItem.id).increment('quantita', 1);
            } else {
                await trx('inventario').insert({ user_id: thiefId, item_id: itemToSteal.item_id, quantita: 1 });
            }

            const thiefName = req.utente.nome_pg;
            await trx('chat_log').insert({
                chat_id: targetChatId, autore: 'SISTEMA',
                testo: `⚠️ RUMORI SOSPETTI: Qualcuno sta frugando tra gli oggetti di ${houseOwner.nome_pg}!`,
                tipo: 'azione' 
            });
        });
        res.json({ message: "Hai rubato l'oggetto! Scappa!" });
    } catch (e) {
        console.error("Errore furto:", e);
        res.status(500).json({ message: e.message || "Errore durante il furto." });
    }
});

// =================================================================
// --- BLOCCO API BANCA ---
// =================================================================

app.post('/api/bank/transfer', verificaToken, async (req, res) => {
    const { receiverName, amount, reason } = req.body;
    const senderId = req.utente.id;
    try {
        await db.transaction(async (trx) => {
            const sender = await trx('utenti').where('id_utente', senderId).first('rem');
            if (sender.rem < amount) throw new Error("Fondi insufficienti.");
            const receiver = await trx('utenti').where(db.raw('LOWER(nome_pg) = LOWER(?)', [receiverName])).first('id_utente');
            if (!receiver) throw new Error("Destinatario non trovato.");
            
            await trx('utenti').where('id_utente', senderId).decrement('rem', amount);
            await trx('utenti').where('id_utente', receiver.id_utente).increment('rem', amount);
            await trx('transactions').insert({ sender_id: senderId, receiver_id: receiver.id_utente, amount, reason });
        });
        res.json({ message: "Trasferimento completato." });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

app.get('/api/bank/history', verificaToken, async (req, res) => {
    try {
        const history = await db('transactions')
            .join('utenti as sender', 'transactions.sender_id', 'sender.id_utente')
            .leftJoin('utenti as receiver', 'transactions.receiver_id', 'receiver.id_utente')
            .select(
                'transactions.id', 'transactions.amount', 'transactions.reason', 'transactions.timestamp',
                'sender.nome_pg as sender_name', 'receiver.nome_pg as receiver_name'
            )
            .where('transactions.sender_id', req.utente.id)
            .orWhere('transactions.receiver_id', req.utente.id)
            .orderBy('transactions.timestamp', 'desc')
            .limit(5);
        res.json(history);
    } catch (error) {
        console.error("Errore storico banca:", error);
        res.status(500).json({ message: "Errore recupero storico." });
    }
});

app.get('/api/bank/job', verificaToken, async (req, res) => {
    try {
        const user = await db('utenti').select('job', 'last_salary_collection', 'rem').where('id_utente', req.utente.id).first();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Errore info lavoro." });
    }
});

app.post('/api/bank/collect-salary', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    const BASE_SALARY = 90; 
    const COOLDOWN_HOURS = 24;

    try {
        const user = await db('utenti')
            .leftJoin('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select('utenti.*', 'housing_types.cost_rem as house_cost', 'housing_types.cost_type as house_payment_type', 'housing_types.name as house_name')
            .where('utenti.id_utente', userId).first();
        
        if (user.last_salary_collection) {
            const lastCollection = new Date(user.last_salary_collection);
            const diffHours = (new Date() - lastCollection) / (1000 * 60 * 60);
            if (diffHours < COOLDOWN_HOURS) return res.status(400).json({ message: `Devi attendere ancora ${(COOLDOWN_HOURS - diffHours).toFixed(1)} ore.` });
        }

        let finalAmount = BASE_SALARY;
        let rentDeduction = 0;
        let logReason = "Stipendio Giornaliero";

        if (user.housing_id && user.house_payment_type === 'DAILY_SALARY') {
            rentDeduction = user.house_cost || 0;
            finalAmount = BASE_SALARY - rentDeduction;
            logReason = `Stipendio (Netto: ${BASE_SALARY} - ${rentDeduction} Affitto)`;
        }
        if (finalAmount < 0) finalAmount = 0;

        await db.transaction(async (trx) => {
            await trx('utenti').where('id_utente', userId).update({ rem: user.rem + finalAmount, last_salary_collection: new Date() });
            await trx('transactions').insert({ sender_id: null, receiver_id: userId, amount: finalAmount, reason: logReason });
        });

        if (rentDeduction > 0) res.json({ message: `Hai ritirato ${finalAmount} REM (Dedotti ${rentDeduction} per l'affitto di ${user.house_name})!` });
        else res.json({ message: `Hai ritirato ${finalAmount} REM!` });

    } catch (error) {
        console.error("Errore stipendio:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

app.post('/api/bank/set-job', verificaToken, async (req, res) => {
    const { jobName } = req.body;
    const userId = req.utente.id;
    if (!jobName) return res.status(400).json({ message: "Devi selezionare un lavoro." });

    try {
        const user = await db('utenti').where('id_utente', userId).first();
        if (user.job) return res.status(400).json({ message: "Hai già un impiego!" });

        await db('utenti').where('id_utente', userId).update({ job: jobName, last_salary_collection: null });
        res.json({ message: `Congratulazioni! Ora lavori come ${jobName}.` });
    } catch (error) {
        console.error("ERRORE SET-JOB:", error); 
        res.status(500).json({ message: "Errore server." });
    }
});

app.post('/api/bank/leave-job', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    const MIN_DAYS = 10;
    try {
        const user = await db('utenti').where('id_utente', userId).first();
        if (!user.job) return res.status(400).json({ message: "Non hai un lavoro da lasciare." });

        if (user.job_started_at) {
            const diffDays = Math.ceil(Math.abs(new Date() - new Date(user.job_started_at)) / (1000 * 60 * 60 * 24)); 
            if (diffDays < MIN_DAYS) return res.status(400).json({ message: `Devi mantenere il lavoro per almeno ${MIN_DAYS} giorni. (Mancano ${MIN_DAYS - diffDays} gg)` });
        }

        await db('utenti').where('id_utente', userId).update({ job: null, last_salary_collection: null, job_started_at: null });
        res.json({ message: "Hai rassegnato le dimissioni." });
    } catch (error) {
        console.error("Errore leave job:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

// =================================================================
// --- BLOCCO API MESSAGGI PRIVATI (COMPLETO) ---
// =================================================================

app.get('/api/pm/conversations', verificaToken, async (req, res) => {
    const myId = req.utente.id;
    try {
        const messages = await db('private_messages')
            .where({ sender_id: myId }).orWhere({ receiver_id: myId })
            .orderBy('timestamp', 'desc');

        const conversationMap = new Map();
        for (const msg of messages) {
            const otherId = (msg.sender_id === myId) ? msg.receiver_id : msg.sender_id;
            if (!conversationMap.has(otherId)) {
                conversationMap.set(otherId, {
                    last_message: msg.text, last_message_timestamp: msg.timestamp, unread_count: 0, otherId: otherId
                });
            }
            if (msg.receiver_id === myId && !msg.is_read) {
                conversationMap.get(otherId).unread_count += 1;
            }
        }

        const conversations = [];
        const partnerIds = Array.from(conversationMap.keys());
        if (partnerIds.length > 0) {
            const partners = await db('utenti').select('id_utente as id', 'nome_pg', 'avatar_chat').whereIn('id_utente', partnerIds);
            partners.forEach(partner => {
                const convData = conversationMap.get(partner.id);
                conversations.push({
                    id_utente: partner.id, nome_pg: partner.nome_pg, avatar_chat: partner.avatar_chat,
                    last_message: convData.last_message, last_message_timestamp: convData.last_message_timestamp,
                    unread_count: convData.unread_count
                });
            });
        }
        conversations.sort((a, b) => new Date(b.last_message_timestamp) - new Date(a.last_message_timestamp));
        res.json(conversations);
    } catch (error) {
        console.error("Errore recupero conversazioni:", error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

app.get('/api/pm/conversation/:userId', verificaToken, async (req, res) => {
    const myId = req.utente.id;
    const otherUserId = req.params.userId;
    try {
        const messages = await db.transaction(async (trx) => {
            const msgs = await trx('private_messages as pm')
                .join('utenti as s', 'pm.sender_id', 's.id_utente')
                .select('pm.*', 's.nome_pg as sender_name', 's.avatar_chat as sender_avatar')
                .where(function() { this.where({ 'pm.sender_id': myId, 'pm.receiver_id': otherUserId }).orWhere({ 'pm.sender_id': otherUserId, 'pm.receiver_id': myId }); })
                .orderBy('pm.timestamp', 'asc');
            await trx('private_messages').where({ sender_id: otherUserId, receiver_id: myId, is_read: 0 }).update({ is_read: 1 });
            return msgs;
        });
        res.json(messages);
    } catch (error) { res.status(500).json({ message: "Errore." }); }
});

// =================================================================
// --- BLOCCO API MUSICA ---
// =================================================================
app.get('/api/playlists', verificaToken, async (req, res) => {
    const playlists = await db('playlists').select('*').orderBy('name', 'asc');
    res.json(playlists);
});
app.get('/api/playlists/:id/songs', verificaToken, async (req, res) => {
    const songs = await db('songs').select('*').where('playlist_id', req.params.id).orderBy('id', 'asc');
    res.json(songs);
});
app.get('/api/youtube-stream/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    console.log(`[Server] Streaming: ${videoId}`); 
    try {
        if (!ytdl.validateID(videoId)) return res.status(400).send("ID video non valido");
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(videoUrl);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
        if (!format) return res.status(404).send("Formato audio non trovato.");
        ytdl(videoUrl, { format: format }).pipe(res);
    } catch (error) {
        console.error(`[Server] Errore streaming ${videoId}:`, error.message);
        res.status(500).send("Errore streaming.");
    }
});

app.get('/api/daily-event', verificaToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const event = await db('daily_events').select('title', 'description').where('event_date', today).first();
    res.json(event || null);
});

app.put('/api/admin/reset-stats/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const resetStats = {
        forza: 1, destrezza: 1, costituzione: 1, mente: 1, empatia: 1,
        stat_body: 10, stat_kotodama: 10, reflexes: 1, velocita: 1,
        percezione_sensi: 1, percezione_spirituale: 1, movimento: 1, salto: 1,
        lancio: 1, peso_trasportabile: 1, ingaggio: 1, danno_cac: 1, danno_cad: 1
    };
    try {
        await db('utenti').where({ id_utente: id }).update(resetStats);
        res.json({ message: `Statistiche resettate per l'utente ${id}.`});
    } catch (error) {
        console.error('Errore reset stats admin:', error);
        res.status(500).json({ message: 'Errore durante il reset.'});
    }
});


// --- 4. GESTIONE WEBSOCKET ---
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Autenticazione fallita: token mancante."));
    jwt.verify(token, process.env.JWT_SECRET, (err, utente) => {
        if (err) return next(new Error("Autenticazione fallita: token non valido."));
        socket.utente = utente;
        next();
    });
});

io.on('connection', async (socket) => { 
    try {
        const userData = await db('utenti').select('nome_pg', 'permesso', 'avatar_chat').where('id_utente', socket.utente.id).first();
        if (!userData) { return socket.disconnect(); }
        
        const userProfile = { id: socket.utente.id, nome_pg: userData.nome_pg, permesso: userData.permesso, avatar_chat: userData.avatar_chat || '/icone/mini_avatar.png' };
        console.log(`✅ Utente AUTENTICATO connesso: ${userProfile.nome_pg}`);
        onlineUsers[socket.id] = userProfile;
        userSockets.set(userProfile.id, socket.id); 
        
        const getUniqueGlobalUsers = () => {
            const uniqueMap = new Map();
            Object.values(onlineUsers).forEach(u => { if (u && u.id) uniqueMap.set(u.id, u); });
            return Array.from(uniqueMap.values());
        };
        io.emit('update_online_list', getUniqueGlobalUsers());
        
        const updateRoomUsers = async (chatId) => {
            const socketsInRoom = await io.in(chatId).fetchSockets();
            const rawUsers = socketsInRoom.map(s => onlineUsers[s.id]).filter(u => u);
            const uniqueUsersMap = new Map();
            rawUsers.forEach(user => { if (!uniqueUsersMap.has(user.id)) uniqueUsersMap.set(user.id, user); });
            io.to(chatId).emit('room_users_update', Array.from(uniqueUsersMap.values()));
        };

        socket.on('join_chat', (chatId) => { socket.join(chatId); updateRoomUsers(chatId); });
        socket.on('leave_chat', (chatId) => { socket.leave(chatId); updateRoomUsers(chatId); });

        socket.on('send_message', async (data) => {
            try {
                const checkBan = await db('utenti').select('ban_expires_at', 'ban_type').where('id_utente', socket.utente.id).first();
                if (checkBan && checkBan.ban_expires_at && new Date(checkBan.ban_expires_at) > new Date()) {
                    if (checkBan.ban_type === 'SHADOW' || checkBan.ban_type === 'FULL') {
                        socket.emit('new_message', {
                            id: 'system-error', autore: 'SYSTEM', testo: '⛔ Sei in modalità SPETTATORE (Shadowban).',
                            tipo: 'errore', timestamp: new Date()
                        });
                        return; 
                    }
                }
            } catch (err) { console.error("Errore controllo ban chat:", err); }

            const messageData = { ...data, autore: userProfile.nome_pg, permesso: userProfile.permesso, avatar_url: userProfile.avatar_chat };

            if (messageData.tipo === 'azione') {
                const textLength = messageData.testo.length;
                const expGained = Math.floor(textLength / 500) * 2;
                if (expGained > 0) {
                     try {
                        await db('utenti').where('id_utente', socket.utente.id)
                            .update({ exp: db.raw('exp + ?', [expGained]), exp_accumulata: db.raw('exp_accumulata + ?', [expGained]) });
                     } catch(e) { console.error("Errore EXP", e); }
                }
            }

            try {
                await db('chat_log').insert({ 
                    chat_id: messageData.chatId, autore: messageData.autore, permesso: messageData.permesso, 
                    testo: messageData.testo, tipo: messageData.tipo, quest_id: messageData.quest_id, luogo: messageData.luogo 
                }); 
            } catch (dbError) { console.error("Errore salvataggio messaggio:", dbError); }
            io.to(messageData.chatId).emit('new_message', messageData);
        });
        
        socket.on('roll_dice', async (data) => {
            const { chatId, diceType } = data;
            try {
                const checkBan = await db('utenti').select('ban_expires_at', 'ban_type').where('id_utente', socket.utente.id).first();
                if (checkBan && checkBan.ban_expires_at && new Date(checkBan.ban_expires_at) > new Date()) {
                    if (checkBan.ban_type === 'SHADOW' || checkBan.ban_type === 'FULL') {
                        socket.emit('new_message', { id: 'sys-err', autore: 'SYSTEM', testo: '⛔ Sei in modalità SPETTATORE.', tipo: 'errore', timestamp: new Date() });
                        return; 
                    }
                }
            } catch (err) { console.error("Errore ban dadi:", err); }

            if (!chatId || !diceType) return;
            const result = Math.floor(Math.random() * diceType) + 1;
            const diceText = `lancia un d${diceType} e ottiene: ${result}`;
            const messageData = { chatId, autore: userProfile.nome_pg, permesso: userProfile.permesso, avatar_url: userProfile.avatar_chat, testo: diceText, tipo: 'dado', timestamp: new Date() };

            try {
                await db('chat_log').insert({ chat_id: messageData.chatId, autore: messageData.autore, permesso: messageData.permesso, testo: messageData.testo, tipo: messageData.tipo });
            } catch (dbError) { console.error("Errore salvataggio dado:", dbError); }
            io.to(chatId).emit('new_message', messageData);
        });

        socket.on('send_private_message', async ({ receiverId, text }) => {
            try {
                const checkBan = await db('utenti').select('ban_expires_at', 'ban_type').where('id_utente', socket.utente.id).first();
                if (checkBan && checkBan.ban_expires_at && new Date(checkBan.ban_expires_at) > new Date()) {
                    if (checkBan.ban_type === 'SHADOW' || checkBan.ban_type === 'FULL') {
                        socket.emit('private_message_sent', { error: true, text: "⛔ Sei in modalità SPETTATORE." });
                        return; 
                    }
                }
            } catch (err) { console.error("Errore controllo ban PM:", err); }

            const senderId = socket.utente.id;
            const [messageIdResult] = await db('private_messages').insert({ sender_id: senderId, receiver_id: receiverId, text: text }).returning('id');
            const messageId = (typeof messageIdResult === 'object') ? messageIdResult.id : messageIdResult;
            const message = await db('private_messages').where('id', messageId).first();
            const senderData = await db('utenti').select('nome_pg', 'avatar_chat').where('id_utente', senderId).first();
            const messagePayload = { ...message, sender_name: senderData.nome_pg, sender_avatar: senderData.avatar_chat };
            
            const receiverSocketId = userSockets.get(Number(receiverId));
            if (receiverSocketId) io.to(receiverSocketId).emit('new_private_message', messagePayload);
            socket.emit('private_message_sent', messagePayload);
        });

        socket.on('disconnect', () => {
            if (userProfile && userProfile.nome_pg) {
                console.log(`❌ Disconnesso: ${userProfile.nome_pg}`);
                delete onlineUsers[socket.id];
                const uniqueMap = new Map();
                Object.values(onlineUsers).forEach(u => { if (u && u.id) uniqueMap.set(u.id, u); });
                io.emit('update_online_list', Array.from(uniqueMap.values()));
            }
        });

    } catch(e) {
        console.error("Errore critico socket:", e);
        socket.disconnect();
    }
});


// =================================================================
// --- FINE ROTTE API ---
// =================================================================

// 1. GESTIONE FRONTEND + CATCH-ALL (Compatibile Express 4)
if (require('fs').existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
}

// In Express 4, l'asterisco '*' FUNZIONA e non fa crashare nulla.
app.get('*', (req, res) => {
    
    // Se chiedono un'API che non esiste -> 404
    if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
        return res.status(404).json({ error: "API non trovata" });
    }

    // Altrimenti manda index.html
    if (require('fs').existsSync(indexFile)) {
        res.sendFile(indexFile);
    } else {
        res.status(500).send("Errore: Frontend build non trovata.");
    }
});

// =================================================================
// --- AVVIO SERVER ---
// =================================================================
(async () => {
    try {
        await db.raw('SELECT 1');
        console.log(`✅ DB CONNESSO.`);
        httpServer.listen(port, () => console.log(`🚀 SERVER (Express 4) SU PORTA ${port}`));
    } catch (e) { console.error("❌ ERRORE AVVIO:", e); }
})();