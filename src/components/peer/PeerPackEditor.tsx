// src/components/peer/PeerPackEditor.tsx
//
// Create/edit modal for a peer fundraiser pack, with support for multiple
// items (bundles spanning several rooms) — the campaign side had this via
// CampaignProductEditorModal; the peer side previously only had a 4-field
// inline form in PeerManagePage.tsx that could create a single-item pack.

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { AvailableRoom, PeerPack, SavePeerPackPayload } from '../../services/PeerService';

type PackType = 'single_entry' | 'bundle' | 'ticket' | 'sponsor' | 'custom';
type ItemType =
  | 'game_entry' | 'quiz_team_ticket' | 'quiz_individual_ticket'
  | 'puzzle_entry' | 'elimination_entry' | 'event_ticket' | 'custom';

const PACK_TYPES: PackType[] = ['single_entry', 'bundle', 'ticket', 'sponsor', 'custom'];
const ITEM_TYPES: ItemType[] = [
  'game_entry', 'quiz_team_ticket', 'quiz_individual_ticket',
  'elimination_entry', 'puzzle_entry', 'event_ticket', 'custom',
];

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  game_entry: 'Game Entry',
  quiz_team_ticket: 'Quiz Team Ticket',
  quiz_individual_ticket: 'Quiz Individual Ticket',
  elimination_entry: 'Last Player Standing Entry',
  puzzle_entry: 'Puzzle Entry',
  event_ticket: 'Event Ticket',
  custom: 'Custom',
};

interface PackItemDraft {
  targetRoomId: string;
  itemType: ItemType;
  quantity: number;
}

function emptyItem(): PackItemDraft {
  return { targetRoomId: '', itemType: 'quiz_individual_ticket', quantity: 1 };
}

interface Props {
  pack: PeerPack | null; // null = create new
  rooms: AvailableRoom[];
  defaultCurrency: string;
  saving: boolean;
  onSave: (payload: SavePeerPackPayload) => Promise<void>;
  onClose: () => void;
}

export default function PeerPackEditor({ pack, rooms, defaultCurrency, saving, onSave, onClose }: Props) {
  const isEdit = !!pack;

  const [name, setName] = useState(pack?.name ?? '');
  const [description, setDescription] = useState(pack?.description ?? '');
  const [packType, setPackType] = useState<PackType>((pack?.pack_type as PackType) ?? 'bundle');
  const [price, setPrice] = useState(String(pack?.price ?? ''));
  const [currency, setCurrency] = useState(pack?.currency ?? defaultCurrency);
  const [isFeatured, setIsFeatured] = useState(Boolean(pack?.is_featured));
  const [badgeLabel, setBadgeLabel] = useState(pack?.badge_label ?? '');
  const [maxSales, setMaxSales] = useState(pack?.max_sales != null ? String(pack.max_sales) : '');

  const [items, setItems] = useState<PackItemDraft[]>(
    pack?.items?.length
      ? pack.items.map(i => ({
          targetRoomId: (i.target_room_id ?? i.targetRoomId ?? '') as string,
          itemType: (i.item_type ?? i.itemType ?? 'quiz_individual_ticket') as ItemType,
          quantity: Number(i.quantity ?? 1),
        }))
      : [emptyItem()]
  );

  const [formError, setFormError] = useState<string | null>(null);

  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, patch: Partial<PackItemDraft>) =>
    setItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = Number(price);
    if (!name.trim()) { setFormError('Pack name is required.'); return; }
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) { setFormError('Price must be 0 or more.'); return; }
    if (!items.length) { setFormError('Add at least one item to this pack.'); return; }
    for (const item of items) {
      if (!item.targetRoomId) { setFormError('Every item needs a linked event.'); return; }
      if (item.quantity < 1) { setFormError('Item quantities must be at least 1.'); return; }
    }

    const payload: SavePeerPackPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      packType,
      price: parsedPrice,
      currency,
      isFeatured,
      badgeLabel: badgeLabel.trim() || null,
      maxSales: maxSales ? Number(maxSales) : null,
      items: items.map(i => ({
        targetRoomId: i.targetRoomId,
        itemType: i.itemType,
        quantity: i.quantity,
      })),
    };

    await onSave(payload);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black text-slate-950">
            {isEdit ? `Edit: ${pack!.name}` : 'Create pack'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {formError && (
            <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {formError}
            </div>
          )}

          {/* ── Pack details ── */}
          <section className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
            <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Pack details</h3>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Name *</label>
              <input
                className="w-full rounded-xl border border-slate-200 p-3"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Tournament Game Pack"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Description</label>
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3"
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description shown to supporters"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Pack type</label>
                <select
                  className="w-full rounded-xl border border-slate-200 p-3"
                  value={packType}
                  onChange={e => setPackType(e.target.value as PackType)}
                >
                  {PACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Price *</label>
                <div className="flex gap-2">
                  <select
                    className="rounded-xl border border-slate-200 p-3"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    {['EUR', 'GBP', 'USD'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input
                    className="flex-1 rounded-xl border border-slate-200 p-3"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
                <span className="text-sm font-bold text-slate-700">Featured / Most Popular</span>
              </label>
              <input
                className="rounded-xl border border-slate-200 p-3"
                value={badgeLabel}
                onChange={e => setBadgeLabel(e.target.value)}
                placeholder="Badge label, e.g. Most Popular"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-700">Max sales (optional)</label>
              <input
                className="w-40 rounded-xl border border-slate-200 p-3"
                type="number"
                min="1"
                value={maxSales}
                onChange={e => setMaxSales(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
          </section>

          {/* ── Items ── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">
                Activities in this pack
              </h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
              >
                <Plus className="h-4 w-4" /> Add activity
              </button>
            </div>
            <p className="text-sm font-semibold text-slate-500">
              Each activity is an event this pack gives access to when purchased — combine several
              to build a bundle (e.g. a quiz ticket + an elimination entry).
            </p>

            {items.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 p-3">
                <select
                  className="min-w-[200px] flex-1 rounded-xl border border-slate-200 p-2"
                  value={item.targetRoomId}
                  onChange={e => updateItem(idx, { targetRoomId: e.target.value })}
                >
                  <option value="">— Select event —</option>
                  {rooms.map(r => (
                    <option key={r.room_id} value={r.room_id}>
                      {r.name} ({r.game_type}, {r.status})
                    </option>
                  ))}
                </select>

                <select
                  className="rounded-xl border border-slate-200 p-2"
                  value={item.itemType}
                  onChange={e => updateItem(idx, { itemType: e.target.value as ItemType })}
                >
                  {ITEM_TYPES.map(t => <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>)}
                </select>

                <input
                  className="w-20 rounded-xl border border-slate-200 p-2"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                  aria-label="Quantity"
                />

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600"
                    aria-label="Remove activity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
                No available events found for this club. Create or schedule an event first.
              </div>
            )}
          </section>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create pack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}