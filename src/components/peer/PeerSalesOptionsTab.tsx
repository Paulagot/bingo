// src/components/peer/PeerSalesOptionsTab.tsx
//
// Sales Options tab extracted from PeerFundraiserDrawer.
// Features:
//   - Drag-to-reorder with explicit Save Order button
//   - Publish lock: create / edit / duplicate / hide disabled when published
//   - Badge label guard: treats null / "" / "0" as no badge
//   - Passes packs + rooms down as props (drawer already has them loaded)

import { useRef, useState } from 'react';
import { GripVertical, Lock, Save } from 'lucide-react';
import type { PeerPack, AvailableRoom } from '../../services/PeerService';
import svc from '../../services/PeerService';
import PeerPackEditor from './PeerPackEditor';
import { brand } from '../dashboard/branding';

const ITEM_TYPE_LABELS: Record<string, string> = {
  game_entry:        'Quiz Entry + All Extras',
  elimination_entry: 'Elimination Entry',
  puzzle_entry:      'Puzzle Drop',
  event_ticket:      'Event Ticket',
  custom:            'Custom',
};

function badgeLabel(pack: PeerPack): string | null {
  if (!pack.is_featured) return null;
  const raw = pack.badge_label;
  if (!raw || raw.trim() === '' || raw.trim() === '0') return 'Featured';
  return raw.trim();
}

interface Props {
  fundraiserId: string;
  packs:        PeerPack[];
  rooms:        AvailableRoom[];
  currency:     string;
  isPublished:  boolean;
  onChanged:    () => void;
}

