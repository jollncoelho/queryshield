import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions legales',
  description: 'Editeur, hebergement et contacts du service QueryShield.',
};

const ROWS = [
  { label: 'Nom du service', value: 'QueryShield' },
  { label: 'Editeur', value: 'A COMPLETER — denomination ou nom de l editeur' },
  { label: 'Statut juridique', value: 'A COMPLETER — micro-entreprise, SASU, SAS, association...' },
  { label: 'SIREN / SIRET', value: 'A COMPLETER' },
  { label: 'Numero de TVA', value: 'A COMPLETER (si assujetti)' },
  { label: 'Adresse du siege', value: 'A COMPLETER' },
  { label: 'Responsable de la publication', value: 'A COMPLETER' },
  { label: 'Contact general', value: 'support@query-intel.com' },
  { label: 'Contact protection des donnees', value: 'support@query-intel.com' },
  { label: 'Domaine', value: 'query-intel.com' },
  { label: 'Hebergement', value: 'A COMPLETER — nom, adresse et telephone de l hebergeur' },
  { label: 'Prestataire de paiement', value: 'Stripe Payments Europe, Ltd.' },
];

export default function LegalNoticePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-[30px] font-medium tracking-[-0.01em] text-slate-50">Mentions legales</h1>
      <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
        Informations relatives a l editeur et a l hebergement du service, conformement aux obligations d information
        applicables aux services de communication en ligne.
      </p>

      <div className="mt-10 qs-card overflow-hidden">
        <dl className="divide-y divide-line/70">
          {ROWS.map((row) => (
            <div key={row.label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[240px_1fr] sm:gap-4">
              <dt className="text-[12px] text-slate-500">{row.label}</dt>
              <dd className="text-[12.5px] text-slate-200">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 qs-card border-amber-500/30 bg-amber-500/[0.06] p-5">
        <h2 className="text-[14px] font-medium text-amber-200">A completer avant mise en ligne publique</h2>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-slate-300">
          Les champs marques « A COMPLETER » doivent etre renseignes avant toute ouverture du service au public : ils
          constituent une obligation legale d information. Le fichier source de cette page est
          <code className="mx-1 rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[11.5px] text-brand-300">
            src/app/legal/mentions/page.tsx
          </code>
          .
        </p>
      </div>
    </div>
  );
}
