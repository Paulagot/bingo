import React from 'react';
import { SkipForward, Trophy } from 'lucide-react';

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

interface OrderImageReviewQuestion {
  id: string;
  prompt: string;
  images: Array<{ 
    id: string; 
    imageUrl: string;  // ✅ Changed from 'url'
    label: string; 
    order: number;
  }>;
  difficulty?: string;
  category?: string;
  questionNumber?: number;
  totalQuestions?: number;
  statistics?: {
    totalPlayers: number;
    correctCount: number;
    incorrectCount: number;
    noAnswerCount: number;
    correctPercentage: number;
    incorrectPercentage: number;
    noAnswerPercentage: number;
  };
}

interface OrderImageReviewPanelProps {
  visible: boolean;
  reviewQuestion: OrderImageReviewQuestion | null;
  isLastQuestionOfRound: boolean;
  reviewComplete: boolean;
  onShowRoundResults: () => void;
  onNextReview: () => void;
}

const OrderImageReviewPanel: React.FC<OrderImageReviewPanelProps> = ({
  visible,
  reviewQuestion,
  isLastQuestionOfRound,
  reviewComplete,
  onShowRoundResults,
  onNextReview
}) => {
  if (!visible || !reviewQuestion) return null;

  const stats = reviewQuestion.statistics;

  return (
    <div className="bg-muted mb-6 rounded-xl border-2 border-yellow-200 p-6 shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-fg text-lg font-bold">📖 Order Image Review</h3>
          {reviewQuestion.questionNumber && reviewQuestion.totalQuestions && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
              Question {reviewQuestion.questionNumber}/{reviewQuestion.totalQuestions}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {(isLastQuestionOfRound || reviewComplete) && (
            <button
              onClick={onShowRoundResults}
              className="flex items-center space-x-2 rounded-lg bg-purple-500 px-4 py-2 font-medium text-white transition hover:bg-purple-600"
            >
              <Trophy className="h-4 w-4" />
              <span>Show Round Results</span>
            </button>
          )}

          {!isLastQuestionOfRound && !reviewComplete && (
            <button
              onClick={onNextReview}
              className="flex items-center space-x-2 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white transition hover:bg-yellow-600"
            >
              <SkipForward className="h-4 w-4" />
              <span>Next Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-4 rounded-lg bg-gray-50 p-4">
        <p className="text-fg text-lg font-medium">{reviewQuestion.prompt}</p>
      </div>

      {/* Correct Order Display */}
      <div className="mb-4">
        <h4 className="mb-2 text-sm font-semibold text-green-700">
          ✅ Correct Order (Oldest → Newest):
        </h4>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {reviewQuestion.images
            .sort((a, b) => a.order - b.order)
            .map((img, idx) => (
              <div
                key={img.id}
                className="rounded-lg border-2 border-green-200 bg-green-50 p-3 text-center"
              >
                <div className="mb-1 text-xs font-bold text-green-700">
                  #{idx + 1}
                </div>
                <img
                  src={getFullImageUrl(img.imageUrl)}
                  alt={img.label}
                  className="mb-2 h-20 w-full object-contain"
                />
                <p className="text-sm font-medium text-gray-700">{img.label}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="rounded-lg bg-blue-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-blue-900">
            📊 Answer Statistics
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.correctCount}
              </div>
              <div className="text-xs text-gray-600">
                ✅ Correct ({stats.correctPercentage}%)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.incorrectCount}
              </div>
              <div className="text-xs text-gray-600">
                ❌ Incorrect ({stats.incorrectPercentage}%)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {stats.noAnswerCount}
              </div>
              <div className="text-xs text-gray-600">
                ⏰ No Answer ({stats.noAnswerPercentage}%)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderImageReviewPanel;