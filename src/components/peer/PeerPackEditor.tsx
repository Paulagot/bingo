import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type {
  AvailableRoom,
  PeerPack,
  PeerSellableOption,
  SavePeerPackPayload,
} from '../../services/PeerService';

type SalesOptionType = 'single_entry' | 'bundle';

type ItemDraft = {
  targetRoomId: string;
  optionId: string;
  quantity: number;
};

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

const ACTIVITY_GROUP_LABELS: Record<AvailableRoom['game_type'], string> = {
  quiz: 'Quiz',
  elimination: 'Elimination',
  ticketed_event: 'Ticketed Events',
  puzzle_drop: 'Puzzle Drops',
};

const ACTIVITY_GROUP_ORDER: AvailableRoom['game_type'][] = [
  'quiz',
  'elimination',
  'ticketed_event',
  'puzzle_drop',
];

function parseMetadata(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, any>;
  try {
    return JSON.parse(String(value)) as Record<string, any>;
  } catch {
    return {};
  }
}

function optionKey(roomId: string, optionId: string): string {
  return `${roomId}::${optionId}`;
}

function currencySymbol(currency: string): string {
  if (currency === 'EUR') return '€';
  if (currency === 'GBP') return '£';
  if (currency === 'USD') return '$';
  return `${currency} `;
}

function emptyItem(): ItemDraft {
  return {
    targetRoomId: '',
    optionId: '',
    quantity: 1,
  };
}

interface Props {
  pack: PeerPack | null;
  rooms: AvailableRoom[];
  defaultCurrency: string;
  saving: boolean;
  onSave: (payload: SavePeerPackPayload) => Promise<void>;
  onClose: () => void;
}

