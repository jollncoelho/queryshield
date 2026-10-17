'use client';

import Link from 'next/link';

import { useI18n } from '@/lib/i18n/provider';

/**
 * Les liens de la colonne « Ressources » pointent vers des services externes
 * dont le nom est un nom propre : ils ne sont pas traduits.
 */
const RESOURCES = [
  { href: 'https://signal-spam.fr', label: 'Signal Spam' },
  { href: 'https://www.internet-signalement.gouv.fr', label: 'Pharos' },
  { href: 'https://33700.fr', label: '33700' },
];

export function Footer() {
  const { t, format } = useI18n();

  const columns = [
    {
      title: t.footer.productTitle,
      links: [
        { href: '/', label: t.footer.linkAnalyzer },
        { href: '/verifier-site', label: t.footer.linkSite },
        { href: '/tarifs', label: t.footer.linkPricing },
        { href: '/api-docs', label: t.footer.linkApiDocs },
        { href: '/api/health', label: t.footer.linkHealth },
      ],
    },
    {
      title: t.footer.legalTitle,
      links: [
        { href: '/legal/confidentialite', label: t.footer.linkPrivacy },
        { href: '/legal/conditions', label: t.footer.linkTerms },
        { href: '/legal/mentions', label: t.footer.linkMentions },
      ],
    },
    {
      title: t.footer.resourcesTitle,
      links: RESOURCES,
    },
  ];

  return (
    <footer className="mt-20 border-t border-line/70 bg-ink-950">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-brand-500/40 bg-brand-500/10">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="#5EB8FF" strokeWidth="1.6">
                  <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[14px] font-medium text-slate-200">QueryShield</span>
            </div>
            <p className="mt-4 max-w-xs text-[12px] leading-relaxed text-slate-500">{t.footer.tagline}</p>
            <a
              href="mailto:support@query-intel.com"
              className="mt-4 inline-block text-[12px] text-brand-400 hover:text-brand-300"
            >
              support@query-intel.com
            </a>
            <a
              href="https://www.query-intel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[12px] text-slate-500 transition-colors hover:text-slate-200"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M10 14L21 3M21 3h-6M21 3v6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.footer.ecosystem}
            </a>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="qs-label">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith('http') ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-[12px] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line/70 pt-6">
          <p className="text-[11px] leading-relaxed text-slate-500">{t.footer.disclaimer}</p>
          <p className="mt-4 text-[11px] text-slate-600">
            {format(t.footer.rights, { year: new Date().getFullYear() })}
          </p>
          <p className="mt-2 text-[11px] text-slate-600">{t.footer.legalNotice}</p>
        </div>
      </div>
    </footer>
  );
}
