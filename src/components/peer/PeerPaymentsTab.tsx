// src/components/peer/PeerPaymentsTab.tsx
//
// Payment methods selector for a peer fundraiser.
// Logic unchanged from the original - re-skinned to match the
// events dashboard teal/cream palette (no more orange).

import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import svc from '../../services/PeerService';
import { brand } from '../dashboard/branding';

export default function PeerPaymentsTab({ fundraiserId }: { fundraiserId: string }) {
  const [methods,  setMethods]  = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [original, setOriginal] = useState<number[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    svc.paymentMethods(fundraiserId).then((r: any) => {
      setMethods(r.availableMethods);
      setSelected(r.linkedMethodIds);
      setOriginal(r.linkedMethodIds);
    });
  }, [fundraiserId]);

  const changed = useMemo(
    () => JSON.stringify([...selected].sort()) !== JSON.stringify([...original].sort()),
    [selected, original],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await svc.savePaymentMethods(fundraiserId, selected);
      setOriginal(selected);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: number) => {
    setSelected(x => x.includes(id) ? x.filter(i => i !== id) : [...x, id]);
    setJustSaved(false);
  };

  if (methods.length === 0) {
    return (
      <p className="text-sm py-4 text-center" style={{ color: brand.slate }}>
        Loading payment methods…
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm font-semibold" style={{ color: brand.slate }}>
        Choose the club payment methods supporters can use for this fundraiser.
      </p>

      <div className="space-y-3">
        {methods.map(m => {
          const isSelected = selected.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              className="flex w-full items-center justify-between rounded-xl border p-4 text-left transition"
              style={isSelected
                ? { borderColor: brand.teal, background: 'rgba(21,127,133,0.06)' }
                : { borderColor: brand.border, background: brand.surface }
              }
            >
              <div>
                <p className="text-sm font-bold" style={{ color: brand.navy }}>{m.methodLabel}</p>
                <p className="text-xs mt-0.5" style={{ color: brand.slate }}>
                  {m.providerName || m.methodCategory}
                </p>
              </div>
              {isSelected && <Check className="h-4 w-4 flex-shrink-0" style={{ color: brand.teal }} />}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          disabled={!changed || saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 transition"
          style={{ background: brand.teal }}
        >
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : 'Save payment methods'
          }
        </button>
        {justSaved && !changed && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: '#16a34a' }}>
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
