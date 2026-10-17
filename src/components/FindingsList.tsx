'use client';

import type { Finding } from '@/lib/engine/types';
import { useI18n } from '@/lib/i18n/provider';
import { SEVERITY_STYLE, cn } from '@/lib/ui';

interface FindingsListProps {
  findings: Finding[];
}

export function FindingsList({ findings }: FindingsListProps) {
  const { t, format, finding } = useI18n();

  if (findings.length === 0) {
    return (
      <div className="qs-card p-5">
        <h3 className="text-[14px] font-medium text-slate-200">{t.common.signalsDetected}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-400">{t.common.noFindingsDetail}</p>
      </div>
    );
  }

  const countLabel =
    findings.length > 1
      ? format(t.common.rulesTriggeredPlural, { count: findings.length })
      : format(t.common.rulesTriggered, { count: findings.length });

  return (
    <div className="qs-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-5 py-3.5">
        <h3 className="text-[14px] font-medium text-slate-200">{t.common.signalsDetected}</h3>
        <span className="text-[11px] text-slate-500">{countLabel}</span>
      </div>

      <ul className="divide-y divide-line/70">
        {findings.map((item) => {
          const style = SEVERITY_STYLE[item.severity];
          const text = finding(item);
          return (
            <li key={item.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('qs-chip', style.bg, style.border, style.text)}>
                  {t.severity[item.severity]}
                </span>
                <span className="qs-chip border-line bg-ink-900 text-slate-400">{t.category[item.category]}</span>
                {item.sources.includes('llm') && (
                  <span className="qs-chip border-sky-500/40 bg-sky-500/10 text-sky-300">{t.common.semantic}</span>
                )}
                <span className="ml-auto font-mono text-[10px] text-slate-600">{item.id}</span>
              </div>

              <h4 className="mt-2.5 text-[13px] font-medium text-slate-100">{text.title}</h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{text.detail}</p>

              {item.evidence && (
                <div className="mt-3 overflow-hidden rounded-lg border border-line bg-ink-900">
                  <p className="border-b border-line/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    {t.common.trigger}
                  </p>
                  <p className="break-all px-3 py-2 font-mono text-[11.5px] leading-relaxed text-slate-300">
                    {item.evidence}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
