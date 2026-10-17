'use client';

import { useState } from 'react';
import { cn } from '@/lib/ui';

interface PlanButtonProps {
  plan: 'pro' | 'business';
  interval: 'monthly' | 'yearly';
  label: string;
  variant?: 'primary' | 'ghost';
}

export function PlanButton({ plan, interval, label, variant = 'primary' }: PlanButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const startCheckout = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (response.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setMessage(payload.message ?? 'Le paiement n a pas pu etre initie.');
    } catch {
      setMessage('Le service de paiement est injoignable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className={cn('w-full', variant === 'primary' ? 'qs-btn-primary' : 'qs-btn-ghost')}
      >
        {loading ? 'Ouverture du paiement…' : label}
      </button>
      {message && (
        <p className="mt-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-amber-200">
          {message}
        </p>
      )}
    </div>
  );
}
