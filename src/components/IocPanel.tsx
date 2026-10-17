import type { Iocs } from '@/lib/engine/types';
import { defang } from '@/lib/ui';

interface IocPanelProps {
  iocs: Iocs;
}

const GROUPS: { key: keyof Iocs; label: string; mono: boolean }[] = [
  { key: 'urls', label: 'Liens', mono: true },
  { key: 'domains', label: 'Domaines', mono: true },
  { key: 'emails', label: 'Adresses e-mail', mono: true },
  { key: 'phones', label: 'Telephones', mono: true },
  { key: 'ibans', label: 'IBAN', mono: true },
  { key: 'crypto', label: 'Adresses crypto', mono: true },
  { key: 'files', label: 'Fichiers cites', mono: true },
];

export function IocPanel({ iocs }: IocPanelProps) {
  const groups = GROUPS.filter((group) => iocs[group.key].length > 0);
  const total = groups.reduce((count, group) => count + iocs[group.key].length, 0);

  return (
    <div className="qs-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
        <h3 className="text-[14px] font-medium text-slate-200">Indicateurs extraits</h3>
        <span className="text-[11px] text-slate-500">{total} element(s)</span>
      </div>

      {groups.length === 0 ? (
        <p className="px-5 py-4 text-[12.5px] text-slate-500">
          Aucun lien, adresse ou identifiant bancaire n a ete extrait de ce message.
        </p>
      ) : (
        <div className="divide-y divide-line/70">
          {groups.map((group) => (
            <div key={group.key} className="px-5 py-4">
              <p className="qs-label">
                {group.label} · {iocs[group.key].length}
              </p>
              <ul className="mt-2.5 space-y-1.5">
                {iocs[group.key].slice(0, 12).map((value) => (
                  <li
                    key={value}
                    className="break-all font-mono text-[11.5px] leading-relaxed text-slate-300"
                  >
                    {group.mono ? defang(value) : value}
                  </li>
                ))}
                {iocs[group.key].length > 12 && (
                  <li className="text-[11px] text-slate-600">
                    … et {iocs[group.key].length - 12} autre(s)
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="border-t border-line/70 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
        Les liens sont volontairement neutralises a l affichage et n ont jamais ete ouverts ni resolus par le moteur.
      </p>
    </div>
  );
}
