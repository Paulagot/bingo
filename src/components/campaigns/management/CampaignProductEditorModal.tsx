// src/components/campaigns/management/CampaignProductEditorModal.tsx
//
// Create or edit a product and its product items.
// ProductItemBuilder renders the repeating item rows.

import React, { useState, useEffect } from 'react';
import {
  CampaignProduct,
  UpsertCampaignProductPayload,
  UpsertProductItemPayload,
  ItemType,
  ProductType,
} from '../../mgtsystem/services/CampaignProductService';
import campaignProductService from '../../mgtsystem/services/CampaignProductService';

interface LinkedRoom {
  room_id:   string;
  game_type: string;
  label?:    string;
}

interface Props {
  campaignId: string;
  product:    CampaignProduct | null;  // null = create new
  saving:     boolean;
  onSave:     (payload: UpsertCampaignProductPayload) => Promise<void>;
  onClose:    () => void;
}

const ITEM_TYPES: ItemType[] = [
  'elimination_entry', 'quiz_team_ticket', 'quiz_individual_ticket',
  'puzzle_entry', 'event_ticket', 'custom',
];

const PRODUCT_TYPES: ProductType[] = [
  'single_entry', 'bundle', 'ticket', 'subscription', 'sponsor', 'custom',
];

function emptyItem(): UpsertProductItemPayload {
  return { targetRoomId: '', itemType: 'elimination_entry', quantity: 1 };
}

