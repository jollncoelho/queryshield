import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LOCALE_DESCRIPTORS } from '@/lib/i18n/config';
import { I18nProvider } from '@/lib/i18n/provider';
import { getServerDictionary } from '@/lib/i18n/server';

/**
 * Les metadonnees suivent la langue resolue (cookie, puis `Accept-Language`).
 * Le francais reste la langue de reference du site : c'est lui qui est servi
 * quand aucune preference n'est exprimee.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getServerDictionary();
  const descriptor = LOCALE_DESCRIPTORS[locale];

  return {
    title: {
      default: t.meta.title,
      template: '%s · QueryShield',
    },
    description: t.meta.description,
    applicationName: 'QueryShield',
    keywords: [
      'hameconnage',
      'phishing',
      'arnaque SMS',
      'fraude bancaire',
      'OSINT',
      'cybersecurite',
      'analyse de message',
    ],
    openGraph: {
      title: t.meta.ogTitle,
      description: t.meta.ogDescription,
      type: 'website',
      locale: descriptor.ogLocale,
    },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getServerDictionary();

  return (
    <html lang={LOCALE_DESCRIPTORS[locale].htmlLang}>
      <body className="min-h-screen bg-ink-950 font-sans antialiased">
        <I18nProvider locale={locale} dictionary={t}>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(600px circle at 15% -5%, rgba(46,155,240,0.14), transparent 60%), radial-gradient(500px circle at 90% 0%, rgba(34,211,238,0.08), transparent 55%)',
            }}
          />
          <Header />
          <main>{children}</main>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
