## IMPORTANTE PER GEMINI AGENT!
Non provare a lanciare comandi nel bash, quando hai necessità che sia fatto basta indicarmelo.

### **Oyasumi - Technical Context Summary**

Questo documento riassume l'architettura tecnica, le feature implementate e lo stato attuale del progetto "Oyasumi".

#### **1. Tech Stack**

* **Backend:**
    * **Framework:** Node.js con Express.js.
    * **Database ORM:** Knex.js (PostgreSQL in produzione, SQLite in sviluppo).
    * **Real-time:** Socket.IO per la comunicazione WebSocket.
    * **Autenticazione:** JWT + `bcryptjs`.
    * **Altro:** `nodemailer`, `cors`, `ytdl-core` (streaming audio).

* **Frontend:**
    * **Framework:** React 18 + Vite.
    * **Routing:** React Router (`react-router-dom`).
    * **Real-time Client:** Socket.IO Client.
    * **State Management:** Context API (`SocketContext`, `MessagingProvider`).
    * **Styling:** CSS-in-JS (oggetti `styles`), FontAwesome.

#### **2. Architettura Database**

Schema aggiornato con le ultime migrazioni (Housing & Economy):

* **`utenti`**: Dati utente e personaggio.
    * *Campi base:* `id_utente`, `email`, `password`, `nome_pg`, `permesso` (USER, MOD, ADMIN, MASTER).
    * *Stats:* `hp`, `mp`, `exp`, `livello`, attributi fisici/mentali.
    * *Economia/Lavoro:* `rem` (valuta), `job` (nome lavoro), `last_salary_collection` (timestamp), `job_started_at`.
    * *Housing:* `housing_id` (FK), `house_chat_id` (stringa univoca per socket), `rent_due_date`, `house_custom_image`, `house_custom_desc`.
* **`locations`**: Mappe gerarchiche (`MAP`) e nodi chat (`CHAT`).
* **`chat_log`**: Storico messaggi pubblici e di gioco.
* **`private_messages`**: Messaggistica privata.
* **`housing_types`**: Listino immobili (Container, Monolocale, Villa, etc.) con costi (`cost_rem`), tipo pagamento (`MONTHLY`, `DAILY_SALARY`) e bonus (`bonus_hp`, `bonus_slots`).
* **`housing_guests`**: Tabella di associazione per le chiavi di casa (`housing_id`, `owner_id`, `guest_id`).
* **`user_sanctions`**: Log delle punizioni staff (`user_id`, `admin_name`, `type` [FULL/SHADOW], `days`, `reason`).
* **`inventario`** & **`oggetti`**: Sistema di gestione item (inclusa logica di furto nelle case).
* **Forum Tables**: `forum_sezioni`, `forum_bacheche`, `forum_topics`, `forum_posts`, `forum_post_likes`, `forum_topic_reads`.
* **`quests`** & **`transactions`**: Gestione missioni ed economia.

#### **3. Feature Chiave Implementate**

* **Sistema Abitativo (Housing System) [COMPLETO]:**
    * **Mercato Immobiliare:** UI per affittare/acquistare case (`HousingMarket.jsx`). Gestisce requisiti economici e contratti.
    * **Gestione Casa:** Tab dedicato nella Scheda Personaggio. Il proprietario può personalizzare immagine/descrizione, pagare l'affitto e gestire gli ospiti.
    * **Chiavi & Ospiti:** Sistema di inviti che concede l'accesso alla chat privata della casa ad altri utenti.
    * **Chat Privata Casa:** Room Socket.IO protetta. Include funzionalità specifiche come l'accesso all'inventario/armadio della casa.
    * **Sistema di Furto:** Possibilità per gli ospiti di interagire con l'inventario del proprietario (prendere oggetti), con notifiche di sistema.

* **Economia & Lavoro (Arubaito) [COMPLETO]:**
    * **Banca:** UI rinnovata per gestione finanze e bonifici.
    * **Lavori:** Selezione del lavoro e meccanica di ritiro stipendio con cooldown di 24h.
    * **Affitti:** Pagamento manuale o detrazione automatica dallo stipendio (a seconda del tipo di casa).

* **Chat & Real-time:**
    * Canali multipli (Mappe, Case, Globali).
    * **Shadowban:** Gli utenti sanzionati possono scrivere ma i loro messaggi non vengono inoltrati agli altri, e non possono lanciare dadi.
    * Lista utenti online con de-duplicazione delle sessioni.

* **Scheda Personaggio & Stats:**
    * Visualizzazione e modifica profilo.
    * Gestione statistiche e calcolo derivati (HP, MP, capacità di carico, etc.).
    * Log Sanzioni visibile solo allo staff.

* **Forum & Moderazione:**
    * Struttura completa (Sezioni -> Bacheche -> Topic -> Post).
    * Strumenti Admin: Pin, Lock, Delete topic/post.

#### **4. Design System: 'Dark Arcane'**

* **Stile:** Tema scuro, onirico e high-tech.
* **Colori:** Background `#050508`, Accenti Oro `#c9a84a`, Viola `#a270ff`, Rosso Danger `#ff2a2a`.
* **UI:** Finestre flottanti (draggabili), Glassmorphism, Bordi decorativi PNG.

#### **5. Stato Attuale**

Il core del gameplay (Chat, Mappe, Scheda, Economia, Casa) è solido e funzionante in produzione su Render. Il backend è stabile e gestisce correttamente la persistenza dei dati e la logica real-time. Il frontend è ricco di feature ma necessita di ottimizzazione strutturale per la responsività.

#### **6. Prossimi Obiettivi (Roadmap)**

* **Responsive Design & Mobile Optimization (PRIORITÀ ALTA):**
    * Attualmente l'interfaccia è ottimizzata per Desktop (finestre flottanti, layout a 3 colonne).
    * **Obiettivo:** Adattare il layout per funzionare fluidamente su Tablet e Laptop.
    * **Mobile Mode:** Creare una gestione specifica per schermi piccoli (smartphone), probabilmente passando da un sistema a "finestre multiple" a un sistema a "navigazione a tab/schermo intero" per Chat, Mappa e Menu, mantenendo l'usabilità.