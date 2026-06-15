/* ══════════════════════════════════════════════════════════════
   Lanceur local / VPS.
   La logique de l'application vit dans lib/app.js (partagée avec
   la fonction serverless Vercel api/index.js).
══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const app  = require('./lib/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        message: 'Or du Temps — serveur démarré',
        port: PORT,
        env: process.env.NODE_ENV || 'development',
    }));
});
