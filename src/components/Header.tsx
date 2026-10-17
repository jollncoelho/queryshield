'use client';

import Link from 'next/link';

import { useI18n } from '@/lib/i18n/provider';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header() {
  const { t } = useI18n();

  const nav = [
    { href: '/', label: t.nav.analyzer },
    { href: '/verifier-site', label: t.nav.site },
    { href: '/tarifs', label: t.nav.pricing },
    { href: '/api-docs', label: t.nav.api },
    { href: '/compte', label: t.nav.account },
    { href: '/legal/confidentialite', label: t.nav.privacy },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-brand-500/40 bg-brand-500/10">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#5EB8FF" strokeWidth="1.6">
              <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z" strokeLinejoin="round" />
              <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-medium text-slate-100">QueryShield</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">query-intel.com</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[13px] text-slate-400 transition-colors hover:bg-ink-800 hover:text-slate-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`mailto:${t.header.support}`}
            className="hidden rounded-lg border border-line px-3 py-2 text-[12px] text-slate-400 transition-colors hover:border-line-strong hover:text-slate-200 lg:block"
          >
            {t.header.support}
          </a>
          <LanguageSwitcher />
          <Link href="/tarifs" className="qs-btn-primary px-3.5 py-2 text-[12px]">
            {t.header.openAccess}
          </Link>
        </div>
      </div>
    </header>
  );
}
