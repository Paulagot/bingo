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
  answerSubmitted
}) => {
  
  const [items, setItems] = useState<OrderImageItem[]>(question.images || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

   console.log('🎨 [OrderImageAsking] Render:', {
    questionId: question.id,
    itemCount: items.length,
    timeLeft,
    answerSubmitted,
    currentOrder: items.map(i => i.label)
  });

    useEffect(() => {
    if (items.length > 0 && !answerSubmitted && onOrderChange) {
      const currentOrder = items.map(item => item.id);
      onOrderChange(currentOrder);
    }
  }, [items, answerSubmitted, onOrderChange]);

  // Reset items when question changes

    useEffect(() => {
    if (question?.images && Array.isArray(question.images) && question.images.length > 0) {
      console.log('🎨 [OrderImageAsking] Setting items:', question.images.map(i => i.label));
      setItems(question.images);
    }
  }, [question?.id, question?.images]);

   useEffect(() => {
    console.log('🎨 [OrderImageAsking] Render:', {
      questionId: question?.id,
      itemCount: items.length,
      timeLeft,
      answerSubmitted,
      currentOrder: items.map(i => i.label)
    });
  }, [question?.id, items, timeLeft, answerSubmitted]);

  // Handle drag start (desktop)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  // Handle drag over (desktop)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    if (!draggedItem) return; // Safety check
    
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);
    
    setItems(newItems);
    setDraggedIndex(index);
  };

  // Handle drag end (desktop)
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Handle touch start (mobile)
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touch = e.touches[0];
    setDraggedIndex(index);
    setTouchStartY(touch.clientY);
  };

  // Handle touch move (mobile)
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (draggedIndex === null || touchStartY === null) return;
    
    const touch = e.touches[0];
    if (!touch) return; // Safety check for undefined touch
    
    e.preventDefault(); // Prevent scrolling while dragging
    
    const currentY = touch.clientY;
    
    // Determine which item we're hovering over based on Y position
    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const itemHeight = containerRect.height / items.length;
    const relativeY = currentY - containerRect.top;
    const targetIndex = Math.floor(relativeY / itemHeight);
    
    if (targetIndex >= 0 && targetIndex < items.length && targetIndex !== draggedIndex) {
      const newItems = [...items];
      const draggedItem = newItems[draggedIndex];
      
      if (!draggedItem) return; // Safety check
      
      newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, draggedItem);
      
      setItems(newItems);
      setDraggedIndex(targetIndex);
      setTouchStartY(currentY); // Update start position
    }
  }, [draggedIndex, touchStartY, items]);

  // Set up touch event listeners with { passive: false }
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add non-passive listener to allow preventDefault
    container.addEventListener('touchmove', handleTouchMove as any, { passive: false });

    return () => {
      container.removeEventListener('touchmove', handleTouchMove as any);
    };
  }, [handleTouchMove]);

  // Handle touch end (mobile)
  const handleTouchEnd = () => {
    setDraggedIndex(null);
    setTouchStartY(null);
  };

  // Handle submit
  const handleSubmit = () => {
    if (isFrozen || answerSubmitted) return;
    
    const order = items.map(item => item.id);
    onSubmit(order);
  };

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && !answerSubmitted && !isFrozen) {
      handleSubmit();
    }
  }, [timeLeft, answerSubmitted, isFrozen]);

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Header */}
      <div className="w-full max-w-2xl text-center">
        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>Question {question.questionNumber}/{question.totalQuestions}</span>
          {question.difficulty && (
            <span className="capitalize">{question.difficulty}</span>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          {question.prompt}
        </h2>
        
        {/* Timer */}
        {timeLeft !== null && (
          <div className={`text-3xl font-bold mb-4 ${
            timeLeft <= 5 ? 'text-red-600 animate-pulse' : 
            timeLeft <= 10 ? 'text-orange-500' : 
            'text-blue-600'
          }`}>
            {timeLeft}s
          </div>
        )}

        {/* Instructions */}
        {!answerSubmitted && !isFrozen && (
          <p className="text-sm text-gray-600 mb-4">
            👆 Drag and drop to reorder, then tap Submit
          </p>
        )}
      </div>

      {/* Frozen Notice */}
      {isFrozen && frozenNotice && (
        <div className="w-full max-w-2xl p-4 bg-blue-100 border-2 border-blue-300 rounded-lg text-center">
          <p className="text-blue-800 font-semibold">❄️ {frozenNotice}</p>
        </div>
      )}

      {/* Image Grid */}
      <div 
        ref={containerRef}
        className="w-full max-w-2xl space-y-3"
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable={!isFrozen && !answerSubmitted}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchEnd={handleTouchEnd}
            className={`
              relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all
              ${draggedIndex === index ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
              ${isFrozen || answerSubmitted ? 'cursor-not-allowed bg-gray-100 border-gray-300' : 'cursor-move bg-white border-gray-300 hover:border-blue-400 hover:shadow-md'}
            `}
            style={{
              touchAction: 'none', // Prevent default touch behaviors
              userSelect: 'none'
            }}
          >
            {/* Order Number */}
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
              {index + 1}
            </div>

            {/* Image */}
            <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={item.imageUrl} 
                alt={item.label}
                className="w-full h-full object-cover"
                draggable={false} // Prevent image from being draggable
              />
            </div>

            {/* Label */}
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-800">{item.label}</p>
            </div>

            {/* Drag Handle Icon (visual indicator) */}
            {!isFrozen && !answerSubmitted && (
              <div className="flex-shrink-0 text-gray-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit Button */}
      {!answerSubmitted && !isFrozen && (
        <button
          onClick={handleSubmit}
          className="w-full max-w-md py-4 px-6 bg-green-600 hover:bg-green-700 text-white text-xl font-bold rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
        >
          Submit Answer
        </button>
      )}

      {/* Submitted Message */}
      {answerSubmitted && (
        <div className="w-full max-w-md p-4 bg-green-100 border-2 border-green-300 rounded-lg text-center">
          <p className="text-green-800 font-semibold">✅ Answer submitted!</p>
        </div>
      )}
    </div>
  );
};

export default OrderImageAsking;