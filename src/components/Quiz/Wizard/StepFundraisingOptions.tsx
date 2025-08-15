import React, { useState } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../constants/quizMetadata';
import { Globe, Target, ChevronLeft, ChevronRight, TrendingUp, Plus, Trash2, Info, Eye } from 'lucide-react';

interface SimpleCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  onAdd: (key: string) => void;
  getSuggestedPriceRange: (price: string) => string;
  getApplicabilityInfo: (rule: FundraisingExtraDefinition) => any;
  getExcitementColor: (excitement: string) => string;
}

const SimpleCard: React.FC<SimpleCardProps> = ({ 
  extraKey, 
  details, 
  onAdd, 
  getSuggestedPriceRange, 
  getApplicabilityInfo, 
  getExcitementColor 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const applicability = getApplicabilityInfo(details);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(extraKey);
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  return (
    <div className={`border rounded-lg transition-all ${getExcitementColor(details.excitement || 'Low')}`}>
      {/* Main card content */}
      <div className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-gray-100 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
              {details.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{details.label}</h4>
              <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium ${
                details.excitement === 'High' ? 'bg-red-100 text-red-700' :
                details.excitement === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
              }`}>
                {details.excitement}
              </span>
            </div>
          </div>
          <button
            onClick={toggleDetails}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-700 mb-3">{details.description}</p>

        {/* Applicability and Price */}
        <div className="space-y-2 mb-3">
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${applicability.color}`}>
            {applicability.icon}
            <span className="truncate">{applicability.text}</span>
          </div>
          
          <div className="text-xs text-gray-600">
            Suggested: <span className="font-medium">{getSuggestedPriceRange(details.suggestedPrice)}</span>
          </div>
        </div>

        {/* Add button */}
        <button
          onClick={handleAddClick}
          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Add Extra</span>
        </button>
      </div>

      {/* Expandable details */}
      {showDetails && (
        <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
          <div className="space-y-3 text-xs sm:text-sm">
            <div>
              <h5 className="font-medium text-gray-800 mb-1">Strategy</h5>
              <p className="text-gray-600">{details.strategy}</p>
            </div>

            <div>
              <h5 className="font-medium text-gray-800 mb-1">Impact</h5>
              <p className="text-gray-600">{details.impact}</p>
            </div>

            {details.pros && details.pros.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-800 mb-1">Benefits</h5>
                <div className="flex flex-wrap gap-1">
                  {details.pros.map((pro: string, idx: number) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                      {pro}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
    <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-2xl bg-gradient-to-br from-orange-400 to-red-500 flex-shrink-0">
        🚀
      </div>
      <div className="relative bg-white rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-lg border border-gray-200 flex-1">
        <p className="text-gray-700 text-xs sm:text-sm leading-tight sm:leading-normal">
          {selectedExtras.length > 0
            ? `Great! You've enabled ${selectedExtras.length} fundraising extra${selectedExtras.length > 1 ? 's' : ''}.`
            : 'Fundraising extras are optional fun add-ons that boost engagement and donations. Tap the eye icon to see strategy details!'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full px-2 sm:px-4 space-y-3 sm:space-y-6 pb-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base sm:text-xl font-semibold text-indigo-800">Step 3 of 4: Fundraising Extras (Optional)</h2>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Optional add-ons to boost engagement</div>
      </div>

      <Character />

      {/* Revenue indicator */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
          <span className="font-medium text-green-800 text-sm sm:text-base">Potential Revenue</span>
        </div>
        <div className="text-xs sm:text-sm text-green-700">
          Enabled: <strong>{selectedExtras.length}</strong> • Revenue/player: <strong>{currency}{totalExtraValue.toFixed(2)}</strong>
        </div>
      </div>

      {/* Selected extras */}
      {selectedExtras.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-medium text-gray-800 text-sm sm:text-base">Your Extras ({selectedExtras.length})</h3>
          <div className="space-y-2 sm:space-y-3">
            {selectedExtras.map((key) => {
              const details = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              const applicability = getApplicabilityInfo(details);
              const price = fundraisingPrices[key] ?? '';

              return (
                <div key={key} className={`border rounded-lg p-3 sm:p-4 ${getExcitementColor(details.excitement || 'Low')}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <span className="text-lg sm:text-xl flex-shrink-0">{details.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 text-sm sm:text-base">{details.label}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{details.description}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveExtra(key)} 
                      className="p-1 hover:bg-red-100 rounded transition-colors flex-shrink-0" 
                      title="Remove extra"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                    </button>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs sm:text-sm font-medium text-gray-700">Price ({currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.50"
                        value={price}
                        onChange={(e) => handlePriceChange(key, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-20 sm:w-24 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="0.00"
                      />
                      <span className="text-xs text-gray-500 hidden sm:inline">
                        Suggested: {getSuggestedPriceRange(details.suggestedPrice)}
                      </span>
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${applicability.color}`}>
                      {applicability.icon}
                      <span>{applicability.text}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!allPricesSet && selectedExtras.length > 0 && (
            <div className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              ⚠️ Please set prices for all selected extras before continuing.
            </div>
          )}
        </div>
      )}

      {/* Available extras */}
      {selectedExtras.length < applicableExtras.length && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="font-medium text-gray-800 text-sm sm:text-base">Available Extras</h3>
          <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-2 sm:p-3">
            💡 <strong>Tip:</strong> Tap the eye icon to see strategy details!
          </div>
          <div className="space-y-3 sm:space-y-4">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, details]) => (
                <SimpleCard
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



      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={onNext}
          disabled={selectedExtras.length > 0 && !allPricesSet}
          className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl transition-colors text-sm sm:text-base ${
            selectedExtras.length === 0 || allPricesSet
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepFundraisingOptions;











