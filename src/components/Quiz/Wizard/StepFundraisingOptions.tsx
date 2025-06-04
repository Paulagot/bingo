import React, { useState } from 'react';
import { useQuizConfig } from '../useQuizConfig';
import { fundraisingExtras } from '../../../types/quiz';
import { fundraisingExtraDefinitions } from '../../../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../../../constants/quizMetadata';
import { roundTypeDefinitions } from '../../../constants/quizMetadata';

import {
  Globe, Target, ChevronLeft, ChevronRight,
  TrendingUp, Plus, Trash2
} from 'lucide-react';

export const StepFundraisingOptions: React.FC<{
  onNext: () => void;
  onBack: () => void;
}> = ({ onNext, onBack }) => {
  const { config, toggleExtra, updateConfig } = useQuizConfig();
  const [activeExplainer, setActiveExplainer] = useState<FundraisingExtraDefinition | null>(null);

  const [selectedExtras, setSelectedExtras] = useState<string[]>(() => {
    return Object.keys(config.fundraisingOptions || {}).filter(
      key => config.fundraisingOptions?.[key]
    );
  });

  const selectedRounds = config.roundDefinitions || [];
  const currency = config.currencySymbol || '€';

  // Filter extras applicable to current round config
  const applicableExtras = Object.entries(fundraisingExtras).filter(([_, rule]) =>
    selectedRounds.some((round) =>
      rule.applicableTo === 'global' ||
      (Array.isArray(rule.applicableTo) && rule.applicableTo.includes(round.roundType))
    )
  );

  const handleAddExtra = (key: string) => {
    const updated = [...selectedExtras, key];
    setSelectedExtras(updated);
    toggleExtra?.(key);
  };

  const handleRemoveExtra = (key: string) => {
    const updated = selectedExtras.filter(k => k !== key);
    setSelectedExtras(updated);
    toggleExtra?.(key);
  };

  const handlePriceChange = (key: string, value: string) => {
    const parsed = parseFloat(value);
    const currentPrices = { ...(config.fundraisingPrices || {}) };

    if (!isNaN(parsed) && parsed > 0) {
      currentPrices[key] = parsed;
    } else {
      delete currentPrices[key];
    }

    updateConfig({ fundraisingPrices: currentPrices });
  };

  // Utility to get applicability label from roundTypeDefinitions
  const getApplicabilityInfo = (rule: any) => {
    if (rule.applicableTo === 'global') {
      return { text: 'All Rounds', icon: <Globe className="w-3 h-3" />, color: 'text-purple-600 bg-purple-100' };
    }
    const roundTypeNames = rule.applicableTo
      .map((type: string) => roundTypeDefinitions[type as keyof typeof roundTypeDefinitions]?.name || type)
      .join(', ');
    return { text: roundTypeNames, icon: <Target className="w-3 h-3" />, color: 'text-blue-600 bg-blue-100' };
  };

  // Revenue estimate
  const totalExtraValue = selectedExtras.reduce((sum, key) => {
    const price = config.fundraisingPrices?.[key] || 0;
    return sum + price;
  }, 0);

  const getExcitementColor = (excitement: string) => {
    switch (excitement) {
      case 'High': return 'bg-red-50 border-red-200 text-red-800';
      case 'Medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Low': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSuggestedPriceRange = (suggestedPrice: string) => {
    // Base ranges in lowest common denominator
    const ranges = {
      'Low-Medium': { min: 1, max: 3 },
      'Medium': { min: 3, max: 5 },
      'High': { min: 5, max: 10 },
      'Low': { min: 1, max: 2 },
      default: { min: 2, max: 5 }
    };
    
    const range = ranges[suggestedPrice as keyof typeof ranges] || ranges.default;
    
    // Adjust for different currencies
    let adjustedRange = { ...range };
    
    switch (currency) {
      case '$':
      case 'USDGLOW':
        // USD rates are similar to EUR, no adjustment needed
        break;
      case '£':
        // GBP is stronger, slightly lower numbers
        adjustedRange.min = Math.max(1, Math.round(range.min * 0.85));
        adjustedRange.max = Math.round(range.max * 0.85);
        break;
      case '₹':
        // INR is much weaker, multiply by ~80
        adjustedRange.min = Math.round(range.min * 80);
        adjustedRange.max = Math.round(range.max * 80);
        break;
      case '¥':
        // JPY is weaker, multiply by ~150
        adjustedRange.min = Math.round(range.min * 150);
        adjustedRange.max = Math.round(range.max * 150);
        break;
      default:
        // Default to EUR rates
        break;
    }
    
    return `${currency}${adjustedRange.min}-${adjustedRange.max}`;
  };

  const getCurrentMessage = () => {
    if (activeExplainer) {
      return { expression: 'explaining', message: activeExplainer };
    }
    if (selectedExtras.length > 0) {
      return {
        expression: 'excited',
        message: `Excellent! You've enabled ${selectedExtras.length} fundraising extra${selectedExtras.length > 1 ? 's' : ''} to boost engagement.`
      };
    }
    return {
      expression: 'fundraising',
      message: 'Choose optional fundraising extras to enhance both fun and donations!'
    };
  };

  const Character = ({ expression, message }: { expression: string; message: any }) => {
    const getCharacterStyle = () => {
      const base = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      switch (expression) {
        case 'fundraising': return `${base} bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce`;
        case 'explaining': return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        case 'excited': return `${base} bg-gradient-to-br from-orange-400 to-red-500`;
        default: return `${base} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };
    const getEmoji = () => {
      switch (expression) {
        case 'fundraising': return '🎯';
        case 'explaining': return '💡';
        case 'excited': return '🚀';
        default: return '😊';
      }
    };

    const isExplainer = typeof message === 'object' && message.label;

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>{getEmoji()}</div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-lg">
          {isExplainer ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                <span className="text-2xl">{message.icon}</span>
                <span>{message.label}</span>
              </h4>
              <p className="text-gray-600 text-sm">{message.description}</p>
              <div className="text-xs text-blue-700 mt-1">
                <strong>Strategy:</strong> {message.strategy}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {message.pros.map((pro: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    ✓ {pro}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-700 text-sm">{message}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 4 of 7: Fundraising Extras</h2>
      </div>

      <Character {...getCurrentMessage()} />

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-1">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="font-medium text-green-800">Potential Revenue</span>
        </div>
        <div className="text-sm text-green-700">
          Enabled extras: <strong>{selectedExtras.length}</strong> | Est. revenue per player: <strong>{currency}{totalExtraValue.toFixed(2)}</strong>
        </div>
      </div>

      {/* Your Fundraising Extras */}
      {selectedExtras.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
            <span>Your Fundraising Extras ({selectedExtras.length}/{applicableExtras.length})</span>
          </h3>
          <div className="space-y-3">
            {selectedExtras.map((key) => {
              const details = fundraisingExtras[key];
              const explainer = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              const price = config.fundraisingPrices?.[key] ?? '';
              const applicability = getApplicabilityInfo(details);

              return (
                <div key={key} className={`border-2 p-4 rounded-xl ${getExcitementColor(explainer?.excitement || 'Low')}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{explainer.icon}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{explainer.label}</h4>
                        <p className="text-sm text-gray-600">{explainer.description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveExtra(key)}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                      title="Remove extra"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Price ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={price}
                        onChange={(e) => handlePriceChange(key, e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-1 w-24 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0.00"
                      />
                      <span className="text-xs text-gray-500">
                        Suggested: {getSuggestedPriceRange(explainer.suggestedPrice)}
                      </span>
                    </div>
                    
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${applicability.color}`}>
                      {applicability.icon}
                      <span>{applicability.text}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Fundraising Extras */}
      {selectedExtras.length < applicableExtras.length && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Add Fundraising Extras</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, details]) => {
                const explainer = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
                const applicability = getApplicabilityInfo(details);

                return (
                  <div 
                    key={key} 
                    onClick={() => handleAddExtra(key)} 
                    className={`border-2 p-4 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-200 ${getExcitementColor(explainer?.excitement || 'Low')} hover:scale-105`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl">{explainer.icon}</span>
                        <div>
                          <h4 className="font-semibold text-gray-800">{explainer.label}</h4>
                          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs mt-1 ${applicability.color}`}>
                            {applicability.icon}
                            <span>{applicability.text}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Plus className="w-5 h-5 text-indigo-500" />
                        <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                          {getSuggestedPriceRange(explainer.suggestedPrice)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-3">{explainer.description}</p>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-blue-700">
                        <strong>Strategy:</strong> {explainer.strategy}
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {explainer.pros.map((pro: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            ✓ {pro}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span><strong>Impact:</strong> {explainer.impact}</span>
                        <span className={`px-2 py-1 rounded-full font-medium ${
                          explainer.excitement === 'High' ? 'bg-red-100 text-red-700' :
                          explainer.excitement === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {explainer.excitement} Excitement
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button 
          onClick={onBack} 
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button 
          onClick={onNext} 
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepFundraisingOptions;








