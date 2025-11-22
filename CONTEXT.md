### **Oyasumi - Technical Context Summary**

Questo documento riassume l'architettura tecnica, le feature implementate e lo stato attuale del progetto "Oyasumi".

#### **1. Tech Stack**

*   **Backend:**
    *   **Framework:** Node.js con Express.js.
    *   **Database ORM:** Knex.js, configurato per supportare SQLite in sviluppo e PostgreSQL in produzione.
    *   **Real-time:** Socket.IO per la comunicazione WebSocket (chat, lista utenti online).
    *   **Autenticazione:** JWT (JSON Web Tokens) con `bcryptjs` per l'hashing delle password.
    *   **Altro:** `nodemailer` per l'invio di email di registrazione, `cors` per la gestione delle policy Cross-Origin.

*   **Frontend:**
    *   **Framework:** React 18.
    *   **Build Tool:** Vite.
    *   **Routing:** React Router (`react-router-dom`).
    *   **Real-time Client:** Socket.IO Client.
    *   **State Management:** Context API di React (`SocketContext`, `MessagingProvider`).

#### **2. Architettura Database**

Lo schema è definito nel file di migrazione `20251114112821_initial_schema.js` e include le seguenti tabelle principali:

*   **`utenti`**: Memorizza le informazioni degli utenti, incluse credenziali, dati del personaggio (stats, EXP, Rem), permessi (USER, MOD, ADMIN), e personalizzazioni del profilo (avatar, background).
*   **`locations`**: Struttura gerarchica per le mappe del gioco. Ogni location ha un `parent_id` che punta a una location genitore, permettendo di creare una struttura ad albero (es. Mondo -> Regione -> Città -> Taverna). Le location sono tipizzate (`MAP`, `CHAT`).
*   **`chat_log`**: Registra tutti i messaggi inviati nelle chat pubbliche, con informazioni su autore, tipo di messaggio (azione, dado, etc.), e timestamp.
*   **`private_messages`**: Gestisce la messaggistica privata tra utenti.
*   **Tabelle Forum:**
    *   `forum_sezioni`: Le categorie principali del forum.
    *   `forum_bacheche`: Le singole bacheche (board) dentro una sezione.
    *   `forum_topics`: Le discussioni (thread) create dagli utenti.
    *   `forum_posts`: I singoli post all'interno di una discussione.
    *   `forum_post_likes`: Traccia i "mi piace" per ogni post.
    *   `forum_topic_reads`: Salva il timestamp dell'ultima lettura di un topic per ogni utente, per indicare i contenuti non letti.
*   **`quests`**: Contiene le quest del gioco, con tipo, stato (ATTIVA, PAUSA, CONCLUSA), e il master di riferimento.
*   **`quest_participants`**: Associa gli utenti a una specifica quest.
*   **`transactions`**: Log delle transazioni di valuta (`Rem`) tra utenti o assegnate dai master.

#### **3. Feature Chiave Implementate**

*   **Sistema di Mappa Gerarchica:**
    *   Il backend espone l'endpoint `GET /api/game/map/:mapId` che restituisce una location e i suoi figli diretti. L'ID speciale `root` carica la mappa di primo livello.
    *   Il frontend (`GameLayout.jsx`) gestisce lo stato della mappa corrente. Il componente `MapContent.jsx` renderizza la mappa e le "zone" cliccabili. Cliccare su una zona di tipo `MAP` aggiorna l'ID della mappa, ricaricando i dati; cliccare su una zona `CHAT` apre una finestra di chat.

*   **Chat in Tempo Reale:**
    *   Basata su Socket.IO. All'autenticazione, il client si connette inviando il JWT.
    *   Il server gestisce una lista di utenti online (`onlineUsers`) e la trasmette ai client.
    *   Le chat sono stanze di Socket.IO che corrispondono all'ID della `location` di tipo `CHAT`.
    *   L'evento `send_message` gestisce i messaggi. Il tipo `azione` (messaggio narrativo) conferisce EXP in base alla lunghezza del testo (con un cap giornaliero). Il tipo `globale` viene inviato a tutti gli utenti (solo per ADMIN). I messaggi vengono salvati in `chat_log`.
    *   Il frontend renderizza le chat in finestre `ChatWindow.jsx` multiple e flottanti.

