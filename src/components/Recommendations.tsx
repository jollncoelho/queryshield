'use client';

import { useI18n } from '@/lib/i18n/provider';

interface RecommendationsProps {
  items: string[];
}

/**
 * Les recommandations proviennent du moteur et restent en francais : leur
 * traduction demande de les transformer en identifiants de regle, ce qui est
 * prevu dans une etape ulterieure. Le titre, lui, suit la langue active.
 */
export function Recommendations({ items }: RecommendationsProps) {
  const { t } = useI18n();

  if (items.length === 0) return null;

  return (
    <div className="qs-card overflow-hidden">
      <div className="border-b border-line/70 px-5 py-3.5">
        <h3 className="text-[14px] font-medium text-slate-200">{t.common.whatToDo}</h3>
      </div>
      <ol className="divide-y divide-line/70">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3.5 px-5 py-4">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-brand-500/40 bg-brand-500/10 font-mono text-[10.5px] text-brand-400">
              {index + 1}
            </span>
            <p className="text-[12.5px] leading-relaxed text-slate-300">{item}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
