# Déploiement — Or du Temps (Vercel + Supabase)

Le site est **100 % statique** et se déploie sur **Vercel**. Tout le contenu modifiable
par Emma (textes, photos, vidéos, tarifs, avis, FAQ…) est stocké dans **Supabase**
(base de données + stockage de fichiers). Aucun serveur à maintenir.

```
Navigateur ─┬─► Vercel (HTML/CSS/JS statiques)
            ├─► Supabase  ├─ table  ordutemps_site_config  (contenu du site)
            │             └─ bucket ordutemps-media        (images + vidéos)
            └─► Formspree (formulaire de contact, optionnel)
```

## 1. Déployer sur Vercel

1. Aller sur https://vercel.com → **Add New… → Project**.
2. Importer le dépôt GitHub `teambull31/or-du-temps`.
3. **Framework Preset : Other**. Laisser *Build Command* et *Output Directory* vides
   (le `vercel.json` + `.vercelignore` fournis configurent le reste).
4. **Deploy**. Le site est en ligne en ~30 s.
5. (Optionnel) **Settings → Domains** : brancher `ordutemps.fr`.

Aucune variable d'environnement n'est nécessaire : les clés Supabase publiques
(lecture seule) sont dans `supabase-config.js` et protégées par les règles RLS.

Chaque `git push` sur la branche de production redéploie automatiquement.

## 2. Le backend Supabase (déjà en place)

- **Projet** : `or-du-temps` — ref `pjehjrqlgyozxeatxkjc` (région Paris).
- **Table** `public.ordutemps_site_config` : une ligne (`id = 1`, colonne `data` JSONB)
  contenant toute la configuration du site. Lecture publique, écriture réservée à Emma.
- **Bucket** `ordutemps-media` : images et vidéos téléversées depuis l'admin (public en
  lecture). Limite 200 Mo/fichier.
- **Compte admin** : `emma@ordutemps.fr` (mot de passe communiqué séparément — à changer
  à la première connexion via l'onglet **Sécurité** de l'admin).

Les règles RLS n'autorisent l'écriture (contenu + upload) qu'à l'utilisateur d'Emma.
Les clés publiques ne permettent que la lecture.

## 3. L'espace d'administration d'Emma

- URL : `https://<votre-domaine>/emma`
- Connexion avec le mot de passe. Emma peut modifier, **même depuis son téléphone** :
  **Photos** (upload direct), **Textes**, **Tarifs & Soins**, **Témoignages**,
  **Galerie & FAQ**, **Vidéos** (upload de fichier **ou** lien YouTube), **Contact**.
- Chaque **Enregistrer** publie immédiatement en ligne (écriture dans Supabase).
  Pas besoin de toucher à Git ni au tableau de bord Supabase.

### Intégrer une vidéo
Dans **Galerie & FAQ**, pour un emplacement : soit **téléverser un fichier vidéo**
(stocké dans Supabase Storage), soit coller un **lien YouTube**. Les deux s'affichent
en responsive sur le site.

## 4. Formulaire de contact (optionnel)

Le site privilégie les boutons Téléphone / SMS / WhatsApp. Si un formulaire est ajouté,
il utilise **Formspree** : créez un formulaire sur https://formspree.io et renseignez
l'identifiant dans l'admin (champ `formspree_id`). Aucun serveur d'email requis.

## 5. Développement local (facultatif)

Le dépôt contient encore `server.js` (Express) : c'est **un reliquat** de l'ancienne
architecture VPS, utile seulement pour un aperçu local. En production Vercel il n'est pas
utilisé. Pour un simple aperçu statique : servez le dossier avec n'importe quel serveur
statique (ex. `npx serve .`). L'admin nécessite un accès réseau à Supabase.

## Récapitulatif des fichiers clés

| Fichier              | Rôle                                                        |
|----------------------|-------------------------------------------------------------|
| `index.html`         | Page publique                                               |
| `emma.html`          | Espace admin (Supabase Auth + édition + upload)             |
| `script.js`          | Interactions + lecture de la config depuis Supabase         |
| `config.js`          | Config **par défaut** (repli hors-ligne)                    |
| `supabase-config.js` | URL + clé publique Supabase                                 |
| `vercel.json`        | Config déploiement (URLs propres, en-têtes, cache)          |
| `.vercelignore`      | Exclut les fichiers serveur/dev du déploiement statique     |
