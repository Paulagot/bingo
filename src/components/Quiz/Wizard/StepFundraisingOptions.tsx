import React, { useState } from 'react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../../../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../../../constants/quizMetadata';
import { Globe, Target, ChevronLeft, ChevronRight, TrendingUp, Plus, Trash2, RotateCcw, Info } from 'lucide-react';

interface FlipCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  onAdd: (key: string) => void;
  getSuggestedPriceRange: (price: string) => string;
  getApplicabilityInfo: (rule: FundraisingExtraDefinition) => any;
  getExcitementColor: (excitement: string) => string;
}

const FlipCard: React.FC<FlipCardProps> = ({ 
  extraKey, 
  details, 
  onAdd, 
  getSuggestedPriceRange, 
  getApplicabilityInfo, 
  getExcitementColor 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const applicability = getApplicabilityInfo(details);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(extraKey);
  };

  return (
    <div className="group perspective-1000 h-72 md:h-80">
      <div 
        className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
        onClick={handleCardClick}
      >
        {/* Front of card */}
        <div className={`absolute inset-0 backface-hidden border-2 rounded-xl hover:shadow-lg transition-all duration-200 ${getExcitementColor(details.excitement || 'Low')}`}>
          <div className="p-3 md:p-4 h-full flex flex-col">
            {/* Header - Compact layout */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-lg md:text-xl flex-shrink-0 ${
                  details.excitement === 'High' ? 'bg-red-100' :
                  details.excitement === 'Medium' ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  {details.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm md:text-base truncate">{details.label}</h4>
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                    details.excitement === 'High' ? 'bg-red-100 text-red-700' :
                    details.excitement === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {details.excitement} Excitement
                  </span>
                </div>
              </div>
              <Info className="w-3 h-3 text-gray-400 flex-shrink-0" />
            </div>

            {/* Applicability */}
            <div className="mb-3">
              <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${applicability.color}`}>
                {applicability.icon}
                <span className="truncate">{applicability.text}</span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-3 flex-1">
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed line-clamp-3">{details.description}</p>
            </div>

            {/* Suggested Price */}
            <div className="mb-3">
              <div className="text-xs text-gray-600 mb-1">Suggested Price</div>
              <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                {getSuggestedPriceRange(details.suggestedPrice)}
              </span>
            </div>

            {/* Add button */}
            <button
              onClick={handleAddClick}
              className="w-full py-2 md:py-3 px-3 md:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4" />
              <span className="text-xs md:text-sm">Add Extra</span>
            </button>
          </div>
        </div>

        {/* Back of card */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 border-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-xl">{details.icon}</span>
                <h4 className="font-semibold text-gray-900 text-base">{details.label}</h4>
              </div>
              <RotateCcw className="w-3 h-3 text-gray-400" />
            </div>

            <div className="space-y-3 flex-1 text-xs overflow-hidden min-h-0">
              {/* Strategy & Impact */}
              <div className="min-h-0">
                <h5 className="font-medium text-gray-800 mb-1 text-xs">Strategy</h5>
                <p className="text-gray-600 text-xs leading-tight line-clamp-2">{details.strategy}</p>
              </div>

              <div className="min-h-0">
                <h5 className="font-medium text-gray-800 mb-1 text-xs">Impact</h5>
                <p className="text-gray-600 text-xs leading-tight line-clamp-2">{details.impact}</p>
              </div>

              {/* Pros */}
              {details.pros && details.pros.length > 0 && (
                <div className="min-h-0">
                  <h5 className="font-medium text-gray-800 mb-1 text-xs">Benefits</h5>
                  <div className="flex flex-wrap gap-1">
                    {details.pros.map((pro: string, idx: number) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs whitespace-nowrap">
                        {pro}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Applicable Rounds Detail */}
              <div className="min-h-0">
                <h5 className="font-medium text-gray-800 mb-1 text-xs">Available In</h5>
                {details.applicableTo === 'global' ? (
                  <div className="flex items-center space-x-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    <Globe className="w-3 h-3" />
                    <span>All round types</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {details.applicableTo.map((roundType, idx) => {
                      const roundDef = roundTypeDefinitions[roundType];
                      return (
                        <div key={idx} className="flex items-center space-x-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          <span>{roundDef?.icon}</span>
                          <span className="whitespace-nowrap">{roundDef?.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Special Properties */}
              {((details as any).totalRestorePoints || (details as any).pointsToRob) && (
                <div className="min-h-0">
                  <h5 className="font-medium text-gray-800 mb-1 text-xs">Special</h5>
                  <div className="flex flex-wrap gap-1">
                    {(details as any).totalRestorePoints && (
                      <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        {(details as any).totalRestorePoints} restore points
                      </span>
                    )}
                    {(details as any).pointsToRob && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                        Steal {(details as any).pointsToRob} points
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StepFundraisingOptions: React.FC<{ onNext: () => void; onBack: () => void }> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const selectedRounds = setupConfig.roundDefinitions || [];
  const currency = setupConfig.currencySymbol || '€';
  const fundraisingOptions = setupConfig.fundraisingOptions || {};
  const fundraisingPrices = setupConfig.fundraisingPrices || {};
  const selectedExtras = Object.keys(fundraisingOptions).filter((key) => fundraisingOptions[key]);

  const applicableExtras = Object.entries(fundraisingExtraDefinitions).filter(([_, rule]) =>
    selectedRounds.some((round) =>
      rule.applicableTo === 'global' ||
      (Array.isArray(rule.applicableTo) && rule.applicableTo.includes(round.roundType))
    )
  );

  const handleAddExtra = (key: string) => {
    updateSetupConfig({ fundraisingOptions: { ...fundraisingOptions, [key]: true } });
  };

  const handleRemoveExtra = (key: string) => {
    const updatedOptions = { ...fundraisingOptions, [key]: false };
    const updatedPrices = { ...fundraisingPrices };
    delete updatedPrices[key];

    updateSetupConfig({ fundraisingOptions: updatedOptions, fundraisingPrices: updatedPrices });
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
    }
    return `${currency}${adjusted.min}-${adjusted.max}`;
  };

  const totalExtraValue = selectedExtras.reduce((sum, key) => sum + (fundraisingPrices[key] || 0), 0);

  const getExcitementColor = (excitement: string) => {
    switch (excitement) {
      case 'High': return 'bg-red-50 border-red-200 text-red-800';
      case 'Medium': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'Low': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const allPricesSet = selectedExtras.every(key => fundraisingPrices[key] > 0);

  const Character = () => (
    <div className="flex items-start space-x-4 mb-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl bg-gradient-to-br from-orange-400 to-red-500">
        🚀
      </div>
      <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-lg">
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
        <p className="text-gray-700 text-sm">
          {selectedExtras.length > 0
            ? `Excellent! You've enabled ${selectedExtras.length} fundraising extra${selectedExtras.length > 1 ? 's' : ''} to boost engagement.`
            : 'Fundraising Extras are totally optional. The are like in game extras that turn a standard quiz into a fun and exciting game of strategy.  Choose fundraising extras to enhance both fun and donations! Click any card to see detailed strategy info. Select the extras you want to enable and set their prices. Team can decide if they want to purchase them before the games starts. '}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Step 5 of 8: Fundraising Extras</h2>

      <Character />

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-1">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="font-medium text-green-800">Potential Revenue</span>
        </div>
        <div className="text-sm text-green-700">
          Enabled extras: <strong>{selectedExtras.length}</strong> | Est. revenue per player: <strong>{currency}{totalExtraValue.toFixed(2)}</strong>
        </div>
      </div>

      {selectedExtras.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Your Fundraising Extras ({selectedExtras.length}/{applicableExtras.length})</h3>
          <div className="space-y-3">
            {selectedExtras.map((key) => {
              const details = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              const applicability = getApplicabilityInfo(details);
              const price = fundraisingPrices[key] ?? '';

              return (
                <div key={key} className={`border-2 p-4 rounded-xl ${getExcitementColor(details.excitement || 'Low')}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{details.icon}</span>
                      <div>
                        <h4 className="font-semibold text-gray-800">{details.label}</h4>
                        <p className="text-sm text-gray-600">{details.description}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveExtra(key)} className="p-1 hover:bg-red-100 rounded-full transition-colors" title="Remove extra">
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
                      <span className="text-xs text-gray-500">Suggested: {getSuggestedPriceRange(details.suggestedPrice)}</span>
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

          {!allPricesSet && (
            <div className="text-sm text-red-600 mt-2">
              Please enter a price for each selected extra before continuing.
            </div>
          )}
        </div>
      )}

      {selectedExtras.length < applicableExtras.length && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Add Fundraising Extras</h3>
          <div className="text-xs md:text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
            💡 <strong>Tip:</strong> Click any card to flip it and see detailed strategy information!
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, details]) => (
                <FlipCard
                  key={key}
                  extraKey={key}
                  details={details}
                  onAdd={handleAddExtra}
                  getSuggestedPriceRange={getSuggestedPriceRange}
                  getApplicabilityInfo={getApplicabilityInfo}
                  getExcitementColor={getExcitementColor}
                />
              ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          disabled={!allPricesSet}
          className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-colors ${
            allPricesSet
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* CSS styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .perspective-1000 {
            perspective: 1000px;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .line-clamp-3 {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `
      }} />
    </div>
  );
};

export default StepFundraisingOptions;











