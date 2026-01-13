// src/components/Quiz/game/OrderImageReview.tsx
import React from 'react';

// Get the base URL dynamically from the browser's current location
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // In browser: use the current origin (e.g., https://example.ie or https://example.co.uk)
    return window.location.origin;
  }
  // Fallback for SSR or when window is not available
  return import.meta.env.VITE_SITE_ORIGIN || 'http://localhost:3001';
};

const getFullImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  const baseUrl = getBaseUrl();
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface OrderImageItem {
  id: string;
  label: string;
  imageUrl: string;
  url?: string; // Backend might send 'url' instead of 'imageUrl'
  order: number;
}

interface OrderImageQuestion {
  id: string;
  prompt: string;
  images: OrderImageItem[];
  difficulty?: string;
  category?: string;
}

interface OrderImageReviewProps {
  question: OrderImageQuestion;
  playerOrder: string[] | null; // Array of image IDs in player's submitted order
  questionNumber?: number;
  totalQuestions?: number;
}

const OrderImageReview: React.FC<OrderImageReviewProps> = ({
  question,
  playerOrder,
  questionNumber,
  totalQuestions
}) => {
  // Sort images by correct order
  const correctOrderImages = [...question.images].sort((a, b) => a.order - b.order);
  
  // Build player's order (if they submitted)
  const playerOrderImages = playerOrder 
    ? playerOrder.map(id => question.images.find(img => img.id === id)).filter(Boolean) as OrderImageItem[]
    : null;

  // Check if player got it correct
  const isCorrect = playerOrder && playerOrder.length === question.images.length &&
    playerOrder.every((id, index) => {
      const img = question.images.find(i => i.id === id);
      return img && img.order === index + 1;
    });

  // Helper to get image URL (handles both 'imageUrl' and 'url' fields)
  const getImageUrl = (item: OrderImageItem) => {
    const rawUrl = item.imageUrl || item.url || '';
    return getFullImageUrl(rawUrl);
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Header */}
      <div className="w-full max-w-4xl text-center">
        {questionNumber && totalQuestions && (
          <div className="mb-2 text-sm text-gray-500">
            Question {questionNumber}/{totalQuestions}
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {question.prompt}
        </h2>
        {question.difficulty && (
          <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm capitalize mb-4">
            {question.difficulty}
          </span>
        )}
      </div>

      {/* Result Badge */}
      {playerOrder && (
        <div className={`w-full max-w-md p-4 rounded-lg text-center ${
          isCorrect 
            ? 'bg-green-100 border-2 border-green-300' 
            : 'bg-red-100 border-2 border-red-300'
        }`}>
          <p className={`text-xl font-bold ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
          </p>
        </div>
      )}

      {/* No Answer */}
      {!playerOrder && (
        <div className="w-full max-w-md p-4 bg-yellow-100 border-2 border-yellow-300 rounded-lg text-center">
          <p className="text-yellow-800 font-semibold">⏰ No answer submitted</p>
        </div>
      )}

      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-6">
        {/* Correct Order */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-green-700 text-center mb-4">
            ✅ Correct Order
          </h3>
          {correctOrderImages.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-green-50 border-2 border-green-300 rounded-xl"
            >
              {/* Position */}
              <div className="flex-shrink-0 w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
                {index + 1}
              </div>

              {/* Image */}
              <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-green-300">
                <img 
                  src={getImageUrl(item)} 
                  alt={item.label}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className="text-lg font-semibold text-gray-800">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Player's Order */}
        {playerOrderImages && (
          <div className="space-y-3">
            <h3 className={`text-xl font-bold text-center mb-4 ${
              isCorrect ? 'text-green-700' : 'text-red-700'
            }`}>
              {isCorrect ? '✅' : '❌'} Your Answer
            </h3>
            {playerOrderImages.map((item, index) => {
              // Check if this item is in the correct position
              const correctPosition = item.order === index + 1;
              
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                    correctPosition 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                  }`}
                >
                  {/* Position */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white ${
                    correctPosition ? 'bg-green-600' : 'bg-red-600'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Image */}
                  <div className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border ${
                    correctPosition ? 'border-green-300' : 'border-red-300'
                  }`}>
                    <img 
                      src={getImageUrl(item)} 
                      alt={item.label}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-gray-800">{item.label}</p>
                    {!correctPosition && (
                      <p className="text-sm text-red-600 mt-1">
                        Should be position {item.order}
                      </p>
                    )}
                  </div>

                  {/* Indicator */}
                  <div className="flex-shrink-0">
                    {correctPosition ? (
                      <span className="text-2xl">✅</span>
                    ) : (
                      <span className="text-2xl">❌</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No Answer - Show Correct Order Only */}
        {!playerOrderImages && (
          <div className="flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg">You did not submit an answer</p>
            </div>
          </div>
        )}
      </div>

      {/* Educational note */}
      {question.category && (
        <div className="w-full max-w-4xl p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 text-center">
            <strong>Category:</strong> {question.category}
          </p>
        </div>
      )}
    </div>
  );
};

export default OrderImageReview;