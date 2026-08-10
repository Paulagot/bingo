// src/components/peer/CreatePeerFundraiserModal.tsx
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import svc from '../../services/PeerService';
import type { ClubPaymentMethod } from '../../services/PeerService';
import { brand } from '../dashboard/branding';

const field = 'w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent transition border-[#dce1df] bg-white hover:border-[#b8c6b0]';

interface Props {
  onClose:   () => void;
  onCreated: (id: string) => void;
}

export default function CreatePeerFundraiserModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [formatType, setFormatType] = useState<'door_to_door' | 'sponsored'>('door_to_door');
  const [allowDonations, setAllowDonations] = useState(false);

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [target,      setTarget]      = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [videoUrl,      setVideoUrl]      = useState('');
  const [formError,   setFormError]   = useState<string | null>(null);

  const [methods,          setMethods]          = useState<ClubPaymentMethod[]>([]);
  const [selectedMethodIds, setSelectedMethodIds] = useState<number[]>([]);
  const [methodsLoaded,    setMethodsLoaded]    = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    svc.getAvailablePaymentMethods()
      .then(r => setMethods(r.availableMethods))
      .finally(() => setMethodsLoaded(true));
  }, []);

  const toggleMethod = (id: number) =>
    setSelectedMethodIds(x => x.includes(id) ? x.filter(i => i !== id) : [...x, id]);

  const validateStep1 = () => {
    if (!name.trim()) { setFormError('Give your fundraiser a name.'); return false; }
    setFormError(null);
    return true;
  };

  const goStep2 = () => setStep(2);
  const goStep3 = () => { if (validateStep1()) setStep(3); };

  const handleCreate = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const r = await svc.create({
        name:             name.trim(),
        formatType,
        settings: {
          templateType: formatType,
          donationsEnabled: formatType === 'door_to_door' && allowDonations,
          coverImageUrl: coverImageUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        },
        description:      description.trim() || undefined,
        targetAmount:     Number(target || 0),
        status:           'draft',
        paymentMethodIds: selectedMethodIds,
      });
      onCreated(r.fundraiser.id);
    } catch (e: any) {
      setSaveError(e?.message || 'Failed to create fundraiser. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{ background: brand.surface }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${brand.border}` }}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: brand.slate }}>
              Step {step} of 3
            </p>
            <h2 className="text-lg font-bold" style={{ color: brand.navy }}>
              {step === 1 ? 'Choose fundraiser type' : step === 2 ? 'Fundraiser details' : 'Payment methods'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ background: brand.bg, color: brand.slate }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-1 w-full" style={{ background: brand.bg }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%`, background: brand.teal }}
          />
        </div>

        <div className="p-5 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <button type="button" onClick={() => setFormatType('door_to_door')} className="w-full rounded-xl border p-4 text-left" style={{ borderColor: formatType === 'door_to_door' ? brand.teal : brand.border, background: formatType === 'door_to_door' ? '#eef8f7' : 'white' }}>
                <div className="font-bold" style={{ color: brand.navy }}>Sell activities and tickets</div>
                <div className="mt-1 text-sm" style={{ color: brand.slate }}>Participants can sell quiz entries, elimination entries, Puzzle Drop options, event tickets and bundles.</div>
              </button>
              <button type="button" onClick={() => setFormatType('sponsored')} className="w-full rounded-xl border p-4 text-left" style={{ borderColor: formatType === 'sponsored' ? brand.teal : brand.border, background: formatType === 'sponsored' ? '#eef8f7' : 'white' }}>
                <div className="font-bold" style={{ color: brand.navy }}>Collect sponsorship</div>
                <div className="mt-1 text-sm" style={{ color: brand.slate }}>Link participants to an existing sponsored activity and give each person a personal page and target.</div>
              </button>
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>
                  Name <span style={{ color: '#e9574f' }}>*</span>
                </label>
                <input
                  className={field}
                  value={name}
                  onChange={e => { setName(e.target.value); setFormError(null); }}
                  placeholder="e.g. Christmas Pack 2025"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>
                  Description <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
                </label>
                <textarea
                  className={`${field} resize-none`}
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What supporters are buying into…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>
                  Overall target <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
                </label>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                    style={{ color: brand.slate }}
                  >
                    €
                  </span>
                  <input
                    className={`${field} pl-7`}
                    type="number"
                    min="0"
                    step="1"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>
                  Cover image URL <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
                </label>
                <input
                  className={field}
                  value={coverImageUrl}
                  onChange={e => setCoverImageUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: brand.navy }}>
                  Video URL <span className="font-normal" style={{ color: brand.slate }}>(optional)</span>
                </label>
                <input
                  className={field}
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="YouTube link"
                />
              </div>

              {formatType === 'door_to_door' && (
                <label className="flex items-start gap-3 rounded-lg border p-3" style={{ borderColor: brand.border }}>
                  <input type="checkbox" checked={allowDonations} onChange={e => setAllowDonations(e.target.checked)} className="mt-1" />
                  <span><span className="block text-sm font-bold" style={{ color: brand.navy }}>Allow club donations</span><span className="block text-xs" style={{ color: brand.slate }}>Show a donation option for supporters who do not want to buy an activity.</span></span>
                </label>
              )}
              {formError && (
                <p className="text-sm font-semibold" style={{ color: '#e9574f' }}>{formError}</p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm font-semibold" style={{ color: brand.slate }}>
                Choose which of your club's payment methods supporters can use. You can update this later from the fundraiser's Payments tab.
              </p>

              {!methodsLoaded ? (
                <div className="flex items-center gap-2 py-4" style={{ color: brand.slate }}>
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: brand.teal }} />
                  <span className="text-sm">Loading payment methods…</span>
                </div>
              ) : methods.length === 0 ? (
                <div
                  className="rounded-lg p-3 text-sm font-semibold"
                  style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
                >
                  No payment methods are set up for your club yet. You can add them from the Club menu and link them from the fundraiser's Payments tab.
                </div>
              ) : (
                <div className="space-y-2">
                  {methods.map(m => {
                    const selected = selectedMethodIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMethod(m.id)}
                        className="flex w-full items-center justify-between rounded-xl border p-3 text-left transition"
                        style={selected
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
                        {selected && (
                          <Check className="h-4 w-4 flex-shrink-0" style={{ color: brand.teal }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {saveError && (
                <p className="text-sm font-semibold" style={{ color: '#e9574f' }}>{saveError}</p>
              )}
            </>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-5 py-4"
          style={{ borderTop: `1px solid ${brand.border}` }}
        >
          {step < 3 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: brand.border, color: brand.slate }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={step === 1 ? goStep2 : goStep3}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white"
                style={{ background: brand.teal }}
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(step === 3 ? 2 : 1)}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: brand.border, color: brand.slate }}
                disabled={saving}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: brand.teal }}
              >
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                  : <><Check className="h-4 w-4" /> Create fundraiser</>
                }
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}