require('dotenv').config();

// =====================================================
// --- 1. IMPORT E IMPOSTAZIONI GLOBALI (STABILI) ---
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
const port = process.env.PORT || 3000;
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

// 🔥 QUESTO ERA IL BUG CRITICO
// Decodifica SEMPRE il token se presente
app.use(verificaToken);

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
// --- 10. ROOT HEALTHCHECK (RENDER) ---
// =====================================================

app.get('/', (req, res) => {
    res.send('🟢 OYASUMI SERVER ONLINE');
});

// AUTH: REGISTRAZIONE
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, nome_pg, playerPreferences } = req.body;
        
        // 1. Validazione input
        if (!email || !password || !nome_pg) {
            return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
        }
        
        // 2. Hash della password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 3. Singola Transazione per DB e Logica Email
        const newUserId = await db.transaction(async (trx) => {
            
            // Inserimento utente nel database
            const [userIdResult] = await trx('utenti')
                .insert({
                    email,
                    password: hashedPassword,
                    nome_pg,
                    preferenze_gioco: playerPreferences
                })
                .returning('id_utente');

            // Normalizzazione ID per PostgreSQL o SQLite
            const userId = (typeof userIdResult === 'object') ? userIdResult.id_utente : userIdResult;

            // --- CONFIGURAZIONE NODEMAILER ---
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
                        <br />
                        <p style="font-style: italic; color: #888;">"Ricorda: in questo mondo, il confine tra il sogno e l'incubo è sottile come una lama."</p>
                        <hr style="border: 0; border-top: 1px solid #31323e; margin: 20px 0;" />
                        <p style="font-size: 0.8em; color: #666;">Questo è un messaggio automatico dallo staff di Oyasumi.</p>
                    </div>
                `
            };

            // Invio email (gestito asincrono per non bloccare la risposta HTTP)
            transporter.sendMail(mailOptions).catch(err => {
                console.error("⚠️ Errore silente invio mail:", err.message);
            });

            return userId; // Restituisce l'ID alla variabile newUserId esterna
        });

        // 4. Risposta al client
        res.status(201).json({ 
            message: 'Utente registrato con successo!', 
            userId: newUserId 
        });

    } catch (errore) {
        console.error("❌ Errore durante il processo di registrazione:", errore);
        
        // Gestione duplicati (Email già esistente)
        if (errore.code === '23505' || errore.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Questa email è già stata utilizzata.' });
        }
        
        res.status(500).json({ message: 'Errore interno del server durante la registrazione.' });
    }
});

// ==========================================
// 📦 SETUP OGGETTI & INVENTARIO (Rotta Temporanea) DA ELIMINARE! SOLO TEST
// ==========================================
app.get('/api/setup-items', async (req, res) => {
    try {
        console.log("📦 Inizio setup inventario...");

        // 1. CREAZIONE TABELLA 'oggetti' (se manca)
        if (!(await db.schema.hasTable('oggetti'))) {
            await db.schema.createTable('oggetti', (table) => {
                table.increments('id').primary();
                table.string('nome').notNullable();
                table.string('descrizione');
                table.string('icona'); // Es: /icone/pozione.png
                table.string('tipo').defaultTo('GENERICO');
                table.float('peso').defaultTo(0);
            });
            console.log("✅ Tabella 'oggetti' creata.");
        }

        // 2. CREAZIONE TABELLA 'inventario' (se manca)
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
            // 3. POPOLIAMO GLI OGGETTI (Upsert manuale)
            const oggettiBase = [
                { id: 1, nome: 'Pozione Curativa', descrizione: 'Restituisce 10 PF', icona: 'https://i.imgur.com/Xq7tX1h.png', tipo: 'CONSUMABILE' },
                { id: 2, nome: 'Katana Arrugginita', descrizione: 'Vecchia lama.', icona: 'https://i.imgur.com/2b3m4zL.png', tipo: 'ARMA' },
                { id: 3, nome: 'Chiave Dorata', descrizione: 'Apre qualcosa...', icona: 'https://i.imgur.com/8QzXy9A.png', tipo: 'CHIAVE' }
            ];

            for (const obj of oggettiBase) {
                // Controlla se esiste, se no lo crea
                const exists = await trx('oggetti').where('id', obj.id).first();
                if (!exists) {
                    await trx('oggetti').insert(obj);
                }
            }

            // 4. ASSEGNA OGGETTI AL PRIMO UTENTE (Probabilmente TU)
            // Cerchiamo il primo utente nel DB
            const primoUtente = await trx('utenti').orderBy('id_utente', 'asc').first();
            
            if (primoUtente) {
                // Diamo 5 Pozioni
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

// RICERCA UTENTI
app.get('/api/users/find', verificaToken, async (req, res) => {
    const { name } = req.query;
    const myId = req.utente.id;

    if (!name) return res.status(400).json({ message: 'Il nome del personaggio è richiesto.' });

    try {
        // --- MODIFICA QUI ---
        // Prima cercava match esatto (=). Ora cerca parziale (LIKE %...%)
        const users = await db('utenti')
            .select('id_utente', 'nome_pg', 'avatar_chat')
            .whereRaw('LOWER(nome_pg) LIKE LOWER(?)', [`${name}%`])
            .andWhere('id_utente', '!=', myId)
            .limit(5); // Limitiamo a 5 suggerimenti

        // Restituiamo un array, non un singolo oggetto
        res.json(users); 

    } catch (error) {
        console.error("Errore nella ricerca dell'utente:", error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

// API MANUALE (Se il frontend cerca di scaricare testi dinamici)
app.get('/api/manuale', async (req, res) => {
    try {
        // Se non hai una tabella manuale, restituiamo un oggetto vuoto per non far crashare il frontend
        // Se invece hai creato una tabella 'manuale_sezioni', usa: await db('manuale_sezioni').select('*');
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
  
// [GET] SCHEDA PUBBLICA (Per vedere gli altri utenti)

app.get('/api/scheda/:id', verificaToken, async (req, res) => {
    try {
        const targetId = req.params.id;
        const requesterPerm = req.utente.permesso; // Chi sta chiedendo?
        const isStaff = ['ADMIN', 'MOD', 'MASTER'].includes(requesterPerm);

        // Join con housing_types per avere il nome della casa
        const scheda = await db('utenti')
            .leftJoin('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select(
                'utenti.*',
                'housing_types.name as house_name', // Nome generico casa
                'housing_types.id as house_type_id'
            )
            .where('utenti.id_utente', targetId)
            .first();
      
        if (!scheda) return res.status(404).json({ message: 'Scheda non trovata.' });
  
        // PULIZIA DATI
        delete scheda.password;
        delete scheda.email; 
        
        // SICUREZZA CASA:
        // L'ID della chat casa è segreto. Lo mandiamo solo se:
        // 1. È l'utente stesso (ma questa è la rotta pubblica, quindi raro)
        // 2. Chi richiede è STAFF (Irruzione)
        if (!isStaff && req.utente.id !== scheda.id_utente) {
            delete scheda.house_chat_id; 
        }
        
        // Calcolo livello
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
    const adminName = req.utente.nome_pg; // Chi sta bannando?

    if (!days || !reason) return res.status(400).json({ message: "Dati mancanti." });

    const banType = type === 'SHADOW' ? 'SHADOW' : 'FULL';

    try {
        const banDate = new Date();
        banDate.setDate(banDate.getDate() + parseInt(days));

        await db.transaction(async (trx) => {
            // 1. Applica il Ban all'utente
            await trx('utenti').where('id_utente', targetUserId).update({
                ban_expires_at: banDate,
                ban_reason: reason,
                ban_type: banType
            });

            // 2. Scrivi nel registro storico (Log Sanzioni)
            await trx('user_sanctions').insert({
                user_id: targetUserId,
                admin_name: adminName,
                type: banType,
                days: parseInt(days),
                reason: reason
            });
        });

        // Disconnessione forzata se FULL
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

// [POST] UNBAN UTENTE (Per sbannare prima del tempo)
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

// [GET] RECUPERA STORICO SANZIONI (Visibile solo allo Staff)
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

// [POST] AGGIORNA STATISTICHE (Versione con Arrotondamento)
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
                    // --- CORREZIONE FONDAMENTALE ---
                    // Arrotondiamo il numero all'intero più vicino (es. 12.5 -> 13)
                    // Questo impedisce l'errore "invalid input syntax for type integer"
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

// =======================================================
// [AGGIORNAMENTO PROFILO ROBUSTO] (Gestisce PUT e POST)
// =======================================================

const gestisciAggiornamentoProfilo = async (req, res) => {
    console.log("📩 Tentativo aggiornamento profilo per:", req.utente.nome_pg);
    
    // Estraiamo i dati. NOTA: Il nome_pg e il permesso NON si cambiano da qui per sicurezza.
    const { avatar, avatar_chat, background, cognome } = req.body;
    const userId = req.utente.id;

    try {
        // Eseguiamo l'aggiornamento
        await db('utenti')
            .where('id_utente', userId)
            .update({ 
                avatar, 
                avatar_chat, 
                background,
                cognome 
            });

        // Recuperiamo la scheda aggiornata per rimandarla al frontend
        const schedaAggiornata = await db('utenti').where('id_utente', userId).first();
        
        if (schedaAggiornata) {
            delete schedaAggiornata.password;
            
            // Ricalcolo livello se necessario
            if (typeof calculateLevel === 'function') {
                schedaAggiornata.livello = calculateLevel(schedaAggiornata.exp_accumulata);
            }
            
            console.log("✅ Profilo aggiornato con successo!");
            res.status(200).json(schedaAggiornata);
        } else {
            res.status(404).json({ message: "Utente non trovato nel DB." });
        }

    } catch (error) {
        console.error("❌ Errore critico salvataggio profilo:", error);
        res.status(500).json({ message: "Errore interno durante il salvataggio." });
    }
};

// Colleghiamo la funzione a ENTRAMBI i metodi per sicurezza
app.put('/api/scheda/profilo', verificaToken, gestisciAggiornamentoProfilo);
app.post('/api/scheda/profilo', verificaToken, gestisciAggiornamentoProfilo);

// BANNER
app.get('/api/active-event', async (req, res) => {
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
        // ... logica icone ...
        res.json({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: 'sun.png' // Semplificato
        });
    } catch (error) {
        res.status(500).json({ message: 'Impossibile recuperare i dati meteo.' });
    }
});

// ADMIN ROUTES (Users, Locations, etc.)

app.get('/api/admin/users', verificaToken, verificaMod, async (req, res) => {
    const users = await db('utenti').select('id_utente', 'email', 'nome_pg', 'permesso');
    res.json(users);
});
// [PUT] MODIFICA UTENTE DA ADMIN (Nome, Permesso) - ROTTA MANCANTE AGGIUNTA
app.put('/api/admin/users/:id', verificaToken, verificaAdmin, async (req, res) => {
    const targetId = req.params.id;
    const { nome_pg, permesso } = req.body;

    try {
        const updateData = {};
        // Aggiorniamo solo se i dati sono presenti
        if (nome_pg) updateData.nome_pg = nome_pg;
        if (permesso) updateData.permesso = permesso;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: "Nessun dato da modificare." });
        }

        await db('utenti')
            .where('id_utente', targetId)
            .update(updateData);

        res.json({ message: "Utente aggiornato con successo." });

    } catch (error) {
        console.error("Errore modifica admin:", error);
        res.status(500).json({ message: "Errore interno durante la modifica." });
    }
});

// =====================================================
// --- BLOCCO 1: ADMIN BANNERS (CRUD COMPLETO) ---
// =====================================================

// GET — Lista banner (pannello gestione)
app.get('/api/admin/banners', verificaToken, verificaMod, async (req, res) => {
    try {
        const banners = await db('event_banners')
            .select('*')
            .orderBy('id', 'desc'); // 🔒 niente created_at

        res.status(200).json(Array.isArray(banners) ? banners : []);
    } catch (error) {
        console.error("❌ Errore GET admin banners:", error);
        res.status(500).json({ message: "Errore recupero banners." });
    }
});


// POST — Crea nuovo banner
app.post('/api/admin/banners', verificaToken, verificaMod, async (req, res) => {
    const { title, image_url, link_url, is_active } = req.body;

    try {
        await db.transaction(async (trx) => {

            // 👉 Se il nuovo banner è attivo, disattiviamo tutti gli altri
            if (is_active) {
                await trx('event_banners').update({ is_active: 0 });
            }

            await trx('event_banners').insert({
                title,
                image_url,
                link_url,
                is_active: is_active ? 1 : 0
            });
        });

        res.json({ message: "Banner creato con successo." });

    } catch (error) {
        console.error("Errore POST admin banner:", error);
        res.status(500).json({ message: "Errore creazione banner." });
    }
});

// PUT — Modifica banner
app.put('/api/admin/banners/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { title, image_url, link_url, is_active } = req.body;

    try {
        await db.transaction(async (trx) => {

            // 👉 Se lo stiamo attivando, spegniamo gli altri
            if (is_active) {
                await trx('event_banners')
                    .whereNot('id', id)
                    .update({ is_active: 0 });
            }

            await trx('event_banners')
                .where({ id })
                .update({
                    title,
                    image_url,
                    link_url,
                    is_active: is_active ? 1 : 0
                });
        });

        res.json({ message: "Banner aggiornato." });

    } catch (error) {
        console.error("Errore PUT admin banner:", error);
        res.status(500).json({ message: "Errore aggiornamento banner." });
    }
});

// DELETE — Elimina banner
app.delete('/api/admin/banners/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;

    try {
        await db('event_banners')
            .where({ id })
            .del();

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
        const locations = await db('locations')
            .select('*')
            .orderBy('id', 'asc'); // 🔒 sicuro

        res.json(locations);
    } catch (error) {
        console.error("❌ Errore GET admin locations:", error);
        res.status(500).json({ message: "Errore recupero locations." });
    }
});

app.post('/api/admin/locations', verificaToken, verificaMod, async (req, res) => {
    const {
        name,
        type,
        parent_id,
        image_url,
        description,
        pos_x,
        pos_y,
        prefecture
    } = req.body;

    try {
        const [idResult] = await db('locations')
            .insert({
                name,
                type,                 // 'MAP' o 'CHAT'
                parent_id: parent_id ?? null,
                image_url: image_url ?? null,
                description: description ?? null,
                pos_x: pos_x ?? null,
                pos_y: pos_y ?? null,
                prefecture: prefecture ?? null
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

    try {
        await db('locations')
            .where({ id })
            .update(req.body);

        res.json({ message: "Location aggiornata." });
    } catch (error) {
        console.error("❌ Errore UPDATE location:", error);
        res.status(500).json({ message: "Errore aggiornamento location." });
    }
});

app.put('/api/admin/locations/:id/parent', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { newParentId } = req.body;

    try {
        await db('locations')
            .where({ id })
            .update({
                parent_id: newParentId ?? null
            });

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
        res.json(sezioni);
    } catch (e) {
        console.error("Errore get sezioni:", e);
        res.status(500).json({ message: "Errore recupero sezioni." });
    }
});

app.post('/api/admin/forum/sezioni', verificaToken, verificaMod, async (req, res) => {
    const { titolo, descrizione, ordine } = req.body;

    try {
        await db('forum_sezioni').insert({
            titolo,
            descrizione,
            ordine: ordine ?? 0
        });
        res.status(201).json({ message: "Sezione creata." });
    } catch (e) {
        console.error("Errore crea sezione:", e);
        res.status(500).json({ message: "Errore creazione sezione." });
    }
});

app.put('/api/admin/forum/sezioni/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_sezioni')
            .where({ id: req.params.id })
            .update(req.body);
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
        const bacheche = await db('forum_bacheche')
            .orderBy('ordine', 'asc');
        res.json(bacheche);
    } catch (e) {
        console.error("Errore get bacheche:", e);
        res.status(500).json({ message: "Errore recupero bacheche." });
    }
});

app.post('/api/admin/forum/bacheche', verificaToken, verificaMod, async (req, res) => {
    const { sezione_id, titolo, descrizione, ordine } = req.body;

    try {
        await db('forum_bacheche').insert({
            sezione_id,
            titolo,
            descrizione,
            ordine: ordine ?? 0
        });
        res.status(201).json({ message: "Bacheca creata." });
    } catch (e) {
        console.error("Errore crea bacheca:", e);
        res.status(500).json({ message: "Errore creazione bacheca." });
    }
});

app.put('/api/admin/forum/bacheche/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_bacheche')
            .where({ id: req.params.id })
            .update(req.body);
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
        const topics = await db('forum_topics')
            .orderBy('ultimo_post_timestamp', 'desc');
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
        const events = await db('events')
            .orderBy('data_inizio', 'desc');
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
        await db('events').insert({
            titolo,
            descrizione,
            data_inizio,
            data_fine,
            is_active: 0
        });

        res.status(201).json({ message: "Evento creato." });
    } catch (e) {
        console.error("Errore crea evento:", e);
        res.status(500).json({ message: "Errore creazione evento." });
    }
});

app.put('/api/admin/events/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('events')
            .where({ id: req.params.id })
            .update(req.body);

        res.json({ message: "Evento aggiornato." });
    } catch (e) {
        console.error("Errore update evento:", e);
        res.status(500).json({ message: "Errore aggiornamento evento." });
    }
});

app.put('/api/admin/events/:id/activate', verificaToken, verificaMod, async (req, res) => {
    try {
        await db.transaction(async (trx) => {
            // Disattiva tutti
            await trx('events').update({ is_active: 0 });

            // Attiva solo questo
            await trx('events')
                .where({ id: req.params.id })
                .update({ is_active: 1 });
        });

        res.json({ message: "Evento attivato (unico attivo)." });
    } catch (e) {
        console.error("Errore attiva evento:", e);
        res.status(500).json({ message: "Errore attivazione evento." });
    }
});

app.delete('/api/admin/events/:id', verificaToken, verificaAdmin, async (req, res) => {
    try {
        await db('events')
            .where({ id: req.params.id })
            .del();

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
        const { id: userId } = req.utente;
        const sezioni = await db('forum_sezioni')
        .select('id', 'titolo as nome', 'descrizione', 'ordine')
        .orderBy('ordine', 'asc');
              const bacheche = await db('forum_bacheche as b')
            .select([
                'b.*',
                db.raw('(SELECT COUNT(t.id) FROM forum_topics t WHERE t.bacheca_id = b.id) as topic_count'),
                db.raw('(SELECT COUNT(*) FROM forum_post_likes WHERE post_id = p.id) as like_count'),
                db.raw('(SELECT t.ultimo_post_timestamp FROM forum_topics t WHERE t.bacheca_id = b.id ORDER BY t.ultimo_post_timestamp DESC LIMIT 1) as last_post_timestamp'),
                db.raw('(SELECT u.nome_pg FROM forum_topics t JOIN forum_posts p ON p.topic_id = t.id JOIN utenti u ON u.id_utente = p.autore_id WHERE t.bacheca_id = b.id ORDER BY p.timestamp_creazione DESC LIMIT 1) as last_post_author'),
                db.raw(`
                    EXISTS (
                      SELECT 1
                      FROM forum_topics t
                      WHERE t.bacheca_id = b.id
                      AND (
                        t.ultimo_post_timestamp >
                        COALESCE(
                          (SELECT r.last_read_timestamp
                           FROM forum_topic_reads r
                           WHERE r.topic_id = t.id
                           AND r.user_id = ?),
                          TIMESTAMP '1970-01-01 00:00:00'
                        )
                      )
                    ) as has_new_posts
                    `, [userId])
                    
            ])
            .orderBy('b.ordine', 'asc');

        const forumData = sezioni.map(sezione => ({
            ...sezione,
            bacheche: bacheche.filter(bacheca => bacheca.sezione_id === sezione.id)
        }));
        res.json(forumData);
    } catch (error) {
        console.error("Errore forum:", error);
        res.status(500).json({ message: "Errore interno." });
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
        'p.*',
        'u.nome_pg as autore_nome',
        'u.permesso as autore_permesso',
        db.raw("COALESCE(u.avatar_chat, '/icone/mini_avatar.png') as autore_avatar_url"),
        db.raw(
            'EXISTS(SELECT 1 FROM forum_post_likes WHERE post_id = p.id AND user_id = ?) as user_has_liked',
            [userId]
        ),
        db.raw(
            '(SELECT COUNT(*) FROM forum_post_likes WHERE post_id = p.id) as like_count'
        )
    )
    .where('p.topic_id', topicId)
    .orderBy('p.timestamp_creazione', 'asc');

        
            await db('forum_topic_reads')
    .insert({
        user_id: userId,
        topic_id: topicId,
        last_read_timestamp: db.fn.now()
    })
    .onConflict(['user_id', 'topic_id'])
    .merge({
        last_read_timestamp: db.fn.now()
    });


        res.json({ ...topic, posts });
    } catch (error) { res.status(500).json({ message: "Errore." }); }
});

// CRUD Topics/Posts (Semplificato ma funzionale)
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
        // 1. Recuperiamo gli ID di TUTTI i topic esistenti nel forum
        const topics = await db('forum_topics').select('id');

        if (topics.length === 0) {
            return res.json({ message: 'Nessun topic da segnare.' });
        }

        // 2. Prepariamo i dati per l'inserimento massivo
        const readsToInsert = topics.map(t => ({
            user_id: userId,
            topic_id: t.id,
            last_read_timestamp: db.fn.now()
        }));

        // 3. Eseguiamo l'Upsert (Inserisci o Aggiorna se esiste)
        // Questo aggiorna la data di lettura per TUTTI i topic per questo utente
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

// ==============================
// ❤️ TOGGLE LIKE POST FORUM
// ==============================
app.post('/api/forum/posts/:postId/like', verificaToken, async (req, res) => {
    const postId = Number(req.params.postId);
    const userId = req.utente.id;

    if (!postId) {
        return res.status(400).json({ message: "Post non valido." });
    }

    try {
        const existingLike = await db('forum_post_likes')
            .where({ post_id: postId, user_id: userId })
            .first();

        if (existingLike) {
            // 🔻 UNLIKE
            await db('forum_post_likes')
                .where({ post_id: postId, user_id: userId })
                .del();

            return res.json({ liked: false });
        } else {
            // 🔺 LIKE
            await db('forum_post_likes')
                .insert({ post_id: postId, user_id: userId });

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

// 1. VISUALIZZA LISTA CASE (Per Agenzia Immobiliare)
app.get('/api/housing/market', verificaToken, async (req, res) => {
    try {
        const houses = await db('housing_types').select('*').orderBy('cost_rem', 'asc');
        res.json(houses);
    } catch (e) { res.status(500).json({ message: "Errore market." }); }
});

// 2. AFFITTA / COMPRA CASA
app.post('/api/housing/rent', verificaToken, async (req, res) => {
    const { houseId } = req.body;
    const userId = req.utente.id;

    try {
        await db.transaction(async (trx) => {
            const house = await trx('housing_types').where('id', houseId).first();
            const user = await trx('utenti').where('id_utente', userId).first();

            if (!house) throw new Error("Abitazione non valida.");
            
            // Se ha già una casa, deve prima lasciarla (logica semplificata per ora)
            if (user.housing_id) throw new Error("Hai già un'abitazione! Disdici prima quella attuale.");

            // Pagamento primo mese (se non è 'DAILY_SALARY')
            if (house.cost_type === 'MONTHLY') {
                if (user.rem < house.cost_rem) throw new Error("Fondi insufficienti per il primo mese/caparra.");
                
                // Sottrai soldi
                await trx('utenti').where('id_utente', userId).decrement('rem', house.cost_rem);
                
                // Registra transazione
                await trx('transactions').insert({
                    sender_id: userId, receiver_id: null, // Null = System/Banca
                    amount: house.cost_rem, reason: `Affitto iniziale: ${house.name}`
                });
            }

            // Calcola scadenza (30 giorni da oggi)
            const nextDueDate = new Date();
            nextDueDate.setDate(nextDueDate.getDate() + 30);

            // Genera ID Chat Privata univoco (es: "house_15_uuid")
            const houseChatId = `house_${userId}_${Date.now()}`;

            // Aggiorna Utente
            await trx('utenti').where('id_utente', userId).update({
                housing_id: house.id,
                rent_due_date: nextDueDate,
                house_chat_id: houseChatId,
                // Aggiorniamo anche gli slot totali?
                // Per ora li teniamo separati, li sommeremo nel frontend o quando servono
            });
            
            // Creiamo la "Chat Location" (Opzionale, se usi la tabella locations per le chat)
            // Se gestisci le chat dinamiche solo via socket, basta l'ID salvato nell'utente.
        });

        res.json({ message: "Abitazione acquisita con successo! Benvenuto a casa." });

    } catch (error) {
        console.error("Errore acquisto casa:", error);
        res.status(400).json({ message: error.message || "Errore interno." });
    }
});

// 3. ENTRA IN CASA (Recupera dati chat)
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

// 4. PAGA AFFITTO (Trigger manuale dal messaggio Locatario)
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

            // Paga
            await trx('utenti').where('id_utente', userId).decrement('rem', user.cost_rem);
            
            // Aggiorna data (+30 giorni)
            const newDate = new Date(user.rent_due_date);
            newDate.setDate(newDate.getDate() + 30);
            
            await trx('utenti').where('id_utente', userId).update({ rent_due_date: newDate });
            
            // Log transazione
            await trx('transactions').insert({ sender_id: userId, amount: user.cost_rem, reason: `Affitto mensile: ${user.name}` });
        });
        res.json({ message: "Affitto pagato. Grazie!" });
    } catch (e) { res.status(400).json({ message: e.message }); }
});

// 5. INVITA OSPITE (Dai le chiavi)
app.post('/api/housing/invite', verificaToken, async (req, res) => {
    const { guestName } = req.body;
    const userId = req.utente.id;

    try {
        // 1. Recupera la casa dell'utente
        const myHouse = await db('utenti').select('housing_id').where('id_utente', userId).first();
        if (!myHouse || !myHouse.housing_id) return res.status(400).json({ message: "Non hai una casa." });

        // 2. Trova l'ospite
        const guest = await db('utenti').select('id_utente').where(db.raw('LOWER(nome_pg) = LOWER(?)', [guestName])).first();
        if (!guest) return res.status(404).json({ message: "Giocatore non trovato." });
        if (guest.id_utente === userId) return res.status(400).json({ message: "Hai già le chiavi di casa tua." });

        // 3. Dai le chiavi (Inserisci in tabella)
        await db('housing_guests').insert({
            housing_id: myHouse.housing_id,
            owner_id: userId,
            guest_id: guest.id_utente
        });

        res.json({ message: `Hai dato le chiavi di casa a ${guestName}.` });

    } catch (e) {
        if (e.code === '23505' || e.code === 'SQLITE_CONSTRAINT') { // Codice errore duplicato
            return res.status(400).json({ message: "Questo giocatore ha già le chiavi." });
        }
        console.error(e);
        res.status(500).json({ message: "Errore invito." });
    }
});

// 6. REVOCA CHIAVI (Caccia ospite)
app.post('/api/housing/revoke', verificaToken, async (req, res) => {
    const { guestId } = req.body;
    const userId = req.utente.id;
    try {
        await db('housing_guests')
            .where({ owner_id: userId, guest_id: guestId })
            .del();
        res.json({ message: "Chiavi ritirate." });
    } catch (e) { res.status(500).json({ message: "Errore revoca." }); }
});

// 7. LISTA OSPITI (Per il proprietario)
app.get('/api/housing/guests', verificaToken, async (req, res) => {
    try {
        const guests = await db('housing_guests')
            .join('utenti', 'housing_guests.guest_id', 'utenti.id_utente')
            .select('utenti.id_utente', 'utenti.nome_pg', 'housing_guests.created_at')
            .where('housing_guests.owner_id', req.utente.id);
        res.json(guests);
    } catch (e) { res.status(500).json({ message: "Errore lista ospiti." }); }
});

// 8. LE MIE CHIAVI (Case altrui dove sono ospite)
app.get('/api/housing/guest-access', verificaToken, async (req, res) => {
    try {
        const houses = await db('housing_guests')
            .join('utenti', 'housing_guests.owner_id', 'utenti.id_utente')
            .join('housing_types', 'housing_guests.housing_id', 'housing_types.id')
            .select(
                'utenti.nome_pg as owner_name', 
                'housing_types.name as house_name',
                'utenti.house_chat_id' // Serve per entrare nella chat!
            )
            .where('housing_guests.guest_id', req.utente.id);
        res.json(houses);
    } catch (e) { res.status(500).json({ message: "Errore recupero chiavi." }); }
});

// [NUOVO] 9. LASCIA ABITAZIONE (Rescindi contratto)
app.post('/api/housing/leave', verificaToken, async (req, res) => {
    const userId = req.utente.id;

    try {
        const user = await db('utenti').where('id_utente', userId).first();

        // Verifica se l'utente ha effettivamente una casa
        if (!user.housing_id) {
            return res.status(400).json({ message: "Non possiedi alcuna abitazione da lasciare." });
        }

        await db.transaction(async (trx) => {
            // 1. Rimuovi i dati abitazione dall'utente
            await trx('utenti').where('id_utente', userId).update({
                housing_id: null,      // Rimuove il riferimento al tipo di casa
                house_chat_id: null,   // Rimuove l'id della chat
                rent_due_date: null,   // Rimuove la scadenza affitto
                house_custom_image: null, // (Opzionale) Reset immagine personalizzata
                house_custom_desc: null   // (Opzionale) Reset descrizione personalizzata
            });

            // 2. Rimuovi eventuali ospiti che avevano le chiavi di questa casa
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
        await db('utenti')
            .where('id_utente', req.utente.id)
            .update({ 
                house_custom_image: customImage, 
                house_custom_desc: customDesc 
            });
        res.json({ message: "Dati abitazione aggiornati." });
    } catch (e) {
        console.error("Errore salvataggio casa:", e); // Aggiunto log per debug
        res.status(500).json({ message: "Errore aggiornamento." });
    }
});

app.get('/api/housing/chat/:chatId', verificaToken, async (req, res) => {
    try {
        const { chatId } = req.params;

        // Cerchiamo l'utente proprietario di questa chat casa
        const houseData = await db('utenti')
            .join('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select(
                'housing_types.name as type_name',
                'housing_types.description as default_desc',
                'utenti.nome_pg as owner_name',
                'utenti.house_custom_image',
                'utenti.house_custom_desc'
            )
            .where('utenti.house_chat_id', chatId)
            .first();

        if (!houseData) {
            return res.status(404).json({ message: "Casa non trovata." });
        }

        // Formattiamo i dati esattamente come se fosse una "Location" normale
        const responseData = {
            name: houseData.type_name, // O "Casa di X"
            // Se c'è una descrizione personalizzata usa quella, altrimenti quella standard
            description: houseData.house_custom_desc || houseData.default_desc,
            // Se c'è l'immagine custom usa quella
            image_url: houseData.house_custom_image || null,
            // Info extra utile per il master notes
            owner: houseData.owner_name
        };

        res.json(responseData);

    } catch (e) {
        console.error("Errore recupero dettagli chat casa:", e);
        res.status(500).json({ message: "Errore interno." });
    }
});

// 10. [HOUSING] GUARDA NEGLI ARMADI (Vedi inventario casa)
app.get('/api/housing/house-inventory/:chatId', verificaToken, async (req, res) => {
    const { chatId } = req.params;
    const userId = req.utente.id;

    try {
        // 1. Identifica la casa dalla chat
        const houseOwner = await db('utenti').where('house_chat_id', chatId).first();
        if (!houseOwner) return res.status(404).json({ message: "Questa non è una casa." });

        // 2. Controllo Permessi (Proprietario, Ospite o Admin)
        const isOwner = houseOwner.id_utente === userId;
        const isAdmin = ['ADMIN', 'MOD'].includes(req.utente.permesso);
        let isGuest = false;

        if (!isOwner && !isAdmin) {
            const guestRecord = await db('housing_guests')
                .where({ housing_id: houseOwner.housing_id, guest_id: userId })
                .first();
            if (guestRecord) isGuest = true;
        }

        if (!isOwner && !isGuest && !isAdmin) {
            return res.status(403).json({ message: "Non hai le chiavi per frugare qui." });
        }

        // 3. Recupera inventario del proprietario
        // NOTA: Assumiamo che la tua tabella oggetti si chiami 'oggetti' e l'inventario 'inventario'
        // Se i nomi sono diversi nel tuo DB, correggi qui sotto!
        const items = await db('inventario')
            .join('oggetti', 'inventario.item_id', 'oggetti.id') 
            .select('inventario.id as inv_id', 'oggetti.nome', 'oggetti.icona', 'inventario.quantita')
            .where('inventario.user_id', houseOwner.id_utente);

        res.json({ ownerName: houseOwner.nome_pg, items, isOwner });

    } catch (e) {
        console.error("Errore inventario casa:", e);
        // Restituiamo lista vuota in caso di errore (es. tabella inventario mancante) per non bloccare
        res.json({ ownerName: "Sconosciuto", items: [] }); 
    }
});

// 11. [HOUSING] RUBA OGGETTO
app.post('/api/housing/steal', verificaToken, async (req, res) => {
    const { invItemId, targetChatId } = req.body; 
    const thiefId = req.utente.id;

    try {
        await db.transaction(async (trx) => {
            // Verifica casa e proprietario
            const houseOwner = await trx('utenti').where('house_chat_id', targetChatId).first();
            if (!houseOwner) throw new Error("Casa non trovata.");

            if (houseOwner.id_utente === thiefId) throw new Error("Non puoi rubare a te stesso!");

            // Verifica oggetto
            const itemToSteal = await trx('inventario').where('id', invItemId).first();
            if (!itemToSteal || itemToSteal.user_id !== houseOwner.id_utente) {
                throw new Error("L'oggetto non è più qui.");
            }

            // --- ESECUZIONE FURTO (Sposta 1 unità) ---
            
            // 1. Rimuovi da Vittima
            if (itemToSteal.quantita > 1) {
                await trx('inventario').where('id', invItemId).decrement('quantita', 1);
            } else {
                await trx('inventario').where('id', invItemId).del();
            }

            // 2. Aggiungi a Ladro
            const existingItem = await trx('inventario')
                .where({ user_id: thiefId, item_id: itemToSteal.item_id })
                .first();

            if (existingItem) {
                await trx('inventario').where('id', existingItem.id).increment('quantita', 1);
            } else {
                await trx('inventario').insert({
                    user_id: thiefId,
                    item_id: itemToSteal.item_id,
                    quantita: 1
                });
            }

            // 3. Notifica in Chat (Il brivido del rischio!)
            // Usiamo il socket se possibile, altrimenti salviamo nel log
            const thiefName = req.utente.nome_pg;
            await trx('chat_log').insert({
                chat_id: targetChatId,
                autore: 'SISTEMA',
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
// --- GESTIONE AVANZATA FORUM (ADMIN/MOD) ---
// =================================================================

// PIN / UNPIN (Fissare in alto)
app.put('/api/admin/forum/topics/:id/pin', verificaToken, verificaMod, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_pinned } = req.body; // true o false
        await db('forum_topics').where({ id }).update({ is_pinned: is_pinned ? 1 : 0 });
        res.json({ message: `Discussione ${is_pinned ? 'fissata' : 'sbloccata'}.` });
    } catch (e) {
        console.error("Errore operazione pin:", e);
        res.status(500).json({ message: "Errore interno." });
    }
});

// LOCK / UNLOCK (Chiudere la discussione)
app.put('/api/admin/forum/topics/:id/lock', verificaToken, verificaMod, async (req, res) => {
    try {
        const { id } = req.params;
        const { is_locked } = req.body; // true o false
        await db('forum_topics').where({ id }).update({ is_locked: is_locked ? 1 : 0 });
        res.json({ message: `Discussione ${is_locked ? 'chiusa' : 'riaperta'}.` });
    } catch (e) {
        console.error("Errore operazione lock:", e);
        res.status(500).json({ message: "Errore interno." });
    }
});

// CANCELLARE DISCUSSIONE
app.delete('/api/admin/forum/topics/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        // La cancellazione a cascata (post collegati) dovrebbe essere gestita dal DB (ON DELETE CASCADE)
        // Se non lo è, cancelliamo prima i post per sicurezza
        await db('forum_posts').where({ topic_id: req.params.id }).del();
        await db('forum_topics').where({ id: req.params.id }).del();
        res.json({ message: "Discussione eliminata con successo." });
    } catch (e) {
        console.error("Errore eliminazione topic:", e);
        res.status(500).json({ message: "Errore interno." });
    }
});

// CANCELLARE SINGOLO POST
app.delete('/api/admin/forum/posts/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_posts').where({ id: req.params.id }).del();
        res.json({ message: "Post eliminato." });
    } catch (e) {
        console.error("Errore eliminazione post:", e);
        res.status(500).json({ message: "Errore interno." });
    }
});


// NEWS VISOR API
app.get('/api/forum/bacheca/:bachecaId/latest-topics', verificaToken, async (req, res) => {
    try {
        const anteprimaRaw = (environment === 'development') ? "SUBSTR(p.testo, 1, 120) || ' ...' as anteprima" : "SUBSTRING(p.testo, 1, 120) || ' ...' as anteprima";
        const topics = await db('forum_topics as t')
            .join('forum_posts as p', 'p.topic_id', 't.id')
            .select('t.titolo', db.raw(anteprimaRaw), 't.timestamp_creazione')
            .where('t.bacheca_id', req.params.bachecaId)
            .andWhere('p.id', function() { this.from('forum_posts').min('id').whereRaw('topic_id = t.id'); })
            .orderBy('t.ultimo_post_timestamp', 'desc').limit(5);
        res.json(topics);
    } catch (e) { res.status(500).json({ message: 'Errore.' }); }
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
// 2. STORICO TRANSAZIONI
app.get('/api/bank/history', verificaToken, async (req, res) => {
    try {
        const history = await db('transactions')
            .join('utenti as sender', 'transactions.sender_id', 'sender.id_utente')
            .leftJoin('utenti as receiver', 'transactions.receiver_id', 'receiver.id_utente')
            .select(
                'transactions.id', // <--- AGGIUNGI QUESTO!
                'transactions.amount',
                'transactions.reason',
                'transactions.timestamp',
                'sender.nome_pg as sender_name',
                'receiver.nome_pg as receiver_name'
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

// 3. INFO LAVORO E STIPENDIO
app.get('/api/bank/job', verificaToken, async (req, res) => {
    try {
        const user = await db('utenti')
            .select('job', 'last_salary_collection', 'rem')
            .where('id_utente', req.utente.id)
            .first();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Errore info lavoro." });
    }
});

// 4. RITIRA STIPENDIO
app.post('/api/bank/collect-salary', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    const BASE_SALARY = 90; // O calcolato in base al lavoro
    const COOLDOWN_HOURS = 24;

    try {
        // Recuperiamo utente E info sulla casa (costo e tipo pagamento)
        const user = await db('utenti')
            .leftJoin('housing_types', 'utenti.housing_id', 'housing_types.id')
            .select(
                'utenti.*', 
                'housing_types.cost_rem as house_cost', 
                'housing_types.cost_type as house_payment_type',
                'housing_types.name as house_name'
            )
            .where('utenti.id_utente', userId)
            .first();
        
        // 1. Controllo Cooldown (come prima)
        if (user.last_salary_collection) {
            const lastCollection = new Date(user.last_salary_collection);
            const now = new Date();
            const diffHours = (now - lastCollection) / (1000 * 60 * 60);
            
            if (diffHours < COOLDOWN_HOURS) {
                return res.status(400).json({ message: `Devi attendere ancora ${(COOLDOWN_HOURS - diffHours).toFixed(1)} ore.` });
            }
        }

        // 2. Calcolo Stipendio Netto
        let finalAmount = BASE_SALARY;
        let rentDeduction = 0;
        let logReason = "Stipendio Giornaliero";

        // Se ha una casa E il tipo di pagamento è DAILY_SALARY (Detrazione Stipendio)
        if (user.housing_id && user.house_payment_type === 'DAILY_SALARY') {
            rentDeduction = user.house_cost || 0;
            finalAmount = BASE_SALARY - rentDeduction;
            logReason = `Stipendio (Netto: ${BASE_SALARY} - ${rentDeduction} Affitto)`;
        }

        // Se l'affitto è più alto dello stipendio (non dovrebbe succedere, ma per sicurezza)
        if (finalAmount < 0) finalAmount = 0;

        // 3. Eseguiamo la Transazione
        await db.transaction(async (trx) => {
            await trx('utenti').where('id_utente', userId).update({
                rem: user.rem + finalAmount,
                last_salary_collection: new Date()
            });
            
            await trx('transactions').insert({
                sender_id: null, // Sistema
                receiver_id: userId,
                amount: finalAmount,
                reason: logReason
            });
        });

        if (rentDeduction > 0) {
            res.json({ message: `Hai ritirato ${finalAmount} REM (Dedotti ${rentDeduction} per l'affitto di ${user.house_name})!` });
        } else {
            res.json({ message: `Hai ritirato ${finalAmount} REM!` });
        }

    } catch (error) {
        console.error("Errore stipendio:", error);
        res.status(500).json({ message: "Errore interno." });
    }
});

