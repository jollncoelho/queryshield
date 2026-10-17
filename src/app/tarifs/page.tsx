import type { Metadata } from 'next';
import Link from 'next/link';
import { PlanButton } from '@/components/PlanButton';
import { cn } from '@/lib/ui';

export const metadata: Metadata = {
  title: 'Offres et tarifs',
  description:
    'Analyse de messages suspects : offre gratuite limitee, offres Pro et Business avec acces API, quotas eleves et support dedie.',
};

const PLANS = [
  {
    id: 'free',
    name: 'Decouverte',
    price: '0 €',
    period: 'pour toujours',
    tagline: 'Pour tester le moteur sur quelques messages.',
    features: [
      '10 analyses par jour',
      'Analyse heuristique complete',
      'Analyse des en-tetes SPF / DKIM / DMARC',
      'Rapport exportable',
      'Aucune conservation des messages',
    ],
    cta: null,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9 €',
    period: 'par mois',
    tagline: 'Pour un usage personnel intensif ou un independant.',
    features: [
      '1 000 analyses par jour',
      'Acces API avec cle de licence',
      'Passe semantique LLM incluse',
      'Historique local des rapports',
      'Support par e-mail sous 48 h',
    ],
    cta: { plan: 'pro' as const, interval: 'monthly' as const, label: 'S abonner — 9 € / mois' },
    featured: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: '49 €',
    period: 'par mois',
    tagline: 'Pour les equipes qui traitent des messages clients.',
    features: [
      '10 000 analyses par jour',
      'Quotas mutualises par organisation',
      'Acces API multi-cles',
      'Export des rapports et statistiques',
      'Support dedie et accompagnement',
    ],
    cta: { plan: 'business' as const, interval: 'monthly' as const, label: 'S abonner — 49 € / mois' },
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <h1 className="text-[30px] font-medium tracking-[-0.01em] text-slate-50">Offres et tarifs</h1>
      <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400">
        Sans engagement, resiliable a tout moment. Le paiement est traite par Stripe : aucune donnee bancaire ne
        transite par nos serveurs. Les offres annuelles beneficient de deux mois offerts.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'qs-card flex flex-col p-6',
              plan.featured && 'border-brand-500/45 bg-brand-500/[0.06]',
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-slate-100">{plan.name}</h2>
              {plan.featured && (
                <span className="qs-chip border-brand-500/40 bg-brand-500/10 text-brand-300">Recommande</span>
              )}
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[32px] font-medium text-slate-50">{plan.price}</span>
              <span className="text-[12px] text-slate-500">{plan.period}</span>
            </div>

            <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">{plan.tagline}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-[12.5px] text-slate-300">
                  <svg viewBox="0 0 16 16" className="mt-[3px] h-3.5 w-3.5 shrink-0" fill="none" stroke="#5EB8FF" strokeWidth="1.8">
                    <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.cta ? (
                <PlanButton
                  plan={plan.cta.plan}
                  interval={plan.cta.interval}
                  label={plan.cta.label}
                  variant={plan.featured ? 'primary' : 'ghost'}
                />
              ) : (
                <Link href="/#analyseur" className="qs-btn-ghost w-full">
                  Utiliser l analyseur gratuit
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="qs-card p-6">
          <h2 className="text-[15px] font-medium text-slate-100">Offres annuelles</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
            Pro annuel : 90 € au lieu de 108 €. Business annuel : 490 € au lieu de 588 €.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <PlanButton plan="pro" interval="yearly" label="Pro annuel — 90 €" variant="ghost" />
            <PlanButton plan="business" interval="yearly" label="Business annuel — 490 €" variant="ghost" />
          </div>
        </div>

        <div className="qs-card p-6">
          <h2 className="text-[15px] font-medium text-slate-100">Moyens de paiement</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">
            Cartes bancaires, prélèvement SEPA et portefeuilles pris en charge par Stripe. Facturation automatique
            mensuelle ou annuelle, avec possibilite de resiliation immediate depuis l espace client.
          </p>
          <p className="mt-4 text-[11.5px] leading-relaxed text-slate-500">
            Les offres affichees sont indicatives et peuvent evoluer. Pour un besoin specifique (volume, integration
            sur mesure, marche public), ecrivez a support@query-intel.com.
          </p>
        </div>
      </div>
    </div>
  );
}
