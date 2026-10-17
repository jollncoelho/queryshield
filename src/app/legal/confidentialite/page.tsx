import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialite',
  description:
    'Comment QueryShield traite les messages soumis : traitement en memoire, absence de conservation, aucune revente de donnees.',
};

const SECTIONS = [
  {
    title: '1. Principe general',
    paragraphs: [
      'QueryShield est concu selon un principe de minimisation : le service ne collecte que ce qui est strictement necessaire pour produire une evaluation de risque, et ne conserve pas le contenu des messages analyses.',
      'Le message que vous soumettez est transmis au moteur d analyse, traite en memoire, puis restitue sous forme de rapport. Il n est jamais ecrit sur disque, ni place dans une file d attente persistante, ni indexe.',
    ],
  },
  {
    title: '2. Donnees traitees',
    bullets: [
      'Contenu du message soumis (texte, et le cas echeant en-tetes bruts d e-mail) : traite en memoire uniquement, duree de traitement inferieure a quelques secondes.',
      'Identifiant technique anonyme, depose sous forme de cookie afin de comptabiliser le quota quotidien. Cet identifiant est un UUID aleatoire, non relie a votre identite.',
      'Donnees de facturation : en cas d abonnement, elles sont collectees et traitees directement par Stripe. QueryShield ne voit ni ne stocke aucun numero de carte bancaire.',
      'Journaux techniques : date, code de reponse HTTP, duree de traitement. Les journaux ne contiennent pas le contenu des messages.',
    ],
  },
  {
    title: '3. Ce que nous ne faisons pas',
    bullets: [
      'Aucune revente, location ou cession de donnees a des tiers.',
      'Aucune utilisation du contenu des messages a des fins publicitaires, de profilage commercial ou d entrainement de modeles.',
      'Aucune ouverture, aucun suivi et aucune resolution des liens contenus dans les messages analyses : le moteur travaille exclusivement sur le texte que vous fournissez.',
      'Aucune constitution de base de donnees de messages : les messages ne sont pas conserves apres la production du rapport.',
    ],
  },
  {
    title: '4. Passe semantique et sous-traitants',
    paragraphs: [
      'Le moteur heuristique fonctionne integralement sur nos serveurs. Si la passe semantique par modele de langage est activee sur votre offre, elle est executee sur une infrastructure que nous controlons. Le recours a un prestataire externe d intelligence artificielle ne serait mis en oeuvre qu avec information prealable et, le cas echeant, apres anonymisation des elements transmis.',
      'Les prestataires techniques intervenant dans le service (hebergement, paiement) sont engages par contrat et n agissent que sur instruction documentee.',
    ],
  },
  {
    title: '5. Base legale et duree de conservation',
    paragraphs: [
      'Le traitement du message soumis repose sur votre consentement, exprime par l action de soumission, et sur l interet legitime a fournir le service demande. Le traitement des donnees de facturation repose sur l execution du contrat.',
      'Le contenu des messages n est pas conserve. L identifiant anonyme de quota est conserve au maximum douze mois. Les donnees de facturation sont conservees par Stripe pour la duree legale applicable, generalement dix ans en matiere comptable.',
    ],
  },
  {
    title: '6. Vos droits',
    paragraphs: [
      'Vous disposez d un droit d acces, de rectification, d effacement, de limitation, d opposition et de portabilite. Compte tenu de l absence de conservation du contenu des messages, l exercice de ces droits porte en pratique sur les donnees de compte et de facturation.',
      'Toute demande peut etre adressee a support@query-intel.com. Une reponse est apportee dans un delai maximal d un mois. Vous pouvez egalement introduire une reclamation aupres de l autorite de controle competente.',
    ],
  },
  {
    title: '7. Securite',
    bullets: [
      'Chiffrement des communications en transit (TLS).',
      'Traitement sans persistance du contenu, ce qui reduit par construction la surface de fuite.',
      'Restriction des acces aux seuls composants necessaires au fonctionnement du service.',
      'Journalisation technique sans contenu de message, permettant de detecter les abus sans constituer de dossier sur les utilisateurs.',
    ],
  },
  {
    title: '8. Contact',
    paragraphs: [
      'Pour toute question relative a la protection des donnees : support@query-intel.com.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <h1 className="text-[30px] font-medium tracking-[-0.01em] text-slate-50">Politique de confidentialite</h1>
      <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
        Version en vigueur au {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
        Ce document decrit de maniere precise ce que le service fait et ne fait pas de vos donnees.
      </p>

      <div className="mt-10 space-y-9">
        {SECTIONS.map((section) => (
          <section key={section.title}>
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
