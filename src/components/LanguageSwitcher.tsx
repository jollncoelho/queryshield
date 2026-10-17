'use client';

/**
 * Selecteur de langue.
 *
 * Le choix est memorise dans un cookie (`qs_locale`) puis la page est
 * rafraichie : la langue est resolue cote serveur, donc l'interface entiere
 * — y compris le contenu statique des pages — repart dans la bonne langue,
 * sans clignotement ni traduction partielle.
 */

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_DESCRIPTORS,
  type Locale,
} from '@/lib/i18n/config';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/ui';

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const select = (next: Locale) => {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <label
      className={cn(
        'relative hidden items-center rounded-lg border border-line bg-ink-900 transition-opacity sm:flex',
        pending && 'opacity-60',
      )}
    >
      <span className="sr-only">{t.meta.switchLabel}</span>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.5 3.6 8.5S14.4 18.4 12 20.5C9.6 18.4 8.4 15.5 8.4 12S9.6 6.1 12 3.5z" />
      </svg>
      <select
        value={locale}
        onChange={(event) => select(event.target.value as Locale)}
        aria-label={t.meta.switchLabel}
        className="cursor-pointer appearance-none bg-transparent py-2 pl-8 pr-7 text-[12px] text-slate-300 outline-none"
      >
        {LOCALES.map((item) => (
          <option key={item} value={item} className="bg-ink-900 text-slate-200">
            {LOCALE_DESCRIPTORS[item].label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-2 h-3 w-3 text-slate-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
