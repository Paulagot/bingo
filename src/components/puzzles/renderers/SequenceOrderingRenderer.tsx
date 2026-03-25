import React, { useState, useEffect, useRef } from 'react';
import type { SequenceItem, SequenceOrderingPuzzleData } from '../puzzleTypes';

interface SequenceOrderingRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

const SequenceOrderingRenderer: React.FC<SequenceOrderingRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as SequenceOrderingPuzzleData;

  // Guard: items may arrive as a JSON string if MySQL driver doesn't auto-parse
  const safeItems: SequenceItem[] = Array.isArray(data.items)
    ? data.items
    : typeof (data.items as unknown) === 'string'
      ? JSON.parse(data.items as unknown as string)
      : [];

  const initItems = (): SequenceItem[] => {
    const savedIds = currentAnswer.orderedIds as string[] | undefined;
    if (savedIds && savedIds.length === safeItems.length) {
      return savedIds
        .map((id) => safeItems.find((item) => item.id === id))
        .filter((item): item is SequenceItem => item !== undefined);
    }
    return [...safeItems];
  };

  const [items, setItems] = useState<SequenceItem[]>(initItems);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => {
    onAnswerChange({ orderedIds: items.map((i) => i.id) });
  }, [items]);

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverIndex.current = index;
    if (dragIndex.current === null || dragIndex.current === index) return;
    const reordered = [...items];
    const spliced = reordered.splice(dragIndex.current, 1);
    if (!spliced[0]) return;
    reordered.splice(index, 0, spliced[0]);
    dragIndex.current = index;
    setItems(reordered);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Prompt */}
      <p className="text-center text-sm font-semibold text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
        {data.prompt}
      </p>

      {/* Instruction */}
      <p className="text-xs text-center text-gray-400">
        Drag items into the correct order — first at the top.
      </p>

      {/* Draggable items */}
      <ol className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            draggable={!isReadOnly}
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={`flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-xl transition-all select-none ${
              isReadOnly
                ? 'border-gray-200 cursor-default'
                : 'border-gray-200 hover:border-indigo-300 cursor-grab active:cursor-grabbing active:shadow-md active:scale-[1.02]'
            }`}
          >
            {/* Position badge */}
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
              {index + 1}
            </span>

            <span className="text-sm font-medium text-gray-800 flex-1">{item.label}</span>

            {!isReadOnly && (
              <span className="text-gray-300 text-lg leading-none">⠿</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default SequenceOrderingRenderer;