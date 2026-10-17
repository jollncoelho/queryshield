'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SiteCheckResult } from '@/lib/engine/site';
import { apiErrorMessage, confidenceLabel } from '@/lib/i18n/labels';
import { useI18n } from '@/lib/i18n/provider';
import type { Dictionary } from '@/lib/i18n/locales/fr';
import { SITE_VERDICT_STYLE, cn, confidenceKey } from '@/lib/ui';
import { FindingsList } from './FindingsList';
import { Recommendations } from './Recommendations';
import { ScoreGauge } from './ScoreGauge';

type ApiResponse = SiteCheckResult & {
  quota?: { used: number; limit: number; remaining: number };
  plan?: string;
  serverDurationMs?: number;
  message?: string;
  error?: string;
};

/** Adresses de demonstration. Seuls les libelles sont traduits. */
const EXAMPLES = [
  { labelKey: 'exampleOfficial', url: 'https://www.laposte.fr/outils/suivi-colis' },
  { labelKey: 'exampleBank', url: 'credit-agricole-securite.xyz' },
  { labelKey: 'exampleSubdomain', url: 'https://impots.gouv.fr.secure-login.xyz/remboursement' },
  { labelKey: 'exampleRandom', url: 'https://kdvmhvjusprqsfhsgdxjmsx.com' },
] as const satisfies readonly { labelKey: keyof Dictionary['site']; url: string }[];

function NetworkRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2 last:border-b-0">
      <dt className="text-[12px] text-slate-500">{label}</dt>
      <dd className={cn('break-all text-right font-mono text-[11.5px]', tone ?? 'text-slate-300')}>{value}</dd>
    </div>
  );
}

