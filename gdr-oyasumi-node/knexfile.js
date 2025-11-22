require('dotenv').config(); // Carica le variabili dal file .env

const dbConfig = {
  client: 'pg', // Usa PostgreSQL
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  }
};

module.exports = {
  development: dbConfig, // Usa Postgres anche qui!
  production: dbConfig   // Usa Postgres anche qui!
};