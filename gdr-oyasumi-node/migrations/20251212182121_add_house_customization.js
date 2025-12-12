exports.up = function(knex) {
    return knex.schema.table('utenti', function(table) {
      table.string('house_custom_image').nullable(); // Foto caricata dall'utente
      table.text('house_custom_desc').nullable();    // Descrizione personalizzata
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.table('utenti', function(table) {
      table.dropColumn('house_custom_image');
      table.dropColumn('house_custom_desc');
    });
  };