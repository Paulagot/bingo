import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SequenceItem, SequenceOrderingPuzzleData } from '../puzzleTypes';

interface SequenceOrderingRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

const safeParseArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normaliseSequenceItems = (rawItems: unknown[]): SequenceItem[] => {
  return rawItems
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `item-${index + 1}`,
          label: item,
        };
      }

      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;

        const id =
          obj.id ??
          obj.itemId ??
          obj.value ??
          `item-${index + 1}`;

        const label =
          obj.label ??
          obj.text ??
          obj.title ??
          obj.name ??
          obj.value ??
          '';

        return {
          id: String(id),
          label: String(label),
        };
      }

      return null;
    })
    .filter((item): item is SequenceItem => {
      return Boolean(item && item.id && item.label);
    });
};

const SequenceOrderingRenderer: React.FC<SequenceOrderingRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as SequenceOrderingPuzzleData & Record<string, unknown>;

  const safeItems = useMemo(() => {
    const possibleItems =
      data.items ??
      data.sequence ??
      data.steps ??
      data.options ??
      data.answers;

    return normaliseSequenceItems(safeParseArray(possibleItems));
  }, [data]);

  const prompt =
    String(
      data.prompt ??
      data.question ??
      data.instruction ??
      'Put the items into the correct order.'
    );

  const initItems = (): SequenceItem[] => {
    const savedIds = currentAnswer.orderedIds as string[] | undefined;

    if (savedIds && savedIds.length === safeItems.length) {
      const restored = savedIds
        .map(id => safeItems.find(item => item.id === id))
        .filter((item): item is SequenceItem => item !== undefined);

      if (restored.length === safeItems.length) {
        return restored;
      }
    }

    return [...safeItems];
  };

  const [items, setItems] = useState<SequenceItem[]>(initItems);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    setItems(initItems());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleData]);

  useEffect(() => {
    if (items.length > 0) {
      onAnswerChange({ orderedIds: items.map(item => item.id) });
    }
  }, [items, onAnswerChange]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (isReadOnly) return;
    if (toIndex < 0 || toIndex >= items.length) return;

    const reordered = [...items];
    const [movedItem] = reordered.splice(fromIndex, 1);

    if (!movedItem) return;

    reordered.splice(toIndex, 0, movedItem);
    setItems(reordered);
  };

  const handleDragStart = (index: number) => {
    if (isReadOnly) return;
    dragIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    if (isReadOnly) return;
    if (dragIndex.current === null || dragIndex.current === index) return;

    moveItem(dragIndex.current, index);
    dragIndex.current = index;
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
  };

  if (!safeItems.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <div className="font-bold">No sequence items found.</div>
        <div className="mt-1">
          This puzzle needs an items array in puzzleData. The renderer looked for items, sequence, steps, options, or answers.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prompt card */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-5 py-4 shadow-sm">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sky-100/70" />
        <div className="relative">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-500">
            Put these in order
          </div>
          <div className="mt-1 text-base font-bold leading-relaxed text-slate-900 sm:text-lg">
            {prompt}
          </div>
        </div>
      </div>

      {/* Order list */}
      <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Your order
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              First item at the top. Drag cards or use the arrows.
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {items.length} items
          </div>
        </div>

        <ol className="space-y-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable={!isReadOnly}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={event => event.preventDefault()}
              className={[
                'group flex items-center gap-3 rounded-2xl border bg-gradient-to-br from-white to-slate-50 px-3 py-3 shadow-sm transition',
                isReadOnly
                  ? 'border-slate-200'
                  : 'cursor-grab border-slate-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md active:cursor-grabbing',
              ].join(' ')}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sm font-black text-sky-700">
                {index + 1}
              </div>

              <div className="min-w-0 flex-1 text-sm font-bold leading-snug text-slate-800 sm:text-base">
                {item.label}
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move item up"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === items.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move item down"
                  >
                    ↓
                  </button>

                  <span className="hidden pl-1 text-xl leading-none text-slate-300 sm:inline">
                    ⠿
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <p className="text-center text-xs text-slate-400">
        Tip: use the arrows on mobile if dragging feels awkward.
      </p>
    </div>
  );
};

export default SequenceOrderingRenderer;