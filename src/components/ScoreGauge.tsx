'use client';

import { useI18n } from '@/lib/i18n/provider';
import type { VerdictStyle } from '@/lib/ui';

interface ScoreGaugeProps {
  score: number;
  /** Style du verdict, fourni par l'appelant : le meme cadran sert aux messages et aux sites. */
  style: VerdictStyle;
  /** Libelle traduit du verdict, affiche sous le cadran. */
  label: string;
}

const RADIUS = 72;
const ARC_LENGTH = Math.PI * RADIUS;

export function ScoreGauge({ score, style, label }: ScoreGaugeProps) {
  const { t, format } = useI18n();
  const filled = (Math.min(100, Math.max(0, score)) / 100) * ARC_LENGTH;
  const aria = format(t.common.scoreAria, { score });

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 128" className="w-[200px]" role="img" aria-label={aria}>
        <title>{aria}</title>
        <path
          d="M 28 100 A 72 72 0 0 1 172 100"
          fill="none"
          stroke="#1B2540"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 28 100 A 72 72 0 0 1 172 100"
          fill="none"
          stroke={style.hex}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${ARC_LENGTH}`}
        />
        <text
          x="100"
          y="82"
          textAnchor="middle"
          fill={style.hex}
          fontSize="42"
          fontWeight="500"
          fontFamily="var(--font-sans)"
        >
          {score}
        </text>
        <text
          x="100"
          y="104"
          textAnchor="middle"
          fill="#64748B"
          fontSize="11"
          letterSpacing="1.4"
          fontFamily="var(--font-sans)"
        >
          {t.common.outOf}
        </text>
      </svg>
      <span className={`qs-chip mt-1 ${style.bg} ${style.border} ${style.text}`}>{label}</span>
    </div>
  );
}
