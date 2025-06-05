import React, { useState, useCallback } from 'react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../../../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../../../constants/quizMetadata';
import { Globe, Target, ChevronLeft, ChevronRight, TrendingUp, Plus, Trash2 } from 'lucide-react';

export const StepFundraisingOptions: React.FC<{ 
  onNext: () => void; 
  onBack: () => void; 
}> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [activeExplainer, setActiveExplainer] = useState<FundraisingExtraDefinition | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const selectedRounds = setupConfig.roundDefinitions || [];
  const currency = setupConfig.currencySymbol || '€';
  const fundraisingOptions = setupConfig.fundraisingOptions || {};
  const fundraisingPrices = setupConfig.fundraisingPrices || {};

  const selectedExtras = Object.keys(fundraisingOptions).filter((key) => fundraisingOptions[key]);

  // Determine applicable extras based on rounds
  const applicableExtras = Object.entries(fundraisingExtraDefinitions).filter(([_, rule]) =>
    selectedRounds.some((round) =>
      rule.applicableTo === 'global' ||
      (Array.isArray(rule.applicableTo) && rule.applicableTo.includes(round.roundType))
    )
  );

  const handleAddExtra = (key: string) => {
    updateSetupConfig({
      fundraisingOptions: { ...fundraisingOptions, [key]: true }
    });
  };

  const handleRemoveExtra = (key: string) => {
    const updatedOptions = { ...fundraisingOptions, [key]: false };
    updateSetupConfig({ fundraisingOptions: updatedOptions });

    const updatedPrices = { ...fundraisingPrices };
    delete updatedPrices[key];
    updateSetupConfig({ fundraisingPrices: updatedPrices });
  };

  const handlePriceChange = (key: string, value: string) => {
    const parsed = parseFloat(value);
    const updatedPrices = { ...fundraisingPrices };

    if (!isNaN(parsed) && parsed > 0) {
      updatedPrices[key] = parsed;
    } else {
      delete updatedPrices[key];
    }
    updateSetupConfig({ fundraisingPrices: updatedPrices });
  };

  // Improved hover handlers with debouncing
  const handleMouseEnter = useCallback((details: FundraisingExtraDefinition) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setActiveExplainer(details);
    }, 200); // Small delay to prevent flickering
    setHoverTimeout(timeout);
  }, [hoverTimeout]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    const timeout = setTimeout(() => {
      setActiveExplainer(null);
    }, 300); // Slightly longer delay when leaving
    setHoverTimeout(timeout);
  }, [hoverTimeout]);

  const getApplicabilityInfo = (rule: FundraisingExtraDefinition) => {
    if (rule.applicableTo === 'global') {
      return { text: 'All Rounds', icon: <Globe className="w-3 h-3" />, color: 'text-purple-600 bg-purple-100' };
    }
    const roundTypeNames = rule.applicableTo
      .map((type) => roundTypeDefinitions[type]?.name || type)
      .join(', ');
    return { text: roundTypeNames, icon: <Target className="w-3 h-3" />, color: 'text-blue-600 bg-blue-100' };
  };

  const getSuggestedPriceRange = (suggestedPrice: string) => {
    const ranges = {
      'Low-Medium': { min: 1, max: 3 },
      'Medium': { min: 3, max: 5 },
      'High': { min: 5, max: 10 },
      'Low': { min: 1, max: 2 },
      default: { min: 2, max: 5 }
    };

    const range = ranges[suggestedPrice as keyof typeof ranges] || ranges.default;
    let adjusted = { ...range };

    switch (currency) {
      case '$':
      case 'USDGLOW':
        // USD rates are similar to EUR, no adjustment needed
        break;
      case '£':
        adjusted.min = Math.max(1, Math.round(range.min * 0.85));
        adjusted.max = Math.round(range.max * 0.85);
        break;
      case '₹':
        adjusted.min = Math.round(range.min * 80);
        adjusted.max = Math.round(range.max * 80);
        break;
      case '¥':
        adjusted.min = Math.round(range.min * 150);
        adjusted.max = Math.round(range.max * 150);
        break;
      default:
        // Default to EUR rates
        break;
    }
    
    return `${currency}${adjusted.min}-${adjusted.max}`;
  };

  const totalExtraValue = selectedExtras.reduce((sum, key) => {
    const price = fundraisingPrices[key] || 0;
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
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          
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
              const details = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              const applicability = getApplicabilityInfo(details);
              const price = fundraisingPrices[key] ?? '';

              return (
                <div key={key} className={`border-2 p-4 rounded-xl ${getExcitementColor(details?.excitement || 'Low')}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{details.icon}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{details.label}</h4>
                        <p className="text-sm text-gray-600">{details.description}</p>
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
                        Suggested: {getSuggestedPriceRange(details.suggestedPrice)}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, rule]) => {
                const details = rule as FundraisingExtraDefinition;
                const applicability = getApplicabilityInfo(details);

                return (
                  <div 
                    key={key}
                    className={`border-2 rounded-xl transition-all duration-200 ${getExcitementColor(details?.excitement || 'Low')} hover:shadow-lg cursor-pointer`}
                    onMouseEnter={() => handleMouseEnter(details)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                            details.excitement === 'High' ? 'bg-red-100' :
                            details.excitement === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
                          }`}>
                            {details.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg">{details.label}</h4>
                            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs mt-1 ${applicability.color}`}>
                              {applicability.icon}
                              <span>{applicability.text}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            details.excitement === 'High' ? 'bg-red-100 text-red-700' :
                            details.excitement === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {details.excitement} Excitement
                          </span>
                          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                            {getSuggestedPriceRange(details.suggestedPrice)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 leading-relaxed">{details.description}</p>
                      
                      <div className="space-y-3">
                        <div className="text-xs text-blue-700">
                          <strong>Strategy:</strong> {details.strategy}
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {details.pros.map((pro: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              ✓ {pro}
                            </span>
                          ))}
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          <strong>Impact:</strong> {details.impact}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddExtra(key)}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Extra</span>
                      </button>
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









