import { ExtrasPanelProps } from '../types/quiz';

const ExtrasPanel = ({ 
  
  availableExtras, 
  usedExtras, 
  usedExtrasThisRound, 
  onUseExtra,
  answerSubmitted = false // ✅ NEW: Default to false if not provided
}: ExtrasPanelProps) => {

  return (
    <div className="my-4">
      <h3 className="font-semibold mb-2">🎯 Fundraising Extras:</h3>
      <div className="flex flex-col space-y-2">
        {availableExtras.map(extraId => {
          const permanentlyUsed = usedExtras?.[extraId];
          const roundUsed = usedExtrasThisRound?.[extraId];
          
          // ✅ NEW: Special logic for buyHint - disable if answer already submitted
          const isHintAfterSubmit = extraId === 'buyHint' && answerSubmitted;
          const disabled = permanentlyUsed || roundUsed || isHintAfterSubmit;
          
          const label =
            extraId === 'buyHint' ? '💡 Use Hint'
            : extraId === 'freezeOutTeam' ? '❄️ Freeze Opponent'
            : extraId;

          // ✅ NEW: Better status messaging
          let statusText = '';
          if (permanentlyUsed) {
            statusText = '(Used)';
          } else if (roundUsed) {
            statusText = '(Used this round)';
          } else if (isHintAfterSubmit) {
            statusText = '(Answer submitted)';
          }

          return (
            <button
              key={extraId}
              className={`px-4 py-2 rounded transition-all duration-200 ${
                disabled 
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                  : 'bg-indigo-500 text-white hover:bg-indigo-600'
              }`}
              disabled={disabled}
              onClick={() => onUseExtra(extraId)}
              title={isHintAfterSubmit ? 'Cannot use hint after submitting answer' : undefined}
            >
              {label} {statusText}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExtrasPanel;

