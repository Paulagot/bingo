import type React from 'react';

interface Winner {
  id: string;
  name: string;
  wallet?: string;
}

interface WinnerSectionProps {
  title: string;
  color: 'indigo' | 'purple';
  winners: Winner[];
}

const WinnerSection: React.FC<WinnerSectionProps> = ({ title, color, winners }) => {
  const bgClass = `bg-${color}-50`;
  const titleClass = `text-${color}-800`;
  const itemClass = `text-${color}-600`;

  return (
    <div className={`${bgClass} mb-4 rounded-lg p-4`}>
      <h3 className={`font-medium ${titleClass} mb-2`}>{title}</h3>
      {winners.length > 0 ? (
        <ul className="list-inside list-disc">
          {winners.map((winner) => (
            <li key={winner.id} className={itemClass}>
              {winner.name}
              {winner.wallet && (
                <span className="text-fg/60 ml-2 text-xs">
                  ({winner.wallet.slice(0, 6)}...{winner.wallet.slice(-4)})
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg/60 italic">No {title.toLowerCase()}</p>
      )}
    </div>
  );
};

export default WinnerSection;
