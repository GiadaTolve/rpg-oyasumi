/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // 1. PULISCE LE TABELLE (in ordine inverso di creazione)
  await knex('forum_post_likes').del();
  await knex('forum_posts').del();
  await knex('forum_topics').del();
  await knex('forum_bacheche').del();
  await knex('forum_sezioni').del();
  await knex('quest_participants').del();
  await knex('quests').del();
  await knex('locations').del();
  await knex('utenti').del();

  // 2. INSERISCE GLI UTENTI
  await knex('utenti').insert([
    { 
      id_utente: 1, 
      email: 'aramis@test.com', 
      password: '$2b$10$Vu8LWpt6Eqlrv8g745H1peO3yfGRD3h7iandxnwFOUYIVKbti.f7u', 
      nome_pg: 'Aramis', 
      permesso: 'PLAYER',
      exp: 100,
      exp_accumulata: 100 
    },
    { 
      id_utente: 2, 
      email: 'kagetsu@test.com', 
      password: '$2b$10$WRxl4YIhybf/dPZ.hpW4Ku7H3Sos6JsY1RJjXMUxhrVM6cTU3N8AG', 
      nome_pg: 'Kagetsu', 
      permesso: 'ADMIN',
      exp: 200,
      exp_accumulata: 200 
    }
    // Aggiungi qui il tuo utente 'Botan' se vuoi
  ]);

  // 3. INSERISCE LE LOCATIONS (Le tue Mappe)
  await knex('locations').insert([
    { id: 1, parent_id: null, name: 'Mappa Zero', type: 'MAP', image_url: '/maps/map.png', pos_x: 22, pos_y: 30 },
    { id: 2, parent_id: 1, name: 'Altrove', type: 'MAP', image_url: 'maps/map.wasted.png', pos_x: 45, pos_y: 55 },
    { id: 3, parent_id: 1, name: 'Ezochi', type: 'MAP', image_url: 'maps/map.ezochi.png', pos_x: 75, pos_y: 30 },
    { id: 4, parent_id: 1, name: 'Onimori', type: 'MAP', image_url: 'maps/map.onimori.png', pos_x: 35, pos_y: 40 },
    { id: 5, parent_id: 1, name: 'Izayoi', type: 'MAP', image_url: 'maps/map.izayoi.png', pos_x: 30, pos_y: 70 },
    { id: 6, parent_id: 1, name: 'Ogōn', type: 'MAP', image_url: '/maps/map.ogon.png', pos_x: 88, pos_y: 50 }
  ]);

  // 4. INSERISCE IL FORUM
  await knex('forum_sezioni').insert([
    { id: 1, nome: 'off-game' },
    { id: 2, nome: 'on-game' },
    { id: 3, nome: 'hot-topic' }
  ]);

  await knex('forum_bacheche').insert([
    // --- CORREZIONE QUI ---
    { id: 1, sezione_id: 1, nome: 'news-game', is_locked: 0 } 
  ]);

  await knex('forum_topics').insert([
    // --- CORREZIONE QUI ---
    { id: 1, bacheca_id: 1, autore_id: 2, titolo: 'A tutte le unità!', is_pinned: 1 },
    { id: 2, bacheca_id: 1, autore_id: 2, titolo: 'Ciao a tutti', is_pinned: 0 },
    { id: 3, bacheca_id: 1, autore_id: 2, titolo: 'Provo il visore', is_pinned: 0 }
  ]);

  await knex('forum_posts').insert([
    { id: 1, topic_id: 1, autore_id: 2, testo: 'ciao' },
    { id: 2, topic_id: 2, autore_id: 2, testo: 'Sono nuovo!' },
    { id: 3, topic_id: 3, autore_id: 2, testo: 'Eh qui tocca provare il visore, [b]per forza[/b].\nQuindi ora mi metto a fare un lunghissimo spiegone su qualcosa a caso.' },
  ]);

  // 5. INSERISCE LE QUESTS
  await knex('quests').insert([
     { id: 1, name: 'Canti di Sangue', type: 'TRAMA', status: 'IN_CORSO', master_id: 2, filone_name: 'L\'occhio nel Cielo' },
     { id: 2, name: 'Lune di Sangue', type: 'TRAMA', status: 'CONCLUSA', master_id: 2 },
     { id: 3, name: 'Prova1', type: 'BATTLE', status: 'CONCLUSA', master_id: 2 },
     { id: 4, name: 'Prova3', type: 'BATTLE', status: 'CONCLUSA', master_id: 2 },
     { id: 5, name: 'Ciao...', type: 'TRAMA', status: 'CONCLUSA', master_id: 2 },
     { id: 6, name: 'Lame e Urla', type: 'AMBIENT', status: 'CONCLUSA', master_id: 2 },
     { id: 7, name: 'uhiuhihiuhh', type: 'BATTLE', status: 'CONCLUSA', master_id: 2 },
     { id: 8, name: 'Ciao a tutti.', type: 'TRAMA', status: 'CONCLUSA', master_id: 2 }
  ]);

  // --- AGGIUNGI QUESTO ALLA FINE ---
