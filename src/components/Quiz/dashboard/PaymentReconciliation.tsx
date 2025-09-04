import React from 'react';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';

const PaymentReconciliationPanel: React.FC = () => {
  const { players } = usePlayerStore();
  const { config } = useQuizConfig();

  const currency = config.currencySymbol || '€';
  const entryFee = parseFloat(config.entryFee || '0');

  const activePlayers = players.filter((p) => !p.disqualified);
  const paidPlayers = activePlayers.filter((p) => p.paid);
  const unpaidPlayers = activePlayers.filter((p) => !p.paid);
  const totalPlayers = activePlayers.length;

  // Build per-method totals
  const paymentData: Record<
    string,
    { entry: number; extras: number; total: number }
  > = {};

  for (const player of players) {
    const method = player.paymentMethod || 'unknown';

    if (player.paid) {
      if (!paymentData[method]) {
        paymentData[method] = { entry: 0, extras: 0, total: 0 };
      }
      paymentData[method].entry += entryFee;
    }

    if (player.extraPayments) {
      for (const [, val] of Object.entries(player.extraPayments)) {
        const extraMethod = val.method || 'unknown';
        const amount = val.amount || 0;

        if (!paymentData[extraMethod]) {
          paymentData[extraMethod] = { entry: 0, extras: 0, total: 0 };
        }

        paymentData[extraMethod].extras += amount;
      }
    }
  }

  // Finalize totals per method
  for (const method in paymentData) {
    const data = paymentData[method];
    data.total = data.entry + data.extras;
  }

  // Calculate global totals
  const totalEntryReceived = paidPlayers.length * entryFee;
  const totalExtrasReceived = Object.values(paymentData).reduce(
    (sum, val) => sum + val.extras,
    0
  );
  const totalReceived = totalEntryReceived + totalExtrasReceived;

  return (
    <div className="bg-muted rounded-xl p-8 shadow-md">
      <h2 className="text-fg mb-6 text-2xl font-bold">
        💰 Payment Reconciliation
      </h2>

      {/* Summary */}
      <div className="text-fg/70 mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <strong>Entry Fee:</strong> {entryFee ? `${currency}${entryFee}` : 'Free'}
        </div>
        <div>
          <strong>Total Players:</strong> {totalPlayers}
        </div>
        <div>
          <strong>Expected Entry:</strong> {currency}
          {(entryFee * totalPlayers).toFixed(2)}
        </div>
        <div>
          <strong>Received Entry:</strong> {currency}
          {totalEntryReceived.toFixed(2)}
        </div>
        <div>
          <strong>Received Extras:</strong> {currency}
          {totalExtrasReceived.toFixed(2)}
        </div>
        <div className="text-fg font-semibold">
          <strong>Total Received:</strong> {currency}
          {totalReceived.toFixed(2)}
        </div>
      </div>

      {/* Table Breakdown */}
      <div className="mb-6">
        <h3 className="text-fg/80 mb-2 font-semibold">
          Breakdown by Payment Method:
        </h3>
        <div className="overflow-auto">
          <table className="text-fg/80 min-w-full border text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Payment Method</th>
                <th className="border px-4 py-2">Entry Fees</th>
                <th className="border px-4 py-2">Extras</th>
                <th className="border px-4 py-2">Total</th>
                <th className="border px-4 py-2">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paymentData).map(([method, data]) => (
                <tr key={method}>
                  <td className="border px-4 py-2 capitalize">{method}</td>
                  <td className="border px-4 py-2">
                    {currency}
                    {data.entry.toFixed(2)}
                  </td>
                  <td className="border px-4 py-2">
                    {currency}
                    {data.extras.toFixed(2)}
                  </td>
                  <td className="border px-4 py-2">
                    {currency}
                    {data.total.toFixed(2)}
                  </td>
                  <td className="border px-4 py-2">
                    {totalReceived > 0
                      ? `${((data.total / totalReceived) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
              {/* Totals Row */}
              <tr className="bg-gray-50 font-semibold">
                <td className="border px-4 py-2">Total</td>
                <td className="border px-4 py-2">{currency}{totalEntryReceived.toFixed(2)}</td>
                <td className="border px-4 py-2">{currency}{totalExtrasReceived.toFixed(2)}</td>
                <td className="border px-4 py-2">{currency}{totalReceived.toFixed(2)}</td>
                <td className="border px-4 py-2">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Unpaid Players */}
      <div>
        <h3 className="text-fg/80 mb-2 font-semibold">
          🚩 Unpaid Players (Entry):
        </h3>
        {unpaidPlayers.length === 0 ? (
          <p className="text-green-700">All players are paid. Ready to go! ✅</p>
        ) : (
          <ul className="list-inside list-disc space-y-1 text-red-600">
            {unpaidPlayers.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PaymentReconciliationPanel;




