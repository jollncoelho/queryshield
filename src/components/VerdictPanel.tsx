'use client';

import { ScoreGauge } from './ScoreGauge';
import type { AnalyzeResult } from '@/lib/engine/types';
import { confidenceLabel } from '@/lib/i18n/labels';
import { useI18n } from '@/lib/i18n/provider';
import { SEVERITY_STYLE, VERDICT_STYLE, cn, confidenceKey } from '@/lib/ui';

interface VerdictPanelProps {
  result: AnalyzeResult;
  quota?: { used: number; limit: number; remaining: number };
}

const SEVERITY_ROWS = ['critical', 'high', 'medium', 'low', 'info'] as const;

export function VerdictPanel({ result, quota }: VerdictPanelProps) {
  const { t, format } = useI18n();
  const style = VERDICT_STYLE[result.verdict];
  const verdictLabel = t.verdict[result.verdict];
  const maxCategory = Math.max(1, ...result.categories.map((item) => item.score));

  return (
    <section className={cn('qs-card border p-5', style.border, style.bg)}>
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <ScoreGauge score={result.score} style={style} label={verdictLabel} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className={cn('text-[19px] font-medium', style.text)}>{verdictLabel}</h2>
            <span className="qs-chip border-line bg-ink-900 text-slate-400">
              {format(t.common.confidenceChip, {
                level: confidenceLabel(confidenceKey(result.confidence), t),
                percent: Math.round(result.confidence * 100),
              })}
            </span>
            {result.meta.llmUsed && (
              <span className="qs-chip border-brand-500/40 bg-brand-500/10 text-brand-300">
                {t.common.semanticActive}
              </span>
            )}
          </div>

          <p className="mt-3 text-[13px] leading-relaxed text-slate-300">{result.summary}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {SEVERITY_ROWS.filter((severity) => result.signals[severity] > 0).map((severity) => {
              const severityStyle = SEVERITY_STYLE[severity];
              return (
                <span
                  key={severity}
                  className={cn('qs-chip', severityStyle.bg, severityStyle.border, severityStyle.text)}
                >
                  {result.signals[severity]} {t.severity[severity].toLowerCase()}
                </span>
              );
            })}
            {result.findings.length === 0 && (
              <span className="qs-chip border-emerald-500/35 bg-emerald-500/10 text-emerald-300">
                {t.common.noSignal}
              </span>
            )}
          </div>

          {result.categories.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="qs-label">{t.common.categoriesTitle}</p>
              {result.categories.slice(0, 5).map((item) => (
                <div key={item.category} className="flex items-center gap-3">
                  <span className="w-[190px] shrink-0 truncate text-[12px] text-slate-400">
                    {t.category[item.category]}
                  </span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(6, (item.score / maxCategory) * 100)}%`,
                        backgroundColor: style.hex,
                        opacity: 0.75,
                      }}
                    />
                  </span>
                  <span className="w-6 shrink-0 text-right font-mono text-[11px] text-slate-500">
                    {item.findings}
                  </span>
                </div>
              ))}
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line/70 pt-4 text-[11px] sm:grid-cols-4">
            <div>
              <dt className="text-slate-500">{t.common.engine}</dt>
              <dd className="mt-0.5 font-mono text-slate-300">{result.meta.engine}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t.common.duration}</dt>
              <dd className="mt-0.5 font-mono text-slate-300">{result.meta.durationMs} ms</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t.common.headers}</dt>
              <dd className="mt-0.5 font-mono text-slate-300">
                {result.meta.headersProvided ? t.common.headersAnalyzed : t.common.headersMissing}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t.common.quotaToday}</dt>
              <dd className="mt-0.5 font-mono text-slate-300">
                {quota ? `${quota.used} / ${quota.limit}` : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
