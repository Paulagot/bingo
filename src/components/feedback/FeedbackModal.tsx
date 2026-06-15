// components/feedback/FeedbackModal.tsx

import { useState } from 'react';
import { useFeedback } from './useFeedback';

interface FeedbackModalProps {
  roomId:    string;
  clubId?:   number;   // optional — players aren't logged in so this may not be available
  gameType?: string;
  onClose?:  () => void;
}

interface YesNoButtonProps {
  label: string; value: boolean; selected: boolean | null | undefined;
  onClick: (v: boolean) => void;
}

function YesNoButton({ label, value, selected, onClick }: YesNoButtonProps) {
  const isSelected = selected === value;
  return (
    <button
      onClick={() => onClick(value)}
      className={[
        'flex-1 rounded-xl py-3 text-sm font-semibold transition-all duration-150',
        isSelected
          ? value
            ? 'bg-emerald-500 text-white shadow-lg scale-105'
            : 'bg-rose-500 text-white shadow-lg scale-105'
          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white',
      ].join(' ')}
      type="button"
    >
      {label}
    </button>
  );
}

const QUESTIONS: { key: 'enjoyed_game' | 'play_again' | 'recommend'; text: string; emoji: string }[] = [
  { key: 'enjoyed_game', text: 'Did you enjoy the game?',                         emoji: '🎮' },
  { key: 'play_again',   text: 'Would you play again?',                            emoji: '🔁' },
  { key: 'recommend',    text: 'Would you recommend this as a fundraising event?', emoji: '📣' },
];

export function FeedbackModal({ roomId, clubId, gameType, onClose }: FeedbackModalProps) {
  const [visible, setVisible] = useState(true);
  const feedback = useFeedback({ roomId, clubId, gameType });

  const handleClose = () => { setVisible(false); onClose?.(); };

  const handleSubmit = async () => {
    await feedback.submit();
    if (feedback.state !== 'error') setTimeout(handleClose, 1800);
  };

  if (!visible) return null;

  if (feedback.isDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
        <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-800 p-8 text-center shadow-2xl">
          <div className="mb-3 text-5xl">🙌</div>
          <h2 className="text-xl font-bold text-white">Thanks for your feedback!</h2>
          <p className="mt-2 text-sm text-indigo-300">It helps us make fundraising events better.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-indigo-900 to-indigo-800 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Quick feedback</h2>
            <p className="mt-0.5 text-xs text-indigo-300">Anonymous · takes 10 seconds</p>
          </div>
          <button onClick={handleClose} className="ml-4 rounded-lg p-1.5 text-indigo-400 transition hover:bg-white/10 hover:text-white" aria-label="Dismiss" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {QUESTIONS.map(({ key, text, emoji }) => (
            <div key={key}>
              <p className="mb-2 text-sm font-medium text-white/90">{emoji} {text}</p>
              <div className="flex gap-2">
                <YesNoButton label="👍 Yes" value={true}  selected={feedback.answers[key]} onClick={(v) => feedback.setAnswer(key, v)} />
                <YesNoButton label="👎 No"  value={false} selected={feedback.answers[key]} onClick={(v) => feedback.setAnswer(key, v)} />
              </div>
            </div>
          ))}
        </div>

        {feedback.errorMessage && (
          <p className="mt-3 rounded-lg bg-rose-500/20 px-3 py-2 text-xs text-rose-300">{feedback.errorMessage}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={handleClose} className="flex-1 rounded-xl border border-white/20 py-3 text-sm text-white/60 transition hover:bg-white/10 hover:text-white" type="button">
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={!feedback.hasAnyAnswer || feedback.state === 'submitting'}
            className={[
              'flex-1 rounded-xl py-3 text-sm font-semibold text-white transition',
              feedback.hasAnyAnswer && feedback.state !== 'submitting'
                ? 'bg-indigo-500 hover:bg-indigo-400 active:scale-95'
                : 'cursor-not-allowed bg-white/10 text-white/30',
            ].join(' ')}
            type="button"
          >
            {feedback.state === 'submitting' ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}