// Point d'entrée serverless Vercel : réexporte l'app Express partagée.
// Le routage (/api/* et /emma) est défini dans vercel.json.
module.exports = require('../lib/app');
