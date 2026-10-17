import Link from 'next/link';
import { Analyzer } from '@/components/Analyzer';
import { getServerDictionary } from '@/lib/i18n/server';

export default async function HomePage() {
  const { t } = await getServerDictionary();

  const steps = [
    { title: t.home.step1Title, body: t.home.step1Body },
    { title: t.home.step2Title, body: t.home.step2Body },
    { title: t.home.step3Title, body: t.home.step3Body },
  ];

  const coverage = [
    { title: t.home.coverage1Title, body: t.home.coverage1Body },
    { title: t.home.coverage2Title, body: t.home.coverage2Body },
    { title: t.home.coverage3Title, body: t.home.coverage3Body },
    { title: t.home.coverage4Title, body: t.home.coverage4Body },
    { title: t.home.coverage5Title, body: t.home.coverage5Body },
    { title: t.home.coverage6Title, body: t.home.coverage6Body },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="pt-14 pb-10 sm:pt-20">
        <span className="qs-chip border-brand-500/40 bg-brand-500/10 text-brand-300">{t.home.chip}</span>

        <h1 className="mt-5 max-w-3xl text-[34px] font-medium leading-[1.15] tracking-[-0.01em] text-slate-50 sm:text-[42px]">
          {t.home.titleLead}
          <span className="text-brand-400"> {t.home.titleAccent} </span>
          {t.home.titleTail}
        </h1>

        <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-slate-400">{t.home.intro}</p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <a href="#analyseur" className="qs-btn-primary">
            {t.home.ctaAnalyze}
          </a>
          <Link href="/verifier-site" className="qs-btn-ghost">
            {t.home.ctaSite}
          </Link>
          <Link href="/tarifs" className="qs-btn-ghost">
            {t.home.ctaPricing}
          </Link>
          <Link href="/api-docs" className="qs-btn-ghost">
            {t.home.ctaApi}
          </Link>
        </div>
      </section>

      <section id="analyseur" className="scroll-mt-20 pb-14">
        <Analyzer />
      </section>

      <section className="border-t border-line/70 py-14">
        <h2 className="text-[22px] font-medium text-slate-100">{t.home.stepsTitle}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="qs-card p-5">
              <span className="font-mono text-[11px] text-brand-400">0{index + 1}</span>
              <h3 className="mt-3 text-[15px] font-medium text-slate-100">{step.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line/70 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-[22px] font-medium text-slate-100">{t.home.coverageTitle}</h2>
          <p className="max-w-md text-[12.5px] leading-relaxed text-slate-500">{t.home.coverageIntro}</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {coverage.map((item) => (
            <div key={item.title} className="qs-card p-5">
              <h3 className="text-[14px] font-medium text-slate-100">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line/70 py-14">
        <div className="qs-card border-amber-500/30 bg-amber-500/[0.06] p-6">
          <h2 className="text-[15px] font-medium text-amber-200">{t.home.warningTitle}</h2>
          <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-slate-300">{t.home.warningBody}</p>
          <Link
            href="/legal/conditions"
            className="mt-4 inline-block text-[12px] text-amber-300 underline-offset-4 hover:underline"
          >
            {t.home.warningLink}
          </Link>
        </div>
      </section>

      <section className="border-t border-line/70 py-14">
        <div className="qs-card flex flex-wrap items-center justify-between gap-6 p-6">
          <div>
            <h2 className="text-[18px] font-medium text-slate-100">{t.home.ctaTitle}</h2>
            <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-slate-400">{t.home.ctaBody}</p>
          </div>
          <Link href="/tarifs" className="qs-btn-primary">
            {t.home.ctaButton}
          </Link>
        </div>
      </section>
    </div>
  );
}
