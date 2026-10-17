'use client';

import { useState } from 'react';

/**
 * Ouvre le portail de gestion Stripe (factures, moyen de paiement,
 * resiliation). Le portail est heberge par Stripe : aucune donnee bancaire ne
 * transite par QueryShield.
 */
export function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const openPortal = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const payload = (await response.json()) as { url?: string; message?: string };

      if (response.ok && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setMessage(payload.message ?? 'Le portail de gestion est indisponible.');
    } catch {
      setMessage('Le service de facturation est injoignable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={openPortal} disabled={loading} className="qs-btn-ghost">
        {loading ? 'Ouverture du portail…' : 'Gerer mon abonnement et mes factures'}
      </button>
      {message && (
        <p className="mt-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11.5px] leading-relaxed text-amber-200">
          {message}
        </p>
      )}
    </div>
  );
}