*   **Forum:**
    *   Una serie completa di API REST (`/api/forum/*`) gestisce la visualizzazione e la moderazione.
    *   Il frontend (`Forum.jsx`, `BachecaPage.jsx`, `TopicPage.jsx`) permette di navigare sezioni, bacheche e topic.
    *   Gli utenti possono creare topic e post (`NewTopicForm.jsx`, `NewPostForm.jsx`).
    *   Il sistema di `forum_topic_reads` permette di evidenziare topic e bacheche con nuovi messaggi.

*   **Scheda Personaggio:**
    *   L'endpoint `GET /api/scheda` recupera la scheda del proprio personaggio, mentre `GET /api/scheda/:id` recupera quella pubblica di un altro utente (con dati sensibili omessi).
    *   Il componente `SchedaPersonaggio.jsx` è una finestra modale che può visualizzare sia la propria scheda (con opzioni di modifica) sia quella pubblica di altri utenti.
    *   Gli utenti possono spendere EXP per aumentare le statistiche (`/api/scheda/aggiorna-stat`), con validazione del costo lato server.

*   **Sistema di Manuali (Guida/Ambientazione):**
    *   Sono componenti React statici (`Guida.jsx`, `Ambientazione.jsx`) che vengono mostrati come finestre modali.
    *   Il loro contenuto è hard-coded nel frontend e non viene caricato dinamicamente dal backend.

#### **4. Design System: 'Dark Arcane'**

*   **Stile Generale:** Tema scuro, onirico e high-tech.
*   **Palette Colori:**
    *   **Sfondo Principale:** Nero/Blu scuro (`#050508`).
    *   **Oro Arcane:** Accenti dorati usati per elementi importanti e hover effects (`#c9a84a`, gradienti da `#efe784` a `#b37f1f`).
    *   **Viola Etereo:** Viola/Magenta usato per titoli, link e hover effects (`#a270ff`).
*   **Tipografia:**
    *   **UI & Testo:** `Inter` (per leggibilità).
    *   **Titoli & Bottoni:** `Cinzel` (per un tocco fantasy/elegante).
    *   **Font Decorativi:** Vari font custom (`Gothicha`, `goat`) vengono usati per il titolo principale e altri elementi grafici.
*   **UI & Effetti:**
    *   **Glassmorphism:** L'header e altri pannelli usano sfondi semi-trasparenti con `backdrop-filter: blur()`, creando un effetto "vetro smerigliato".
    *   **Bordi PNG:** L'interfaccia è incorniciata da bordi grafici personalizzati applicati tramite CSS (`/frames/borderframe.png`), rafforzando lo stile fantasy.

#### **5. Stato Attuale (Basato sui File Chiave)**

*   **`server.js`**: È il cuore del backend, estremamente maturo. Contiene la logica per quasi tutte le feature, inclusi sistemi complessi come la banca, le quest e la messaggistica privata, oltre a un robusto sistema di permessi.
*   **`GameLayout.jsx`**: È il componente orchestratore del frontend. La sua logica di gestione degli stati per le finestre modali e le chat è centrale per l'esperienza utente. La struttura a 3 colonne e la gestione del rendering dei componenti figli tramite `Outlet` sono ben definite.
*   **`ChatWindow.jsx`**: Rappresenta l'implementazione finale della feature di chat, mostrando come i messaggi ricevuti via socket vengono visualizzati e come l'utente interagisce con la singola istanza di chat.
*   **`Forum.jsx`**: È il punto di ingresso per una delle feature più complesse. La sua esistenza e le rotte associate in `App.jsx` indicano che l'intera infrastruttura del forum è stata implementata e integrata nel layout principale.