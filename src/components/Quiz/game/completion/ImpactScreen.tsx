// src/components/Quiz/completion/ImpactScreen.tsx
// FIXED: Include entry fee in personal impact calculation

import React from 'react';
import { Heart, DollarSign, Zap, TrendingUp } from 'lucide-react';
import { QuizConfig } from '../../types/quiz';

interface ImpactScreenProps {
  config: QuizConfig | null;
  fundraisingData: any;
  isHost: boolean;
  currency: string;
}

export const ImpactScreen: React.FC<ImpactScreenProps> = ({ 
  config, 
  fundraisingData, 
  isHost, 
  currency 
}) => (
  <div className="min-h-screen bg-gradient-to-br from-green-700 via-emerald-700 to-teal-700 p-4 md:p-8">
    <div className="mx-auto max-w-4xl text-center">
      <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">💝 Fundraising Impact</h2>
      <p className="mb-8 text-lg text-green-200 md:text-xl">Together we made a difference!</p>
      
      {fundraisingData ? (
        <div className="space-y-6">
          <div className="rounded-xl bg-white/10 p-8 text-white backdrop-blur">
            <div className="mb-4 text-6xl">❤️</div>
            <h3 className="mb-2 text-4xl font-bold text-green-300">
              {currency}{fundraisingData.totalRaised.toFixed(2)}
            </h3>
            <p className="text-xl">Total Raised for {config?.web3Charity || 'Charity'}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
              <DollarSign className="mx-auto mb-4 h-8 w-8 text-blue-300" />
              <h4 className="mb-2 text-2xl font-bold">{currency}{fundraisingData.totalEntry.toFixed(2)}</h4>
              <p className="text-sm">Entry Fees ({fundraisingData.totalPlayers} players)</p>
            </div>
            
            <div className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
              <Zap className="mx-auto mb-4 h-8 w-8 text-purple-300" />
              <h4 className="mb-2 text-2xl font-bold">{currency}{fundraisingData.totalExtras.toFixed(2)}</h4>
              <p className="text-sm">In-Game Extras</p>
            </div>
            
            <div className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
              <TrendingUp className="mx-auto mb-4 h-8 w-8 text-green-300" />
              <h4 className="mb-2 text-2xl font-bold">{currency}{fundraisingData.charityAmount.toFixed(2)}</h4>
              <p className="text-sm">
                To the Cause ({config?.paymentMethod === 'web3' && config?.web3PrizeSplit?.charity 
                  ? `${config.web3PrizeSplit.charity}%` 
                  : '100%'})
              </p>
            </div>
          </div>

          {/* ENHANCED: Personal Impact now includes entry fee + extras */}
          {!isHost && (fundraisingData.playerContribution.personalImpact > 0 || fundraisingData.playerContribution.entryFee > 0) && (
            <div className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-black">
              <h3 className="mb-4 text-2xl font-bold">🌟 Your Personal Impact</h3>
              
              {/* Enhanced grid showing both entry fee and extras separately */}
              <div className="grid gap-4 md:grid-cols-3 mb-4">
                <div className="text-center">
                  <div className="text-xl font-bold">{currency}{fundraisingData.playerContribution.entryFee?.toFixed(2) || '0.00'}</div>
                  <div className="text-sm">Your Entry Fee</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{currency}{fundraisingData.playerContribution.extrasContribution?.toFixed(2) || '0.00'}</div>
                  <div className="text-sm">From {fundraisingData.playerContribution.extrasUsed || 0} Extras</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold border-t-2 border-black pt-2">
                    {currency}{((fundraisingData.playerContribution.entryFee || 0) + (fundraisingData.playerContribution.extrasContribution || 0)).toFixed(2)}
                  </div>
                  <div className="text-sm font-semibold">Total Contribution</div>
                </div>
              </div>
              
              <p className="text-sm opacity-90">
                {fundraisingData.playerContribution.extrasUsed > 0 
                  ? `Your entry fee plus strategic gameplay (${fundraisingData.playerContribution.extrasUsed} extras) contributed to the charity fundraising!`
                  : 'Your entry fee contributed to the charity fundraising!'
                }
              </p>
              
              {/* Show percentage of total raised */}
              {fundraisingData.totalRaised > 0 && (
                <div className="mt-3 text-xs opacity-80">
                  That's {(((fundraisingData.playerContribution.entryFee || 0) + (fundraisingData.playerContribution.extrasContribution || 0)) / fundraisingData.totalRaised * 100).toFixed(1)}% of the total amount raised!
                </div>
              )}
            </div>
          )}

          {/* Show message even if player didn't use extras */}
          {!isHost && fundraisingData.playerContribution.entryFee > 0 && fundraisingData.playerContribution.extrasUsed === 0 && (
            <div className="rounded-xl bg-gradient-to-r from-blue-400 to-green-500 p-6 text-white">
              <h3 className="mb-2 text-xl font-bold">🙏 Thank You for Contributing!</h3>
              <p className="text-lg">Your {currency}{fundraisingData.playerContribution.entryFee.toFixed(2)} entry fee helped raise funds for the cause.</p>
              <p className="text-sm opacity-90 mt-2">
                Every participant makes a difference in our fundraising efforts!
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white/10 p-8 text-white backdrop-blur">
          <Heart className="mx-auto mb-4 h-16 w-16 text-red-300" />
          <h3 className="mb-4 text-2xl font-bold">Thank you for participating!</h3>
          <p className="text-lg">Every quiz makes a difference in building community and sharing knowledge.</p>
        </div>
      )}
    </div>
  </div>
);