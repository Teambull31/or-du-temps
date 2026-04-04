require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR    = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ADMIN_FILE  = path.join(DATA_DIR, 'admin.json');
const UPLOADS_DIR = path.join(__dirname, 'assets', 'uploads');

[DATA_DIR, UPLOADS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

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
        res.status(401).json({ error: 'Mot de passe incorrect.' });
        return false;
    }
    return true;
}

/* ══════════════════════════════════
   POST /api/admin/check — vérification du mot de passe
══════════════════════════════════ */
app.post('/api/admin/check', (req, res) => {
    if (!checkAuth(req, res)) return;
    res.json({ ok: true });
});

/* ══════════════════════════════════
   GET /api/config — lecture de la config
══════════════════════════════════ */
app.get('/api/config', (req, res) => {
    try {
        const cfg = fs.existsSync(CONFIG_FILE)
            ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
            : {};
        res.json(cfg);
    } catch {
        res.json({});
    }
});

/* ══════════════════════════════════
   POST /api/config — sauvegarde de la config
══════════════════════════════════ */
app.post('/api/config', (req, res) => {
    if (!checkAuth(req, res)) return;
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(req.body, null, 2));
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
    }
});

/* ══════════════════════════════════
   POST /api/upload — upload d'une image locale
   Body: { data: "<base64>", ext: "jpg" }
   Réponse: { url: "/assets/uploads/xxx.jpg" }
══════════════════════════════════ */
app.post('/api/upload', (req, res) => {
    if (!checkAuth(req, res)) return;
    const { data, ext } = req.body;
    if (!data || !ext) return res.status(400).json({ error: 'Données manquantes.' });

    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowed.includes(ext.toLowerCase())) {
        return res.status(400).json({ error: 'Format non autorisé.' });
    }

    try {
        const filename = crypto.randomBytes(12).toString('hex') + '.' + ext.toLowerCase();
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(data, 'base64'));
        res.json({ url: '/assets/uploads/' + filename });
    } catch {
        res.status(500).json({ error: "Erreur lors de l'upload." });
    }
});

/* ══════════════════════════════════
   POST /api/admin/password — changement de mot de passe
   Body: { newPassword: "..." }
══════════════════════════════════ */
app.post('/api/admin/password', (req, res) => {
    if (!checkAuth(req, res)) return;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères).' });
    }
    try {
        fs.writeFileSync(ADMIN_FILE, JSON.stringify({ password: newPassword }, null, 2));
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
});

/* ══════════════════════════════════
   POST /api/contact — Formulaire
══════════════════════════════════ */
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Champs requis manquants.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Adresse email invalide.' });
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `"Or du Temps — Formulaire" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO,
        replyTo: email,
        subject: `Nouveau message de ${name} — Or du Temps`,
        html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 2rem; background: #f9f6f0; border-radius: 8px;">
                <h2 style="color: #A07828; font-size: 1.4rem; margin-bottom: 1.5rem;">Nouveau message de contact</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: .5rem 0; color: #666; width: 120px;"><strong>Nom</strong></td><td style="padding: .5rem 0;">${name}</td></tr>
                    <tr><td style="padding: .5rem 0; color: #666;"><strong>Email</strong></td><td style="padding: .5rem 0;"><a href="mailto:${email}" style="color: #A07828;">${email}</a></td></tr>
                    ${phone ? `<tr><td style="padding: .5rem 0; color: #666;"><strong>Téléphone</strong></td><td style="padding: .5rem 0;">${phone}</td></tr>` : ''}
                </table>
                <hr style="border: none; border-top: 1px solid #e0d4b8; margin: 1.5rem 0;">
                <p style="color: #333; line-height: 1.7; white-space: pre-wrap;">${message}</p>
                <hr style="border: none; border-top: 1px solid #e0d4b8; margin: 1.5rem 0;">
                <p style="font-size: .8rem; color: #999;">Message reçu via le formulaire de contact du site Or du Temps.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur envoi email:', err);
        res.status(500).json({ error: 'Erreur lors de l\'envoi. Veuillez réessayer.' });
    }
});

app.listen(PORT, () => {
    console.log(`Or du Temps — serveur démarré sur http://localhost:${PORT}`);
});
