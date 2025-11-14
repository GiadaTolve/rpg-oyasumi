// --- 1. IMPORT E IMPOSTAZIONI GLOBALI ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const verificaToken = require('./authMiddleware');
const ytdl = require('ytdl-core');
const axios = require('axios');
const knex = require('knex');
const knexConfig = require('./knexfile');


console.log("✅ FASE 1: Tutti i moduli sono stati importati.");

require('dotenv').config();

// Seleziona l'ambiente (development o production)
const environment = process.env.NODE_ENV || 'development';
// Inizializza il database usando Knex e il file di configurazione
const db = knex(knexConfig[environment]); // <-- QUESTA È LA NUOVA INIZIALIZZAZIONE

const app = express();
const port = process.env.PORT || 3000; // Usa la variabile d'ambiente
const httpServer = http.createServer(app);
const frontendURL = process.env.FRONTEND_URL || "http://localhost:5173";

const allowedOrigins = [
    "http://localhost:5173", // Per lo sviluppo in locale
    process.env.FRONTEND_URL // Per la produzione!
].filter(Boolean); // Rimuove valori nulli se FRONTEND_URL non è settato

// Opzioni CORS che useremo ovunque
const corsOptions = {
    origin: function (origin, callback) {
      // Permetti le richieste senza 'origin' (es. app mobile o Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'La policy CORS non permette l\'accesso da questa origine.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    }
};

const io = new Server(httpServer, {
    cors: corsOptions // Ora usa la funzione unificata
});

let onlineUsers = {};
let userSockets = new Map(); // <-- AGGIUNGI QUESTO


// --- HELPER FUNCTIONS ---
function calculateLevel(exp) {
  if (exp < 100) return 1;
  const level = Math.floor((-5 + Math.sqrt(225 + 4 * exp)) / 10);
  return Math.min(level, 50);
}

// --- 2. MIDDLEWARE ---
app.use(cors(corsOptions)); // <-- Ora usa le opzioni unificate CORRETTE
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. API ROUTES ---

// Middleware di verifica permessi
const verificaAdmin = (req, res, next) => {
    if (req.utente?.permesso === 'ADMIN') next();
    else res.status(403).json({ message: 'Accesso negato: richiesti permessi di Admin.' });
  };
  
  // MODIFICATO: Ora include anche MOD e ADMIN
  const verificaMaster = (req, res, next) => {
    const permessiValidi = ['MASTER', 'MOD', 'ADMIN'];
    if (permessiValidi.includes(req.utente?.permesso)) next();
    else res.status(403).json({ message: 'Accesso negato: richiesti permessi di Master o superiori.' });
  };
  
  // NUOVO: Middleware per i Moderatori e Admin
  const verificaMod = (req, res, next) => {
    const permessiValidi = ['MOD', 'ADMIN'];
    if (permessiValidi.includes(req.utente?.permesso)) next();
    else res.status(403).json({ message: 'Accesso negato: richiesti permessi di Moderatore o superiori.' });
  };

// API Pubbliche e di base
app.get('/', (req, res) => res.send('Il server è attivo!'));

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, nome_pg, playerPreferences } = req.body;
        if (!email || !password || !nome_pg) {
            return res.status(400).json({ message: 'Tutti i campi sono obbligatori.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUserId = await db.transaction(async (trx) => {
            const [userIdResult] = await trx('utenti').insert({
                email,
                password: hashedPassword,
                nome_pg,
                preferenze_gioco: playerPreferences
            }).returning('id_utente');

            // Knex restituisce un oggetto in PG, un numero in SQLite
            const userId = (typeof userIdResult === 'object') ? userIdResult.id_utente : userIdResult;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER || 'oyasumi.staff@gmail.com',
                    pass: process.env.EMAIL_PASS,
                },
            });

            const mailToUser = {
                from: '"Oyasumi Staff" <oyasumi.staff@gmail.com>',
                to: email,
                subject: "Benvenuto in Oyasumi! Il tuo viaggio ha inizio!",
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Ciao ${nome_pg}!</h2>
                        <p>Siamo felicissimi di darti il benvenuto nel mondo oscuro e onirico di <strong>Oyasumi</strong>.</p>
                        <p>Il tuo account è stato creato con successo. Ecco un riepilogo dei tuoi dati:</p>
                        <ul>
                            <li><strong>Nome Personaggio:</strong> ${nome_pg}</li>
                            <li><strong>Email:</strong> ${email}</li>
                            <li><strong>Password:</strong> ${password}</li>
                        </ul>
                        <p>Custodisci queste informazioni e preparati a vivere la tua avventura.</p>
                        <p>A presto,<br/>Lo Staff di Oyasumi</p>
                    </div>
                `
            };

            const mailToStaff = {
                from: '"Notifiche Oyasumi" <oyasumi.staff@gmail.com>',
                to: 'oyasumi.staff@gmail.com',
                subject: `🔔 Nuova Registrazione: ${nome_pg}`,
                html: `
                     <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Un nuovo sognatore si è unito a noi!</h2>
                        <p>Un nuovo utente si è registrato su Oyasumi:</p>
                        <ul>
                            <li><strong>ID Utente:</strong> ${userId}</li>
                            <li><strong>Nome Personaggio:</strong> ${nome_pg}</li>
                            <li><strong>Email:</strong> ${email}</li>
                        </ul>
                        <hr>
                        <h3>Preferenze/Note del Giocatore:</h3>
                        <p style="background-color: #f4f4f4; border-left: 4px solid #ccc; padding: 10px; font-style: italic;">
                            ${playerPreferences || 'Nessuna preferenza espressa.'}
                        </p>
                    </div>
                `
            };

            await transporter.sendMail(mailToUser);
            await transporter.sendMail(mailToStaff);

            console.log(`✅ Registrazione (in transazione) e invio email completati per ${nome_pg}.`);

            return userId;
        });

        res.status(201).json({ message: 'Utente registrato con successo!', userId: newUserId });

    } catch (errore) {
        console.error("Errore durante il processo di registrazione:", errore);
        if (errore.code === '23505' || errore.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Questa email è già stata utilizzata.' });
        }
        res.status(500).json({ message: 'Errore interno del server durante la registrazione.' });
    }
});


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

        res.status(200).json({ message: 'Login effettuato con successo!', token });
    } catch (errore) {
        console.error('Errore nel login:', errore);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

app.get('/api/users/find', verificaToken, async (req, res) => {
    const { name } = req.query;
    const myId = req.utente.id;

    if (!name) {
        return res.status(400).json({ message: 'Il nome del personaggio è richiesto.' });
    }

    try {
        const user = await db('utenti')
            .select('id_utente', 'nome_pg', 'avatar_chat')
            // Usa LOWER per query case-insensitive (funziona su PG e SQLite)
            .where(db.raw('LOWER(nome_pg) = LOWER(?)', [name.trim()])) 
            .andWhere('id_utente', '!=', myId)
            .first();

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: `Nessun giocatore di nome "${name}" è stato trovato.` });
        }

    } catch (error) {
        console.error("Errore nella ricerca dell'utente:", error);
        res.status(500).json({ message: 'Errore interno del server.' });
    }
});

app.get('/api/scheda', verificaToken, async (req, res) => {
    try {
      const scheda = await db('utenti').where('id_utente', req.utente.id).first();
      
      if (!scheda) {
        return res.status(404).json({ message: 'Scheda non trovata.' });
      }
  
      const livello = calculateLevel(scheda.exp_accumulata);
      delete scheda.password;
      const schedaCompleta = { ...scheda, livello: livello };
      
      res.status(200).json(schedaCompleta);
    } catch (errore) {
      console.error("Errore recupero scheda:", errore);
      res.status(500).json({ message: 'Errore interno del server.' });
    }
  });
  
  // --- NUOVO ENDPOINT PER AGGIORNARE LE STATISTICHE ---
  app.post('/api/scheda/aggiorna-stat', verificaToken, async (req, res) => {
      const { updates, cost } = req.body;
      const userId = req.utente.id;
  
      if (!updates || typeof cost !== 'number') {
          return res.status(400).json({ message: "Dati invalidi per l'aggiornamento." });
      }
  
      try {
          const schedaAggiornata = await db.transaction(async (trx) => {
              const utente = await trx('utenti').where({ id_utente: userId }).first();
              if (!utente) {
                  const err = new Error("Utente non trovato.");
                  err.statusCode = 404;
                  throw err;
  _}
  
              // 1. Ricalcola il costo sul backend per sicurezza
              let serverCost = 0;
              const validStats = ['forza', 'destrezza', 'costituzione', 'mente'];
              for (const stat in updates) {
                  if (!validStats.includes(stat)) continue;
  
                  const originalValue = utente[stat];
                  const newValue = updates[stat];
                  if (newValue > originalValue) {
                      for (let i = originalValue + 1; i <= newValue; i++) {
                          serverCost += i * 10;
                      }
                  }
              }
              
              // 2. Confronta il costo del server con quello del client e controlla l'EXP
              if (serverCost !== cost || serverCost > utente.exp) {
                  const err = new Error("Costo non valido o EXP insufficiente.");
                  err.statusCode = 400;
                  throw err;
              }
  
              // 3. Applica le modifiche
              await trx('utenti').where({ id_utente: userId }).update({
                  exp: db.raw('exp - ?', [serverCost]),
                  forza: updates.forza,
                  destrezza: updates.destrezza,
                  costituzione: updates.costituzione,
                  mente: updates.mente
              });
  
              // 4. Recupera la scheda aggiornata per inviarla
              const schedaDb = await trx('utenti').where({ id_utente: userId }).first();
              delete schedaDb.password;
              schedaDb.livello = calculateLevel(schedaDb.exp_accumulata);
              
              return schedaDb;
          });
  
          res.status(200).json(schedaAggiornata);
  
      } catch (error) {
          console.error("Errore aggiornamento statistiche:", error);
          res.status(error.statusCode || 500).json({ message: error.message || "Errore interno del server durante l'aggiornamento." });
      }
  });
  
  // --- NUOVO ENDPOINT PER AGGIORNARE IL PROFILO ---
app.put('/api/scheda/profilo', verificaToken, async (req, res) => {
    const { avatar, avatar_chat, background } = req.body;
    const userId = req.utente.id;

    try {
        await db('utenti')
            .where('id_utente', userId)
            .update({
                avatar,
                avatar_chat,
                background
            });

        // Invia la scheda aggiornata al client
        const schedaAggiornata = await db('utenti').where('id_utente', userId).first();
        
        if (schedaAggiornata) {
            delete schedaAggiornata.password;
            schedaAggiornata.livello = calculateLevel(schedaAggiornata.exp_accumulata);
            res.status(200).json(schedaAggiornata);
        } else {
            res.status(404).json({ message: "Utente non trovato dopo l'aggiornamento." });
        }

    } catch (error) {
        console.error("Errore aggiornamento profilo:", error);
        res.status(500).json({ message: "Errore interno del server durante l'aggiornamento del profilo." });
    }
});

// --- API PER IL BANNER PUBBLICO ---
app.get('/api/active-banner', async (req, res) => {
    try {
        const banner = await db('event_banners').where('is_active', 1).first();
        res.json(banner || null);
    } catch (error) {
        console.error("Errore recupero banner attivo:", error);
        res.status(500).json({ message: "Errore nel recupero del banner." });
    }
});

// --- API PER LA GESTIONE DEI BANNER (ADMIN) ---
app.get('/api/admin/banners', verificaToken, verificaMod, async (req, res) => {
    try {
        const banners = await db('event_banners').orderBy('id', 'desc');
        res.json(banners);
    } catch (error) {
        console.error("Errore nel recupero dei banner:", error);
        res.status(500).json({ message: "Errore nel recupero dei banner." });
    }
});

app.post('/api/admin/banners', verificaToken, verificaMod, async (req, res) => {
    try {
        const { title, image_url, link_url, is_active } = req.body;
        const [id] = await db('event_banners').insert({
            title,
            image_url,
            link_url,
            is_active: is_active ? 1 : 0
        }).returning('id');
        res.status(201).json({ id: (typeof id === 'object') ? id.id : id });
    } catch (error) {
        console.error("Errore nella creazione del banner:", error);
        res.status(500).json({ message: "Errore nella creazione del banner." });
    }
});

app.put('/api/admin/banners/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        const { title, image_url, link_url, is_active } = req.body;
        await db('event_banners')
            .where('id', req.params.id)
            .update({
                title,
                image_url,
                link_url,
                is_active: is_active ? 1 : 0
            });
        res.json({ message: 'Banner aggiornato' });
    } catch (error) {
        console.error("Errore nell'aggiornamento del banner:", error);
        res.status(500).json({ message: "Errore nell'aggiornamento del banner." });
    }
});

app.delete('/api/admin/banners/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('event_banners').where('id', req.params.id).del();
        res.json({ message: 'Banner eliminato' });
    } catch (error) {
        console.error("Errore nell'eliminazione del banner:", error);
        res.status(500).json({ message: "Errore nell'eliminazione del banner." });
    }
});

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

// --- NUOVO BLOCCO API METEO ---
app.get('/api/weather', verificaToken, async (req, res) => {
    const { location } = req.query;
    if (!location) {
        return res.status(400).json({ message: 'Prefettura non specificata.' });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location},JP&appid=${apiKey}&units=metric&lang=it`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        const isDay = data.dt > data.sys.sunrise && data.dt < data.sys.sunset;
        let icon = 'sun.png'; // Default

        switch (data.weather[0].main.toLowerCase()) {
            case 'clear':
                icon = isDay ? 'sun.png' : 'moon.png';
                break;
            case 'clouds': case 'mist': case 'smoke': case 'haze': case 'dust': case 'fog': case 'sand': case 'ash': case 'squall': case 'tornado':
                icon = isDay ? 'sun.png' : 'moon.png'; // Semplificato per ora
                break;
            case 'rain': case 'drizzle': case 'thunderstorm':
                icon = 'rainy.png';
                break;
            case 'snow':
                icon = 'snow.png';
                break;
            default:
                icon = 'windy.png';
                break;
        }

        res.json({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            icon: icon
        });

    } catch (error) {
        console.error("Errore API Meteo:", error.response?.data?.message || error.message);
        res.status(500).json({ message: 'Impossibile recuperare i dati meteo.' });
    }
});

