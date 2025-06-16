import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';

interface Props {
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string) => void;
}

const debug = true;

const GlobalExtrasDuringLeaderboard = ({ availableExtras, usedExtras, onUseExtra }: Props) => {
  const globalExtras = Object.values(fundraisingExtraDefinitions).filter(
    (extra) => extra.applicableTo === 'global' && availableExtras.includes(extra.id)
  );

  if (debug) {
    console.log('[GlobalExtras] availableExtras:', availableExtras);
    console.log('[GlobalExtras] usedExtras:', usedExtras);
    console.log('[GlobalExtras] filtered global extras:', globalExtras);
  }

  if (globalExtras.length === 0) return null;

  return (
    <div className="bg-blue-50 p-4 mt-6 rounded-xl shadow">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">🌍 Global Fundraising Extras</h3>
      <p className="text-sm text-blue-600 mb-3">Use these before the next round starts:</p>
      <div className="space-y-2">
        {globalExtras.map(extra => {
          const isUsed = usedExtras[extra.id];
          return (
            <button
              key={extra.id}
              onClick={() => onUseExtra(extra.id)}
              disabled={isUsed}
              className={`w-full text-left px-4 py-2 rounded-lg transition font-medium
                ${isUsed
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {extra.icon} {extra.label} {isUsed && '(Used)'}
              <span className="block text-xs text-white opacity-80">
                {extra.description || 'No description available.'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GlobalExtrasDuringLeaderboard;


