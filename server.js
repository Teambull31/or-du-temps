require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR    = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ADMIN_FILE  = path.join(DATA_DIR, 'admin.json');
const UPLOADS_DIR = path.join(__dirname, 'assets', 'uploads');
const BACKUP_DIR  = path.join(DATA_DIR, 'backups');

[DATA_DIR, UPLOADS_DIR, BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

/* ══════════════════════════════════
   En-têtes de sécurité HTTP
══════════════════════════════════ */
app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Powered-By', ''); // masquer Express
    next();
});

/* ══════════════════════════════════
   Rate limiting
══════════════════════════════════ */
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5,
    message: { error: 'Trop de messages envoyés. Réessayez dans 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 10,
    message: { error: 'Trop de tentatives. Réessayez dans une minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const passwordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 heure
    max: 5,
    message: { error: 'Trop de tentatives. Réessayez dans une heure.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/* ══════════════════════════════════
   Helpers auth
══════════════════════════════════ */
function getAdminPassword() {
    try {
        const admin = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
        if (admin.password) return admin.password;
    } catch {}
    return process.env.ADMIN_PASSWORD || 'ordutemps2026';
}

function checkAuth(req, res) {
    const pwd = req.headers['x-admin-password'];
    if (!pwd || pwd !== getAdminPassword()) {
        log('warn', 'Accès admin refusé', { ip: req.ip, path: req.path });
        res.status(401).json({ error: 'Mot de passe incorrect.' });
        return false;
    }
    return true;
}

/* ══════════════════════════════════
   Validation magic bytes des images
   Vérifie le contenu réel du fichier,
   pas seulement l'extension.
══════════════════════════════════ */
const IMAGE_SIGNATURES = {
    jpg:  ['ffd8ff'],
    jpeg: ['ffd8ff'],
    png:  ['89504e47'],
    webp: ['52494646'], // RIFF (suivi de WEBP)
    gif:  ['47494638'],
};

function validateImageBytes(base64data, ext) {
    try {
        const buf = Buffer.from(base64data.substring(0, 12), 'base64');
        const hex = buf.toString('hex').toLowerCase();
        const sigs = IMAGE_SIGNATURES[ext.toLowerCase()] || [];
        return sigs.some(sig => hex.startsWith(sig));
    } catch {
        return false;
    }
}

/* ══════════════════════════════════
   Backup automatique de config.json
   Conserve les 10 dernières versions
══════════════════════════════════ */
function backupConfig() {
    if (!fs.existsSync(CONFIG_FILE)) return;
    try {
        const ts  = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(CONFIG_FILE, path.join(BACKUP_DIR, `config-${ts}.json`));
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith('config-'))
            .sort()
            .reverse();
        files.slice(10).forEach(f => {
            try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
        });
    } catch (err) {
        log('error', 'Échec backup config', { error: err.message });
    }
}

/* ══════════════════════════════════
   Échappement HTML (anti-injection email)
══════════════════════════════════ */
function esc(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
app.get('/api/config', (req, res) => {
    try {
        const cfg = fs.existsSync(CONFIG_FILE)
            ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
            : {};
        res.json(cfg);
    } catch (err) {
        log('error', 'Erreur lecture config', { error: err.message });
        res.json({});
    }
});

/* ══════════════════════════════════
   POST /api/config
══════════════════════════════════ */
app.post('/api/config', (req, res) => {
    if (!checkAuth(req, res)) return;
    try {
        backupConfig();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2));
        log('info', 'Config sauvegardée', { ip: req.ip });
        res.json({ success: true });
    } catch (err) {
        log('error', 'Erreur sauvegarde config', { error: err.message });
        res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
    }
});

/* ══════════════════════════════════
   POST /api/upload
══════════════════════════════════ */
app.post('/api/upload', (req, res) => {
    if (!checkAuth(req, res)) return;
    const { data, ext } = req.body;
    if (!data || !ext) return res.status(400).json({ error: 'Données manquantes.' });

    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(ext.toLowerCase())) {
        return res.status(400).json({ error: 'Format non autorisé.' });
    }

    if (!validateImageBytes(data, ext)) {
        log('warn', 'Upload refusé : contenu invalide', { ip: req.ip, ext });
        return res.status(400).json({ error: 'Fichier invalide ou corrompu.' });
    }

    try {
        const filename = crypto.randomBytes(12).toString('hex') + '.' + ext.toLowerCase();
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(data, 'base64'));
        log('info', 'Image uploadée', { filename, ip: req.ip });
        res.json({ url: '/assets/uploads/' + filename });
    } catch (err) {
        log('error', "Erreur upload", { error: err.message });
        res.status(500).json({ error: "Erreur lors de l'upload." });
    }
});

