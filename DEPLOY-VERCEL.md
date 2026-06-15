# Déploiement Or du Temps sur Vercel

Ce guide explique comment mettre le site en ligne sur **Vercel**, avec un
espace admin `/emma` où Emma modifie elle-même textes, **photos** et **vidéos**.

## Comment ça marche (architecture)

- Les pages (`index.html`, `style.css`, `script.js`, `config.js`, `assets/`)
  sont servies en statique par le CDN Vercel.
- Les routes `/api/*` et `/emma` sont gérées par une fonction serverless
  (`api/index.js`, qui réexporte l'app Express de `lib/app.js`). Le routage est
  défini dans `vercel.json`.
- La **persistance** passe par **Vercel Blob** :
  - la configuration éditable est un fichier JSON (`config/config.json`) ;
  - les photos et vidéos uploadées depuis `/emma` sont stockées comme des blobs
    publics, servis via le CDN.
- Le navigateur **uploade les médias directement** vers Blob
  (`@vercel/blob/client`). Le serveur ne fait qu'émettre un jeton signé après
  avoir vérifié le mot de passe admin (route `/api/blob/upload`). Cela permet
  les **gros fichiers vidéo** et évite la limite de 4,5 Mo des fonctions.
- En local (sans `BLOB_READ_WRITE_TOKEN`), l'app retombe automatiquement sur le
  système de fichiers (dossier `data/`), pratique pour le développement.

## Étapes de déploiement

### 1. Importer le projet
- Sur [vercel.com](https://vercel.com), **Add New → Project**, choisir le repo
  GitHub `Teambull31/or-du-temps`.
- **Framework Preset : Other.** Pas de build command. Install command :
  `npm install`. Output : laisser vide (site statique + fonctions).

### 2. Créer le store Blob
- Dans le projet : **Storage → Create Database → Blob** → relier au projet.
- Cela injecte automatiquement `BLOB_READ_WRITE_TOKEN` dans l'environnement de
  production (rien à copier à la main).

### 3. Variables d'environnement
**Settings → Environment Variables** (Production + Preview) :

| Variable | Valeur | Obligatoire |
|----------|--------|-------------|
| `ADMIN_PASSWORD` | un mot de passe fort | ✅ Oui |
| `ALLOWED_ORIGINS` | `https://ordutemps.fr,https://www.ordutemps.fr` (+ le domaine `*.vercel.app` si vous testez depuis l'admin en preview) | recommandé |
| `CALENDLY_URL` | l'URL Calendly d'Emma | si utilisée |

> `BLOB_READ_WRITE_TOKEN` est ajouté automatiquement par le store Blob — ne pas
> le saisir à la main en production.

### 4. Déployer
- **Deploy.** Une fois en ligne, vérifier `https://<projet>.vercel.app` puis
  `https://<projet>.vercel.app/emma`.

### 5. Domaine personnalisé
- **Settings → Domains** → ajouter `ordutemps.fr` et `www.ordutemps.fr`,
  suivre les instructions DNS. Le HTTPS/TLS est automatique.
- Ajouter le domaine final à `ALLOWED_ORIGINS`.

## Développement local

```bash
# Récupérer les variables (dont le token Blob) depuis Vercel
vercel env pull .env

# Lancer
npm run dev        # lance server.js → lib/app.js sur http://localhost:3000
# ou, pour émuler le routage Vercel et les fonctions :
vercel dev
```

Sans `BLOB_READ_WRITE_TOKEN`, l'édition de textes fonctionne (stockage dans
`data/`), mais l'upload de médias nécessite le token (les médias vont sur Blob).

## Formulaire de contact

Le formulaire utilise **Formspree** (champ « Formspree ID » dans l'onglet
Contact de `/emma`). Aucune configuration SMTP n'est nécessaire sur Vercel.

## Changer le mot de passe admin

Le mot de passe est la variable `ADMIN_PASSWORD`. Pour le modifier :
**Settings → Environment Variables → `ADMIN_PASSWORD`** → nouvelle valeur →
**Redeploy**.

## Points d'attention

- **Rate limiting** : `express-rate-limit` est « best-effort » en serverless
  (compteur en mémoire, réinitialisé à chaque instance froide). Suffisant pour
  un site vitrine ; passer à Upstash/Vercel KV si besoin d'une vraie limite.
- **Cache** : `GET /api/config` renvoie `Cache-Control: max-age=30`. Les
  modifications apparaissent donc en moins d'une minute côté visiteur.
- **Anciennes images** : les chemins `/assets/uploads/…` de l'ère VPS n'existent
  plus sur Vercel. Re-uploader les photos concernées via `/emma` après la mise
  en ligne (ou exécuter le script de migration ponctuel).
