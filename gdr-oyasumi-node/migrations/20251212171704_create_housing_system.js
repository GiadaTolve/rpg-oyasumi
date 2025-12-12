/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
      // 1. Tabella Tipi di Abitazione (Il Catalogo)
      .createTable('housing_types', function(table) {
        table.increments('id');
        table.string('name').notNullable();        // Es: "Bilocale"
        table.integer('cost_rem').defaultTo(0);    // Costo mensile (es. 150)
        table.string('cost_type').defaultTo('MONTHLY'); // 'MONTHLY' o 'DAILY_SALARY'
        table.integer('bonus_hp').defaultTo(0);    // Bonus PF (es. +5)
        table.integer('bonus_slots').defaultTo(0); // Slot Inventario aggiuntivi
        table.text('description');                 // Dettagli (mq, zona)
      })
      // 2. Aggiornamento Utente
      .table('utenti', function(table) {
        // Collegamento alla casa posseduta
        table.integer('housing_id').unsigned().references('id').inTable('housing_types').defaultTo(null); // Null = Senzatetto
        
        // Gestione Affitto
        table.date('rent_due_date').nullable();    // Quando scade l'affitto
        
        // Gestione Chat Privata Casa
        table.string('house_chat_id').nullable();  // ID della "stanza" socket della casa
        
        // Slot Base (separati dalla casa)
        // Nota: slot_inventario esisteva già, lo usiamo come "Slot totali calcolati" o base? 
        // Meglio separare per chiarezza:
        table.integer('base_inventory_slots').defaultTo(5); // I 5 slot di base
        table.integer('backpack_slots').defaultTo(0);       // Slot dati dagli zaini equipaggiati
      });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema
      .table('utenti', function(table) {
        table.dropColumn('housing_id');
        table.dropColumn('rent_due_date');
        table.dropColumn('house_chat_id');
        table.dropColumn('base_inventory_slots');
        table.dropColumn('backpack_slots');
      })
      .dropTable('housing_types');
  };