/* ══════════════════════════════════
   POST /api/admin/password
══════════════════════════════════ */
app.post('/api/admin/password', adminLimiter, passwordLimiter, (req, res) => {
    if (!checkAuth(req, res)) return;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères).' });
    }
    try {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify({ password: newPassword }, null, 2));
        log('info', 'Mot de passe admin modifié', { ip: req.ip });
        res.json({ success: true });
    } catch (err) {
        log('error', 'Erreur changement mot de passe', { error: err.message });
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
});

/* ══════════════════════════════════
   GET /emma — Espace admin
══════════════════════════════════ */
app.get('/emma', (_req, res) => {
    res.sendFile(path.join(__dirname, 'emma.html'));
});

/* ══════════════════════════════════
   POST /api/contact
══════════════════════════════════ */
app.post('/api/contact', contactLimiter, async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Champs requis manquants.' });
    }

    if (name.length > 100 || message.length > 5000 || (phone && phone.length > 20)) {
        return res.status(400).json({ error: 'Données trop longues.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from:    `"Or du Temps — Formulaire" <${process.env.EMAIL_USER}>`,
        to:      process.env.EMAIL_TO,
        replyTo: email,
        subject: `Nouveau message de ${esc(name)} — Or du Temps`,
        html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #f9f6f0; border-radius: 8px;">
                <h2 style="color: #A07828; font-size: 1.4rem; margin-bottom: 1.5rem;">Nouveau message de contact</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: .5rem 0; color: #666; width: 120px;"><strong>Nom</strong></td><td style="padding: .5rem 0;">${esc(name)}</td></tr>
                    <tr><td style="padding: .5rem 0; color: #666;"><strong>Email</strong></td><td style="padding: .5rem 0;"><a href="mailto:${esc(email)}" style="color: #A07828;">${esc(email)}</a></td></tr>
                    ${phone ? `<tr><td style="padding: .5rem 0; color: #666;"><strong>Téléphone</strong></td><td style="padding: .5rem 0;">${esc(phone)}</td></tr>` : ''}
                </table>
                <hr style="border: none; border-top: 1px solid #e0d4b8; margin: 1.5rem 0;">
                <p style="color: #333; line-height: 1.7; white-space: pre-wrap;">${esc(message)}</p>
                <hr style="border: none; border-top: 1px solid #e0d4b8; margin: 1.5rem 0;">
                <p style="font-size: .8rem; color: #999;">Message reçu via le formulaire de contact du site Or du Temps.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        log('info', 'Email de contact envoyé', { from: email });
        res.json({ success: true });
    } catch (err) {
        log('error', 'Erreur envoi email', { error: err.message });
        res.status(500).json({ error: "Erreur lors de l'envoi. Veuillez réessayer." });
    }
});

/* ══════════════════════════════════
   Gestionnaire d'erreurs global Express
══════════════════════════════════ */
app.use((err, req, res, _next) => {
    log('error', 'Erreur non gérée', { error: err.message, path: req.path });
    res.status(500).json({ error: 'Erreur serveur.' });
});

app.listen(PORT, () => {
    log('info', 'Or du Temps — serveur démarré', { port: PORT, env: process.env.NODE_ENV || 'development' });
});
