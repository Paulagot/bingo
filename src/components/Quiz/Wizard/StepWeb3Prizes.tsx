// src/components/Quiz/Wizard/StepWeb3Prizes.tsx
import { useState, type FC, type FormEvent } from 'react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';
import { 
  AlertCircle, 
  Percent, 
  Wallet, 
  ChevronLeft, 
  ChevronRight,
  Trophy,
  Heart,
  User,
  Info,
  Plus,
  Trash2,
  Target
} from 'lucide-react';
import type { Prize } from '../../Quiz/types/quiz';

const Character = ({ expression, message }: { expression: string; message: string }) => {
  const getCharacterStyle = (): string => {
    const base = "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300";
    switch (expression) {
      case "excited": return `${base} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
      case "explaining": return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
      case "strategic": return `${base} bg-gradient-to-br from-orange-400 to-red-500`;
      case "encouraging": return `${base} bg-gradient-to-br from-green-400 to-blue-500`;
      default: return `${base} bg-gradient-to-br from-gray-400 to-gray-600`;
    }
  };

  const getEmoji = (): string => {
    switch (expression) {
      case "excited": return "🎯";
      case "explaining": return "💡";
      case "strategic": return "🧠";
      case "encouraging": return "⚡";
      default: return "😊";
    }
  };

  return (
    <div className="flex items-start space-x-3 md:space-x-4 mb-6">
      <div className={getCharacterStyle()}>{getEmoji()}</div>
      <div className="relative bg-white rounded-2xl p-3 md:p-4 shadow-lg border-2 border-gray-200 max-w-sm md:max-w-lg flex-1">
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
        <p className="text-gray-700 text-sm md:text-base">{message}</p>
      </div>
    </div>
  );
};

const StepWeb3Prizes: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();

  const [charityPct, setCharityPct] = useState(setupConfig.web3PrizeSplit?.charity || 75);
  const [hostPct, setHostPct] = useState(setupConfig.web3PrizeSplit?.host || 5);
  const [prizePct, setPrizePct] = useState(setupConfig.web3PrizeSplit?.prizes || 0);
  const [hostWallet, setHostWallet] = useState(setupConfig.hostWallet || '');
  const [error, setError] = useState('');

  const [prizeMode, setPrizeMode] = useState<'split' | 'assets'>(
    setupConfig.prizeMode === 'assets' ? 'assets' : 'split'
  );

  const [prizes, setPrizes] = useState<Prize[]>(setupConfig.prizes || []);
  const [splits, setSplits] = useState<Record<number, number>>(setupConfig.prizeSplits || { 1: 100 });

  const totalPrizeSplit = Object.values(splits).reduce((acc, val) => acc + val, 0);
  const totalHostAndPrize = hostPct + prizePct;
  const totalPoolUsed = charityPct + hostPct + prizePct;

  const getCurrentMessage = () => {
    if (totalPoolUsed < 80) {
      return { 
        expression: "encouraging", 
        message: `You're using ${totalPoolUsed}% of the available 80%. You can add up to ${80 - totalPoolUsed}% more to prizes, or adjust charity down to 50% minimum to allocate more funds.` 
      };
    }
    
    if (charityPct < 50) {
      return { 
        expression: "explaining", 
        message: "Charity allocation must be at least 50% to maintain the charitable nature of your quiz. Please increase the charity percentage." 
      };
    }
    
    if (prizeMode === 'split' && totalPrizeSplit > 100) {
      return { 
        expression: "encouraging", 
        message: "Your prize split percentages add up to more than 100%. Please adjust the splits so they total 100% or less." 
      };
    }
    
    if (totalPoolUsed > 80) {
      return { 
        expression: "strategic", 
        message: "You're allocating more than 80% of the pool. Remember, 20% is reserved for the platform to keep the service running." 
      };
    }
    
    if (totalPoolUsed === 80) {
      return { 
        expression: "excited", 
        message: `Perfect! You're using the full 80% allocation: ${charityPct}% to charity, ${hostPct}% to host, ${prizePct}% to prizes. This maximizes the impact of your quiz!` 
      };
    }
    
    return { 
      expression: "explaining", 
      message: "We've set up optimal defaults using 80% of the pool. You can adjust charity (min 50%), host (max 5%), and prizes (max 25%) as needed." 
    };
  };

  const handlePrizeChange = <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => {
    setPrizes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleSplitChange = (place: number, value: number) => {
    setSplits((prev) => ({ ...prev, [place]: value }));
  };

  const handleAddPrize = () => {
    setPrizes((prev) => [
      ...prev,
      { place: prev.length + 1, description: '', value: 0 },
    ]);
  };

  const handleRemovePrize = (index: number) => {
    setPrizes((prev) => prev.filter((_, i) => i !== index));
  };

  const isDuplicatePlace = (place: number) => {
    return prizes.filter((p) => p.place === place).length > 1;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (charityPct < 50) return setError('At least 50% must go to charity.');
    if (hostPct > 5) return setError('Host allocation cannot exceed 5%.');
    if (prizePct > 25) return setError('Prize pool cannot exceed 25%.');
    if (totalHostAndPrize > 30) return setError('Host + Prize allocation cannot exceed 30%.');
    if (totalPoolUsed > 80) return setError('Only 80% of the pool can be allocated. 20% is reserved for the platform.');
    if (hostPct > 0 && !hostWallet) return setError('Please enter a wallet address for host payout.');

    // Only validate prize configuration if prize pool is allocated OR if using digital assets
    if (prizePct > 0 || prizeMode === 'assets') {
      if (prizeMode === 'split' && prizePct > 0 && !splits[1]) {
        return setError('At least a 1st place split is required when using prize pool.');
      }

      if (prizeMode === 'assets') {
        const hasDuplicate = prizes.some((p) => isDuplicatePlace(p.place));
        if (!prizes.some((p) => p.place === 1)) {
          return setError('You must assign at least a 1st place prize when using digital assets.');
        }
        if (hasDuplicate) {
          return setError('Duplicate prize place numbers are not allowed.');
        }
      }
    }

    updateSetupConfig({
      web3PrizeSplit: {
        charity: charityPct,
        host: hostPct,
        prizes: prizePct,
      },
      hostWallet,
      prizeMode,
      prizeSplits: prizeMode === 'split' ? splits : undefined,
      prizes: prizeMode === 'assets' ? prizes.sort((a, b) => a.place - b.place) : [],
    });

    setError('');
    onNext();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 5 of 8: Prize Pool Allocation
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Configure Web3 prize distribution</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Pool Allocation Overview */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <Trophy className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Pool Allocation</span>
        </div>
        <div className="text-xs md:text-sm text-indigo-700 mb-2">
          Using {totalPoolUsed}% of 80% available (20% platform reserved)
          {totalPoolUsed < 80 && <span className="text-indigo-600 font-medium"> • {80 - totalPoolUsed}% remaining</span>}
        </div>
        <div className="w-full bg-indigo-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              totalPoolUsed === 80 ? 'bg-green-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.min((totalPoolUsed / 80) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pool Split Configuration */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-yellow-100">
              🎯
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Pool Split Configuration</h3>
              <p className="text-sm text-gray-600">Allocate collected funds between charity, host, and prizes</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Charity Allocation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span>Charity (%)</span>
              </label>
              <input 
                type="number" 
                min={50} 
                max={80} 
                value={charityPct} 
                onChange={(e) => {
                  setCharityPct(parseFloat(e.target.value));
                  setError('');
                }}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
              <p className="text-xs text-gray-500">Can reduce to 50%, Max: 80%</p>
            </div>

            {/* Host Allocation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-500" />
                <span>Host (%)</span>
              </label>
              <input 
                type="number" 
                min={0} 
                max={5} 
                value={hostPct} 
                onChange={(e) => {
                  setHostPct(parseFloat(e.target.value));
                  setError('');
                }}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
              <p className="text-xs text-gray-500">Can reduce to 0%, Max: 5%</p>
            </div>

            {/* Prize Allocation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span>Prizes (%)</span>
              </label>
              <input 
                type="number" 
                min={0} 
                max={25} 
                value={prizePct} 
                onChange={(e) => {
                  setPrizePct(parseFloat(e.target.value));
                  setError('');
                }}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
              <p className="text-xs text-gray-500">Can increase up to 25%</p>
            </div>
          </div>

          {/* Host Wallet Address */}
          {hostPct > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Host Wallet Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={hostWallet}
                onChange={(e) => {
                  setHostWallet(e.target.value);
                  setError('');
                }}
                placeholder="e.g., G... (Stellar) or 0x... (Ethereum)"
                className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
            </div>
          )}

          {/* Allocation Summary */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-red-50 rounded border border-red-200">
              <div className="font-bold text-red-700">{charityPct}%</div>
              <div className="text-xs text-red-600">Charity</div>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded border border-blue-200">
              <div className="font-bold text-blue-700">{hostPct}%</div>
              <div className="text-xs text-blue-600">Host</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
              <div className="font-bold text-yellow-700">{prizePct}%</div>
              <div className="text-xs text-yellow-600">Prizes</div>
            </div>
          </div>
        </div>

        {/* Prize Distribution Method */}
        <div className={`bg-white border-2 rounded-xl p-4 md:p-6 shadow-sm transition-all duration-200 ${
          prizePct === 0 ? 'border-gray-300 opacity-60' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
        }`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              prizePct === 0 ? 'bg-gray-100' : 'bg-purple-100'
            }`}>
              🏆
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${
                prizePct === 0 ? 'text-gray-500' : 'text-gray-900'
              }`}>Prize Distribution Method</h3>
              <p className={`text-sm ${
                prizePct === 0 ? 'text-gray-400' : 'text-gray-600'
              }`}>Choose how to distribute prizes to winners</p>
            </div>
          </div>

          {prizePct === 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">No Prize Pool - External Prizes Only</span>
                </div>
                <p className="text-sm text-yellow-700 mb-2">
                  Since you have 0% allocated to prizes, you can only distribute digital assets from your own wallet (not from the collected pool).
                </p>
                <p className="text-xs text-yellow-600">
                  This includes NFTs, tokens, or other digital assets you already own.
                </p>
              </div>

              {/* Only show Digital Assets option when no pool */}
              <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                prizeMode === 'assets' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400'
              }`}>
                <input 
                  type="radio" 
                  name="prizeMode" 
                  checked={prizeMode === 'assets'} 
                  onChange={() => setPrizeMode('assets')} 
                  className="hidden" 
                />
                <Wallet className="w-6 h-6 text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Give Digital Assets</p>
                  <p className="text-sm text-gray-600">NFTs or tokens awarded from your personal wallet</p>
                </div>
              </label>

              {/* Disabled percentage split option */}
              <div className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl opacity-50 cursor-not-allowed bg-gray-50">
                <Percent className="w-6 h-6 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-500">Split by Percentage</p>
                  <p className="text-sm text-gray-400">Requires prize pool allocation above 0%</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                prizeMode === 'split' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400'
              }`}>
                <input 
                  type="radio" 
                  name="prizeMode" 
                  checked={prizeMode === 'split'} 
                  onChange={() => setPrizeMode('split')} 
                  className="hidden" 
                />
                <Percent className="w-6 h-6 text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Split by Percentage</p>
                  <p className="text-sm text-gray-600">Use smart contracts to split the {prizePct}% prize pool automatically</p>
                </div>
              </label>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    With {prizePct}% allocated to prizes, you'll distribute from the collected cryptocurrency pool only.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prize Split Configuration */}
        {prizeMode === 'split' && prizePct > 0 && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100">
                📊
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 text-lg">Prize Split Percentages</h4>
                <p className="text-sm text-gray-600">Set percentage splits for top winners</p>
              </div>
            </div>

            <div className="space-y-3">
              {[1, 2, 3].map((place) => (
                <div key={place} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Target className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-700 w-20">
                    {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'} Place
                  </span>
                  <input 
                    type="number" 
                    value={splits[place] || ''} 
                    onChange={(e) => handleSplitChange(place, parseFloat(e.target.value))} 
                    placeholder="e.g. 50" 
                    className="w-24 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                Total Split: <strong>{totalPrizeSplit}%</strong> 
                {totalPrizeSplit > 100 && <span className="text-red-600 ml-2">⚠️ Cannot exceed 100%</span>}
              </p>
            </div>
          </div>
        )}

        {/* Digital Assets Configuration */}
        {prizeMode === 'assets' && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100">
                  🎁
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-lg">
                    {prizePct === 0 ? 'External Digital Assets' : 'Digital Asset Prizes'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {prizePct === 0 
                      ? 'Assign NFTs or tokens from your personal wallet' 
                      : 'Assign NFTs or tokens by place'
                    }
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleAddPrize} 
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Prize</span>
              </button>
            </div>

            <div className="space-y-4">
              {prizes.map((prize, index) => (
                <div key={index} className="border-2 border-gray-200 p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-gray-700">Place</label>
                      <input 
                        type="number" 
                        min={1} 
                        max={10} 
                        value={prize.place} 
                        onChange={(e) => handlePrizeChange(index, 'place', parseInt(e.target.value, 10))} 
                        className="w-20 px-2 py-1 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                      />
                      {isDuplicatePlace(prize.place) && (
                        <span className="text-xs text-red-600 font-medium">⚠️ Duplicate</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePrize(index)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={prize.description} 
                      onChange={(e) => handlePrizeChange(index, 'description', e.target.value)} 
                      placeholder="Prize description (e.g., Rare NFT Collection)" 
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                    />
                    <input 
                      type="text" 
                      value={prize.tokenAddress || ''} 
                      onChange={(e) => handlePrizeChange(index, 'tokenAddress', e.target.value)} 
                      placeholder="Token/Contract Address (optional)" 
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                    />
                    <input 
                      type="text" 
                      value={prize.sponsor || ''} 
                      onChange={(e) => handlePrizeChange(index, 'sponsor', e.target.value)} 
                      placeholder="Sponsor (optional)" 
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </div>
              ))}

              {prizes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No prizes added yet. Click "Add Prize" to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Prize Pool Guidelines</p>
              <ul className="space-y-1 text-xs">
                <li>• Minimum 50% must go to charity to maintain charitable status</li>
                <li>• Host compensation limited to 5% maximum</li>
                <li>• Prize pool cannot exceed 25% of total</li>
                <li>• Platform reserves 20% for operational costs</li>
                <li>• Smart contracts handle automatic distribution</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={totalPoolUsed > 80 || charityPct < 50 || (prizeMode === 'split' && totalPrizeSplit > 100)}
            className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>Save & Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepWeb3Prizes;
