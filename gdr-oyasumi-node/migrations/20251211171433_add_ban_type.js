/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('utenti', function(table) {
      // 1. Colonne Base Ban (che mancavano)
      table.timestamp('ban_expires_at').nullable(); // Data scadenza
      table.text('ban_reason').nullable();          // Motivazione testo
      
      // 2. Colonne Avanzate Ban (Shadow & IP)
      table.string('ban_type').nullable();          // 'FULL' o 'SHADOW'
      table.string('last_ip_address').nullable();   // Per tracciare l'IP
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.table('utenti', function(table) {
      table.dropColumn('ban_expires_at');
      table.dropColumn('ban_reason');
      table.dropColumn('ban_type');
      table.dropColumn('last_ip_address');
    });
  };