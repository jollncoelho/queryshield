import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getRepositories } from '@/lib/db';
import { CLIENT_COOKIE, PLAN_QUOTA, licenseUsability, today } from '@/lib/license';
import { PortalButton } from '@/components/PortalButton';
import { cn } from '@/lib/ui';

export const metadata: Metadata = {
  title: 'Mon compte',
  description: 'Votre licence QueryShield, votre offre et votre consommation du jour.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: 'Actif', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  past_due: { label: 'Paiement en retard', className: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  canceled: { label: 'Resilie', className: 'border-slate-500/40 bg-slate-500/10 text-slate-300' },
  revoked: { label: 'Revoque', className: 'border-red-500/40 bg-red-500/10 text-red-300' },
};

function formatDate(value: number | null): string {
  if (value === null) return 'sans echeance';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

interface AccountPageProps {
  searchParams: Promise<{ paiement?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const clientId = cookieStore.get(CLIENT_COOKIE)?.value ?? null;

  const { licenses, quota } = getRepositories();
  const mine = clientId ? licenses.listByClient(clientId) : [];
  const now = Date.now();
  const day = today(now);

  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <h1 className="text-[30px] font-medium tracking-[-0.01em] text-slate-50">Mon compte</h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400">
        Cette page retrouve votre licence a partir de l identifiant anonyme depose dans votre navigateur. Aucune
        inscription n est necessaire : c est le meme identifiant qui rattache votre abonnement a votre consommation.
      </p>

      {params.paiement === 'succes' && (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 text-[12.5px] leading-relaxed text-emerald-200">
          Paiement enregistre. Votre licence apparait ci-dessous des que Stripe a confirme l abonnement, ce qui prend
          generalement quelques secondes. Rechargez la page si elle n est pas encore visible.
        </div>
      )}

      {params.paiement === 'annule' && (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3.5 text-[12.5px] text-amber-200">
          Paiement annule. Aucun montant n a ete preleve.
        </div>
      )}

      {mine.length === 0 ? (
        <section className="mt-8 qs-card p-6">
          <h2 className="text-[15px] font-medium text-slate-100">Aucun abonnement rattache a ce navigateur</h2>
          <p className="mt-2.5 max-w-2xl text-[12.5px] leading-relaxed text-slate-400">
            Vous utilisez actuellement l offre Decouverte : {PLAN_QUOTA.free} analyses par jour, sans cle de licence.
            Si vous avez souscrit un abonnement depuis un autre navigateur ou un autre appareil, la licence y est
            rattachee : utilisez la cle de licence sur cet appareil, ou ecrivez a support@query-intel.com.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/tarifs" className="qs-btn-primary">
              Voir les offres
            </Link>
            <Link href="/#analyseur" className="qs-btn-ghost">
              Utiliser l analyseur
            </Link>
          </div>
        </section>
      ) : (
        <div className="mt-8 space-y-5">
          {mine.map((license) => {
            const usability = licenseUsability(license, now);
            const status = STATUS_LABEL[license.status] ?? STATUS_LABEL.canceled;
            const used = quota.peek(`lic:${license.key}`, day);
            const limit = PLAN_QUOTA[license.plan];
            const ratio = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;

            return (
              <section key={license.key} className="qs-card p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[16px] font-medium text-slate-100">
                    Offre {license.plan === 'business' ? 'Business' : 'Pro'}
                  </h2>
                  <span className={cn('qs-chip', status.className)}>{status.label}</span>
                  {usability === 'expired' && (
                    <span className="qs-chip border-amber-500/40 bg-amber-500/10 text-amber-300">
                      Periode terminee
                    </span>
                  )}
                </div>

                <div className="mt-5">
                  <p className="qs-label">Cle de licence</p>
                  <p className="mt-2 select-all break-all rounded-lg border border-line bg-ink-900 px-3.5 py-2.5 font-mono text-[13px] text-brand-300">
                    {license.key}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
                    Presentez-la dans l en-tete <code className="font-mono text-slate-400">x-qs-license</code> pour
                    utiliser l API. Ne la partagez pas : elle donne acces a votre quota.
                  </p>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="qs-label">Echeance</p>
                    <p className="mt-1.5 text-[12.5px] text-slate-300">
                      {formatDate(license.currentPeriodEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="qs-label">Analyses aujourd hui</p>
                    <p className="mt-1.5 font-mono text-[12.5px] text-slate-300">
                      {used} / {limit}
                    </p>
                  </div>
                  <div>
                    <p className="qs-label">Origine</p>
                    <p className="mt-1.5 text-[12.5px] text-slate-300">
                      {license.stripeSubscriptionId ? 'Stripe' : 'Emission manuelle'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-700">
                  <span
                    className="block h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.max(2, ratio)}%` }}
                  />
                </div>

                {license.stripeSubscriptionId && (
                  <div className="mt-5">
                    <PortalButton />
                  </div>
                )}
              </section>
            );
          })}

          <p className="text-[11.5px] leading-relaxed text-slate-500">
            Pour resilier, changer de moyen de paiement ou recuperer vos factures, utilisez le portail de gestion
            ci-dessus : il est opere par Stripe. La resiliation prend effet a la fin de la periode en cours.
          </p>
        </div>
      )}
    </div>
  );
}