export default function PeerSalesOptionsTab({
  fundraiserId,
  packs,
  rooms,
  currency,
  isPublished,
  onChanged,
}: Props) {
  // Local ordered list - we only touch display_order here, nothing else
  const activePacks = packs.filter(p => p.is_active !== 0 && p.is_active !== false);
  const [ordered, setOrdered] = useState<PeerPack[]>(
    [...activePacks].sort((a, b) => a.display_order - b.display_order),
  );
  const [orderDirty,  setOrderDirty]  = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderError,  setOrderError]  = useState<string | null>(null);

  const [editorOpen,  setEditorOpen]  = useState(false);
  const [editingPack, setEditingPack] = useState<PeerPack | null>(null);
  const [packSaving,  setPackSaving]  = useState(false);

  // Keep ordered in sync when parent refreshes packs (after save/duplicate/hide)
  // but only if the user hasn't started dragging
  const prevPacksRef = useRef(packs);
  if (prevPacksRef.current !== packs && !orderDirty) {
    prevPacksRef.current = packs;
    setOrdered([...activePacks].sort((a, b) => a.display_order - b.display_order));
  }

  // ── Drag-to-reorder ──────────────────────────────────────────────────────
  const dragIndex = useRef<number | null>(null);

  const onDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) return;
    const next = [...ordered];
    const spliced = next.splice(from, 1);
    const moved = spliced[0];
    if (!moved) return;
    next.splice(index, 0, moved);
    dragIndex.current = index;
    setOrdered(next);
    setOrderDirty(true);
    setOrderError(null);
  };

  const onDragEnd = () => {
    dragIndex.current = null;
  };

  const saveOrder = async () => {
    setOrderSaving(true);
    setOrderError(null);
    try {
      // Fire PATCH calls sequentially - each pack gets its new display_order
      for (let i = 0; i < ordered.length; i++) {
        const p = ordered[i];
        if (!p) continue;
        if (p.display_order !== i + 1) {
          await svc.updatePack(fundraiserId, p.id, {
            name:         p.name,
            price:        p.price,
            currency:     p.currency,
            isFeatured:   Boolean(p.is_featured),
            badgeLabel:   p.badge_label ?? null,
            displayOrder: i + 1,
            description:  p.description ?? null,
            maxSales:     p.max_sales ?? null,
            salesStartAt: p.sales_start_at ?? null,
            salesEndAt:   p.sales_end_at ?? null,
            items: p.items.map(item => ({
              targetRoomId: item.target_room_id ?? item.targetRoomId ?? '',
              itemType:     item.item_type     ?? item.itemType     ?? '',
              quantity:     item.quantity,
              metadata:     (item.metadata_json ?? item.metadata ?? null) as any,
            })),
          });
        }
      }
      setOrderDirty(false);
      onChanged();
    } catch (e: any) {
      setOrderError(e?.message || 'Failed to save order. Please try again.');
    } finally {
      setOrderSaving(false);
    }
  };

  // ── Pack editor ──────────────────────────────────────────────────────────
  const openCreate = () => { setEditingPack(null); setEditorOpen(true); };
  const openEdit   = (p: PeerPack) => { setEditingPack(p); setEditorOpen(true); };

  const savePack = async (payload: any) => {
    setPackSaving(true);
    try {
      if (editingPack) await svc.updatePack(fundraiserId, editingPack.id, payload);
      else             await svc.addPack(fundraiserId, payload);
      setEditorOpen(false);
      setEditingPack(null);
      setOrderDirty(false);
      onChanged();
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setPackSaving(false);
    }
  };

  const hidePack = async (pack: PeerPack) => {
    if (!confirm(`Hide "${pack.name}"? It will no longer appear on your fundraiser page.`)) return;
    try { await svc.hidePack(fundraiserId, pack.id); onChanged(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
  };

  const duplicatePack = async (pack: PeerPack) => {
    try { await svc.duplicatePack(fundraiserId, pack.id); onChanged(); }
    catch (e: any) { alert(`Failed: ${e.message}`); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: brand.navy }}>Sales Options</h2>
          <p className="text-xs mt-0.5" style={{ color: brand.slate }}>
            {isPublished
              ? 'Sales options are locked while the fundraiser is published.'
              : 'Choose what supporters can buy. Drag rows to set the display order on your fundraiser page.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {orderDirty && !isPublished && (
            <button
              onClick={saveOrder}
              disabled={orderSaving}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              style={{ background: '#16a34a' }}
            >
              <Save className="h-3.5 w-3.5" />
              {orderSaving ? 'Saving order…' : 'Save order'}
            </button>
          )}
          {!isPublished && (
            <button
              onClick={openCreate}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: brand.teal }}
            >
              + Create sales option
            </button>
          )}
          {isPublished && (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: brand.bg, color: brand.slate }}
            >
              <Lock className="h-3.5 w-3.5" /> Published
            </span>
          )}
        </div>
      </div>

      {orderError && (
        <p className="mb-3 text-sm font-semibold" style={{ color: '#e9574f' }}>{orderError}</p>
      )}

      {/* Drag hint */}
      {!isPublished && ordered.length > 1 && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold"
          style={{ background: '#eef8f7', color: brand.teal, border: `1px solid ${brand.teal}20` }}
        >
          <GripVertical className="h-3.5 w-3.5 flex-shrink-0" />
          Drag the handle on any card to reorder how options appear to supporters, then click <strong className="ml-1">Save order</strong>.
        </div>
      )}

      {/* Empty state */}
      {ordered.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: brand.border }}
        >
          <p className="text-sm font-semibold" style={{ color: brand.slate }}>
            No sales options yet
            {!isPublished && ' - create the first option supporters can buy.'}
          </p>
        </div>
      )}

      {/* Pack cards - draggable grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {ordered.map((p, index) => {
          const badge = badgeLabel(p);
          return (
            <div
              key={p.id}
              draggable={!isPublished}
              onDragStart={() => onDragStart(index)}
              onDragOver={e => onDragOver(e, index)}
              onDragEnd={onDragEnd}
              className="rounded-xl p-4 select-none"
              style={{
                border: `1px solid ${brand.border}`,
                background: '#ffffff',
                cursor: isPublished ? 'default' : 'grab',
              }}
            >
              <div className="flex items-start gap-2">
                {/* Drag handle */}
                {!isPublished && (
                  <GripVertical
                    className="h-4 w-4 mt-0.5 flex-shrink-0 opacity-40"
                    style={{ color: brand.slate }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-bold text-sm leading-tight" style={{ color: brand.navy }}>
                      {p.name}
                    </p>
                    <p className="font-bold text-sm flex-shrink-0" style={{ color: brand.navy }}>
                      {p.currency || currency}{Number(p.price).toFixed(2)}
                    </p>
                  </div>

                  {badge && (
                    <span
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: 'rgba(210,181,130,0.25)', color: '#8a6d2f' }}
                    >
                      {badge}
                    </span>
                  )}

                  {p.description && (
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: brand.slate }}>
                      {p.description}
                    </p>
                  )}

                  <ul className="mt-3 space-y-1">
                    {p.items.map((item, i) => {
                      const room = rooms.find(r => r.room_id === (item.target_room_id ?? item.targetRoomId));
                      return (
                        <li key={item.id ?? i} className="text-xs" style={{ color: brand.slate }}>
                          {item.quantity} × {ITEM_TYPE_LABELS[item.item_type ?? item.itemType ?? ''] ?? (item.item_type ?? item.itemType)}
                          {room ? ` · ${room.name}` : ''}
                        </li>
                      );
                    })}
                  </ul>

                  {!isPublished && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                        style={{ borderColor: brand.border, color: brand.navy }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => duplicatePack(p)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                        style={{ borderColor: brand.border, color: brand.navy }}
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => hidePack(p)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-bold"
                        style={{ borderColor: '#f2c5c2', color: '#b42318' }}
                      >
                        Hide
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pack editor modal */}
      {editorOpen && (
        <PeerPackEditor
          pack={editingPack}
          rooms={rooms}
          defaultCurrency={currency}
          saving={packSaving}
          onSave={savePack}
          onClose={() => { setEditorOpen(false); setEditingPack(null); }}
        />
      )}
    </div>
  );
}