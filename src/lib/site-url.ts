/**
 * Adresse publique canonique du site, utilisee pour les URL absolues
 * (sitemap.xml, robots.txt, metadataBase).
 *
 * `NEXT_PUBLIC_APP_URL` sert deja aux redirections Stripe. On ne le reprend
 * que s'il designe une vraie adresse HTTPS publique : une valeur laissee a
 * `http://localhost:4321` (cf. .env.example) ne doit jamais finir dans un
 * sitemap destine a Google.
 */
const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '');

export const SITE_URL =
  configured && /^https:\/\//.test(configured) && !/localhost|127\.0\.0\.1/.test(configured)
    ? configured
    : 'https://shield.query-intel.com';
