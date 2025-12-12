exports.up = function(knex) {
    return knex.schema.createTable('housing_guests', function(table) {
      table.increments('id');
      table.integer('housing_id').unsigned().notNullable(); // ID della Casa
      table.integer('owner_id').unsigned().notNullable();   // ID del Proprietario (per sicurezza)
      table.integer('guest_id').unsigned().notNullable();   // ID dell'Ospite
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      // Evitiamo doppi inviti
      table.unique(['housing_id', 'guest_id']);
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('housing_guests');
  };