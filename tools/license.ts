/**
 * Outil d'administration des licences.
 *
 * Usage :
 *   npm run license -- issue --plan pro [--client <id>] [--email <adresse>]
 *                                  [--days 365] [--note "offert"]
 *   npm run license -- list [--limit 50]
 *   npm run license -- show <cle>
 *   npm run license -- revoke <cle> [--note "chargeback"]
 *   npm run license -- quota <sujet> [--day 2026-10-12]
 *   npm run license -- reset-quota <sujet> [--day 2026-10-12]
 *   npm run license -- stats
 *
 * Le sujet de quota est « anon:<identifiant navigateur> » ou « lic:<cle> ».
 */

import { getRepositories, getStorageStatus } from '../src/lib/db';
import { issueLicense, licenseUsability, PLAN_QUOTA, revokeLicense, today } from '../src/lib/license';
import type { Plan } from '../src/lib/db/types';

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string>;
}

function parseArgs(argv: string[]): Args {
  const [command = 'help', ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token.startsWith('--')) {
      const name = token.slice(2);
      const next = rest[index + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = 'true';
      }
    } else {
      positional.push(token);
    }
  }

  return { command, positional, flags };
}

function formatDate(value: number | null): string {
  if (value === null) return 'sans echeance';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function pad(value: string, width: number): string {
  return value.length >= width ? value.slice(0, width) : value.padEnd(width, ' ');
}

function usage(): void {
  console.log(`QueryShield — administration des licences

  issue --plan <pro|business> [--client <id>] [--email <adresse>]
        [--days <nombre>] [--note <texte>] [--stripe-customer <id>]
        [--stripe-subscription <id>]     Emet une licence
  list [--limit <nombre>]               Liste les licences
  show <cle>                            Detail d une licence
  revoke <cle> [--note <texte>]         Revoque une licence
  quota <sujet> [--day <AAAA-MM-JJ>]    Consommation d un sujet
  reset-quota <sujet> [--day <date>]    Remet un compteur a zero
  stats                                 Statistiques des 30 derniers jours

Sujet de quota : « anon:<identifiant navigateur> » ou « lic:<cle de licence> ».
`);
}

function commandIssue(args: Args): void {
  const planFlag = args.flags.plan ?? 'pro';
  if (planFlag !== 'pro' && planFlag !== 'business') {
    console.error('Offre invalide : utilisez --plan pro ou --plan business.');
    process.exitCode = 1;
    return;
  }
  const plan: Exclude<Plan, 'free'> = planFlag;

  const days = args.flags.days ? Number(args.flags.days) : undefined;
  if (days !== undefined && (!Number.isFinite(days) || days <= 0)) {
    console.error('--days doit etre un nombre de jours positif.');
    process.exitCode = 1;
    return;
  }

  const license = issueLicense({
    plan,
    clientId: args.flags.client ?? null,
    email: args.flags.email ?? null,
    note: args.flags.note ?? null,
    stripeCustomerId: args.flags['stripe-customer'] ?? null,
    stripeSubscriptionId: args.flags['stripe-subscription'] ?? null,
    currentPeriodEnd: days === undefined ? null : Date.now() + days * 86_400_000,
  });

  console.log(`Licence emise.

  Cle        : ${license.key}
  Offre      : ${license.plan}  (${PLAN_QUOTA[license.plan]} analyses par jour)
  Porteur    : ${license.clientId ?? 'non rattache'}
  Echeance   : ${formatDate(license.currentPeriodEnd)}
  Note       : ${license.note ?? '—'}

Presentez la cle dans l en-tete « x-qs-license ».
`);
}

function commandList(args: Args): void {
  const limit = args.flags.limit ? Number(args.flags.limit) : 50;
  const licenses = getRepositories().licenses.listAll(Number.isFinite(limit) ? limit : 50);

  if (licenses.length === 0) {
    console.log('Aucune licence enregistree.');
    return;
  }

  console.log(`${pad('CLE', 26)} ${pad('OFFRE', 9)} ${pad('STATUT', 10)} ${pad('ETAT', 9)} ${pad('ECHEANCE', 12)} PORTEUR`);
  console.log('-'.repeat(96));

  const now = Date.now();
  for (const license of licenses) {
    console.log(
      `${pad(license.key, 26)} ${pad(license.plan, 9)} ${pad(license.status, 10)} ` +
        `${pad(licenseUsability(license, now), 9)} ${pad(formatDate(license.currentPeriodEnd), 12)} ` +
        `${license.clientId ?? '—'}`,
    );
  }
  console.log(`\n${licenses.length} licence(s).`);
}

function commandShow(args: Args): void {
  const key = args.positional[0];
  if (!key) {
    console.error('Cle manquante. Usage : show <cle>');
    process.exitCode = 1;
    return;
  }

  const license = getRepositories().licenses.findByKey(key);
  if (!license) {
    console.error(`Licence introuvable : ${key}`);
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({ ...license, usability: licenseUsability(license) }, null, 2));
}

function commandRevoke(args: Args): void {
  const key = args.positional[0];
  if (!key) {
    console.error('Cle manquante. Usage : revoke <cle>');
    process.exitCode = 1;
    return;
  }

  const license = getRepositories().licenses.findByKey(key);
  if (!license) {
    console.error(`Licence introuvable : ${key}`);
    process.exitCode = 1;
    return;
  }

  revokeLicense(key, args.flags.note ?? 'revocation manuelle');
  console.log(`Licence ${key} revoquee. L acces est coupe immediatement.`);
}

function commandQuota(args: Args): void {
  const subject = args.positional[0];
  if (!subject) {
    console.error('Sujet manquant. Usage : quota <sujet>');
    process.exitCode = 1;
    return;
  }

  const day = args.flags.day ?? today();
  const used = getRepositories().quota.peek(subject, day);
  console.log(`Sujet ${subject} — ${day} : ${used} analyse(s) consommee(s).`);
}

function commandResetQuota(args: Args): void {
  const subject = args.positional[0];
  if (!subject) {
    console.error('Sujet manquant. Usage : reset-quota <sujet>');
    process.exitCode = 1;
    return;
  }

  const day = args.flags.day ?? today();
  getRepositories().quota.reset(subject, day);
  console.log(`Compteur remis a zero pour ${subject} le ${day}.`);
}

function commandStats(): void {
  const since = Date.now() - 30 * 86_400_000;
  const { usage, licenses } = getRepositories();

  const total = usage.countSince(since);
  const breakdown = usage.verdictBreakdown(since);
  const all = licenses.listAll(1000);
  const now = Date.now();
  const active = all.filter((license) => licenseUsability(license, now) === 'usable').length;

  console.log(`Fenetre : 30 derniers jours

  Licences enregistrees : ${all.length}
  Licences actives      : ${active}
  Analyses              : ${total}
`);

  if (breakdown.length > 0) {
    console.log('  Repartition des verdicts :');
    for (const entry of breakdown) {
      const ratio = total > 0 ? Math.round((entry.total / total) * 100) : 0;
      console.log(`    ${pad(entry.verdict, 18)} ${pad(String(entry.total), 8)} ${ratio} %`);
    }
  }
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const status = getStorageStatus();

  if (status.degraded) {
    console.error(
      `ATTENTION — stockage degrade (${status.driver}).\n` +
        `${status.reason ?? ''}\n` +
        'Toute modification sera perdue. Renseignez QUERYSHIELD_DB_FILE puis relancez.\n',
    );
  }

  switch (args.command) {
    case 'issue':
      commandIssue(args);
      break;
    case 'list':
      commandList(args);
      break;
    case 'show':
      commandShow(args);
      break;
    case 'revoke':
      commandRevoke(args);
      break;
    case 'quota':
      commandQuota(args);
      break;
    case 'reset-quota':
      commandResetQuota(args);
      break;
    case 'stats':
      commandStats();
      break;
    default:
      usage();
      break;
  }

  getRepositories().close();
}

main();
