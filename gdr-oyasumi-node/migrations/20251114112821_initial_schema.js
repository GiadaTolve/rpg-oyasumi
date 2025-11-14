/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // --- Creazione e Aggiornamento Tabelle con Knex Schema Builder ---

    await knex.schema.createTableIfNotExists('utenti', (table) => {
        table.increments('id_utente').primary();
        table.string('email').notNullable().unique();
        table.string('password').notNullable();
        table.string('nome_pg');
        table.string('permesso').defaultTo('PLAYER');
        table.integer('exp').defaultTo(0);
        table.integer('exp_accumulata').defaultTo(0);
        table.integer('daily_exp_earned').defaultTo(0);
        table.string('last_exp_date');
        table.integer('mente').defaultTo(5);
        table.integer('forza').defaultTo(5);
        table.integer('destrezza').defaultTo(5);
        table.integer('costituzione').defaultTo(5);
        table.string('avatar');
        table.string('avatar_chat');
        table.text('preferenze_gioco');
    });

    await knex.schema.createTableIfNotExists('chat_log', (table) => {
        table.increments('id');
        table.string('chat_id').notNullable();
        table.string('autore').notNullable();
        table.string('permesso');
        table.text('testo').notNullable();
        table.string('tipo').notNullable();
        table.integer('quest_id');
        table.datetime('timestamp').defaultTo(knex.fn.now());
    });

    await knex.schema.createTableIfNotExists('locations', (table) => {
        table.increments('id');
        table.integer('parent_id').unsigned().references('id').inTable('locations').onDelete('CASCADE');
        table.string('name').notNullable();
        table.string('type').notNullable();
        table.string('image_url');
        table.text('description');
        table.text('master_notes');
        table.integer('pos_x');
        table.integer('pos_y');
        table.string('prefecture');
    });

    await knex.schema.createTableIfNotExists('quests', (table) => {
        table.increments('id');
        table.string('name').notNullable();
        table.string('type').notNullable();
        table.string('status').notNullable().defaultTo('IN_CORSO');
        table.integer('master_id').notNullable().references('id_utente').inTable('utenti');
        table.string('filone_name');
        table.integer('parent_quest_id');
        table.datetime('start_time').defaultTo(knex.fn.now());
        table.datetime('end_time');
    });

    await knex.schema.createTableIfNotExists('quest_participants', (table) => {
        table.increments('id');
        table.integer('quest_id').notNullable().references('id').inTable('quests').onDelete('CASCADE');
        table.integer('user_id').notNullable().references('id_utente').inTable('utenti').onDelete('CASCADE');
        table.integer('exp_reward').defaultTo(0);
    });

    await knex.schema.createTableIfNotExists('forum_sezioni', (table) => {
        table.increments('id');
        table.string('nome').notNullable().unique();
        table.text('descrizione');
        table.integer('ordine').defaultTo(0);
    });

    await knex.schema.createTableIfNotExists('forum_bacheche', (table) => {
        table.increments('id');
        table.integer('sezione_id').notNullable().references('id').inTable('forum_sezioni').onDelete('CASCADE');
        table.string('nome').notNullable();
        table.text('descrizione');
        table.integer('ordine').defaultTo(0);
        table.boolean('is_locked').notNullable().defaultTo(false);
    });

    await knex.schema.createTableIfNotExists('forum_topics', (table) => {
        table.increments('id');
        table.integer('bacheca_id').notNullable().references('id').inTable('forum_bacheche').onDelete('CASCADE');
        table.integer('autore_id').references('id_utente').inTable('utenti').onDelete('SET NULL');
        table.string('titolo').notNullable();
        table.boolean('is_locked').notNullable().defaultTo(false);
        table.boolean('is_pinned').notNullable().defaultTo(false);
        table.datetime('timestamp_creazione').defaultTo(knex.fn.now());
        table.datetime('ultimo_post_timestamp').defaultTo(knex.fn.now());
    });

    await knex.schema.createTableIfNotExists('forum_posts', (table) => {
        table.increments('id');
        table.integer('topic_id').notNullable().references('id').inTable('forum_topics').onDelete('CASCADE');
        table.integer('autore_id').references('id_utente').inTable('utenti').onDelete('SET NULL');
        table.text('testo').notNullable();
        table.integer('like_count').notNullable().defaultTo(0);
        table.datetime('timestamp_creazione').defaultTo(knex.fn.now());
    });

    await knex.schema.createTableIfNotExists('forum_post_likes', (table) => {
        table.integer('post_id').notNullable().references('id').inTable('forum_posts').onDelete('CASCADE');
        table.integer('user_id').notNullable().references('id_utente').inTable('utenti').onDelete('CASCADE');
        table.primary(['post_id', 'user_id']);
    });

    await knex.schema.createTableIfNotExists('forum_topic_reads', (table) => {
        table.integer('user_id').notNullable().references('id_utente').inTable('utenti').onDelete('CASCADE');
        table.integer('topic_id').notNullable().references('id').inTable('forum_topics').onDelete('CASCADE');
        table.datetime('last_read_timestamp').notNullable();
        table.primary(['user_id', 'topic_id']);
    });

    await knex.schema.createTableIfNotExists('event_banners', (table) => {
        table.increments('id');
        table.string('title').notNullable();
        table.string('image_url').notNullable();
        table.string('link_url');
        table.boolean('is_active').defaultTo(false);
    });

    await knex.schema.createTableIfNotExists('playlists', (table) => {
        table.increments('id');
        table.string('name').notNullable().unique();
    });

    await knex.schema.createTableIfNotExists('songs', (table) => {
        table.increments('id');
        table.integer('playlist_id').notNullable().references('id').inTable('playlists').onDelete('CASCADE');
        table.string('title').notNullable();
        table.string('source_type').notNullable();
        table.string('url').notNullable();
        table.string('cover_image_url');
    });

    await knex.schema.createTableIfNotExists('daily_events', (table) => {
        table.increments('id');
        table.string('event_date').notNullable().unique();
        table.string('title').notNullable();
        table.text('description').notNullable();
    });

    await knex.schema.createTableIfNotExists('private_messages', (table) => {
        table.increments('id');
        table.integer('sender_id').notNullable().references('id_utente').inTable('utenti').onDelete('CASCADE');
        table.integer('receiver_id').notNullable().references('id_utente').inTable('utenti').onDelete('CASCADE');
        table.text('text').notNullable();
        table.boolean('is_read').defaultTo(false);
        table.datetime('timestamp').defaultTo(knex.fn.now());
    });

    await knex.schema.createTableIfNotExists('transactions', (table) => {
        table.increments('id');
        table.integer('sender_id').references('id_utente').inTable('utenti').onDelete('SET NULL');
        table.integer('receiver_id').notNullable().references('id_utente').inTable('utenti').onDelete('CASCADE');
        table.integer('amount').notNullable();
        table.text('reason').notNullable();
        table.datetime('timestamp').defaultTo(knex.fn.now());
    });

    // Aggiunta colonne con controllo di esistenza
    if (!await knex.schema.hasColumn('utenti', 'background')) {
        await knex.schema.table('utenti', (table) => { table.text('background').defaultTo(''); });
    }
    if (!await knex.schema.hasColumn('locations', 'prefecture')) {
        await knex.schema.table('locations', (table) => { table.string('prefecture'); });
    }
    if (!await knex.schema.hasColumn('chat_log', 'luogo')) {
        await knex.schema.table('chat_log', (table) => { table.string('luogo'); });
    }
    if (!await knex.schema.hasColumn('utenti', 'job')) {
        await knex.schema.table('utenti', (table) => { table.string('job'); });
    }
    if (!await knex.schema.hasColumn('utenti', 'last_salary_collection')) {
        await knex.schema.table('utenti', (table) => { table.string('last_salary_collection'); });
    }
    if (!await knex.schema.hasColumn('utenti', 'rem')) {
        await knex.schema.table('utenti', (table) => { table.integer('rem').notNullable().defaultTo(0); });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // È buona norma eliminare le tabelle in ordine INVERSO
    // rispetto alla creazione per rispettare le chiavi esterne.
    
    await knex.schema.dropTableIfExists('transactions');
    await knex.schema.dropTableIfExists('private_messages');
    await knex.schema.dropTableIfExists('daily_events');
    await knex.schema.dropTableIfExists('songs');
    await knex.schema.dropTableIfExists('playlists');
    await knex.schema.dropTableIfExists('event_banners');
    await knex.schema.dropTableIfExists('forum_topic_reads');
    await knex.schema.dropTableIfExists('forum_post_likes');
    await knex.schema.dropTableIfExists('forum_posts');
    await knex.schema.dropTableIfExists('forum_topics');
    await knex.schema.dropTableIfExists('forum_bacheche');
    await knex.schema.dropTableIfExists('forum_sezioni');
    await knex.schema.dropTableIfExists('quest_participants');
    await knex.schema.dropTableIfExists('quests');
    await knex.schema.dropTableIfExists('locations');
    await knex.schema.dropTableIfExists('chat_log');
    await knex.schema.dropTableIfExists('utenti');
  };
