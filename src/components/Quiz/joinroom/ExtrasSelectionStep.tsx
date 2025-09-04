// src/components/Quiz/joinroom/ExtrasSelectionStep.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe, Target, Zap, AlertCircle, CheckCircle, Plus, Minus, GamepadIcon } from 'lucide-react';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

// Use consistent RoomConfig interface
interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string; // Make required to fix type conflict
  web3Chain?: string;
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
}

interface ExtraCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  price: number;
  currency: string;
  isSelected: boolean;
  onToggle: (key: string) => void;
  applicableRounds: string[];
}

const ExtraCard: React.FC<ExtraCardProps> = ({ 
  extraKey, 
  details, 
  price, 
  currency, 
  isSelected, 
  onToggle,
  applicableRounds 
}) => {
  const getExcitementColor = (excitement: string) => {
    switch (excitement) {
      case 'High': return 'border-red-300 bg-red-50';
      case 'Medium': return 'border-yellow-300 bg-yellow-50';
      case 'Low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getExcitementBadge = (excitement: string) => {
    switch (excitement) {
      case 'High': return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-fg/80';
    }
  };

  const getApplicabilityInfo = () => {
    if (details.applicableTo === 'global') {
      return { text: 'All Rounds', icon: <Globe className="h-3 w-3" />, color: 'text-purple-600 bg-purple-100' };
    }
    return { 
      text: applicableRounds.join(', '), 
      icon: <Target className="h-3 w-3" />, 
      color: 'text-blue-600 bg-blue-100' 
    };
  };

  const applicability = getApplicabilityInfo();

  return (
    <div 
      className={`cursor-pointer rounded-lg border-2 p-3 transition-all sm:p-4 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : `${getExcitementColor(details.excitement || 'Low')} hover:shadow-md`
      }`}
      onClick={() => onToggle(extraKey)}
    >
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-3">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-lg sm:h-10 sm:w-10 sm:text-xl ${
            details.excitement === 'High' ? 'bg-red-100' :
            details.excitement === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {details.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-fg truncate text-sm font-semibold sm:text-base">{details.label}</h4>
            <p className="text-fg/70 truncate text-xs sm:block sm:text-sm">{details.description}</p>
            <div className="mt-1 flex items-center space-x-2">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getExcitementBadge(details.excitement || 'Low')}`}>
                {details.excitement}
              </span>
              <div className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-xs ${applicability.color}`}>
                {applicability.icon}
                <span className="hidden sm:inline">{applicability.text}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center space-x-2">
          <div className="text-right">
            <div className="text-fg text-sm font-bold sm:text-lg">{currency}{price.toFixed(2)}</div>
          </div>
          {isSelected ? (
            <CheckCircle className="h-5 w-5 text-blue-500" />
          ) : (
            <Plus className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
};

interface ExtrasSelectionStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  onBack: () => void;
  onContinue: (selectedExtras: string[]) => void;
}

export const ExtrasSelectionStep: React.FC<ExtrasSelectionStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  onBack,
  onContinue
}) => {
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  // Calculate totals
  const extrasTotal = selectedExtras.reduce((sum, key) => sum + (roomConfig.fundraisingPrices[key] || 0), 0);
  const total = roomConfig.entryFee + extrasTotal;

  // Get available extras based on room config
  const getAvailableExtras = () => {
    return Object.entries(roomConfig.fundraisingOptions)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key)
      .filter(key => key in fundraisingExtraDefinitions);
  };

  // Get applicable round names for an extra
  const getApplicableRounds = (extraKey: string) => {
    const definition = fundraisingExtraDefinitions[extraKey as keyof typeof fundraisingExtraDefinitions];
    if (!definition || !roomConfig?.roundDefinitions) return [];

    if (definition.applicableTo === 'global') {
      return ['All Rounds'];
    }

    const roundTypes = roomConfig.roundDefinitions.map(r => r.roundType as RoundTypeId);
    return (definition.applicableTo as RoundTypeId[])
      .filter(roundType => roundTypes.includes(roundType))
      .map(roundType => roundTypeDefinitions[roundType]?.name || roundType);
  };

  const toggleExtra = (key: string) => {
    setSelectedExtras(prev =>
      prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key]
    );
  };

  const availableExtras = getAvailableExtras();

  return (
    <div className="flex h-full max-h-[95vh] flex-col sm:max-h-[90vh]">
      <div className="border-border border-b p-4 sm:p-6">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
            🚀
          </div>
          <div>
            <h2 className="text-fg text-lg font-bold sm:text-2xl">Game Extras</h2>
            <p className="text-fg/70 text-sm sm:text-base">
              Joining {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} {roomConfig.gameType || 'quiz'} game
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Summary */}
      <div className="sticky top-0 z-10 border-b border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-fg/70 text-sm">Total Cost</span>
            <div className="text-sm font-medium sm:text-base">{selectedExtras.length} extras added</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-900 sm:text-2xl">{roomConfig.currencySymbol}{total.toFixed(2)}</div>
            <div className="text-xs text-blue-600 sm:text-sm">
              Entry {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)} + Extras {roomConfig.currencySymbol}{extrasTotal.toFixed(2)}
            </div>
          </div>
        </div>
        
        {selectedExtras.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1 sm:gap-2">
            {selectedExtras.map(key => {
              const extra = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              return (
                <span key={key} className="bg-muted flex items-center space-x-1 rounded-full px-2 py-1 text-xs sm:text-sm">
                  <span>{extra?.icon}</span>
                  <span className="hidden sm:inline">{extra?.label}</span>
                  <button onClick={() => toggleExtra(key)} className="text-gray-400 hover:text-red-500">
                    <Minus className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-6">
          {/* Available Extras */}
          {availableExtras.length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Animated Header */}
              <div className={`transition-all duration-500 ${selectedExtras.length === 0 ? 'animate-pulse' : ''}`}>
                <div className="mb-2 flex items-center space-x-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 sm:h-8 sm:w-8 ${
                    selectedExtras.length === 0 ? 'animate-bounce bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-blue-100'
                  }`}>
                    {selectedExtras.length === 0 ? (
                      <span className="text-sm text-white sm:text-base">🔥</span>
                    ) : (
                      <Zap className="h-3 w-3 text-blue-600 sm:h-5 sm:w-5" />
                    )}
                  </div>
                  <h3 className={`text-base font-semibold transition-all duration-300 sm:text-lg ${
                    selectedExtras.length === 0 ? 'bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent' : 'text-fg'
                  }`}>
                    {selectedExtras.length === 0 ? '🔥 Power-Up Your Game' : 'Power-Ups'}
                  </h3>
                </div>
                
                {selectedExtras.length === 0 && (
                  <div className="mb-4 rounded-lg border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-3">
                    <div className="flex items-center space-x-2 text-xs sm:text-sm">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium text-yellow-800">87% of winners used at least one extra!</span>
                    </div>
                  </div>
                )}
                
                <p className="text-fg/70 mb-4 text-xs sm:text-sm">
                  {selectedExtras.length === 0 
                    ? "Strategic extras give you a competitive edge. Most winners don't play without them!"
                    : "Choose strategic extras to boost your performance and increase your chances of winning!"
                  }
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-2 sm:gap-4 lg:grid-cols-2">
                {availableExtras.map((key) => {
                  const definition = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
                  const price = roomConfig.fundraisingPrices[key] || 0;
                  const applicableRounds = getApplicableRounds(key);
                  
                  return (
                    <ExtraCard
                      key={key}
                      extraKey={key}
                      details={definition}
                      price={price}
                      currency={roomConfig.currencySymbol}
                      isSelected={selectedExtras.includes(key)}
                      onToggle={toggleExtra}
                      applicableRounds={applicableRounds}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 sm:h-16 sm:w-16">
                <GamepadIcon className="h-6 w-6 text-gray-400 sm:h-8 sm:w-8" />
              </div>
              <h3 className="text-fg mb-2 text-base font-medium sm:text-lg">No Extras Available</h3>
              <p className="text-fg/70 text-sm sm:text-base">This game doesn't have any optional extras configured.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-border border-t bg-gray-50 p-3 sm:p-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="text-fg/70 hover:text-fg flex items-center space-x-2 px-3 py-2 text-sm transition-colors sm:px-4 sm:py-3 sm:text-base"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          
          {/* Mobile: Show simplified total */}
          <div className="text-right sm:hidden">
            <div className="text-fg text-lg font-bold">{roomConfig.currencySymbol}{total.toFixed(2)}</div>
            <div className="text-fg/70 text-xs">Total</div>
          </div>
          
          {/* Desktop: Show detailed breakdown */}
          <div className="hidden text-right sm:block">
            <div className="text-fg/70 text-sm">Ready to continue?</div>
            <div className="text-fg text-xl font-bold">{roomConfig.currencySymbol}{total.toFixed(2)} total</div>
          </div>
          
          <button 
            onClick={() => onContinue(selectedExtras)}
            className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
          >
            <span>Continue to Payment</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};