// Questo comando aggiorna i contatori degli ID di PostgreSQL
// per evitare conflitti dopo il seed.
console.log("Aggiornamento delle sequenze del database...");

// Usiamo 'TRUNCATE ... RESTART IDENTITY' per pulire E resettare i contatori
// È più pulito che fare .del() e poi .raw()

await knex.raw('TRUNCATE TABLE utenti, locations, quests, forum_sezioni, forum_bacheche, forum_topics, forum_posts RESTART IDENTITY CASCADE');

// Ora reinseriamo tutto, e gli ID saranno gestiti automaticamente da Postgres

console.log("Reinserimento dati seed...");

await knex('utenti').insert([
  { 
    email: 'aramis@test.com', 
    password: '$2b$10$Vu8LWpt6Eqlrv8g745H1peO3yfGRD3h7iandxnwFOUYIVKbti.f7u', 
    nome_pg: 'Aramis', 
    permesso: 'PLAYER',
    exp: 100,
    exp_accumulata: 100 
  },
  { 
    email: 'kagetsu@test.com', 
    password: '$2b$10$WRxl4YIhybf/dPZ.hpW4Ku7H3Sos6JsY1RJjXMUxhrVM6cTU3N8AG', 
    nome_pg: 'Kagetsu', 
    permesso: 'ADMIN',
    exp: 200,
    exp_accumulata: 200 
  }
]);

await knex('locations').insert([
  { name: 'Mappa Zero', type: 'MAP', image_url: '/maps/map.png', pos_x: 22, pos_y: 30 },
  { parent_id: 1, name: 'Altrove', type: 'MAP', image_url: 'maps/map.wasted.png', pos_x: 45, pos_y: 55 },
  { parent_id: 1, name: 'Ezochi', type: 'MAP', image_url: 'maps/map.ezochi.png', pos_x: 75, pos_y: 30 },
  { parent_id: 1, name: 'Onimori', type: 'MAP', image_url: 'maps/map.onimori.png', pos_x: 35, pos_y: 40 },
  { parent_id: 1, name: 'Izayoi', type: 'MAP', image_url: 'maps/map.izayoi.png', pos_x: 30, pos_y: 70 },
  { parent_id: 1, name: 'Ogōn', type: 'MAP', image_url: '/maps/map.ogon.png', pos_x: 88, pos_y: 50 }
]);

await knex('forum_sezioni').insert([
  { nome: 'off-game' },
  { nome: 'on-game' },
  { nome: 'hot-topic' }
]);

await knex('forum_bacheche').insert([
  { sezione_id: 1, nome: 'news-game', is_locked: 0 } 
]);

await knex('forum_topics').insert([
  { bacheca_id: 1, autore_id: 2, titolo: 'A tutte le unità!', is_pinned: 1 },
  { bacheca_id: 1, autore_id: 2, titolo: 'Ciao a tutti', is_pinned: 0 },
  { bacheca_id: 1, autore_id: 2, titolo: 'Provo il visore', is_pinned: 0 }
]);

await knex('forum_posts').insert([
  { topic_id: 1, autore_id: 2, testo: 'ciao' },
  { topic_id: 2, autore_id: 2, testo: 'Sono nuovo!' },
  { topic_id: 3, autore_id: 2, testo: 'Eh qui tocca provare il visore, [b]per forza[/b].\nQuindi ora mi metto a fare un lunghissimo spiegone su qualcosa a caso.' },
]);

await knex('quests').insert([
   { name: 'Canti di Sangue', type: 'TRAMA', status: 'IN_CORSO', master_id: 2, filone_name: 'L\'occhio nel Cielo' },
   { name: 'Lune di Sangue', type: 'TRAMA', status: 'CONCLUSA', master_id: 2 },
   { name: 'Prova1', type: 'BATTLE', status: 'CONCLUSA', master_id: 2 },
   { name: 'Prova3', type: 'BATTLE', status: 'CONCLUSA', master_id: 2 },
   { name: 'Ciao...', type: 'TRAMA', status: 'CONCLUSA', master_id: 2 },
   { name: 'Lame e Urla', type: 'AMBIENT', status: 'CONCLUSA', master_id: 2 },
   { name: 'uhiuhihiuhh', type: 'BATTLE', status: 'CONCLUSA', master_id: 2 },
   { name: 'Ciao a tutti.', type: 'TRAMA', status: 'CONCLUSA', master_id: 2 }
]);

console.log("Dati reinseriti e sequenze aggiornate.");

};