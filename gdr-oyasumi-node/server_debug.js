require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

console.log("🟡 --- AVVIO SERVER DEBUG ---");

// Middleware base sicuri
app.use(express.json());

// Rotta semplice (Home)
app.get('/', (req, res) => {
    res.send('<h1>SERVER DEBUG ATTIVO 🟢</h1><p>Se leggi questo, il problema era nel vecchio codice.</p>');
});

// Avvio
app.listen(port, () => {
    console.log(`✅ SERVER DEBUG PARTITO su porta ${port}`);
});