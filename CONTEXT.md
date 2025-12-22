# 📂 CONTEXT AGGIORNATO: RPG "Dark Arcane" (React/Node)

## 1. Architettura Core (`GameLayout.jsx`)
**Stato:** Ibrido / Monolitico.
Abbiamo abbandonato la separazione in due file distinti (`Desktop` vs `Mobile`) per evitare la perdita di props critiche (es. oggetto `user`) durante il rendering condizionale.
Attualmente, **un unico file** `GameLayout.jsx` gestisce entrambe le viste tramite lo stato `isMobile` (`window.innerWidth <= 1024`).

* **Gestione Props:** L'oggetto `user` viene passato tassativamente a **tutti** i componenti figli (Sidebar, Modali Guida/Lore, Chat, ecc.) per garantire che i permessi (Admin/Master) e le feature (Skills, Armadio) siano sempre accessibili.
* **Navigazione Mobile:** Gestita tramite uno stato locale `activeMobileTab` (HOME, MAPPA, MESSAGGI, PRESENTI).

## 2. Layout & UI
**Stile:** "Dark Arcane"
* **Palette:** Sfondo Nero Profondo (`#050508`), Accenti Oro Spento (`#c9a84a`), Viola Arcano (`#a270ff`).
* **Font:** 'Cinzel' (Intestazioni), 'Inter' (Testo).
* **Asset:** Icone **SVG Inline** (definite localmente nel codice per performance e stile custom) su Mobile; Immagini PNG su Desktop.

### Modalità Mobile (App View)
* **Struttura:** Full Screen, Fixed, Dock di navigazione in basso.
* **Funzionalità Home:** Tasti rapidi per "Ritira Stipendio" e "Entra in Casa".
* **Lista Presenti:** Card con avatar e tasto rapido (icona mail) per aprire direttamente la chat privata.
* **Mappa:** Navigazione a lista verticale con icone differenziate per Zone (Map) e Chat.

### Modalità Desktop (Classic RPG View)
* **Struttura:** Header + Left Sidebar (Navigazione) + Main Content (Mappa) + Right Sidebar (Info/Chat).
* **Chat Window:** Finestra flottante (`position: absolute`) centrata nel main wrapper.
    * **Posizionamento:** `top: 130px`, `width: calc(100% - 580px)` (calcolato sottraendo le sidebar), `left: 50%` (traslato).
* **Sidebar:** Includono tasti per "Skills & Items" e "Armadio" (visibili solo se la prop `user` è passata correttamente).

## 3. Sistema di Chat (`ChatWindow.jsx`)
Componente ibrido che muta layout e funzionalità in base a `isMobile`.

* **Logica Mobile:**
    * Stile "WhatsApp Dark".
    * `position: fixed`, `top: 0`, `z-index: 2000`.
    * Input box gestiti con `box-sizing: border-box` per evitare overflow orizzontale.
* **Logica Desktop:**
    * Layout a 2 colonne (Info luogo/Presenti a SX, Chat a DX).
    * Include strumenti avanzati: **Dadi**, **Shinigami Tool** (Master), **Note Master**, **Gestione Armadio** (Housing).
* **Housing System:**
    * Se la chat ha ID `house_...`, attiva logica specifica.
    * Permette di visualizzare l'inventario della casa (Armadio) e rubare oggetti (tasto "Ruba").

## 4. Messaggistica Privata (`MessagingManager.jsx`)
Sistema robusto contro i fallimenti del server.

* **Local Storage Cache:** Se il server risponde con errore (500) nel recupero conversazioni, il frontend carica l'ultima lista salvata in `localStorage`.
* **Apertura Diretta:** Cliccando un utente dalla lista "Presenti", viene forzata l'apertura della chat (settando lo stato `targetUser`) e la conversazione viene iniettata localmente nella lista per feedback istantaneo.
* **Live Search:** Barra di ricerca con *debounce* (300ms) per trovare utenti nel DB o filtrare chat esistenti.
    * *Nota Backend:* Richiede query SQL con `LIKE` o `ILIKE` per la ricerca parziale (es. "Bo" -> "Botan").

## 5. Modifiche Future & Manutenzione
* **Server:** Ricordarsi di aggiornare la query `/api/users/find` per supportare la ricerca parziale (`%LIKE%`).
* **Componenti:** Ogni volta che si aggiunge una nuova modale (es. Crafting), ricordarsi di passare `user={user}` nel `GameLayout`.