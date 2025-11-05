import React from 'react';

export const SelfServeCtas: React.FC<{ onCreate: ()=>void; onJoin: ()=>void; title?: string; subtitle?: string; }> = ({
  onCreate, onJoin, title = '⚡ Ready to Host Yourself?', subtitle = 'Spin up a room with crypto-powered features and on-chain receipts.'
}) => (
  <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg">
    <div className="text-center">
      <h3 className="text-fg mb-2 text-xl font-bold">{title}</h3>
      <p className="text-fg/80 mb-6 text-sm">{subtitle}</p>
    </div>
    <div className="mx-auto grid max-w-md grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-2">
      <button className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700" onClick={onCreate}>
        Create Web3 Quiz
      </button>
      <button className="w-full rounded-lg border-2 border-indigo-600 bg-white px-4 py-3 font-semibold text-indigo-600 hover:bg-indigo-50" onClick={onJoin}>
        Join Existing Quiz
      </button>
    </div>
  </div>
);
