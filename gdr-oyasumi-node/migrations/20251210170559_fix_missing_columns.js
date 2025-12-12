/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    const hasEmpatia = await knex.schema.hasColumn('utenti', 'empatia');
    const hasLock = await knex.schema.hasColumn('utenti', 'is_stats_locked');
  
    return knex.schema.table('utenti', function(table) {
      if (!hasEmpatia) {
        table.integer('empatia').defaultTo(1);
      }
      if (!hasLock) {
        table.boolean('is_stats_locked').defaultTo(false);
      }
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.table('utenti', function(table) {
      // Non facciamo nulla nel down per sicurezza in questa fase di fix
    });
  };