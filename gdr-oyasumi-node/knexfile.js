// knexfile.js
module.exports = {
  
    development: {
      client: 'sqlite3',
      connection: {
        filename: './gdr.db' // Il tuo file .db locale
      },
      useNullAsDefault: true
    },
  
    production: {
      client: 'pg',
      connection: {
        // Questa variabile la imposteremo su Render
        connectionString: process.env.DATABASE_URL, 
        ssl: { rejectUnauthorized: false }
      }
    }
  };