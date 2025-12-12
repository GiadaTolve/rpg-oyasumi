/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('utenti', function(table) {
    // --- 1. DETTAGLI DI BASE & INVENTARIO ---
    table.string('grado').defaultTo('Nemuribito');
    table.string('cognome');
    table.integer('slot_inventario').defaultTo(3);
    table.integer('slot_backpack').defaultTo(3);
    table.string('ordine_personaggio');
    table.string('ordine_icona');
    table.string('madosho');
    table.string('madosho_icona');
    table.string('permesso_icona');

    // --- 2. NUOVE STATISTICHE DERIVATE (I tuoi "cassetti") ---
    
    // Vitali Max (Body & Kotodama)
    table.integer('stat_body').defaultTo(10);      // Body (Max HP)
    table.integer('stat_kotodama').defaultTo(10);  // Kotodama (Max MP)

    // Statistiche di Combattimento & Movimento
    table.integer('reflexes').defaultTo(1);             // Riflessi
    table.integer('velocita').defaultTo(1);             // Velocità
    table.integer('movimento').defaultTo(1);            // Movimento
    table.integer('salto').defaultTo(1);                // Salto
    
    // Azioni Fisiche
    table.integer('lancio').defaultTo(1);               // Lancio (valore base)
    table.integer('peso_trasportabile').defaultTo(1);   // Peso Trasportabile
    table.integer('ingaggio').defaultTo(1);             // Distanza d'ingaggio

    // Percezioni
    table.integer('percezione_sensi').defaultTo(1);     // Percezione Sensi (Fisica)
    table.integer('percezione_spirituale').defaultTo(1);// Percezione Anime (Spirituale)

    // Danni Base
    table.integer('danno_cac').defaultTo(1);            // Danno Corpo a Corpo
    table.integer('danno_cad').defaultTo(1);            // Danno a Distanza
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('utenti', function(table) {
    // Cancellazione pulita di tutto
    table.dropColumn('grado');
    table.dropColumn('cognome');
    table.dropColumn('slot_inventario');
    table.dropColumn('slot_backpack');
    table.dropColumn('ordine_personaggio');
    table.dropColumn('ordine_icona');
    table.dropColumn('madosho');
    table.dropColumn('madosho_icona');
    table.dropColumn('permesso_icona');

    table.dropColumn('stat_body');
    table.dropColumn('stat_kotodama');
    table.dropColumn('reflexes');
    table.dropColumn('velocita');
    table.dropColumn('movimento');
    table.dropColumn('salto');
    table.dropColumn('lancio');
    table.dropColumn('peso_trasportabile');
    table.dropColumn('ingaggio');
    table.dropColumn('percezione_sensi');
    table.dropColumn('percezione_spirituale');
    table.dropColumn('danno_cac');
    table.dropColumn('danno_cad');
  });
};