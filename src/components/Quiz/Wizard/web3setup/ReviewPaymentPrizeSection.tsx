import React, { useMemo } from "react";
import { CheckCircle, Trophy, Gift } from "lucide-react";

interface Props {
  setupConfig: any;
}



const ReviewPaymentPrizeSection: React.FC<Props> = ({ setupConfig }) => {
  const prizeMode: "split" | "assets" | undefined = setupConfig.prizeMode;
  const splits = setupConfig.web3PrizeSplit || setupConfig.prizeSplits || {};
  const currency = setupConfig.currencySymbol || setupConfig.web3Currency || "GLOUSD";

  const hasPool = prizeMode === "split" && splits && (splits.prizes ?? 0) > 0;
  const hasAssets = prizeMode === "assets" && (setupConfig.prizes?.length ?? 0) > 0;

  const enabledExtrasEntries = useMemo(
    () => Object.entries(setupConfig.fundraisingOptions || {}).filter(([, v]) => v),
    [setupConfig.fundraisingOptions]
  );

  const totalExtrasPerPlayer = useMemo(
    () =>
      enabledExtrasEntries.reduce((acc, [key]) => {
        const price = setupConfig.fundraisingPrices?.[key];
        return acc + (typeof price === "number" ? price : 0);
      }, 0),
    [enabledExtrasEntries, setupConfig.fundraisingPrices]
  );

  console.log('fundraisingOptions', setupConfig.fundraisingOptions);
console.log('fundraisingPrices', setupConfig.fundraisingPrices);


  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">💰</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Web3 Payments & Prize Model</h3>
          <p className="text-fg/70 text-sm">Entry fee & distribution</p>
        </div>
        <CheckCircle className="h-5 w-5 text-green-600" />
      </div>

      {/* Body */}
      <div className="space-y-3 text-sm">
        {/* Payment Method */}
        <div className="flex items-center space-x-2">
          <span className="text-fg/80">Payment Method:</span>
          <span className="text-fg font-medium">
            {setupConfig.paymentMethod === "web3" ? "Web3 Wallet" : "Cash / Card"}
          </span>
        </div>

        {/* Prize Distribution */}
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <div className="mb-2 font-medium text-indigo-900">Prize Distribution (overview)</div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Charity</div>
              <div className="text-fg font-semibold">{splits?.charity ?? "—"}%</div>
            </div>
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Personal</div>
              <div className="text-fg font-semibold">{splits?.host ?? 0}%</div>
            </div>
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Prizes</div>
              <div className="text-fg font-semibold">{splits?.prizes ?? 0}%</div>
            </div>
            <div className="rounded border bg-gray-50 p-2">
              <div className="text-xs text-fg/70">Platform</div>
              <div className="text-fg font-semibold">20%</div>
            </div>
          </div>
        </div>

        {/* Prize Pool Splits */}
        {hasPool && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="mb-2 font-medium text-yellow-800">Prize Pool Splits</div>

            <div className="grid grid-cols-3 gap-2">
              {Object.entries(splits).map(([place, pct]) => (
                <div key={place} className="rounded border border-yellow-200 bg-white p-2 text-center">
                  <div className="font-bold text-yellow-700">{Number(pct)}%</div>
                  <div className="text-xs text-yellow-700">
                    {place === "1" ? "1st" : place === "2" ? "2nd" : place === "3" ? "3rd" : `${place}th`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External Asset Prizes */}
        {hasAssets && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-2 font-medium text-green-800">External Asset Prizes</div>

            <div className="space-y-2">
              {setupConfig.prizes!.map((prize: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded border border-green-200 bg-white p-2">
                  <Trophy className="h-4 w-4 text-green-700" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-fg">
                      {prize.place === 1 ? "1st" : prize.place === 2 ? "2nd" : prize.place === 3 ? "3rd" : `${prize.place}th`}{" "}
                      Place
                    </div>

                    <div className="text-xs text-fg/70">{prize.description || "No description"}</div>

                    {prize.tokenAddress && (
                      <div className="text-xs font-mono text-fg/70 break-all">{prize.tokenAddress}</div>
                    )}

                    {prize.value ? <div className="text-xs text-fg/70">Qty/ID: {prize.value}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fundraising Extras */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <div className="mb-2 flex items-center gap-2 font-medium text-purple-900">
            <Gift className="h-4 w-4" />
            Fundraising Extras
          </div>

          {enabledExtrasEntries.length === 0 ? (
            <div className="text-xs text-fg/60">No extras enabled.</div>
          ) : (
            <div className="space-y-2">
              {enabledExtrasEntries.map(([key]) => {
                const price = setupConfig.fundraisingPrices?.[key];
                return (
                  <div key={key} className="flex items-center justify-between rounded bg-white p-2">
                    <span className="text-xs text-fg/80">{key}</span>
                    <span className="text-xs font-medium text-fg">
                      {typeof price === "number" ? `${price.toFixed(3)} ${currency}` : "—"}
                    </span>
                  </div>
                );
              })}

              <div className="mt-1 text-right text-xs text-fg/70">
                Potential extras per player:{" "}
                <span className="font-semibold">
                  {totalExtrasPerPlayer.toFixed(3)} {currency}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewPaymentPrizeSection;

