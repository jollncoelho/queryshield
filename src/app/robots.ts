import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

/**
 * Regle explicite et non ambigue pour Googlebot.
 *
 * Sans ce fichier, Next.js renvoyait un 404 HTML sur /robots.txt. Google
 * interprete un 4xx comme « aucune restriction », mais un fichier explicite
 * permet a la Search Console de verifier et de valider la correction, et
 * d'eviter qu'une regle `Disallow` heritee d'un ancien deploiement (ou d'une
 * URL de preview Vercel) reste en cache.
 *
 * Volontairement aucune regle `Disallow` : les pages privees (/compte) portent
 * deja un `noindex`, que Google ne peut lire que s'il est autorise a les
 * explorer.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