export default function CampaignProductEditorModal({
  campaignId, product, saving, onSave, onClose,
}: Props) {
  const isEdit = !!product;

  // Form state
  const [name,         setName]         = useState(product?.name ?? '');
  const [description,  setDescription]  = useState(product?.description ?? '');
  const [productType,  setProductType]  = useState<ProductType>(product?.productType ?? 'single_entry');
  const [price,        setPrice]        = useState(String(product?.price ?? ''));
  const [currency,     setCurrency]     = useState(product?.currency ?? 'EUR');
  const [isFeatured,   setIsFeatured]   = useState(product?.isFeatured ?? false);
  const [badgeLabel,   setBadgeLabel]   = useState(product?.badgeLabel ?? '');
  const [maxSales,     setMaxSales]     = useState(String(product?.maxSales ?? ''));
  const [items,        setItems]        = useState<UpsertProductItemPayload[]>(
    product?.items.map(i => ({
      targetRoomId: i.targetRoomId,
      itemType:     i.itemType,
      quantity:     i.quantity,
    })) ?? [emptyItem()]
  );

  const [linkedRooms, setLinkedRooms] = useState<LinkedRoom[]>([]);
  const [formError,   setFormError]   = useState<string | null>(null);

  // Load linked rooms for the campaign (dropdown options)
  useEffect(() => {
    fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/linked-rooms`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}`,
      },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.rooms) setLinkedRooms(data.rooms);
      })
      .catch(() => {
        // Non-fatal — rooms input falls back to free-text
      });
  }, [campaignId]);

  // ── Item helpers ─────────────────────────────────────────────────────────

  const addItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (idx: number) =>
    setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, patch: Partial<UpsertProductItemPayload>) =>
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...patch } : item));

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedPrice = Number(price);
    if (!name.trim())        { setFormError('Product name is required.'); return; }
    if (isNaN(parsedPrice) || parsedPrice < 0) { setFormError('Price must be 0 or more.'); return; }

    for (const item of items) {
      if (!item.targetRoomId.trim()) { setFormError('All items must have a linked event/room.'); return; }
      if (item.quantity < 1)         { setFormError('All item quantities must be at least 1.'); return; }
    }

    const payload: UpsertCampaignProductPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      productType,
      price:       parsedPrice,
      currency,
      isFeatured,
      badgeLabel:  badgeLabel.trim() || undefined,
      maxSales:    maxSales ? Number(maxSales) : undefined,
      items,
    };

    await onSave(payload);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fl-modal-overlay" onClick={onClose}>
      <div
        className="fl-modal fl-product-editor"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit Product' : 'Create Product'}
      >
        <div className="fl-modal-header">
          <h2>{isEdit ? `Edit: ${product!.name}` : 'Create Product'}</h2>
          <button className="fl-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="fl-modal-body" onSubmit={handleSubmit} noValidate>
          {formError && <div className="fl-form-error">{formError}</div>}

          {/* ── Product details ── */}
          <fieldset className="fl-fieldset">
            <legend>Product Details</legend>

            <div className="fl-form-row">
              <label className="fl-label" htmlFor="prod-name">Name *</label>
              <input
                id="prod-name"
                className="fl-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Tournament Game Pack"
                required
              />
            </div>

            <div className="fl-form-row">
              <label className="fl-label" htmlFor="prod-desc">Description</label>
              <textarea
                id="prod-desc"
                className="fl-input fl-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description shown to supporters"
                rows={2}
              />
            </div>

            <div className="fl-form-row fl-form-row--split">
              <div>
                <label className="fl-label" htmlFor="prod-type">Product Type</label>
                <select
                  id="prod-type"
                  className="fl-input fl-select"
                  value={productType}
                  onChange={e => setProductType(e.target.value as ProductType)}
                >
                  {PRODUCT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="fl-label" htmlFor="prod-price">Price *</label>
                <div className="fl-input-group">
                  <select
                    className="fl-input fl-select fl-input-group-prefix"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    {['EUR','GBP','USD'].map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input
                    id="prod-price"
                    className="fl-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="fl-form-row fl-form-row--split">
              <div className="fl-form-check">
                <input
                  id="prod-featured"
                  type="checkbox"
                  checked={isFeatured}
                  onChange={e => setIsFeatured(e.target.checked)}
                />
                <label htmlFor="prod-featured">Featured / Most Popular</label>
              </div>
              <div>
                <label className="fl-label" htmlFor="prod-badge">Badge Label</label>
                <input
                  id="prod-badge"
                  className="fl-input"
                  value={badgeLabel}
                  onChange={e => setBadgeLabel(e.target.value)}
                  placeholder="e.g. Most Popular"
                />
              </div>
            </div>

            <div className="fl-form-row">
              <label className="fl-label" htmlFor="prod-maxsales">Max Sales (optional)</label>
              <input
                id="prod-maxsales"
                className="fl-input fl-input--narrow"
                type="number"
                min="1"
                value={maxSales}
                onChange={e => setMaxSales(e.target.value)}
                placeholder="Leave blank for unlimited"
              />
            </div>
          </fieldset>

          {/* ── Included items ── */}
          <fieldset className="fl-fieldset">
            <legend>Included Items</legend>
            <p className="fl-fieldset-hint">
              Each item defines what is created when a supporter purchases this product.
            </p>

            {items.map((item, idx) => (
              <ProductItemRow
                key={idx}
                item={item}
                rooms={linkedRooms}
                onChange={patch => updateItem(idx, patch)}
                onRemove={items.length > 1 ? () => removeItem(idx) : undefined}
              />
            ))}

            <button type="button" className="fl-btn fl-btn--ghost fl-btn--sm" onClick={addItem}>
              + Add Item
            </button>
          </fieldset>

          {/* ── Actions ── */}
          <div className="fl-modal-footer">
            <button type="button" className="fl-btn fl-btn--outline" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="fl-btn fl-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Product item row ──────────────────────────────────────────────────────────

interface ItemRowProps {
  item:     UpsertProductItemPayload;
  rooms:    LinkedRoom[];
  onChange: (patch: Partial<UpsertProductItemPayload>) => void;
  onRemove: (() => void) | undefined;
}

function ProductItemRow({ item, rooms, onChange, onRemove }: ItemRowProps) {
  return (
    <div className="fl-item-row">
      <div className="fl-item-row-event">
        {rooms.length > 0 ? (
          <select
            className="fl-input fl-select"
            value={item.targetRoomId}
            onChange={e => onChange({ targetRoomId: e.target.value })}
          >
            <option value="">— Select event / room —</option>
            {rooms.map(r => (
              <option key={r.room_id} value={r.room_id}>
                {r.label ?? r.room_id} ({r.game_type})
              </option>
            ))}
          </select>
        ) : (
          <input
            className="fl-input"
            value={item.targetRoomId}
            onChange={e => onChange({ targetRoomId: e.target.value })}
            placeholder="Room ID"
          />
        )}
      </div>

      <div className="fl-item-row-type">
        <select
          className="fl-input fl-select"
          value={item.itemType}
          onChange={e => onChange({ itemType: e.target.value as ItemType })}
        >
          {ITEM_TYPES.map(t => (
            <option key={t} value={t}>
              {campaignProductService.itemTypeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <div className="fl-item-row-qty">
        <input
          className="fl-input fl-input--narrow"
          type="number"
          min="1"
          value={item.quantity}
          onChange={e => onChange({ quantity: Number(e.target.value) })}
          aria-label="Quantity"
        />
      </div>

      {onRemove && (
        <button
          type="button"
          className="fl-btn fl-btn--ghost fl-btn--icon fl-btn--danger"
          onClick={onRemove}
          aria-label="Remove item"
        >
          ×
        </button>
      )}
    </div>
  );
}