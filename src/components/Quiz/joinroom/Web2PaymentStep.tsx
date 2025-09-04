// src/components/Quiz/joinroom/Web2PaymentStep.tsx
import React from 'react';
import { ChevronLeft, CreditCard, Shield } from 'lucide-react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  web3Chain?: string;
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
}

interface Web2PaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
}

export const Web2PaymentStep: React.FC<Web2PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose
}) => {
  // Calculate total payment amount
  const extrasTotal = selectedExtras.reduce((sum, extraId) => {
    return sum + (roomConfig.fundraisingPrices[extraId] || 0);
  }, 0);
  
  const totalAmount = roomConfig.entryFee + extrasTotal;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          💳
        </div>
        <div>
          <h2 className="text-fg text-xl font-bold sm:text-2xl">Traditional Payment</h2>
          <p className="text-fg/70 text-sm sm:text-base">
            Pay with card or bank transfer
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-fg font-medium">Total Cost</div>
            <div className="text-fg/70 text-sm">
              Entry: {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {roomConfig.currencySymbol}{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Selected Extras Display */}
      {selectedExtras.length > 0 && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-4">
          <h3 className="text-green-800 font-medium mb-3 flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Selected Power-Ups</span>
          </h3>
          <div className="space-y-2">
            {selectedExtras.map(extraId => {
              const definition = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
              const price = roomConfig.fundraisingPrices[extraId] || 0;
              return (
                <div key={extraId} className="flex items-center justify-between rounded border border-green-200 bg-white p-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{definition?.icon}</span>
                    <span className="text-green-700 font-medium text-sm">{definition?.label}</span>
                  </div>
                  <span className="text-green-700 font-bold text-sm">
                    {roomConfig.currencySymbol}{price.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-blue-800 font-semibold">Web2 Payment Flow</h3>
            <p className="text-blue-700 text-sm">
              Coming soon! Traditional payment integration will be available here.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-4 mb-4">
        <h3 className="text-fg font-medium mb-2">Payment Options (Coming Soon):</h3>
        <ul className="text-fg/70 text-sm space-y-1">
          <li>• Credit/Debit Card payments</li>
          <li>• Bank transfer integration</li>
          <li>• PayPal and other payment providers</li>
          <li>• Cash payments (managed by host)</li>
        </ul>
      </div>

      <div className="border-border mt-6 flex flex-col justify-end space-y-3 border-t pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button 
          onClick={onBack}
          className="text-fg/80 flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button 
          disabled
          className="flex items-center justify-center space-x-2 rounded-lg bg-gray-400 px-4 py-2 text-sm font-medium text-white transition-colors sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Coming Soon</span>
        </button>
      </div>
    </div>
  );
};