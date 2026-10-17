/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // better-sqlite3 est un module natif : on l'externalise pour que Next ne
  // tente pas de le bundler (il doit etre requis a l'execution, cote serveur).
  // Sur Vercel, le pilote de stockage recommande reste `memory`
  // (QUERYSHIELD_DB_DRIVER=memory) car le systeme de fichiers est ephemere.
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
