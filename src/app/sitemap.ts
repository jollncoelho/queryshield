import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

/** Pages publiques indexables. /compte est exclu (noindex), /api/* aussi. */
const PUBLIC_PATHS = [
  '/',
  '/verifier-site',
  '/tarifs',
  '/api-docs',
  '/legal/conditions',
  '/legal/confidentialite',
  '/legal/mentions',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1 : 0.7,
  }));
}
