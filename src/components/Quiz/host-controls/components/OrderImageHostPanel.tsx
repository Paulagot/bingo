// src/components/Quiz/host-controls/components/OrderImageHostPanel.tsx
import React from 'react';
import { Timer } from 'lucide-react';

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

interface OrderImageQuestion {
  id: string;
  prompt: string;
  images: Array<{ 
    id: string; 
    imageUrl: string;  // ✅ Changed from 'url'
    label: string;
  }>;
  difficulty?: string;
  category?: string;
  questionNumber?: number;
  totalQuestions?: number;
  timeLimit?: number;
}

interface OrderImageHostPanelProps {
  visible: boolean;
  question: OrderImageQuestion | null;
  timeLeft: number | null;
}

const OrderImageHostPanel: React.FC<OrderImageHostPanelProps> = ({
  visible,
  question,
  timeLeft
}) => {
  if (!visible || !question) return null;

  return (
    <div className="mb-6 rounded-xl border-2 border-blue-200 bg-white p-6 shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-fg text-lg font-bold">
            📸 Order Image Question
          </h3>
          {question.questionNumber && question.totalQuestions && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              Question {question.questionNumber}/{question.totalQuestions}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {question.category && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
              {question.category}
            </span>
          )}
          {question.difficulty && (
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                question.difficulty === 'easy'
                  ? 'bg-green-100 text-green-700'
                  : question.difficulty === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {question.difficulty}
            </span>
          )}
          {timeLeft !== null && (
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-orange-600" />
              <span
                className={`text-lg font-bold ${
                  timeLeft <= 10
                    ? 'animate-pulse text-red-600'
                    : timeLeft <= 30
                      ? 'text-orange-600'
                      : 'text-green-600'
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-4 rounded-lg bg-gray-50 p-4">
        <p className="text-fg text-lg font-medium">{question.prompt}</p>
      </div>

      {/* Images Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {question.images.map((img) => (
          <div
            key={img.id}
            className="rounded-lg border-2 border-gray-200 bg-white p-3 text-center"
          >
            <img
              src={getFullImageUrl(img.imageUrl)}
              alt={img.label}
              className="mb-2 h-24 w-full object-contain"
            />
            <p className="text-sm font-medium text-gray-700">{img.label}</p>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-4 rounded-lg bg-blue-50 p-3">
        <p className="text-sm text-blue-700">
          ℹ️ Players are arranging these images in chronological order (oldest to newest)
        </p>
      </div>
    </div>
  );
};

export default OrderImageHostPanel;