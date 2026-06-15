/* ══════════════════════════════════════════════════════════════
   Application Express partagée.
   - En local / VPS   : server.js l'importe et appelle app.listen().
   - Sur Vercel       : api/index.js la réexporte comme fonction
                        serverless (voir vercel.json pour le routage).

   La persistance de la config passe par lib/storage.js (Blob ou fs).
   Les médias (photos/vidéos) sont uploadés directement du navigateur
   vers Vercel Blob via la route /api/blob/upload (token signé).
══════════════════════════════════════════════════════════════ */

require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const path      = require('path');

const storage = require('./storage');

const app  = express();
const ROOT = path.join(__dirname, '..');

/* ══════════════════════════════════
   Logging structuré (JSON)
══════════════════════════════════ */
function log(level, message, data = {}) {
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, message, ...data });
    if (level === 'error' || level === 'warn') console.error(entry);
    else console.log(entry);
}

/* ══════════════════════════════════
   CORS — origines autorisées
══════════════════════════════════ */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['https://ordutemps.fr', 'https://www.ordutemps.fr', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        log('warn', 'Origine CORS refusée', { origin });
        cb(new Error('Origine non autorisée'));
    },
    methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '4mb' }));

/* ══════════════════════════════════
   En-têtes de sécurité HTTP
══════════════════════════════════ */
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Powered-By', '');
    next();
});

/* ══════════════════════════════════
   Rate limiting (best-effort en serverless)
══════════════════════════════════ */
const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Trop de tentatives. Réessayez dans une minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/* ══════════════════════════════════
   Auth admin
══════════════════════════════════ */
function checkAuth(req, res) {
    const pwd = req.headers['x-admin-password'];
    if (!pwd || pwd !== storage.getAdminPassword()) {
        log('warn', 'Accès admin refusé', { ip: req.ip, path: req.path });
        res.status(401).json({ error: 'Mot de passe incorrect.' });
        return false;
    }
    return true;
}

/* ══════════════════════════════════
   POST /api/admin/check
══════════════════════════════════ */
app.post('/api/admin/check', adminLimiter, (req, res) => {
    if (!checkAuth(req, res)) return;
    res.json({ ok: true });
});

/* ══════════════════════════════════
   GET /api/config
══════════════════════════════════ */
app.get('/api/config', async (_req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, max-age=30');
        res.json(await storage.getConfig());
    } catch (err) {
        log('error', 'Erreur lecture config', { error: err.message });
        res.json({});
    }
});

/* ══════════════════════════════════
   POST /api/config
══════════════════════════════════ */
app.post('/api/config', async (req, res) => {
    if (!checkAuth(req, res)) return;
    try {
        await storage.saveConfig(req.body);
        log('info', 'Config sauvegardée', { ip: req.ip });
        res.json({ success: true });
    } catch (err) {
        log('error', 'Erreur sauvegarde config', { error: err.message });
        res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
    }
});

/* ══════════════════════════════════
   POST /api/blob/upload
   Émet un token d'upload signé pour l'upload direct
   navigateur → Vercel Blob (photos ET vidéos).
   L'auth est vérifiée dans onBeforeGenerateToken via
   le mot de passe passé en clientPayload.
══════════════════════════════════ */
app.post('/api/blob/upload', async (req, res) => {
    let handleUpload;
    try {
        ({ handleUpload } = require('@vercel/blob/client'));
    } catch {
        return res.status(500).json({ error: 'Stockage Blob indisponible.' });
    }

    try {
        const result = await handleUpload({
            request: req,
            body: req.body,
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                if (!clientPayload || clientPayload !== storage.getAdminPassword()) {
                    throw new Error('Non autorisé');
                }
                return {
                    allowedContentTypes: [
                        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                        'video/mp4', 'video/webm', 'video/quicktime',
                    ],
                    maximumSizeInBytes: 200 * 1024 * 1024, // 200 Mo (vidéos)
                    addRandomSuffix: true,
                };
            },
            onUploadCompleted: async ({ blob }) => {
                log('info', 'Média uploadé', { url: blob.url });
            },
        });
        res.json(result);
    } catch (err) {
        log('warn', 'Upload refusé', { error: err.message });
        res.status(400).json({ error: err.message });
    }
});

/* ══════════════════════════════════
   GET /emma — Espace admin
══════════════════════════════════ */
app.get('/emma', (_req, res) => {
    res.sendFile(path.join(ROOT, 'emma.html'));
});

/* ══════════════════════════════════
   Fichiers statiques (local / VPS).
   Sur Vercel ils sont servis par la couche statique.
══════════════════════════════════ */
app.use(express.static(ROOT));

/* ══════════════════════════════════
   Gestionnaire d'erreurs global
══════════════════════════════════ */
app.use((err, req, res, _next) => {
    log('error', 'Erreur non gérée', { error: err.message, path: req.path });
    res.status(500).json({ error: 'Erreur serveur.' });
});

module.exports = app;