// MODIFICA: 5. IMPOSTA LAVORO 
app.post('/api/bank/set-job', verificaToken, async (req, res) => {
    const { jobName } = req.body;
    const userId = req.utente.id;

    if (!jobName) return res.status(400).json({ message: "Devi selezionare un lavoro." });

    try {
        const user = await db('utenti').where('id_utente', userId).first();
        if (user.job) return res.status(400).json({ message: "Hai già un impiego!" });

        await db('utenti').where('id_utente', userId).update({
            job: jobName,
            last_salary_collection: null,
            // job_started_at: new Date()  <--- COMMENTA O RIMUOVI QUESTA RIGA SE NON HAI AGGIORNATO IL DB
        });

        res.json({ message: `Congratulazioni! Ora lavori come ${jobName}.` });
    } catch (error) {
        console.error("ERRORE SET-JOB:", error); // <--- Questo ti dirà l'errore esatto nel terminale
        res.status(500).json({ message: "Errore server." });
    }
});

// [NUOVO] 6. LASCIA LAVORO (Con controllo 10 giorni)
app.post('/api/bank/leave-job', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    const MIN_DAYS = 10;

    try {
        const user = await db('utenti').where('id_utente', userId).first();

        if (!user.job) return res.status(400).json({ message: "Non hai un lavoro da lasciare." });

        // Controllo Cooldown
        if (user.job_started_at) {
            const startDate = new Date(user.job_started_at);
            const now = new Date();
            const diffTime = Math.abs(now - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

            if (diffDays < MIN_DAYS) {
                return res.status(400).json({ 
                    message: `Devi mantenere il lavoro per almeno ${MIN_DAYS} giorni. (Mancano ${MIN_DAYS - diffDays} gg)` 
                });
            }
        }

        // Procedi alle dimissioni
        await db('utenti').where('id_utente', userId).update({
            job: null,
            last_salary_collection: null,
            job_started_at: null
        });

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
        // 1. Scarichiamo TUTTI i messaggi che ti riguardano
        const messages = await db('private_messages')
            .where({ sender_id: myId })
            .orWhere({ receiver_id: myId })
            .orderBy('timestamp', 'desc');

        // 2. Elaboriamo la lista manualmente (più sicuro che fare query SQL complesse)
        const conversationMap = new Map();

        for (const msg of messages) {
            const otherId = (msg.sender_id === myId) ? msg.receiver_id : msg.sender_id;

            if (!conversationMap.has(otherId)) {
                conversationMap.set(otherId, {
                    last_message: msg.text,
                    last_message_timestamp: msg.timestamp,
                    unread_count: 0, 
                    otherId: otherId
                });
            }
            
            // Conta i non letti
            if (msg.receiver_id === myId && !msg.is_read) {
                const conv = conversationMap.get(otherId);
                conv.unread_count += 1;
            }
        }

        // 3. Recuperiamo i nomi e avatar degli interlocutori
        const conversations = [];
        const partnerIds = Array.from(conversationMap.keys());

        if (partnerIds.length > 0) {
            const partners = await db('utenti')
                .select('id', 'nome_pg', 'avatar_chat')
                .whereIn('id', partnerIds);

            partners.forEach(partner => {
                const convData = conversationMap.get(partner.id);
                conversations.push({
                    id_utente: partner.id,
                    nome_pg: partner.nome_pg,
                    avatar_chat: partner.avatar_chat,
                    last_message: convData.last_message,
                    last_message_timestamp: convData.last_message_timestamp,
                    unread_count: convData.unread_count
                });
            });
        }

        // 4. Ordiniamo per data
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
// Endpoint speciale per lo streaming da YouTube
app.get('/api/youtube-stream/:videoId', async (req, res) => {
    const videoId = req.params.videoId;
    console.log(`[Server] Ricevuta richiesta per lo streaming di: ${videoId}`); 

    try {
        if (!ytdl.validateID(videoId)) {
            console.error(`[Server] ID video non valido: ${videoId}`);
            return res.status(400).send("ID video non valido");
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const info = await ytdl.getInfo(videoUrl);
        
        const format = ytdl.chooseFormat(info.formats, { 
            quality: 'highestaudio', 
            filter: 'audioonly' 
        });

        if (!format) {
            console.error(`[Server] Nessun formato solo audio trovato per ${videoId}.`);
            return res.status(404).send("Formato audio non trovato per questo video.");
        }
        
        console.log(`[Server] Formato audio trovato. Avvio dello streaming...`);
        ytdl(videoUrl, { format: format }).pipe(res);

    } catch (error) {
        console.error(`[Server] ERRORE CRITICO nello streaming di ${videoId}:`, error.message);
        res.status(500).send("Errore durante il recupero dello stream audio.");
    }
});

// --- API EVENTI GIORNALIERI (Daily Event) ---
app.get('/api/daily-event', verificaToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const event = await db('daily_events').select('title', 'description').where('event_date', today).first();
    res.json(event || null);
});


// [PUT] RESET STATS (ADMIN)
app.put('/api/admin/reset-stats/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    
    const resetStats = {
        // Statistiche Base
        forza: 1, 
        destrezza: 1, 
        costituzione: 1, 
        mente: 1, 
        empatia: 1,
        
        // Statistiche Derivate
        stat_body: 10,
        stat_kotodama: 10,
        reflexes: 1,
        velocita: 1,
        
        // --- QUI C'ERA L'ERRORE ---
        percezione_sensi: 1,       // <--- PRIMA ERA percezione_fisica
        // --------------------------
        
        percezione_spirituale: 1,
        movimento: 1,
        salto: 1,
        lancio: 1,
        peso_trasportabile: 1,
        ingaggio: 1,
        danno_cac: 1,
        danno_cad: 1
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
        
        // --- 1. FIX LISTA GLOBALE (Rimuovi duplicati) ---
        const getUniqueGlobalUsers = () => {
            const uniqueMap = new Map();
            Object.values(onlineUsers).forEach(u => {
                if (u && u.id) uniqueMap.set(u.id, u);
            });
            return Array.from(uniqueMap.values());
        };
        io.emit('update_online_list', getUniqueGlobalUsers());
        
        // --- 2. FIX LISTA STANZA (Rimuovi duplicati) ---
        const updateRoomUsers = async (chatId) => {
            const socketsInRoom = await io.in(chatId).fetchSockets();
            
            // Mappiamo i socket agli utenti
            const rawUsers = socketsInRoom.map(s => onlineUsers[s.id]).filter(u => u);
            
            // Usiamo una Map per tenere solo un utente per ogni ID
            const uniqueUsersMap = new Map();
            rawUsers.forEach(user => {
                if (!uniqueUsersMap.has(user.id)) {
                    uniqueUsersMap.set(user.id, user);
                }
            });
            
            // Convertiamo la Map in Array
            const uniqueUsers = Array.from(uniqueUsersMap.values());
            
            io.to(chatId).emit('room_users_update', uniqueUsers);
        };

        socket.on('join_chat', (chatId) => { socket.join(chatId); updateRoomUsers(chatId); });
        socket.on('leave_chat', (chatId) => { socket.leave(chatId); updateRoomUsers(chatId); });

        // --- GESTIONE MESSAGGI CHAT ---
        socket.on('send_message', async (data) => {
            
            // 1. CONTROLLO BAN (Il Posto di Blocco)
            try {
                // Interroghiamo il DB per vedere lo stato attuale dell'utente
                const checkBan = await db('utenti')
                    .select('ban_expires_at', 'ban_type')
                    .where('id_utente', socket.utente.id)
                    .first();

                // Se c'è una data di scadenza futura...
                if (checkBan && checkBan.ban_expires_at && new Date(checkBan.ban_expires_at) > new Date()) {
                    
                    // Se è SHADOW BAN o FULL BAN, blocchiamo tutto.
                    // (Nel caso FULL non dovrebbe nemmeno essere qui, ma per sicurezza controlliamo)
                    if (checkBan.ban_type === 'SHADOW' || checkBan.ban_type === 'FULL') {
                        
                        // Opzionale: Mandiamo un messaggio SOLO a lui per dirgli che è bloccato
                        // (Se vuoi il vero "Shadowban" dove lui scrive e nessuno legge, rimuovi queste 3 righe sotto)
                        socket.emit('new_message', {
                            id: 'system-error',
                            autore: 'SYSTEM',
                            testo: '⛔ Sei in modalità SPETTATORE (Shadowban). Non puoi inviare messaggi.',
                            tipo: 'errore', // Assicurati che il frontend gestisca il tipo o usa un colore diverso
                            timestamp: new Date()
                        });

                        return; // STOP! Il codice si ferma qui. Niente EXP, niente messaggio agli altri.
                    }
                }
            } catch (err) {
                console.error("Errore controllo ban chat:", err);
            }

            // 2. CODICE NORMALE (Se non è bannato, prosegue qui...)
            const messageData = { 
                ...data, 
                autore: userProfile.nome_pg, 
                permesso: userProfile.permesso, 
                avatar_url: userProfile.avatar_chat 
            };

            // Logica EXP (semplificata)
            if (messageData.tipo === 'azione') {
                const textLength = messageData.testo.length;
                const expGained = Math.floor(textLength / 500) * 2;
                if (expGained > 0) {
                     try {
                        await db('utenti')
                            .where('id_utente', socket.utente.id)
                            .update({ 
                                exp: db.raw('exp + ?', [expGained]), 
                                exp_accumulata: db.raw('exp_accumulata + ?', [expGained]) 
                            });
                     } catch(e) { console.error("Errore EXP", e); }
                }
            }

            try {
                await db('chat_log').insert({ 
                    chat_id: messageData.chatId, 
                    autore: messageData.autore, 
                    permesso: messageData.permesso, 
                    testo: messageData.testo, 
                    tipo: messageData.tipo, 
                    quest_id: messageData.quest_id, 
                    luogo: messageData.luogo 
                }); 
            } catch (dbError) { console.error("Errore salvataggio messaggio:", dbError); }
                
            io.to(messageData.chatId).emit('new_message', messageData);
        });
        
        // --- LANCIO DADI (Con protezione Shadowban) ---
        socket.on('roll_dice', async (data) => {
            const { chatId, diceType } = data;

            // 1. CONTROLLO BAN
            try {
                const checkBan = await db('utenti')
                    .select('ban_expires_at', 'ban_type')
                    .where('id_utente', socket.utente.id)
                    .first();

                if (checkBan && checkBan.ban_expires_at && new Date(checkBan.ban_expires_at) > new Date()) {
                    if (checkBan.ban_type === 'SHADOW' || checkBan.ban_type === 'FULL') {
                        socket.emit('new_message', {
                            id: 'sys-err',
                            autore: 'SYSTEM',
                            testo: '⛔ Sei in modalità SPETTATORE. Non puoi lanciare dadi.',
                            tipo: 'errore',
                            timestamp: new Date()
                        });
                        return; // STOP
                    }
                }
            } catch (err) { console.error("Errore ban dadi:", err); }

            // 2. LOGICA DADO
            if (!chatId || !diceType) return;

            const result = Math.floor(Math.random() * diceType) + 1;
            const diceText = `lancia un d${diceType} e ottiene: ${result}`;

            const messageData = {
                chatId, // Importante: deve essere passato dal frontend
                autore: userProfile.nome_pg,
                permesso: userProfile.permesso,
                avatar_url: userProfile.avatar_chat,
                testo: diceText,
                tipo: 'dado',
                timestamp: new Date()
            };

            // 3. SALVATAGGIO DB
            try {
                await db('chat_log').insert({
                    chat_id: messageData.chatId,
                    autore: messageData.autore,
                    permesso: messageData.permesso,
                    testo: messageData.testo,
                    tipo: messageData.tipo
                });
            } catch (dbError) { console.error("Errore salvataggio dado:", dbError); }

            // 4. INVIO A TUTTI
            io.to(chatId).emit('new_message', messageData);
        });

        socket.on('send_private_message', async ({ receiverId, text }) => {
    
            // --- [AGGIUNGI QUESTO BLOCCO DI SICUREZZA] ---
            try {
                const checkBan = await db('utenti')
                    .select('ban_expires_at', 'ban_type')
                    .where('id_utente', socket.utente.id)
                    .first();
        
                if (checkBan && checkBan.ban_expires_at && new Date(checkBan.ban_expires_at) > new Date()) {
                    if (checkBan.ban_type === 'SHADOW' || checkBan.ban_type === 'FULL') {
                        // Avvisiamo solo lui che non può inviare
                        socket.emit('private_message_sent', { 
                            error: true,
                            text: "⛔ Sei in modalità SPETTATORE. Non puoi inviare messaggi privati." 
                        });
                        return; // STOP! Il messaggio non viene salvato né inviato.
                    }
                }
            } catch (err) {
                console.error("Errore controllo ban PM:", err);
            }
            // ----------------------------------------------
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
                // Nota: Non cancelliamo da userSockets se ha altre schede aperte, 
                // ma per ora va bene così, il problema visivo è la priorità.
                delete onlineUsers[socket.id];
                
                // Usiamo la stessa logica di deduplicazione di prima
                const uniqueMap = new Map();
                Object.values(onlineUsers).forEach(u => {
                    if (u && u.id) uniqueMap.set(u.id, u);
                });
                
                io.emit('update_online_list', Array.from(uniqueMap.values()));
            }
        });

    } catch(e) {
        console.error("Errore critico socket:", e);
        socket.disconnect();
    }
});

// ===============================
// SERVE FRONTEND REACT (RENDER)
// ===============================
const path = require('path');

// path alla build di Vite
app.use(express.static(path.join(__dirname, '../gdr-frontend/dist')));

// catch-all: qualsiasi rotta non-API va a React
app.get('*', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../gdr-frontend/dist/index.html')
    );
});



// --- 5. AVVIO SERVER ---
(async () => {
    try {
        await db.raw('SELECT 1');
        console.log(`✅ Connessione al database (${environment}) riuscita.`);
        httpServer.listen(port, () => {
            console.log(`🚀 Server avviato su http://localhost:${port} in modalità ${environment}`);
        });
    } catch (errore) {
        console.error("ERRORE CRITICO AVVIO SERVER:", errore);
        process.exit(1);
    }
})();