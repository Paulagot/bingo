import { ExtrasPanelProps } from '../../../types/quiz';

const ExtrasPanel = ({ roomId, playerId, availableExtras, usedExtras, usedExtrasThisRound, onUseExtra }: ExtrasPanelProps) => {
  return (
    <div className="my-4">
      <h3 className="font-semibold mb-2">🎯 Fundraising Extras:</h3>
      <div className="flex flex-col space-y-2">
        {availableExtras.map(extraId => {
          const permanentlyUsed = usedExtras?.[extraId];
          const roundUsed = usedExtrasThisRound?.[extraId];
          const disabled = permanentlyUsed || roundUsed;
          const label =
            extraId === 'buyHint' ? '💡 Use Hint'
            : extraId === 'freezeOutTeam' ? '❄️ Freeze Opponent'
            : extraId;

          return (
            <button
              key={extraId}
              className={`px-4 py-2 rounded ${disabled ? 'bg-gray-300 text-gray-600' : 'bg-indigo-500 text-white'}`}
              disabled={disabled}
              onClick={() => onUseExtra(extraId)}
            >
              {label} {permanentlyUsed ? '(Used)' : roundUsed ? '(Used this round)' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExtrasPanel;

