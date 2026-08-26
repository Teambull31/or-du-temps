/**
 * Configuration publique Supabase — Or du Temps
 *
 * Ces clés sont PUBLIQUES par conception (clé "anon"/"publishable").
 * Elles n'autorisent que la LECTURE du contenu du site.
 * Toute écriture (config, upload d'images/vidéos) exige que la cliente Emma
 * soit authentifiée : c'est appliqué côté base par les règles RLS (Row Level
 * Security) définies sur le projet Supabase. Il est donc sûr de les committer.
 *
 * Projet : or-du-temps (hébergé, isolé sous les objets « ordutemps_* »)
 */
window.__ODT_SUPABASE__ = {
    url:     'https://pjehjrqlgyozxeatxkjc.supabase.co',
    anonKey: 'sb_publishable_IgyVfCxee6GYzj4ek6qRTw_qyQWxFUA',
    table:   'ordutemps_site_config',
    bucket:  'ordutemps-media',
};
