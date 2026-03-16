require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
