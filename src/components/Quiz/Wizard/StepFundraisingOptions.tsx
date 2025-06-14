import React from 'react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../../../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../../../constants/quizMetadata';
import { Globe, Target, ChevronLeft, ChevronRight, TrendingUp, Plus, Trash2 } from 'lucide-react';

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
            : 'Choose optional fundraising extras to enhance both fun and donations!'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Step 4 of 7: Fundraising Extras</h2>

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, details]) => {
                const applicability = getApplicabilityInfo(details);
                return (
                  <div key={key} className={`border-2 rounded-xl ${getExcitementColor(details.excitement || 'Low')} hover:shadow-lg`}>
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
                            details.excitement === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {details.excitement} Excitement
                          </span>
                          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
                            {getSuggestedPriceRange(details.suggestedPrice)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{details.description}</p>
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
    </div>
  );
};

export default StepFundraisingOptions;