export function SiteChecker() {
  const { t, format } = useI18n();
  const [url, setUrl] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const canSubmit = useMemo(() => url.trim().length >= 4 && !loading, [url, loading]);

  const runCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/check-site', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), active }),
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        setError(apiErrorMessage(payload, t, t.common.genericError));
        return;
      }

      setResult(payload);
    } catch {
      setError(t.common.networkError);
    } finally {
      setLoading(false);
    }
  }, [url, active, t]);

  const reset = useCallback(() => {
    setUrl('');
    setResult(null);
    setError(null);
  }, []);

  const style = result ? SITE_VERDICT_STYLE[result.verdict] : null;

  /**
   * Le moteur renvoie une phrase de synthese en francais, conservee pour les
   * consommateurs de l'API. L'interface la reconstruit ici a partir du verdict
   * et des memes donnees, pour qu'elle suive la langue active.
   */
  const summary = useMemo(() => {
    if (!result) return '';
    if (!result.identity) return t.site.summaryInvalid;

    const host = result.identity.host;

    switch (result.verdict) {
      case 'official':
        return format(t.site.summaryOfficial, {
          host,
          brand: result.officialBrand?.name ?? t.site.knownOrganisation,
        });
      case 'phishing':
        return format(t.site.summaryPhishing, {
          host,
          score: result.score,
          brands: result.impersonatedBrands.length > 0
            ? result.impersonatedBrands.join(', ')
            : t.site.knownOrganisation,
        });
      case 'suspicious':
        return format(t.site.summarySuspicious, { host, score: result.score });
      default:
        return format(t.site.summaryUnknown, { host });
    }
  }, [result, format, t]);

  /** Recommandations : identifiant traduit, repli sur le texte francais du moteur. */
  const recommendations = useMemo(() => {
    if (!result) return [];
    const catalogue = t.siteRecs as Record<string, string | undefined>;
    return result.recommendations.map((item) => catalogue[item.id] ?? item.text);
  }, [result, t]);

  return (
    <div className="space-y-6">
      <section className="qs-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
          <h2 className="text-[14px] font-medium text-slate-200">{t.site.formTitle}</h2>
          <span className="font-mono text-[11px] text-slate-600">{t.common.siteContactedNever}</span>
        </div>

        <div className="space-y-3 p-5">
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value.slice(0, 2048))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canSubmit) void runCheck();
            }}
            placeholder={t.site.urlPlaceholder}
            className="qs-input font-mono"
            aria-label={t.site.urlLabel}
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink-900 px-4 py-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#5EB8FF]"
            />
            <span className="text-[12px] leading-relaxed text-slate-400">
              <span className="text-slate-200">{t.site.activeLabel}</span> — {t.site.activeBody}{' '}
              <span className="text-slate-300">{t.site.activeNeverContacted}</span>
              {t.site.activeTail}
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={runCheck} disabled={!canSubmit} className="qs-btn-primary">
              {loading ? t.site.submitting : t.site.submit}
            </button>
            <button type="button" onClick={reset} className="qs-btn-ghost">
              {t.common.clear}
            </button>
            <p className="ml-auto text-[11px] text-slate-500">{t.common.privacyShort}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-line/70 px-5 py-3.5">
          <p className="qs-label">{t.site.examplesLabel}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example.url}
                type="button"
                onClick={() => {
                  setUrl(example.url);
                  setResult(null);
                  setError(null);
                }}
                className="rounded-lg border border-line bg-ink-800 px-2.5 py-1.5 text-[11.5px] text-slate-400 transition-colors hover:border-line-strong hover:text-slate-200"
              >
                {t.site[example.labelKey]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {result && style && (
        <div className="space-y-6">
          <section className={cn('qs-card border p-5', style.border, style.bg)}>
            <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
              <ScoreGauge score={result.score} style={style} label={t.siteVerdict[result.verdict]} />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className={cn('text-[19px] font-medium', style.text)}>{t.siteVerdict[result.verdict]}</h2>
                  <span className="qs-chip border-line bg-ink-900 text-slate-400">
                    {format(t.common.confidenceChip, {
                      level: confidenceLabel(confidenceKey(result.confidence), t),
                      percent: Math.round(result.confidence * 100),
                    })}
                  </span>
                  {result.meta.active && (
                    <span className="qs-chip border-brand-500/40 bg-brand-500/10 text-brand-300">{t.site.activeChip}</span>
                  )}
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-slate-300">{summary}</p>

                {result.officialBrand && (
                  <p className="mt-3 text-[12.5px] text-emerald-300">
                    {format(t.site.organisation, {
                      name: result.officialBrand.name,
                      category: result.officialBrand.category,
                    })}
                  </p>
                )}

                {result.impersonatedBrands.length > 0 && (
                  <p className="mt-3 text-[12.5px] text-red-300">
                    {format(t.site.impersonated, { brands: result.impersonatedBrands.join(', ') })}
                  </p>
                )}

                {result.identity && (
                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line/70 pt-4 text-[11px] sm:grid-cols-4">
                    <div>
                      <dt className="text-slate-500">{t.site.host}</dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-300">{result.identity.host}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t.site.domain}</dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-300">{result.identity.registrable}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t.site.extension}</dt>
                      <dd className="mt-0.5 font-mono text-slate-300">.{result.identity.tld}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{t.common.duration}</dt>
                      <dd className="mt-0.5 font-mono text-slate-300">{result.meta.durationMs} ms</dd>
                    </div>
                  </dl>
                )}
              </div>
            </div>
          </section>

          {result.network?.attempted && (
            <section className="qs-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[14px] font-medium text-slate-200">{t.site.networkTitle}</h3>
                <span className="font-mono text-[10.5px] text-slate-600">{t.site.networkSource}</span>
              </div>

              <dl className="mt-4">
                <NetworkRow
                  label={t.site.dnsResolution}
                  value={
                    result.network.resolves === null
                      ? t.site.dnsNotChecked
                      : result.network.resolves
                        ? format(t.site.dnsAddresses, { count: result.network.addresses.length })
                        : t.site.dnsFails
                  }
                  tone={
                    result.network.resolves === false
                      ? 'text-amber-300'
                      : result.network.resolves
                        ? 'text-slate-300'
                        : 'text-slate-500'
                  }
                />

                <NetworkRow
                  label={t.site.domainAge}
                  value={
                    result.network.domainAgeDays === null
                      ? t.site.domainAgeUnknown
                      : format(t.site.domainAgeDays, { days: result.network.domainAgeDays })
                  }
                  tone={
                    result.network.domainAgeDays !== null && result.network.domainAgeDays <= 30
                      ? 'text-red-300'
                      : result.network.domainAgeDays !== null && result.network.domainAgeDays <= 180
                        ? 'text-amber-300'
                        : 'text-slate-300'
                  }
                />

                {result.network.registeredAt && (
                  <NetworkRow label={t.site.registeredOn} value={result.network.registeredAt.slice(0, 10)} />
                )}

                {result.network.registrar && (
                  <NetworkRow label={t.site.registrar} value={result.network.registrar} />
                )}

                <NetworkRow
                  label={t.site.reputation}
                  value={
                    result.network.reputation === 'flagged'
                      ? result.network.threats.length > 0
                        ? `${t.site.reputationFlagged} (${result.network.threats.join(', ')})`
                        : t.site.reputationFlagged
                      : result.network.reputation === 'clean'
                        ? t.site.reputationClean
                        : t.site.reputationNotChecked
                  }
                  tone={
                    result.network.reputation === 'flagged'
                      ? 'text-red-300'
                      : result.network.reputation === 'clean'
                        ? 'text-emerald-300'
                        : 'text-slate-500'
                  }
                />
              </dl>

              {result.network.reputation === 'unavailable' && (
                <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500">
                  {t.site.reputationUnavailable}
                </p>
              )}
            </section>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <FindingsList findings={result.findings} />
            <Recommendations items={recommendations} />
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">{t.site.footnote}</p>
        </div>
      )}
    </div>
  );
}
