/* ══════════════════════════════════════════════════════════════
   Couche de stockage — Vercel Blob (production) ou système de
   fichiers (développement local / VPS).

   Le backend est choisi automatiquement selon la présence de la
   variable d'environnement BLOB_READ_WRITE_TOKEN :
     - présente  → Vercel Blob (config + médias persistés en ligne)
     - absente   → fichiers locaux dans data/ (comme l'ancien VPS)

   La config est un unique objet JSON. Les médias (photos/vidéos)
   sont, eux, uploadés directement depuis le navigateur vers Blob
   (voir la route /api/blob/upload dans app.js).
══════════════════════════════════════════════════════════════ */

const fs   = require('fs');
const path = require('path');

const USE_BLOB      = !!process.env.BLOB_READ_WRITE_TOKEN;
const CONFIG_PATH   = 'config/config.json';   // chemin stable dans le store Blob
const BACKUP_PREFIX = 'config/backups/';
const MAX_BACKUPS   = 10;

/* ───────── Backend système de fichiers (local / VPS) ───────── */

const ROOT        = path.join(__dirname, '..');
const DATA_DIR    = path.join(ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const BACKUP_DIR  = path.join(DATA_DIR, 'backups');

function fsEnsureDirs() {
    [DATA_DIR, BACKUP_DIR].forEach(d => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    });
}

async function fsGetConfig() {
    try {
        return fs.existsSync(CONFIG_FILE)
            ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
            : {};
    } catch {
        return {};
    }
}

async function fsSaveConfig(obj) {
    fsEnsureDirs();
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            fs.copyFileSync(CONFIG_FILE, path.join(BACKUP_DIR, `config-${ts}.json`));
            fs.readdirSync(BACKUP_DIR)
                .filter(f => f.startsWith('config-'))
                .sort()
                .reverse()
                .slice(MAX_BACKUPS)
                .forEach(f => { try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {} });
        } catch {}
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(obj, null, 2));
}

/* ───────── Backend Vercel Blob (production) ───────── */

let _blob;
function blobSdk() {
    if (!_blob) _blob = require('@vercel/blob');
    return _blob;
}

async function blobGetConfig() {
    try {
        const { list } = blobSdk();
        const { blobs } = await list({ prefix: CONFIG_PATH, limit: 100 });
        const b = blobs.find(x => x.pathname === CONFIG_PATH);
        if (!b) return {};
        // Cache-buster + no-store : les URLs Blob sont mises en cache CDN,
        // on force la lecture de la dernière version sauvegardée.
        const res = await fetch(`${b.url}?t=${Date.now()}`, { cache: 'no-store' });
        return res.ok ? await res.json() : {};
    } catch {
        return {};
    }
}

async function blobSaveConfig(obj) {
    const { put, list, del } = blobSdk();

    // Sauvegarde rotative de la version actuelle (10 dernières).
    try {
        const current = await blobGetConfig();
        if (current && Object.keys(current).length) {
            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            await put(`${BACKUP_PREFIX}config-${ts}.json`, JSON.stringify(current), {
                access: 'public',
                contentType: 'application/json',
                addRandomSuffix: false,
                allowOverwrite: true,
            });
            const { blobs } = await list({ prefix: BACKUP_PREFIX });
            const old = blobs
                .sort((a, b) => (a.pathname < b.pathname ? 1 : -1))
                .slice(MAX_BACKUPS);
            if (old.length) await del(old.map(b => b.url));
        }
    } catch {}

    await put(CONFIG_PATH, JSON.stringify(obj, null, 2), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
    });
}

/* ───────── API publique du module ───────── */

module.exports = {
    USE_BLOB,
    getConfig:        USE_BLOB ? blobGetConfig  : fsGetConfig,
    saveConfig:       USE_BLOB ? blobSaveConfig : fsSaveConfig,
    // Renvoie null si ADMIN_PASSWORD n'est pas définie. Surtout pas de valeur
    // par défaut : ce mot de passe garde aussi l'émission des jetons d'upload
    // Blob, et le repo est public. Les appelants doivent refuser l'accès sur
    // null (échec fermé) plutôt que de laisser passer.
    getAdminPassword: () => process.env.ADMIN_PASSWORD || null,
};