// API DI GESTIONE (ADMIN)
app.get('/api/admin/users', verificaToken, verificaMod, async (req, res) => {
    try {
        const users = await db('utenti').select('id_utente', 'email', 'nome_pg', 'permesso');
        res.json(users);
    } catch (error) {
        console.error("Errore recupero utenti:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.put('/api/admin/users/:id', verificaToken, verificaMod, async (req, res) => {
    const { id } = req.params;
    const { email, nome_pg, permesso, password } = req.body;
    
    try {
        const updateUser = { email, nome_pg, permesso };
        if (password) {
            updateUser.password = await bcrypt.hash(password, 10);
        }
        await db('utenti').where('id_utente', id).update(updateUser);
        res.json({ message: "Utente aggiornato con successo." });
    } catch (error) {
        console.error("Errore aggiornamento utente:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.get('/api/admin/chat-rooms', verificaToken, verificaAdmin, async (req, res) => {
    try {
        const rooms = await db('locations').select('id', 'name').where('type', 'CHAT').orderBy('name', 'asc');
        res.json(rooms);
    } catch (error) {
        console.error("Errore recupero chat rooms:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.get('/api/admin/logs', verificaToken, verificaMod, async (req, res) => {
    const { chatId, date } = req.query;
    if (!chatId || !date) return res.status(400).json({ message: "ID della chat e data sono richiesti." });
    
    try {
        const logs = await db('chat_log')
            .where('chat_id', chatId)
            .andWhere(db.raw('date(timestamp) = ?', [date]))
            .orderBy('timestamp', 'asc');
        res.json(logs);
    } catch (error) {
        console.error("Errore recupero log:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

// API GESTIONE LOCATIONS
app.get('/api/admin/locations', verificaToken, verificaAdmin, async (req, res) => {
    try {
        const locations = await db('locations').orderBy(['parent_id', 'name']);
        res.json(locations);
    } catch (error) {
        console.error("Errore recupero locations:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.post('/api/admin/locations', verificaToken, verificaAdmin, async (req, res) => {
    const { parent_id, name, type, image_url, description, pos_x, pos_y, prefecture } = req.body;
    try {
        const [id] = await db('locations').insert({
            parent_id: parent_id || null,
            name,
            type,
            image_url: image_url || null,
            description: description || '',
            pos_x: pos_x || 50,
            pos_y: pos_y || 50,
            master_notes: '',
            prefecture: prefecture || null
        }).returning('id');
        res.status(201).json({ id: (typeof id === 'object') ? id.id : id, ...req.body });
    } catch (error) {
        console.error("Errore inserimento location:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.put('/api/admin/locations/:id', verificaToken, verificaAdmin, async (req, res) => {
    const { name, image_url, description, pos_x, pos_y, prefecture } = req.body;
    try {
        await db('locations').where('id', req.params.id).update({
            name,
            image_url,
            description,
            pos_x,
            pos_y,
            prefecture
        });
        res.json({ message: 'Location aggiornata con successo.' });
    } catch (error) {
        console.error("Errore aggiornamento location:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.delete('/api/admin/locations/:id', verificaToken, verificaAdmin, async (req, res) => {
    try {
        await db('locations').where('id', req.params.id).del();
        res.json({ message: 'Location eliminata con successo.' });
    } catch (error) {
        console.error("Errore eliminazione location:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.put('/api/admin/locations/:id/parent', verificaToken, verificaAdmin, async (req, res) => {
    const { newParentId } = req.body;
    const locationId = req.params.id;

    if (Number(locationId) === Number(newParentId)) {
        return res.status(400).json({ message: "Una location non può essere figlia di se stessa." });
    }

    try {
        await db('locations').where('id', locationId).update({ parent_id: newParentId || null });
        res.json({ message: 'Gerarchia mappa aggiornata con successo.' });
    } catch (error) {
        console.error("Errore nell'aggiornamento del genitore della location:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});


// API GESTIONE QUEST
app.get('/api/quests/trame', verificaToken, verificaMaster, async (req, res) => {
    try {
        const trame = await db('quests')
            .select('id', 'name')
            .where('type', 'TRAMA')
            .whereNull('parent_quest_id');
        res.json(trame);
    } catch (error) {
        console.error("Errore recupero trame:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.post('/api/quests', verificaToken, verificaMaster, async (req, res) => {
    const { name, type, filone_name, parent_quest_id, participants } = req.body;
    const master_id = req.utente.id;

    try {
        const [questIdResult] = await db.transaction(async (trx) => {
            const [newQuestIdResult] = await trx('quests').insert({
                name,
                type,
                master_id,
                filone_name,
                parent_quest_id: parent_quest_id || null
            }).returning('id');

            const newQuestId = (typeof newQuestIdResult === 'object') ? newQuestIdResult.id : newQuestIdResult;

            if (participants && participants.length > 0) {
                const participantRows = participants.map(userId => ({
                    quest_id: newQuestId,
                    user_id: userId
                }));
                await trx('quest_participants').insert(participantRows);
            }
            
            return [newQuestId];
        });
        
        const questId = (typeof questIdResult === 'object') ? questIdResult.id : questIdResult;
        res.status(201).json({ message: 'Quest creata con successo!', questId });

    } catch (error) {
        console.error("Errore creazione quest:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.put('/api/quests/:id/status', verificaToken, verificaMaster, async (req, res) => {
    const { status } = req.body;
    try {
        const updateData = { status };
        if (status === 'CONCLUSA') {
            // db.fn.now() è il modo di Knex per CURRENT_TIMESTAMP
            updateData.end_time = db.fn.now(); 
        }
        await db('quests').where('id', req.params.id).update(updateData);
        res.json({ message: `Stato della quest aggiornato a ${status}` });
    } catch (error) {
        console.error("Errore aggiornamento stato quest:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.get('/api/quests/paused', verificaToken, verificaMaster, async (req, res) => {
    try {
      const pausedQuests = await db('quests')
        .select('id', 'name')
        .where({ master_id: req.utente.id, status: 'PAUSA' });
      res.json(pausedQuests);
    } catch (error) { 
        console.error("Errore recupero quest in pausa:", error);
        res.status(500).json({ message: "Errore recupero quest in pausa." }); 
    }
});


// --- API AGGIUNTA PER RISOLVERE IL BUG ---
app.get('/api/quests/:id', verificaToken, verificaMaster, async (req, res) => {
    try {
        const { id } = req.params;
        const questInfo = await db('quests').where({ id, master_id: req.utente.id }).first();
        
        if (!questInfo) return res.status(404).json({ message: 'Quest non trovata o non autorizzato.' });
        
        const participantsData = await db('quest_participants as qp')
            .join('utenti as u', 'qp.user_id', 'u.id_utente')
            .select('u.id_utente AS id', 'u.nome_pg')
            .where('qp.quest_id', id);
        
        res.json({ 
            questId: questInfo.id, 
            name: questInfo.name, 
            type: questInfo.type, 
            participants: participantsData
        });
    } catch (error) {
        console.error("Errore recupero dettagli quest:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.post('/api/quests/:id/rewards', verificaToken, verificaMaster, async (req, res) => {
    const { questId, questName, rewards } = req.body;
    const masterSignature = `Shinigami (${req.utente.nome_pg})`;

    try {
        await db.transaction(async (trx) => {
            const rewardPromises = rewards.map(reward => {
                if (reward.amount > 0) {
                    return Promise.all([
                        trx('utenti')
                            .where('id_utente', reward.userId)
                            .increment({
                                exp: reward.amount,
                                exp_accumulata: reward.amount
                            }),
                        trx('exp_log').insert({
                            user_id: reward.userId,
                            quest_id: questId,
                            amount: reward.amount,
                            reason: questName,
                            master_signature: masterSignature
                        })
                    ]);
                }
                return Promise.resolve();
            });

            await Promise.all(rewardPromises);
        });

        res.json({ message: "Ricompense assegnate." });

    } catch (error) {
        console.error("Errore assegnazione ricompense:", error);
        res.status(500).json({ message: "Errore interno del server durante l'assegnazione delle ricompense." });
    }
});

// --- API AGGIUNTA PER RISOLVERE IL BUG "CANCELLA" ---
app.delete('/api/quests/:id', verificaToken, verificaMaster, async (req, res) => {
  try {
      const { id } = req.params;
      await db('quests').where({ id, master_id: req.utente.id }).del();
      res.json({ message: 'Quest eliminata con successo.' });
  } catch (error) {
      console.error("Errore nell'eliminazione della quest:", error);
      res.status(500).json({ message: "Errore interno del server." });
  }
});

// API PER IL GIOCO
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
    try {
        const location = await db('locations').where('id', req.params.id).first();
        if (location) res.json(location);
        else res.status(404).json({ message: 'Location non trovata.' });
    } catch (error) {
        console.error("Errore recupero location:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.put('/api/chats/:id/notes', verificaToken, verificaMaster, async (req, res) => {
    try {
        await db('locations')
            .where({ id: req.params.id, type: 'CHAT' })
            .update({ master_notes: req.body.master_notes });
        res.json({ message: 'Note del master aggiornate.' });
    } catch (error) {
        console.error("Errore aggiornamento note chat:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

// =================================================================
// --- BLOCCO API FORUM ---
// =================================================================

// --- API PUBBLICHE (per visualizzare il forum) ---
app.get('/api/forum', verificaToken, async (req, res) => {
    try {
        const { id: userId } = req.utente;

        const sezioni = await db('forum_sezioni').orderBy('ordine', 'asc');

        // Nota: IFNULL è specifico di SQLite. COALESCE è lo standard SQL
        // e funziona sia su SQLite che su PostgreSQL.
        const bacheche = await db('forum_bacheche as b')
            .select([
                'b.*',
                db.raw('(SELECT COUNT(t.id) FROM forum_topics t WHERE t.bacheca_id = b.id) as topic_count'),
                db.raw('(SELECT t.ultimo_post_timestamp FROM forum_topics t WHERE t.bacheca_id = b.id ORDER BY t.ultimo_post_timestamp DESC LIMIT 1) as last_post_timestamp'),
                db.raw('(SELECT u.nome_pg FROM forum_topics t JOIN forum_posts p ON p.topic_id = t.id JOIN utenti u ON u.id_utente = p.autore_id WHERE t.bacheca_id = b.id ORDER BY p.timestamp_creazione DESC LIMIT 1) as last_post_author'),
                db.raw(
      `EXISTS (
        SELECT 1 FROM forum_topics t 
        WHERE t.bacheca_id = b.id AND (t.ultimo_post_timestamp > COALESCE((SELECT r.last_read_timestamp FROM forum_topic_reads r WHERE r.topic_id = t.id AND r.user_id = ?), '1970-01-01'))
    ) as has_new_posts`, 
    [userId]
)
            ])
            .orderBy('b.ordine', 'asc');

        const forumData = sezioni.map(sezione => ({
            ...sezione,
            bacheche: bacheche.filter(bacheca => bacheca.sezione_id === sezione.id)
        }));
        
        res.json(forumData);
    } catch (error) {
        console.error("Errore recupero dati forum:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});


app.get('/api/forum/bacheca/:bachecaId/topics', verificaToken, async (req, res) => {
    try {
        const { bachecaId } = req.params;
        const { id: userId } = req.utente;

        const bacheca = await db('forum_bacheche').where('id', bachecaId).first();
        if (!bacheca) {
            return res.status(404).json({ message: 'Bacheca non trovata.' });
        }

        const topics = await db('forum_topics as t')
            .join('utenti as u', 't.autore_id', 'u.id_utente')
            .select([
                't.*',
                'u.nome_pg as autore_nome',
                db.raw('(SELECT COUNT(p.id) FROM forum_posts p WHERE p.topic_id = t.id) as post_count'),
                db.raw('(SELECT u2.nome_pg FROM forum_posts p2 JOIN utenti u2 ON p2.autore_id = u2.id_utente WHERE p2.topic_id = t.id ORDER BY p2.timestamp_creazione DESC LIMIT 1) as ultimo_post_autore'),
                db.raw(`(t.ultimo_post_timestamp > COALESCE((SELECT r.last_read_timestamp FROM forum_topic_reads r WHERE r.topic_id = t.id AND r.user_id = ?), '1970-01-01 00:00:00')) as has_new_posts`, [userId])
            ])
            .where('t.bacheca_id', bachecaId)
            .orderBy('t.is_pinned', 'desc')
            .orderBy('t.ultimo_post_timestamp', 'desc');

        res.json({ bacheca, topics });
    } catch (error) {
        console.error("Errore recupero topics per bacheca:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.get('/api/forum/topic/:topicId', verificaToken, async (req, res) => {
    try {
        const { topicId } = req.params;
        const { id: userId } = req.utente;

        const topic = await db('forum_topics as t')
            .join('utenti as u', 't.autore_id', 'u.id_utente')
            .select('t.*', 'u.nome_pg as autore_nome')
            .where('t.id', topicId)
            .first();

        if (!topic) {
            return res.status(404).json({ message: 'Discussione non trovata.' });
        }

        const posts = await db('forum_posts as p')
            .join('utenti as u', 'p.autore_id', 'u.id_utente')
            .select(
                'p.*',
                'u.nome_pg as autore_nome',
                'u.permesso as autore_permesso',
                db.raw("COALESCE(u.avatar_chat, '/icone/mini_avatar.png') as autore_avatar_url"),
                db.raw('EXISTS(SELECT 1 FROM forum_post_likes WHERE post_id = p.id AND user_id = ?) as user_has_liked', [userId])
            )
            .where('p.topic_id', topicId)
            .orderBy('p.timestamp_creazione', 'asc');
        
        res.json({ ...topic, posts });
    } catch (error) { 
        console.error("Errore recupero topic:", error);
        res.status(500).json({ message: "Errore interno del server." }); 
    }
});

// --- API AZIONI UTENTE (creare, rispondere, etc.) ---

// Crea una nuova discussione
app.post('/api/forum/topics', verificaToken, async (req, res) => {
    const { bacheca_id, titolo, testo } = req.body;
    const autore_id = req.utente.id;

    if (!bacheca_id || !titolo || !testo) {
        return res.status(400).json({ message: "Bacheca, titolo e testo sono obbligatori." });
    }

    try {
        const [newTopicIdResult] = await db.transaction(async (trx) => {
            const bacheca = await trx('forum_bacheche').where('id', bacheca_id).first('is_locked');
            if (bacheca && bacheca.is_locked) {
                const err = new Error("Questa bacheca è chiusa e non è possibile creare nuove discussioni.");
                err.statusCode = 403;
                throw err;
            }

            const [topicIdResult] = await trx('forum_topics').insert({
                bacheca_id,
                autore_id,
                titolo
            }).returning('id');
            
            const topicId = (typeof topicIdResult === 'object') ? topicIdResult.id : topicIdResult;

            await trx('forum_posts').insert({
                topic_id: topicId,
                autore_id,
                testo
            });
            
            return [topicId];
        });

        const newTopicId = (typeof newTopicIdResult === 'object') ? newTopicIdResult.id : newTopicIdResult;
        res.status(201).json({ message: 'Discussione creata con successo!', topicId: newTopicId });

    } catch (error) {
        console.error("Errore creazione discussione:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Errore durante la creazione della discussione." });
    }
});

// Aggiunge una risposta a una discussione
app.post('/api/forum/posts', verificaToken, async (req, res) => {
    const { topic_id, testo } = req.body;
    const autore_id = req.utente.id;

    if (!topic_id || !testo) {
        return res.status(400).json({ message: "ID della discussione e testo sono obbligatori." });
    }

    try {
        await db.transaction(async (trx) => {
            const topic = await trx('forum_topics').where('id', topic_id).first('is_locked');
            
            if (!topic) {
                const err = new Error("Discussione non trovata.");
                err.statusCode = 404;
                throw err;
            }
            if (topic.is_locked) {
                const err = new Error("Questa discussione è chiusa e non accetta nuove risposte.");
                err.statusCode = 403;
                throw err;
            }

            await trx('forum_posts').insert({
                topic_id,
                autore_id,
                testo
            });

            await trx('forum_topics')
                .where('id', topic_id)
                .update({ ultimo_post_timestamp: db.fn.now() });
        });

        res.status(201).json({ message: 'Risposta inviata con successo!' });

    } catch (error) {
        console.error("Errore invio risposta:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Errore durante l'invio della risposta." });
    }
});

// Mette o toglie un "like" a un post
app.post('/api/forum/posts/:id/like', verificaToken, async (req, res) => {
    const { id: postId } = req.params;
    const { id: userId } = req.utente;

    try {
        const { liked, newLikeCount } = await db.transaction(async (trx) => {
            const existingLike = await trx('forum_post_likes')
                .where({ post_id: postId, user_id: userId })
                .first();

            let currentLikedState;

            if (existingLike) {
                // UNLIKE
                await trx('forum_post_likes')
                    .where({ post_id: postId, user_id: userId })
                    .del();
                
                await trx('forum_posts')
                    .where('id', postId)
                    .decrement('like_count', 1);
                
                currentLikedState = false;
            } else {
                // LIKE
                await trx('forum_post_likes').insert({
                    post_id: postId,
                    user_id: userId
                });

                await trx('forum_posts')
                    .where('id', postId)
                    .increment('like_count', 1);

                currentLikedState = true;
            }

            const { like_count } = await trx('forum_posts').where('id', postId).first('like_count');
            
            return { liked: currentLikedState, newLikeCount: like_count };
        });

        res.json({ liked, newLikeCount });

    } catch (error) {
        console.error("Errore operazione like:", error);
        res.status(500).json({ message: "Errore durante l'operazione di 'like'." });
    }
});

// API per segnare una singola discussione come letta (quando l'utente la visita)
app.post('/api/forum/topics/:topicId/mark-as-read', verificaToken, async (req, res) => {
    try {
        const { topicId } = req.params;
        const { id: userId } = req.utente;

        // onConflict().merge() è un "upsert": inserisce o aggiorna.
        await db('forum_topic_reads')
            .insert({
                user_id: userId,
                topic_id: topicId,
                last_read_timestamp: db.fn.now()
            })
            .onConflict(['user_id', 'topic_id'])
            .merge();

        res.status(200).json({ message: 'Discussione segnata come letta.' });
    } catch (error) {
        console.error("Errore nel segnare la discussione come letta:", error);
        res.status(500).json({ message: "Errore nel segnare la discussione come letta." });
    }
});

// API per segnare TUTTE le discussioni del forum come lette
app.post('/api/forum/mark-all-as-read', verificaToken, async (req, res) => {
    const { id: userId } = req.utente;

    try {
        const topics = await db('forum_topics').select('id');
        if (topics.length === 0) {
            return res.status(200).json({ message: 'Nessuna discussione da segnare.' });
        }

        const upserts = topics.map(topic => ({
            user_id: userId,
            topic_id: topic.id,
            last_read_timestamp: db.fn.now()
        }));

        await db('forum_topic_reads')
            .insert(upserts)
            .onConflict(['user_id', 'topic_id'])
            .merge();

        res.status(200).json({ message: 'Tutte le discussioni sono state segnate come lette.' });

    } catch (error) {
        console.error("Errore nel segnare tutto come letto:", error);
        res.status(500).json({ message: "Errore nel segnare tutto come letto." });
    }
});

// =================================================================
// --- BLOCCO API BANCA ---
// =================================================================

// [ADMIN/MASTER] Assegna Rem a un giocatore
app.post('/api/admin/grant-rem', verificaToken, verificaMaster, async (req, res) => {
    const { receiverName, amount, reason } = req.body;
    const masterName = req.utente.nome_pg;

    if (!receiverName || !amount || !reason || amount <= 0) {
        return res.status(400).json({ message: "Dati mancanti o importo non valido." });
    }

    try {
        await db.transaction(async (trx) => {
            const receiver = await trx('utenti').where(db.raw('LOWER(nome_pg) = LOWER(?)', [receiverName])).first('id_utente');
            
            if (!receiver) {
                const err = new Error("Giocatore non trovato.");
                err.statusCode = 404;
                throw err;
            }

            await trx('utenti')
                .where('id_utente', receiver.id_utente)
                .increment('rem', amount);

            await trx('transactions').insert({
                receiver_id: receiver.id_utente,
                amount,
                reason: `${reason} (da: ${masterName})`
            });
        });

        res.json({ message: `${amount} Rem inviati a ${receiverName} con successo.` });

    } catch (error) {
        console.error("Errore assegnazione Rem:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Errore interno del server." });
    }
});

// [PLAYER] Trasferisce Rem a un altro giocatore
app.post('/api/bank/transfer', verificaToken, async (req, res) => {
    const { receiverName, amount, reason } = req.body;
    const senderId = req.utente.id;

    if (!receiverName || !amount || !reason || amount <= 0) {
        return res.status(400).json({ message: "Dati mancanti o importo non valido." });
    }

    try {
        await db.transaction(async (trx) => {
            const sender = await trx('utenti').where('id_utente', senderId).first('rem');
            if (sender.rem < amount) {
                const err = new Error("Fondi insufficienti.");
                err.statusCode = 400;
                throw err;
            }

            const receiver = await trx('utenti')
                .where(db.raw('LOWER(nome_pg) = LOWER(?)', [receiverName]))
                .whereNot('id_utente', senderId)
                .first('id_utente');

            if (!receiver) {
                const err = new Error("Giocatore destinatario non trovato.");
                err.statusCode = 404;
                throw err;
            }

            // Esegui il trasferimento
            await trx('utenti').where('id_utente', senderId).decrement('rem', amount);
            await trx('utenti').where('id_utente', receiver.id_utente).increment('rem', amount);

            // Registra la transazione
            await trx('transactions').insert({
                sender_id: senderId,
                receiver_id: receiver.id_utente,
                amount,
                reason
            });
        });

        res.json({ message: "Trasferimento completato." });

    } catch (error) {
        console.error("Errore durante il trasferimento di Rem:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Errore interno del server durante il trasferimento." });
    }
});

// [PLAYER] Recupera lo storico delle transazioni
app.get('/api/bank/history', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    try {
        const history = await db('transactions as t')
            .leftJoin('utenti as sender', 't.sender_id', 'sender.id_utente')
            .join('utenti as receiver', 't.receiver_id', 'receiver.id_utente')
            .select(
                't.id',
                't.amount',
                't.reason',
                't.timestamp',
                't.sender_id',
                'sender.nome_pg as sender_name',
                'receiver.nome_pg as receiver_name'
            )
            .where('t.sender_id', userId)
            .orWhere('t.receiver_id', userId)
            .orderBy('t.timestamp', 'desc')
            .limit(50);

        res.json(history);
    } catch (error) {
        console.error("Errore nel recupero dello storico transazioni:", error);
        res.status(500).json({ message: "Errore nel recupero dello storico." });
    }
});

// [PLAYER] Imposta il lavoro del giocatore
app.post('/api/bank/set-job', verificaToken, async (req, res) => {
    const { jobName } = req.body;
    const userId = req.utente.id;

    if (!jobName) {
        return res.status(400).json({ message: "Nome del lavoro non specificato." });
    }

    try {
        const utente = await db('utenti').where('id_utente', userId).first('job');
        
        if (utente.job) {
            return res.status(400).json({ message: "Hai già un lavoro." });
        }

        await db('utenti').where('id_utente', userId).update({ job: jobName });
        
        res.json({ message: `Hai scelto il lavoro: ${jobName}.` });
    } catch (error) {
        console.error("Errore durante la scelta del lavoro:", error);
        res.status(500).json({ message: "Errore durante la scelta del lavoro." });
    }
});

// [PLAYER] Ritira la paga giornaliera
app.post('/api/bank/collect-salary', verificaToken, async (req, res) => {
    const userId = req.utente.id;
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const salary = 90;

    try {
        const { newBalance } = await db.transaction(async (trx) => {
            const utente = await trx('utenti').where('id_utente', userId).first('job', 'last_salary_collection');

            if (!utente.job) {
                const err = new Error("Devi prima scegliere un lavoro.");
                err.statusCode = 400;
                throw err;
            }
            if (utente.last_salary_collection === today) {
                const err = new Error("Hai già ritirato la paga oggi. Riprova domani.");
                err.statusCode = 400;
                throw err;
            }

            await trx('utenti')
                .where('id_utente', userId)
                .update({
                    rem: db.raw('rem + ?', [salary]), // Usa db.raw per operazioni matematiche
                    last_salary_collection: today
                });

            await trx('transactions').insert({
                receiver_id: userId,
                amount: salary,
                reason: `Paga giornaliera: ${utente.job}`
            });
            
            const updatedUser = await trx('utenti').where('id_utente', userId).first('rem');
            return { newBalance: updatedUser.rem };
        });

        res.json({ message: `Hai ricevuto ${salary} Rem per il tuo lavoro.`, newBalance });

    } catch (error) {
        console.error("Errore durante il ritiro della paga:", error);
        res.status(error.statusCode || 500).json({ message: error.message || "Errore durante il ritiro della paga." });
}
});

//FINE API BANCA

// --- API GESTIONE FORUM (SOLO ADMIN) ---

// Gestione Sezioni
app.get('/api/admin/forum/sezioni', verificaToken, verificaMod, async (req, res) => {
    try {
        const sezioni = await db('forum_sezioni').orderBy(['ordine', 'nome']);
        res.json(sezioni);
    } catch (error) { 
        console.error("Errore recupero sezioni forum:", error);
        res.status(500).json({ message: "Errore interno." }); 
    }
});
app.post('/api/admin/forum/sezioni', verificaToken, verificaMod, async (req, res) => {
    try {
        const { nome, descrizione, ordine } = req.body;
        if (!nome) return res.status(400).json({ message: "Il nome è obbligatorio." });
        
        const [id] = await db('forum_sezioni').insert({ 
            nome, 
            descrizione: descrizione || null, 
            ordine: ordine || 0 
        }).returning('id');

        const newId = (typeof id === 'object') ? id.id : id;
        res.status(201).json({ id: newId, ...req.body });
    } catch (error) { 
        console.error("Errore creazione sezione forum:", error);
        res.status(500).json({ message: 'Errore interno.' }); 
    }
});
app.put('/api/admin/forum/sezioni/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descrizione, ordine } = req.body;
        if (!nome) return res.status(400).json({ message: "Il nome è obbligatorio." });
        
        await db('forum_sezioni').where({ id }).update({ nome, descrizione, ordine });
        res.json({ message: 'Sezione aggiornata.' });
    } catch (error) { 
        console.error("Errore aggiornamento sezione forum:", error);
        res.status(500).json({ message: 'Errore interno.' }); 
    }
});
app.delete('/api/admin/forum/sezioni/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        await db('forum_sezioni').where('id', req.params.id).del();
        res.json({ message: 'Sezione eliminata.' });
    } catch (error) { 
        console.error("Errore eliminazione sezione forum:", error);
        res.status(500).json({ message: "Errore interno." }); 
    }
});

// Gestione Bacheche
app.get('/api/admin/forum/bacheche', verificaToken, verificaMod, async (req, res) => {
    try {
        const bacheche = await db('forum_bacheche as b')
            .join('forum_sezioni as s', 'b.sezione_id', 's.id')
            .select('b.*', 's.nome as sezione_nome')
            .orderBy(['s.ordine', 'b.ordine']);
        res.json(bacheche);
    } catch (error) { 
        console.error("Errore recupero bacheche:", error);
        res.status(500).json({ message: "Errore interno." }); 
    }
});
app.post('/api/admin/forum/bacheche', verificaToken, verificaMod, async (req, res) => {
    try {
        const { sezione_id, nome, descrizione, ordine } = req.body;
        if (!sezione_id || !nome) return res.status(400).json({ message: "Sezione e nome sono obbligatori."});
        
        const [id] = await db('forum_bacheche').insert({ 
            sezione_id, 
            nome, 
            descrizione, 
            ordine: ordine || 0 
        }).returning('id');

        const newId = (typeof id === 'object') ? id.id : id;
        res.status(201).json({ id: newId, ...req.body });
    } catch (error) { 
        console.error("Errore creazione bacheca:", error);
        res.status(500).json({ message: "Errore interno." }); 
    }
});
app.put('/api/admin/forum/bacheche/:id', verificaToken, verificaMod , async (req, res) => {
    try {
        const { id } = req.params;
        const { sezione_id, nome, descrizione, ordine } = req.body;
        if (!sezione_id || !nome) return res.status(400).json({ message: "Sezione e nome sono obbligatori."});
        
        await db('forum_bacheche').where({ id }).update({ sezione_id, nome, descrizione, ordine });
        res.json({ message: 'Bacheca aggiornata.' });
    } catch (error) { 
        console.error("Errore aggiornamento bacheca:", error);
        res.status(500).json({ message: "Errore interno." }); 
    }
});
app.delete('/api/admin/forum/bacheche/:id', verificaToken, verificaMod , async (req, res) => {
    try {
        await db('forum_bacheche').where('id', req.params.id).del();
        res.json({ message: 'Bacheca eliminata.' });
    } catch (error) { 
        console.error("Errore eliminazione bacheca:", error);
        res.status(500).json({ message: "Errore interno." }); 
    }
});
app.put('/api/admin/forum/bacheche/:id/lock', verificaToken, verificaMod , async (req, res) => {
    try {
        const { id } = req.params;
        const { is_locked } = req.body;
        await db('forum_bacheche').where({ id }).update({ is_locked: is_locked ? 1 : 0 });
        res.json({ message: `Bacheca ${is_locked ? 'bloccata' : 'sbloccata'}.` });
    } catch (error) { 
        console.error("Errore blocco bacheca:", error);
        res.status(500).json({ message: "Errore durante l'operazione di blocco." }); 
    }
});

// Gestione Discussioni
// lock
app.put('/api/admin/forum/topics/:id/lock', verificaToken, verificaMod , async (req, res) => {
    try {
        const { id } = req.params;
        const { is_locked } = req.body;
        await db('forum_topics').where({ id }).update({ is_locked: is_locked ? 1 : 0 });
        res.json({ message: `Discussione ${is_locked ? 'bloccata' : 'sbloccata'}.` });
    } catch (error) { 
        console.error("Errore blocco discussione:", error);
        res.status(500).json({ message: "Errore durante l'operazione di blocco." }); 
    }
});
//cancella discussione
app.delete('/api/admin/forum/topics/:id', verificaToken, verificaMod , async (req, res) => {
    try {
        const { id } = req.params;
        await db('forum_topics').where({ id }).del();
        res.json({ message: 'Discussione eliminata con successo.' });
    } catch (error) {
        console.error("Errore eliminazione discussione:", error);
        res.status(500).json({ message: "Errore durante l'eliminazione della discussione." });
    }
});

// pin
app.put('/api/admin/forum/topics/:id/pin', verificaToken, verificaMod , async (req, res) => {
    try {
        const { id } = req.params;
        const { is_pinned } = req.body;
        await db('forum_topics').where({ id }).update({ is_pinned: is_pinned ? 1 : 0 });
        res.json({ message: `Discussione ${is_pinned ? 'fissata' : 'sbloccata'} con successo.` });
    } catch (error) {
        console.error("Errore durante l'operazione di pin:", error);
        res.status(500).json({ message: "Errore durante l'operazione di pin." });
    }
});
// cancella post
app.delete('/api/admin/forum/posts/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        const { id } = req.params;

        const post = await db('forum_posts').where({ id }).first();
        if (!post) {
            return res.status(404).json({ message: "Post non trovato." });
        }

        await db('forum_posts').where({ id }).del();
        res.json({ message: 'Post eliminato con successo.' });

    } catch (error) {
        console.error("Errore durante l'eliminazione del post:", error);
        res.status(500).json({ message: "Errore durante l'eliminazione del post." });
    }
});

// =================================================================
// --- FINE BLOCCO API FORUM ---
// =================================================================



//  =================================
//  --- API PER VISORI (NEWS)
//  =================================
app.get('/api/forum/bacheca/:bachecaId/latest-topics', verificaToken, async (req, res) => {
    try {
        const { bachecaId } = req.params;
        
        // SUBSTR è SQLite, SUBSTRING è SQL standard (PostgreSQL)
        // Usiamo un db.raw per gestire la compatibilità
        const anteprimaRaw = (environment === 'development') 
            ? "SUBSTR(p.testo, 1, 120) || ' ...' as anteprima"
            : "SUBSTRING(p.testo, 1, 120) || ' ...' as anteprima";

        const topics = await db('forum_topics as t')
            .join('forum_posts as p', 'p.topic_id', 't.id')
            .select(
                't.titolo',
                db.raw(anteprimaRaw),
                't.timestamp_creazione'
            )
            .where('t.bacheca_id', bachecaId)
            .andWhere('p.id', function() {
                // Sotto-query per prendere solo il primo post del topic
                this.from('forum_posts').min('id').whereRaw('topic_id = t.id');
            })
            .orderBy('t.ultimo_post_timestamp', 'desc')
            .limit(5);

        res.json(topics);
    } catch (error) {
        console.error("Errore recupero latest topics:", error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
});
// --- FINE VISORE NEWS - HOT TOPIC

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
        // [TRADOTTO] db.get -> db.first
        const userData = await db('utenti')
            .select('nome_pg', 'permesso', 'avatar_chat')
            .where('id_utente', socket.utente.id)
            .first();
        
        if (!userData) {
            console.log(`AVVISO: L'utente con ID ${socket.utente.id} dal token non è stato trovato nel DB. Disconnessione forzata.`);
            return socket.disconnect();
        }
        
        const userProfile = {
            id: socket.utente.id,
            nome_pg: userData.nome_pg,
            permesso: userData.permesso,
            avatar_chat: userData.avatar_chat || '/icone/mini_avatar.png'
        };

        console.log(`✅ Utente AUTENTICATO connesso: ${userProfile.nome_pg}`);
        onlineUsers[socket.id] = userProfile;
        userSockets.set(userProfile.id, socket.id); 
        io.emit('update_online_list', Object.values(onlineUsers));
        
        const updateRoomUsers = async (chatId) => {
            const socketsInRoom = await io.in(chatId).fetchSockets();
            const usersInRoom = socketsInRoom.map(s => onlineUsers[s.id]);
            io.to(chatId).emit('room_users_update', usersInRoom);
        };

        socket.on('join_chat', (chatId) => { socket.join(chatId); updateRoomUsers(chatId); });
        socket.on('leave_chat', (chatId) => { socket.leave(chatId); updateRoomUsers(chatId); });

        socket.on('send_message', async (data) => {
            const messageData = { 
                ...data, 
                autore: userProfile.nome_pg, 
                permesso: userProfile.permesso,
                avatar_url: userProfile.avatar_chat 
            };

        if (messageData.tipo === 'azione') {
            const userId = socket.utente.id;
            const textLength = messageData.testo.length;
            const expGained = Math.floor(textLength / 500) * 2;
            if (expGained > 0) {
                try {
                    // [TRADOTTO] db.get -> db.first
                    const userExpData = await db('utenti')
                        .select('daily_exp_earned', 'last_exp_date')
                        .where('id_utente', userId)
                        .first();
                        
                    const today = new Date().toISOString().split('T')[0];
                    let dailyExp = userExpData.daily_exp_earned || 0;
                    if (userExpData.last_exp_date !== today) { dailyExp = 0; }
                    const maxExpToday = 100 - dailyExp;
                    const expToAward = Math.min(expGained, maxExpToday);
                    if (expToAward > 0) {
                        // [TRADOTTO] db.run -> db.update
                        await db('utenti')
                            .where('id_utente', userId)
                            .update({
                                exp: db.raw('exp + ?', [expToAward]),
                                exp_accumulata: db.raw('exp_accumulata + ?', [expToAward]),
                                daily_exp_earned: dailyExp + expToAward,
                                last_exp_date: today
                            });
                        console.log(`✨ ${socket.utente.nome_pg} ha guadagnato ${expToAward} EXP!`);
                    }
                } catch (expError) { console.error("Errore nell'assegnazione dell'EXP:", expError); }
            }
        }
        // [TRADOTTO] db.run -> db.insert
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
        } catch (dbError) { console.error("Errore nel salvataggio del messaggio:", dbError); }
            
        switch (messageData.tipo) {
                case 'globale': if (userProfile.permesso === 'ADMIN') io.emit('new_message', messageData); break;
                default: io.to(messageData.chatId).emit('new_message', messageData); break;
            }
        });

    socket.on('roll_dice', async (data) => {
        const { chatId, diceType } = data;
        if (!chatId || !diceType) return;
        const result = Math.floor(Math.random() * diceType) + 1;
        const diceText = `lancia un D${diceType} e ottiene: ${result}`;
        const messageData = { chatId, autore: socket.utente.nome_pg, permesso: socket.utente.permesso, testo: diceText, tipo: 'dado' };
        
        try {
            // [TRADOTTO] db.run -> db.insert
            await db('chat_log').insert({
                chat_id: messageData.chatId,
                autore: messageData.autore,
                permesso: messageData.permesso,
                testo: messageData.testo,
                tipo: messageData.tipo
            });
        } catch (dbError) { console.error("Errore nel salvataggio del lancio di dado:", dbError); }
        io.to(chatId).emit('new_message', messageData);
    });

socket.on('send_private_message', async ({ receiverId, text }) => {
    const senderId = socket.utente.id;
    if (!receiverId || !text) return;

    try {
        // [TRADOTTO] db.run -> db.insert
        const [messageIdResult] = await db('private_messages')
            .insert({
            sender_id: senderId,
            receiver_id: receiverId,
            text: text
        }).returning('id');

        const messageId = (typeof messageIdResult === 'object') ? messageIdResult.id : messageIdResult;

        // [TRADOTTO] db.get -> db.first
        const message = await db('private_messages').where('id', messageId).first();

        // [TRADOTTO] db.get -> db.first
        const senderData = await db('utenti')
            .select('nome_pg', 'avatar_chat')
            .where('id_utente', senderId)
            .first();
            
        const messagePayload = { ...message, sender_name: senderData.nome_pg, sender_avatar: senderData.avatar_chat };

        const receiverSocketId = userSockets.get(Number(receiverId));
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_private_message', messagePayload);
        }

        socket.emit('private_message_sent', messagePayload);

    } catch (error) {
        console.error("Errore invio messaggio privato:", error);
    }
});

   socket.on('disconnect', () => {
        if (userProfile && userProfile.nome_pg) {
            console.log(`❌ Utente ${userProfile.nome_pg} si è disconnesso.`);
            userSockets.delete(userProfile.id);
            delete onlineUsers[socket.id];
            io.emit('update_online_list', Object.values(onlineUsers));
        } else {
            console.log("❌ Un utente sconosciuto si è disconnesso (probabile errore in connessione).");
        }
    });

    } catch(e) {
        console.error("Errore critico durante la connessione del socket:", e);
        socket.disconnect();
    }
});



// --- API PER LA MUSICA ---

// Recupera tutte le playlist
app.get('/api/playlists', verificaToken, async (req, res) => {
    try {
        // [TRADOTTO] db.all -> db.select
        const playlists = await db('playlists').select('*').orderBy('name', 'asc');
        res.json(playlists);
    } catch (e) { 
        console.error("Errore recupero playlist:", e);
        res.status(500).json({ message: "Errore recupero playlist."}); 
    }
});

// Recupera le canzoni di una playlist
app.get('/api/playlists/:id/songs', verificaToken, async (req, res) => {
    try {
        // [TRADOTTO] db.all -> db.select
        const songs = await db('songs')
            .select('*')
            .where('playlist_id', req.params.id)
            .orderBy('id', 'asc');
        res.json(songs);
    } catch (e) { 
        console.error("Errore recupero canzoni:", e);
        res.status(500).json({ message: "Errore recupero canzoni."}); 
    }
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


// API per la gestione della musica (ADMIN)
app.post('/api/admin/playlists', verificaToken, verificaMod, async (req, res) => {
    const { name } = req.body;
    try {
        // [TRADOTTO] db.run -> db.insert
        const [id] = await db('playlists').insert({ name }).returning('id');
        const newId = (typeof id === 'object') ? id.id : id;
        res.status(201).json({ id: newId });
    } catch (error) {
        console.error("Errore creazione playlist:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

app.post('/api/admin/songs', verificaToken, verificaMod, async (req, res) => {
    const { playlist_id, title, source_type, url, cover_image_url } = req.body;
    try {
        // [TRADOTTO] db.run -> db.insert
        const [id] = await db('songs').insert({ 
            playlist_id, 
            title, 
            source_type, 
            url, 
            cover_image_url 
        }).returning('id');
        const newId = (typeof id === 'object') ? id.id : id;
        res.status(201).json({ id: newId });
    } catch (error) {
        console.error("Errore creazione canzone:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

// --- MODIFICARE UNA CANZONE ---
app.put('/api/admin/songs/:id', verificaToken, verificaMod, async (req, res) => {
    const { playlist_id, title, source_type, url, cover_image_url } = req.body;
    try {
        // [TRADOTTO] db.run -> db.update
        await db('songs')
            .where('id', req.params.id)
            .update({
                playlist_id, 
                title, 
                source_type, 
                url, 
                cover_image_url
            });
        res.json({ message: 'Canzone aggiornata con successo' });
    } catch (error) {
        console.error("Errore nell'aggiornamento della canzone:", error);
        res.status(500).json({ message: 'Errore interno del server' });
    }
});

app.delete('/api/admin/songs/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        // [TRADOTTO] db.run -> db.del
        await db('songs').where('id', req.params.id).del();
        res.json({ message: 'Canzone eliminata' });
    } catch (error) {
        console.error("Errore eliminazione canzone:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

//FINE API MUSICA


// API PER EVENTI MONDANI

// --- API GESTIONE EVENTI GIORNALIERI (ADMIN) ---
app.get('/api/admin/daily-events', verificaToken, verificaMod, async (req, res) => {
    try {
        // [TRADOTTO] db.all -> db.select
        const events = await db('daily_events').select('*').orderBy('event_date', 'desc');
        res.json(events);
    } catch (error) {
        console.error("Errore recupero eventi giornalieri (admin):", error);
        res.status(500).json({ message: "Errore nel recupero degli eventi giornalieri." });
    }
});

app.post('/api/admin/daily-events', verificaToken, verificaMod, async (req, res) => {
    try {
        const { event_date, title, description } = req.body;
        if (!event_date || !title || !description) {
            return res.status(400).json({ message: "Data, titolo e descrizione sono obbligatori." });
        }
        // [TRADOTTO] db.run -> db.insert
        const [id] = await db('daily_events').insert({ event_date, title, description }).returning('id');
        const newId = (typeof id === 'object') ? id.id : id;
        res.status(201).json({ id: newId, ...req.body });
    } catch (error) {
        if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Esiste già un evento per questa data.' });
        }
        console.error("Errore creazione evento giornaliero:", error);
        res.status(500).json({ message: "Errore nella creazione dell'evento giornaliero." });
    }
});

app.put('/api/admin/daily-events/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        const { event_date, title, description } = req.body;
        // [TRADOTTO] db.run -> db.update
        await db('daily_events').where('id', req.params.id).update({ event_date, title, description });
        res.json({ message: 'Evento giornaliero aggiornato.' });
    } catch (error) {
        if (error.code === '23505' || error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ message: 'Esiste già un evento per questa data.' });
        }
        console.error("Errore aggiornamento evento giornaliero:", error);
        res.status(500).json({ message: "Errore nell'aggiornamento dell'evento giornaliero." });
    }
});

app.delete('/api/admin/daily-events/:id', verificaToken, verificaMod, async (req, res) => {
    try {
        // [TRADOTTO] db.run -> db.del
        await db('daily_events').where('id', req.params.id).del();
        res.json({ message: 'Evento giornaliero eliminato.' });
    } catch (error) {
        console.error("Errore eliminazione evento giornaliero:", error);
        res.status(500).json({ message: "Errore nell'eliminazione dell'evento giornaliero." });
    }
});

// --- API PUBBLICA PER OTTENERE L'EVENTO DI OGGI ---
app.get('/api/daily-event', verificaToken, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
        // [TRADOTTO] db.get -> db.first
        const event = await db('daily_events').select('title', 'description').where('event_date', today).first();
        res.json(event || null);
    } catch (error) {
        console.error("Errore recupero evento giornaliero di oggi:", error);
        res.status(500).json({ message: "Errore nel recupero dell'evento giornaliero." });
    }
});

// =================================================================
// --- BLOCCO API MESSAGGISTICA PRIVATA (VERSIONE FIX POSTGRESQL) ---
// =================================================================

// Prende la lista di tutte le conversazioni dell'utente
app.get('/api/pm/conversations', verificaToken, async (req, res) => {
    try {
        const myId = req.utente.id;

        // 1️⃣ Subquery per ottenere gli ID partner in modo compatibile con PostgreSQL
        const partnerIds = await db
            .from(function () {
                this.select(
                    db.raw(`
                        CASE 
                            WHEN sender_id = ? THEN receiver_id
                            ELSE sender_id
                        END AS partner_id
                    `, [myId])
                )
                .from('private_messages')
                .where('sender_id', myId)
                .orWhere('receiver_id', myId)
                .as('sub_pm');
            })
            .distinct()
            .pluck('partner_id');

        // Nessuna conversazione → restituisci array vuoto
        if (partnerIds.length === 0) {
            return res.json([]);
        }

        // 2️⃣ Recupera i dati delle conversazioni
        const conversations = await db('utenti as u')
            .select([
                'u.id_utente',
                'u.nome_pg',
                'u.avatar_chat',

                // ultimo messaggio
                db.raw(`
                    (SELECT text 
                     FROM private_messages 
                     WHERE (sender_id = u.id_utente AND receiver_id = ?) 
                        OR (sender_id = ? AND receiver_id = u.id_utente)
                     ORDER BY timestamp DESC 
                     LIMIT 1
                    ) AS last_message
                `, [myId, myId]),

                // timestamp ultimo messaggio
                db.raw(`
                    (SELECT timestamp 
                     FROM private_messages 
                     WHERE (sender_id = u.id_utente AND receiver_id = ?) 
                        OR (sender_id = ? AND receiver_id = u.id_utente)
                     ORDER BY timestamp DESC 
                     LIMIT 1
                    ) AS last_message_timestamp
                `, [myId, myId]),

                // conteggio non letti
                db.raw(`
                    (SELECT COUNT(*) 
                     FROM private_messages 
                     WHERE sender_id = u.id_utente 
                       AND receiver_id = ? 
                       AND is_read = 0
                    ) AS unread_count
                `, [myId])
            ])
            .whereIn('u.id_utente', partnerIds)
            .orderBy(db.raw('last_message_timestamp'), 'desc');

        res.json(conversations);

    } catch (error) {
        console.error("ERRORE CRITICO RECUPERO CONVERSAZIONI (PM):", error);
        res.status(500).json({ message: "Errore interno del server durante il recupero dei PM." });
    }
});

// -----------------------------------------------------------------
// Prende la cronologia completa di una conversazione + segna letti
// -----------------------------------------------------------------
app.get('/api/pm/conversation/:userId', verificaToken, async (req, res) => {
    const myId = req.utente.id;
    const otherUserId = req.params.userId;

    try {
        const messages = await db.transaction(async (trx) => {

            // 1️⃣ Recupera messaggi in ordine cronologico
            const msgs = await trx('private_messages as pm')
                .join('utenti as s', 'pm.sender_id', 's.id_utente')
                .select(
                    'pm.*',
                    's.nome_pg as sender_name',
                    's.avatar_chat as sender_avatar'
                )
                .where(function () {
                    this.where({
                        'pm.sender_id': myId,
                        'pm.receiver_id': otherUserId
                    }).orWhere({
                        'pm.sender_id': otherUserId,
                        'pm.receiver_id': myId
                    });
                })
                .orderBy('pm.timestamp', 'asc');

            // 2️⃣ Segna messaggi come letti
            await trx('private_messages')
                .where({
                    sender_id: otherUserId,
                    receiver_id: myId,
                    is_read: 0
                })
                .update({ is_read: 1 });

            return msgs;
        });

        res.json(messages);

    } catch (error) {
        console.error("Errore recupero messaggi privati:", error);
        res.status(500).json({ message: "Errore interno del server." });
    }
});

// =================================================================
// --- FINE API MESSAGGISTICA PRIVATA ---
// =================================================================



// --- 5. AVVIO DELL'APPLICAZIONE ---
// Rimuoviamo la vecchia funzione 'avviaApplicazione'.
// Knex gestisce la connessione al DB al primo utilizzo.
// Le tabelle devono essere create tramite i file di migrazione Knex.

(async () => {
    try {
        if (environment === 'development') {
            console.log("Controllo connessione DB in sviluppo...");
            await db.raw('PRAGMA foreign_keys = ON');
            await db.raw('PRAGMA journal_mode = WAL;');
            console.log("PRAGMA SQLite impostati.");
        }
        
        // Test di connessione
        await db.raw('SELECT 1+1 as result');
        console.log(`✅ Connessione al database (${environment}) riuscita.`);

        // Avvio del server
        httpServer.listen(port, () => {
            console.log(`🚀 Server avviato su http://localhost:${port} in modalità ${environment}`);
        });

    } catch (errore) {
        console.error("ERRORE CRITICO AVVIO SERVER:", errore);
        process.exit(1); // Esce se non può connettersi al DB
    }
})();
