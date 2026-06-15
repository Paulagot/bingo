// src/components/campaigns/management/CampaignPaymentsTab.tsx
//
// Campaign-level payment method selector.
// Mirrors PaymentsTab.tsx used for quiz/elimination rooms, but:
//   - operates on campaign-level linked_payment_methods_json
//   - no late payments section (that's handled per-event)
//   - no lock state (campaigns don't have a 'completed' status)
//
// Club selects which of their payment methods supporters can use
// when buying campaign products online. Stripe/crypto auto-confirm.
// Everything else (Revolut, cash) requires club confirmation in Orders tab.

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, CheckCircle2, CreditCard, AlertCircle, Wallet, Info,
} from 'lucide-react';
import campaignProductService from '../../mgtsystem/services/CampaignProductService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
  id:                   number;
  methodCategory:       string;
  providerName:         string | null;
  methodLabel:          string;
  displayOrder:         number;
  isEnabled:            boolean;
  playerInstructions:   string | null;
  methodConfig:         Record<string, unknown> | null;
  isOfficialClubAccount: boolean;
}

interface Props {
  campaignId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatProvider(name?: string | null) {
  if (!name) return '';
  return name.replace(/_/g, ' ');
}

function getSubtitle(method: PaymentMethod): string {
  const parts: string[] = [];
  if (method.providerName) parts.push(formatProvider(method.providerName));

  const cat = method.methodCategory;
  if (cat === 'stripe')         parts.push('Card / Apple Pay / Google Pay — auto-confirmed');
  if (cat === 'crypto')         parts.push('Crypto — auto-confirmed on-chain');
  if (cat === 'instant_payment') parts.push('Manual confirmation required');

  return parts.join(' · ');
}

function isAutoConfirmed(method: PaymentMethod): boolean {
  return method.methodCategory === 'stripe' || method.methodCategory === 'crypto';
}

function getMethodIcon(method: PaymentMethod) {
  if (method.methodCategory === 'crypto') return <Wallet className="h-5 w-5" />;
  return <CreditCard className="h-5 w-5" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignPaymentsTab({ campaignId }: Props) {
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [available,   setAvailable]   = useState<PaymentMethod[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    load();
  }, [campaignId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await campaignProductService.getCampaignPaymentMethods(campaignId);
      const enabled = res.available_methods.filter((m: PaymentMethod) => m.isEnabled);
      const enabledIds = new Set(enabled.map((m: PaymentMethod) => m.id));
      const linked = res.linked_method_ids.filter((id: number) => enabledIds.has(id));
      setAvailable(enabled);
      setSelectedIds(linked);
      setOriginalIds(linked);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  const handleToggle = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await campaignProductService.updateCampaignPaymentMethods(campaignId, selectedIds);
      setOriginalIds(selectedIds);
    } catch (err: any) {
      setError(err.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const a = [...selectedIds].sort((x, y) => x - y);
    const b = [...originalIds].sort((x, y) => x - y);
    return JSON.stringify(a) !== JSON.stringify(b);
  }, [selectedIds, originalIds]);

  const selectedMethods = useMemo(
    () => available.filter(m => selectedIds.includes(m.id)),
    [available, selectedIds]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fl-payments-tab">

      {/* ── Info banner ── */}
      <div className="fl-payments-banner">
        <div className="fl-payments-banner-icon"><CreditCard /></div>
        <div>
          <h3>Campaign payment options</h3>
          <p>
            Choose which payment methods supporters can use when buying products
            from your campaign page. Stripe and crypto confirm automatically.
            Revolut, cash, and card tap require you to confirm in the Orders tab.
          </p>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="fl-payments-loading">
          <Loader2 className="fl-spin" /> Loading payment methods…
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="fl-payments-error">
          <AlertCircle /> {error}
        </div>
      )}

      {/* ── No methods configured ── */}
      {!loading && available.length === 0 && (
        <div className="fl-payments-empty">
          <AlertCircle />
          <div>
            <p><strong>No active payment methods</strong></p>
            <p>
              Add payment methods via the Payment Methods section on your club
              dashboard first, then come back here to link them to this campaign.
            </p>
          </div>
        </div>
      )}

      {/* ── Method list ── */}
      {!loading && available.length > 0 && (
        <div className="fl-payments-list">
          {available.map(method => {
            const isSelected = selectedIds.includes(method.id);
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => handleToggle(method.id)}
                className={`fl-payment-method-btn ${isSelected ? 'fl-payment-method-btn--selected' : ''}`}
              >
                <div className={`fl-payment-method-icon ${isSelected ? 'fl-payment-method-icon--selected' : ''}`}>
                  {isSelected ? <CheckCircle2 className="h-5 w-5" /> : getMethodIcon(method)}
                </div>
                <div className="fl-payment-method-body">
                  <div className="fl-payment-method-header">
                    <span className="fl-payment-method-label">{method.methodLabel}</span>
                    <div className="fl-payment-method-badges">
                      {isAutoConfirmed(method) && (
                        <span className="fl-badge fl-badge--auto">Auto-confirmed</span>
                      )}
                      {!isAutoConfirmed(method) && (
                        <span className="fl-badge fl-badge--manual">Manual confirm</span>
                      )}
                      {isSelected && (
                        <span className="fl-badge fl-badge--selected">Selected</span>
                      )}
                    </div>
                  </div>
                  {getSubtitle(method) && (
                    <p className="fl-payment-method-subtitle">{getSubtitle(method)}</p>
                  )}
                  {method.playerInstructions && (
                    <p className="fl-payment-method-instructions">{method.playerInstructions}</p>
                  )}
                </div>
              </button>
            );
          })}

          {/* ── Summary + save ── */}
          <div className="fl-payments-footer">
            <p className="fl-payments-count">
              {selectedIds.length === 0
                ? 'No methods selected — supporters will see "contact organiser"'
                : `${selectedIds.length} method${selectedIds.length === 1 ? '' : 's'} selected`}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges || loading}
              className="fl-btn fl-btn--primary"
            >
              {saving
                ? <><Loader2 className="fl-spin fl-spin--sm" /> Saving…</>
                : <><CheckCircle2 className="h-4 w-4" /> Save payment options</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Preview — what supporters will see ── */}
      {selectedMethods.length > 0 && (
        <div className="fl-payments-preview">
          <div className="fl-payments-preview-header">
            <Info className="h-4 w-4" />
            <span>Supporters will see these options at checkout</span>
          </div>
          <ul className="fl-payments-preview-list">
            {selectedMethods.map(m => (
              <li key={m.id}>
                {m.methodCategory === 'stripe' && '💳'}
                {m.methodCategory === 'crypto' && '🔗'}
                {m.methodCategory === 'instant_payment' && '📱'}
                {!['stripe','crypto','instant_payment'].includes(m.methodCategory) && '💰'}
                {' '}{m.methodLabel}
                {isAutoConfirmed(m) ? ' — instant' : ' — needs confirmation'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}