'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SAMPLES, type Sample } from '@/lib/samples';
import type { AnalyzeResult, Channel } from '@/lib/engine/types';
import { apiErrorMessage } from '@/lib/i18n/labels';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/ui';
import { VerdictPanel } from './VerdictPanel';
import { FindingsList } from './FindingsList';
import { IocPanel } from './IocPanel';
import { Recommendations } from './Recommendations';

type ApiResponse = AnalyzeResult & {
  quota?: { used: number; limit: number; remaining: number };
  plan?: string;
  serverDurationMs?: number;
  message?: string;
  error?: string;
};

const MAX_CHARS = 20000;

/**
 * Journal de traitement affiche pendant l'analyse. Volontairement non traduit :
 * une sortie de console reste technique, comme dans les outils d'analyse reels.
 */
const CONSOLE_STEPS = [
  '[+] Parsing headers…',
  '[+] Checking domain reputation…',
  '[+] Extracting indicators…',
  '[+] Scoring heuristics…',
  '[+] Vector evaluated.',
];

export function Analyzer() {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [rawHeaders, setRawHeaders] = useState('');
  const [showHeaders, setShowHeaders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [logStep, setLogStep] = useState(0);

  /* Revelation progressive du journal pendant l'analyse (respecte prefers-reduced-motion) */
  useEffect(() => {
    if (!loading) {
      setLogStep(0);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLogStep(CONSOLE_STEPS.length);
      return;
    }
    let step = 0;
    const timer = window.setInterval(() => {
      step += 1;
      setLogStep(step);
      if (step >= CONSOLE_STEPS.length) window.clearInterval(timer);
    }, 420);
    return () => window.clearInterval(timer);
  }, [loading]);

  const channels: { value: Channel; label: string }[] = [
    { value: 'email', label: t.analyzer.channelEmail },
    { value: 'sms', label: t.analyzer.channelSms },
    { value: 'messaging', label: t.analyzer.channelMessaging },
    { value: 'unknown', label: t.analyzer.channelOther },
  ];

  const canSubmit = useMemo(() => text.trim().length >= 4 && !loading, [text, loading]);

  const loadSample = useCallback((sample: Sample) => {
    setText(sample.text);
    setChannel(sample.channel);
    setSender(sample.sender ?? '');
    setSubject(sample.subject ?? '');
    setRawHeaders(sample.rawHeaders ?? '');
    setShowHeaders(Boolean(sample.rawHeaders));
    setActiveSample(sample.id);
    setResult(null);
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setText('');
    setSender('');
    setSubject('');
    setRawHeaders('');
    setShowHeaders(false);
    setActiveSample(null);
    setResult(null);
    setError(null);
  }, []);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text,
          channel,
          sender: sender.trim() || undefined,
          subject: subject.trim() || undefined,
          rawHeaders: rawHeaders.trim() || undefined,
        }),
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
  }, [text, channel, sender, subject, rawHeaders, t]);

  const copyReport = useCallback(async () => {
    if (!result) return;
    const report = {
      score: result.score,
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary,
      signals: result.signals,
      findings: result.findings.map((item) => ({
        id: item.id,
        severity: item.severity,
        category: item.category,
        title: item.title,
        evidence: item.evidence,
      })),
      iocs: result.iocs,
      analyzedAt: result.meta.analyzedAt,
      engine: result.meta.engine,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    } catch {
      /* le presse-papiers peut etre indisponible : sans consequence */
    }
  }, [result]);

  return (
    <div className="space-y-6">
      <section className="qs-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-3.5">
          <div className="flex flex-wrap gap-1.5">
            {channels.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setChannel(item.value)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] transition-colors',
                  channel === item.value
                    ? 'bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-500/40'
                    : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line/70 px-5 py-2 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-500">
          <span>
            ENGINE <b className="text-brand-400">Q-CORE v2.4</b>
          </span>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span>
            MODE <b className="text-brand-400">STATIC HEURISTICS</b>
          </span>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span>
            IOC CHECK <b className="text-brand-400">ACTIVE</b>
          </span>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span>{text.length} / {MAX_CHARS}</span>
        </div>

        <div className="space-y-3 p-5">
          {channel === 'email' && (
            <>
              <input
                type="text"
                value={sender}
                onChange={(event) => setSender(event.target.value.slice(0, 400))}
                placeholder={t.analyzer.senderPlaceholder}
                className="qs-input"
                aria-label={t.analyzer.senderLabel}
              />
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value.slice(0, 400))}
                placeholder={t.analyzer.subjectPlaceholder}
                className="qs-input"
                aria-label={t.analyzer.subjectLabel}
              />
            </>
          )}

          <div className="relative">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, MAX_CHARS))}
              rows={11}
              spellCheck={false}
              placeholder={t.analyzer.textPlaceholder}
              className="qs-input resize-y font-mono leading-relaxed"
              aria-label={t.analyzer.textLabel}
            />
            {loading && (
              <div className="qs-scanning pointer-events-none absolute inset-0 overflow-hidden rounded-xl" />
            )}
          </div>

          {(loading || result) && (
            <div className="qs-console-log" aria-hidden="true">
              {(result ? CONSOLE_STEPS : CONSOLE_STEPS.slice(0, logStep)).map((line) => (
                <div key={line} className="qs-console-log__line">
                  <span className="text-emerald-400/90">[+]</span>
                  {line.slice(3)}
                </div>
              ))}
              {result && (
                <div className="qs-console-log__line text-brand-300">
                  <span className="text-emerald-400/90">[✓]</span>
                  audit complete · signals: {result.findings.length} · score: {result.score}/100
                </div>
              )}
              {loading && logStep < CONSOLE_STEPS.length && (
                <span className="qs-console-log__cursor" />
              )}
            </div>
          )}

          {channel === 'email' && (
            <p className="text-[11px] leading-relaxed text-slate-500">{t.analyzer.senderHelp}</p>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowHeaders((value) => !value)}
              className="text-[12px] text-brand-400 transition-colors hover:text-brand-300"
            >
              {showHeaders ? t.analyzer.headersHide : t.analyzer.headersShow}
            </button>

            {showHeaders && (
              <div className="mt-3">
                <textarea
                  value={rawHeaders}
                  onChange={(event) => setRawHeaders(event.target.value.slice(0, 30000))}
                  rows={7}
                  spellCheck={false}
                  placeholder={t.analyzer.headersPlaceholder}
                  className="qs-input resize-y font-mono text-[11.5px] leading-relaxed"
                  aria-label={t.analyzer.headersLabel}
                />
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{t.analyzer.headersHelp}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={runAnalysis} disabled={!canSubmit} className="qs-btn-primary">
              {loading ? t.analyzer.submitting : t.analyzer.submit}
            </button>
            <button type="button" onClick={reset} className="qs-btn-ghost">
              {t.common.clear}
            </button>
            {result && (
              <button type="button" onClick={copyReport} className="qs-btn-ghost">
                {t.common.copyReport}
              </button>
            )}
            <p className="ml-auto text-[11px] text-slate-500">{t.analyzer.privacyNote}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="border-t border-line/70 px-5 py-3.5">
          <p className="qs-label">{t.analyzer.samplesLabel}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SAMPLES.map((sample) => {
              const localized = (t.samples as Record<string, { label: string; hint: string } | undefined>)[
                sample.id
              ];
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => loadSample(sample)}
                  title={localized?.hint ?? sample.hint}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-[11.5px] transition-colors',
                    activeSample === sample.id
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                      : 'border-line bg-ink-800 text-slate-400 hover:border-line-strong hover:text-slate-200',
                  )}
                >
                  {localized?.label ?? sample.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {result && (
        <div className="space-y-6">
          <VerdictPanel result={result} quota={result.quota} />
          <div className="grid gap-6 lg:grid-cols-2">
            <FindingsList findings={result.findings} />
            <div className="space-y-6">
              <IocPanel iocs={result.iocs} />
              <Recommendations items={result.recommendations} />
            </div>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">{t.analyzer.disclaimer}</p>
        </div>
      )}
    </div>
  );
}
