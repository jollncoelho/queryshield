import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions d utilisation et avertissement',
  description:
    'Conditions d utilisation de QueryShield et clause de non-responsabilite : le service fournit une evaluation de risque, non une garantie de detection.',
};

const SECTIONS = [
  {
    title: '1. Objet du service',
    paragraphs: [
      'QueryShield est un outil d aide a la decision. Il analyse un message que vous lui soumettez et produit une evaluation automatisee du niveau de risque, accompagnee d un score de probabilite et de la liste des signaux detectes.',
      'Le service ne constitue ni un antivirus, ni un filtre de messagerie, ni un service de blocage. Il ne modifie pas vos messages et n agit pas a votre place.',
    ],
  },
  {
    title: '2. Avertissement — clause de non-responsabilite',
    emphasis: true,
    paragraphs: [
      'Le score et le verdict produits sont des estimations. Aucun systeme automatise ne peut garantir une detection fiable a 100 %. Deux erreurs sont possibles et doivent etre connues : un message frauduleux peut ne declencher aucun signal (faux negatif), et un message legitime peut en declencher (faux positif).',
      'En consequence, l evaluation fournie ne saurait etre interpretee comme une certification de fiabilite, de securite ou d authenticite d un message, d un expediteur ou d un site web. Elle ne remplace en aucun cas la verification aupres de l organisme concerne, ni l avis d un professionnel qualifie.',
      'L utilisateur demeure seul responsable des decisions qu il prend a la suite de la consultation d un rapport, y compris la decision de cliquer, de repondre, de payer ou de transmettre des informations. Le service ne peut etre tenu responsable d un dommage resultant d une erreur de detection, dans les limites permises par la loi.',
    ],
  },
  {
    title: '3. Usage autorise',
    bullets: [
      'Vous ne devez soumettre que des messages que vous etes legitime a analyser. Ne transmettez pas de contenu appartenant a un tiers sans son accord.',
      'Il est interdit d utiliser le service pour tester, ameliorer ou entrainer un systeme concurrent, ou pour automatiser des envois frauduleux.',
      'Il est interdit de contourner les quotas, de partager une cle de licence hors du perimetre autorise, ou de revendre l acces au service.',
      'L usage du service a des fins de harcelement, de surveillance abusive ou d atteinte a la vie privee d autrui est proscrit.',
    ],
  },
  {
    title: '4. Quotas, offres et facturation',
    paragraphs: [
      'Les offres gratuites sont soumises a un quota quotidien. Les offres payantes sont facturees par abonnement recurrent, mensuel ou annuel, par l intermediaire de Stripe.',
      'L abonnement est resiliable a tout moment depuis l espace client. La resiliation prend effet a la fin de la periode en cours ; les sommes deja versees ne sont pas remboursees, sauf disposition legale contraire.',
      'Le service peut evoluer. En cas de modification substantielle d une offre payante, les utilisateurs concernes en sont informes avant l echeance suivante.',
    ],
  },
  {
    title: '5. Disponibilite',
    paragraphs: [
      'Le service est fourni en l etat. Aucune garantie de disponibilite continue n est donnee, notamment pour les offres gratuites. Des interruptions pour maintenance ou pour raison de securite peuvent survenir sans preavis.',
      'Le microservice d analyse semantique est un composant optionnel : son indisponibilite n affecte pas la fourniture du rapport heuristique.',
    ],
  },
  {
    title: '6. Propriete intellectuelle',
    paragraphs: [
      'Le moteur d analyse, le referentiel de regles, les interfaces et la documentation sont proteges. L utilisation du service ne confere aucun droit de propriete sur ces elements.',
      'Vous conservez l integralite de vos droits sur les messages que vous soumettez. Vous accordez uniquement l autorisation technique necessaire au traitement de votre requete.',
    ],
  },
  {
    title: '7. Droit applicable',
    paragraphs: [
      'Les presentes conditions sont soumises au droit francais. En cas de litige, une solution amiable sera recherchee en priorite par le biais de support@query-intel.com avant toute action contentieuse.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-[30px] font-medium tracking-[-0.01em] text-slate-50">
        Conditions d utilisation et avertissement
      </h1>
      <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
        Version en vigueur au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
        L utilisation du service vaut acceptation sans reserve des presentes conditions.
      </p>

      <div className="mt-10 space-y-9">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className={section.emphasis ? 'qs-card border-amber-500/30 bg-amber-500/[0.06] p-5' : undefined}
          >
            <h2 className="text-[16px] font-medium text-slate-100">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-[13px] leading-relaxed text-slate-400">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-3 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[13px] leading-relaxed text-slate-400">
                    <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
