// components/quiz/RobPointsModal.tsx

interface User {
  id: string;
  name: string;
}

const RobPointsModal = ({
  visible,
  players,
  onCancel,
  onConfirm
}: {
  visible: boolean;
  players: User[];
  onCancel: () => void;
  onConfirm: (targetPlayerId: string) => void;
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded-xl shadow-lg w-80">
        <h2 className="text-lg font-semibold mb-4">⚡ Rob Points</h2>
        <p className="text-sm mb-2">Select a player to rob 5 points from:</p>
        <ul className="space-y-2">
          {players.map(player => (
            <li key={player.id}>
              <button
                className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => onConfirm(player.id)}
              >
                {player.name}
              </button>
            </li>
          ))}
        </ul>
        <button onClick={onCancel} className="mt-4 text-sm text-gray-600 hover:underline">Cancel</button>
      </div>
    </div>
  );
};

export default RobPointsModal;