export default function PeerPackEditor({
  pack,
  rooms,
  defaultCurrency,
  saving,
  onSave,
  onClose,
}: Props) {
  const optionsByKey = useMemo(() => {
    const map = new Map<string, PeerSellableOption>();

    for (const room of rooms) {
      for (const option of room.sellable_options ?? []) {
        map.set(optionKey(room.room_id, option.optionId), option);
      }
    }

    return map;
  }, [rooms]);

  const groupedRooms = useMemo(
    () =>
      ACTIVITY_GROUP_ORDER.map(gameType => ({
        gameType,
        label: ACTIVITY_GROUP_LABELS[gameType],
        rooms: rooms.filter(
          room =>
            room.game_type === gameType &&
            Array.isArray(room.sellable_options) &&
            room.sellable_options.length > 0,
        ),
      })).filter(group => group.rooms.length > 0),
    [rooms],
  );

  const [name, setName] = useState(pack?.name ?? '');
  const [description, setDescription] = useState(pack?.description ?? '');
  const [optionType, setOptionType] = useState<SalesOptionType>(
    pack?.pack_type === 'bundle' ? 'bundle' : 'single_entry',
  );
  const [price, setPrice] = useState(String(pack?.price ?? ''));
  const [currency, setCurrency] = useState(pack?.currency ?? defaultCurrency);
  const [isFeatured, setIsFeatured] = useState(Boolean(pack?.is_featured));
  const [badgeLabel, setBadgeLabel] = useState(pack?.badge_label ?? '');
  const [maxSales, setMaxSales] = useState(
    pack?.max_sales != null ? String(pack.max_sales) : '',
  );
  const [formError, setFormError] = useState<string | null>(null);

  const [items, setItems] = useState<ItemDraft[]>(() => {
    if (!pack?.items?.length) return [emptyItem()];

    return pack.items.map(item => {
      const metadata = parseMetadata(item.metadata_json ?? item.metadata);
      const targetRoomId = String(
        item.target_room_id ?? item.targetRoomId ?? '',
      );

      const storedOptionId = String(
        metadata.optionId ??
          metadata.ticketTypeId ??
          metadata.pricingTierId ??
          '',
      );

      const directKey = optionKey(targetRoomId, storedOptionId);
      if (storedOptionId && optionsByKey.has(directKey)) {
        return {
          targetRoomId,
          optionId: storedOptionId,
          quantity: Number(item.quantity || 1),
        };
      }

      const fallback = rooms
        .find(room => room.room_id === targetRoomId)
        ?.sellable_options?.find(
          option =>
            option.itemType === (item.item_type ?? item.itemType),
        );

      return {
        targetRoomId,
        optionId: fallback?.optionId ?? '',
        quantity: Number(item.quantity || 1),
      };
    });
  });

  const configuredValue = useMemo(
    () =>
      items.reduce((sum, item) => {
        const option = optionsByKey.get(
          optionKey(item.targetRoomId, item.optionId),
        );

        return (
          sum +
          Number(option?.configuredPrice || 0) *
            Math.max(1, Number(item.quantity || 1))
        );
      }, 0),
    [items, optionsByKey],
  );

  const updateItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems(current =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const parsedPrice = Number(price);

    if (!name.trim()) {
      setFormError('Sales option name is required.');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError('Enter a valid selling price.');
      return;
    }

    if (!items.length) {
      setFormError('Add at least one activity.');
      return;
    }

    const payloadItems: SavePeerPackPayload['items'] = [];

    for (const item of items) {
      const room = rooms.find(
        candidate => candidate.room_id === item.targetRoomId,
      );

      const option = room?.sellable_options?.find(
        candidate => candidate.optionId === item.optionId,
      );

      if (!room || !option) {
        setFormError(
          'Choose a valid activity and selling option for every item.',
        );
        return;
      }

      payloadItems.push({
        targetRoomId: room.room_id,
        itemType: option.itemType,
        quantity: Math.max(1, Number(item.quantity || 1)),
        metadata: {
          optionId: option.optionId,
          optionKind: option.metadata.optionKind,
          configuredPrice: option.configuredPrice,
          referencePrice: option.metadata.referencePrice,
          ticketTypeId: option.metadata.ticketTypeId,
          ticketTypeName: option.metadata.ticketTypeName,
          ticketTypeQuantity: option.metadata.ticketTypeQuantity,
          ticketTypeSaleEndsAt: option.metadata.ticketTypeSaleEndsAt,
          pricingTierId: option.metadata.pricingTierId,
          pricingTierLabel: option.metadata.pricingTierLabel,
          puzzleQuantity: option.metadata.puzzleQuantity,
          puzzleItemIds: option.metadata.puzzleItemIds,
          puzzleItems: option.metadata.puzzleItems,
        },
      });
    }

    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      packType: items.length > 1 ? 'bundle' : optionType,
      price: parsedPrice,
      currency,
      isFeatured,
      badgeLabel: badgeLabel.trim() || null,
      maxSales: maxSales ? Number(maxSales) : null,
      metadata: {
        configuredValue,
        discountAmount: Math.max(0, configuredValue - parsedPrice),
      },
      items: payloadItems,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              Sales option
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {pack ? `Edit ${pack.name}` : 'Create sales option'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-6">
          {formError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Name
              </span>
              <input
                className={field}
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Quiz Entry, Puzzle Pair or Family Bundle"
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Description
              </span>
              <textarea
                className={field}
                rows={2}
                value={description}
                onChange={event => setDescription(event.target.value)}
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Type
              </span>
              <select
                className={field}
                value={optionType}
                onChange={event =>
                  setOptionType(event.target.value as SalesOptionType)
                }
                disabled={items.length > 1}
              >
                <option value="single_entry">Single activity</option>
                <option value="bundle">Bundle</option>
              </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Currency
              </span>
              <select
                className={field}
                value={currency}
                onChange={event => setCurrency(event.target.value)}
              >
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-950">
                  Included activities
                </h3>
                <p className="text-sm text-slate-500">
                  Choose the activity first, then its exact entry, ticket type
                  or Puzzle Drop tier.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setItems(current => [...current, emptyItem()]);
                  setOptionType('bundle');
                }}
                disabled={!rooms.length}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>

            {!groupedRooms.length && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                No eligible quiz, elimination, ticketed-event or Puzzle Drop
                options are currently available.
              </div>
            )}

            {items.map((item, index) => {
              const room = rooms.find(
                candidate => candidate.room_id === item.targetRoomId,
              );

              return (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_1fr_90px_40px]"
                >
                  <select
                    className={field}
                    value={item.targetRoomId}
                    onChange={event =>
                      updateItem(index, {
                        targetRoomId: event.target.value,
                        optionId: '',
                      })
                    }
                  >
                    <option value="">Choose activity</option>

                    {groupedRooms.map(group => (
                      <optgroup key={group.gameType} label={group.label}>
                        {group.rooms.map(groupedRoom => (
                          <option
                            key={groupedRoom.room_id}
                            value={groupedRoom.room_id}
                          >
                            {groupedRoom.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  <select
                    className={field}
                    value={item.optionId}
                    disabled={!room}
                    onChange={event =>
                      updateItem(index, {
                        optionId: event.target.value,
                      })
                    }
                  >
                    <option value="">Choose selling option</option>

                    {(room?.sellable_options ?? []).map(option => (
                      <option
                        key={option.optionId}
                        value={option.optionId}
                      >
                        {option.label} — {currencySymbol(option.currency)}
                        {Number(option.configuredPrice).toFixed(2)}
                      </option>
                    ))}
                  </select>

                  {(() => {
                    const selectedOption = room?.sellable_options?.find(
                      option => option.optionId === item.optionId,
                    );
                    const extras = selectedOption?.metadata?.includedExtras ?? [];
                    const entryFee = Number(selectedOption?.metadata?.entryFee ?? 0);
                    const extrasTotal = Number(selectedOption?.metadata?.extrasTotal ?? 0);

                    if (room?.game_type !== 'quiz' || !selectedOption) return null;

                    return (
                      <div className="sm:col-span-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                        <p className="font-black">
                          All available quiz extras are included automatically.
                        </p>
                        <p className="mt-1">
                          Entry {currencySymbol(selectedOption.currency)}{entryFee.toFixed(2)}
                          {' '}+ extras {currencySymbol(selectedOption.currency)}{extrasTotal.toFixed(2)}
                          {' '}= true configured value {currencySymbol(selectedOption.currency)}
                          {Number(selectedOption.configuredPrice).toFixed(2)}.
                        </p>
                        {extras.length > 0 && (
                          <p className="mt-1 text-amber-800">
                            Included: {extras.map((extra: any) =>
                              `${extra.label || extra.extraId} (${currencySymbol(selectedOption.currency)}${Number(extra.price).toFixed(2)})`
                            ).join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  <input
                    className={field}
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={event =>
                      updateItem(index, {
                        quantity: Math.max(
                          1,
                          Number(event.target.value || 1),
                        ),
                      })
                    }
                    aria-label="Quantity"
                  />

                  <button
                    type="button"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems(current =>
                        current.filter(
                          (_, itemIndex) => itemIndex !== index,
                        ),
                      )
                    }
                    className="grid h-10 w-10 place-items-center rounded-xl text-red-600 disabled:opacity-30"
                    aria-label="Remove activity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </section>

          <section className="grid gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-4 sm:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Selling price
              </span>
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={event => setPrice(event.target.value)}
              />
            </label>

            <div className="rounded-xl bg-white p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span>Configured value</span>
                <strong>
                  {currencySymbol(currency)}
                  {configuredValue.toFixed(2)}
                </strong>
              </div>

              <div className="mt-1 flex justify-between gap-3">
                <span>Difference</span>
                <strong>
                  {currencySymbol(currency)}
                  {(Number(price || 0) - configuredValue).toFixed(2)}
                </strong>
              </div>
            </div>

            <label>
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Badge
              </span>
              <input
                className={field}
                value={badgeLabel}
                onChange={event => setBadgeLabel(event.target.value)}
                placeholder="Popular"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-bold text-slate-800">
                Maximum sales
              </span>
              <input
                className={field}
                type="number"
                min="1"
                value={maxSales}
                onChange={event => setMaxSales(event.target.value)}
                placeholder="No limit"
              />
            </label>

            <label className="flex items-center gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={event => setIsFeatured(event.target.checked)}
              />
              <span className="text-sm font-bold text-slate-800">
                Feature this option
              </span>
            </label>
          </section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 font-bold"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || !groupedRooms.length}
              className="rounded-xl bg-teal-700 px-5 py-2.5 font-bold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save sales option'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
