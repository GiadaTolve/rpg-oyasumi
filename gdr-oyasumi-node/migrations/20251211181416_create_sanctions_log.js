/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('user_sanctions', function(table) {
      table.increments('id');
      table.integer('user_id').notNullable(); // Chi è stato punito
      table.string('admin_name');             // Chi ha dato la punizione (Nome PG)
      table.string('type');                   // FULL o SHADOW
      table.integer('days');                  // Durata
      table.text('reason');                   // Motivo
      table.timestamp('created_at').defaultTo(knex.fn.now()); // Quando
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTable('user_sanctions');
  };