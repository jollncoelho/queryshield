import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteChecker } from '@/components/SiteChecker';
import { getServerDictionary } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerDictionary();
  return {
    title: t.site.metaTitle,
    description: t.site.metaDescription,
  };
}

export default async function VerifierSitePage() {
  const { t } = await getServerDictionary();

  const criteria = [
    { title: t.site.criteria1Title, body: t.site.criteria1Body },
    { title: t.site.criteria2Title, body: t.site.criteria2Body },
    { title: t.site.criteria3Title, body: t.site.criteria3Body },
    { title: t.site.criteria4Title, body: t.site.criteria4Body },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="pt-14 pb-8 sm:pt-20">
        <span className="qs-chip border-brand-500/40 bg-brand-500/10 text-brand-300">{t.site.chip}</span>

        <h1 className="mt-5 max-w-3xl text-[32px] font-medium leading-[1.15] tracking-[-0.01em] text-slate-50 sm:text-[40px]">
          {t.site.titleLead}
          <span className="text-brand-400"> {t.site.titleAccent} </span>
          {t.site.titleTail}
        </h1>

        <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-slate-400">{t.site.intro}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/" className="qs-btn-ghost">
            {t.site.ctaAnalyzer}
          </Link>
          <Link href="/api-docs" className="qs-btn-ghost">
            {t.site.ctaApi}
          </Link>
        </div>
      </section>

      <section className="pb-14">
        <SiteChecker />
      </section>

      <section className="border-t border-line/70 py-14">
        <h2 className="text-[22px] font-medium text-slate-100">{t.site.criteriaTitle}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {criteria.map((item) => (
            <div key={item.title} className="qs-card p-5">
              <h3 className="text-[14px] font-medium text-slate-100">{item.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line/70 py-14">
        <div className="qs-card border-amber-500/30 bg-amber-500/[0.06] p-6">
          <h2 className="text-[15px] font-medium text-amber-200">{t.site.limitsTitle}</h2>
          <p className="mt-3 max-w-3xl text-[12.5px] leading-relaxed text-slate-300">{t.site.limitsBody}</p>
        </div>
      </section>
    </div>
  );
}
