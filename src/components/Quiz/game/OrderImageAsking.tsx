// src/components/Quiz/game/OrderImageAsking.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface OrderImageItem {
  id: string;
  label: string;
  imageUrl: string;
}

interface OrderImageQuestion {
  id: string;
  prompt: string;
  images: OrderImageItem[];
  difficulty?: string;
  category?: string;
  timeLimit: number;
  questionStartTime: number;
  questionNumber: number;
  totalQuestions: number;
}

interface OrderImageAskingProps {
  question: OrderImageQuestion;
  onSubmit: (order: string[]) => void;
  onOrderChange?: (order: string[]) => void;
  isFrozen?: boolean;
  frozenNotice?: string | null;
  timeLeft: number | null;
  answerSubmitted: boolean;
}

const OrderImageAsking: React.FC<OrderImageAskingProps> = ({
  question,
  onSubmit,
  onOrderChange,
  isFrozen = false,
  frozenNotice = null,
  timeLeft,
  answerSubmitted,
}) => {
  const [items, setItems] = useState<OrderImageItem[]>(question.images || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Notify parent of order changes
  useEffect(() => {
    if (items.length > 0 && !answerSubmitted && onOrderChange) {
      onOrderChange(items.map(item => item.id));
    }
  }, [items, answerSubmitted, onOrderChange]);

  // Reset items when question changes
  useEffect(() => {
    if (question?.images && Array.isArray(question.images) && question.images.length > 0) {
      setItems(question.images);
    }
  }, [question?.id, question?.images]);

  // Desktop drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    if (!draggedItem) return;

    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setItems(newItems);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    if (!touch) return;
    setDraggedIndex(index);
    setTouchStartY(touch.clientY);
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (draggedIndex === null || touchStartY === null) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();

      const currentY = touch.clientY;

      // Find which item we're hovering over by checking each item's bounding rect
      let targetIndex: number | null = null;
      itemRefs.current.forEach((ref, idx) => {
        if (!ref) return;
        const rect = ref.getBoundingClientRect();
        if (currentY >= rect.top && currentY <= rect.bottom) {
          targetIndex = idx;
        }
      });

      if (targetIndex !== null && targetIndex !== draggedIndex) {
        const newItems = [...items];
        const draggedItem = newItems[draggedIndex];
        if (!draggedItem) return;
        newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, draggedItem);
        setItems(newItems);
        setDraggedIndex(targetIndex);
        setTouchStartY(currentY);
      }
    },
    [draggedIndex, touchStartY, items]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false });
    return () => container.removeEventListener('touchmove', handleTouchMove as EventListener);
  }, [handleTouchMove]);

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setTouchStartY(null);
  };

  const handleSubmit = () => {
    if (isFrozen || answerSubmitted) return;
    onSubmit(items.map(item => item.id));
  };

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLeft === 0 && !answerSubmitted && !isFrozen) {
      handleSubmit();
    }
  }, [timeLeft, answerSubmitted, isFrozen]);

  const timerColor =
    timeLeft !== null && timeLeft <= 5
      ? '#ef4444'
      : timeLeft !== null && timeLeft <= 10
      ? '#f97316'
      : '#3b82f6';

  const timerPercent =
    timeLeft !== null && question.timeLimit > 0
      ? (timeLeft / question.timeLimit) * 100
      : 100;

  return (
    /**
     * LAYOUT STRATEGY (mobile-first):
     * - The outer wrapper is a full-height flex column (min-h-dvh)
     * - Sticky header contains: question meta + prompt + timer bar
     * - Scrollable middle section holds the draggable list
     * - Sticky footer holds the submit button
     * This keeps the timer always visible and the list drag-friendly
     * without the page itself scrolling underneath your finger.
     */
    <div className="flex flex-col" style={{ minHeight: '100dvh', background: '#f8fafc' }}>

      {/* ── STICKY HEADER ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Meta row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
            Q{question.questionNumber}/{question.totalQuestions}
          </span>
          {question.difficulty && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '2px 10px',
                borderRadius: 99,
                background: '#f1f5f9',
                color: '#475569',
              }}
            >
              {question.difficulty}
            </span>
          )}
          {/* Timer digit */}
          {timeLeft !== null && (
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: timerColor,
                minWidth: 44,
                textAlign: 'right',
                transition: 'color 0.3s',
                animation: timeLeft <= 5 ? 'pulse 0.6s infinite alternate' : 'none',
              }}
            >
              {timeLeft}s
            </span>
          )}
        </div>

        {/* Timer progress bar */}
        {timeLeft !== null && (
          <div style={{ height: 4, background: '#e2e8f0', margin: '0 0 2px' }}>
            <div
              style={{
                height: '100%',
                width: `${timerPercent}%`,
                background: timerColor,
                borderRadius: 2,
                transition: 'width 1s linear, background 0.3s',
              }}
            />
          </div>
        )}

        {/* Prompt */}
        <div className="px-4 py-3">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', lineHeight: 1.4, margin: 0 }}>
            {question.prompt}
          </h2>
          {!answerSubmitted && !isFrozen && (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              ↕ Drag to reorder · then tap Submit
            </p>
          )}
        </div>

        {/* Frozen notice */}
        {isFrozen && frozenNotice && (
          <div
            style={{
              margin: '0 12px 10px',
              padding: '8px 14px',
              background: '#eff6ff',
              border: '1.5px solid #93c5fd',
              borderRadius: 10,
              fontSize: 13,
              color: '#1d4ed8',
              fontWeight: 600,
            }}
          >
            ❄️ {frozenNotice}
          </div>
        )}

        {answerSubmitted && (
          <div
            style={{
              margin: '0 12px 10px',
              padding: '8px 14px',
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: 10,
              fontSize: 13,
              color: '#166534',
              fontWeight: 600,
            }}
          >
            ✅ Answer submitted!
          </div>
        )}
      </div>

      {/* ── SCROLLABLE DRAG LIST ── */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 12px 8px',
          // Prevent the page scroll from interfering during drag
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          return (
            <div
              key={item.id}
              ref={el => { itemRefs.current[index] = el; }}
              draggable={!isFrozen && !answerSubmitted}
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={e => handleTouchStart(e, index)}
              onTouchEnd={handleTouchEnd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                marginBottom: 10,
                borderRadius: 14,
                border: `2px solid ${isDragging ? '#3b82f6' : '#e2e8f0'}`,
                background: isDragging ? '#eff6ff' : '#fff',
                boxShadow: isDragging
                  ? '0 8px 24px rgba(59,130,246,0.18)'
                  : '0 1px 4px rgba(0,0,0,0.06)',
                opacity: isDragging ? 0.85 : 1,
                transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
                cursor: isFrozen || answerSubmitted ? 'not-allowed' : 'grab',
                touchAction: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {/* Position badge */}
              <div
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isDragging ? '#3b82f6' : '#1e40af',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 16,
                }}
              >
                {index + 1}
              </div>

              {/* Image */}
              <div
                style={{
                  flexShrink: 0,
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1.5px solid #e2e8f0',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.label}
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>

              {/* Label */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1e293b',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </p>
              </div>

              {/* Drag handle */}
              {!isFrozen && !answerSubmitted && (
                <div style={{ flexShrink: 0, color: '#cbd5e1', padding: '0 2px' }}>
                  {/* Three-line drag handle — clearer than dots on mobile */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                    <rect y="3" width="18" height="2.5" rx="1.25" />
                    <rect y="7.75" width="18" height="2.5" rx="1.25" />
                    <rect y="12.5" width="18" height="2.5" rx="1.25" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── STICKY FOOTER SUBMIT ── */}
      {!answerSubmitted && !isFrozen && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            padding: '10px 12px 14px',
            background: 'linear-gradient(to bottom, rgba(248,250,252,0) 0%, #f8fafc 30%)',
          }}
        >
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '15px 0',
              fontSize: 17,
              fontWeight: 800,
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(22,163,74,0.35)',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            Submit Answer ✓
          </button>
        </div>
      )}

      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse {
          from { opacity: 1; transform: scale(1); }
          to   { opacity: 0.7; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};

export default OrderImageAsking;