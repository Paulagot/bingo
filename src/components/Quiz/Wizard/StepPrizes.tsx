import { useState, type FC, type FormEvent } from 'react';
import { useQuizConfig } from '../useQuizConfig';
import type { WizardStepProps } from './WizardStepProps';
import { AlertCircle, Plus, Trash2, Info, Trophy, DollarSign, Percent, Wallet, ChevronLeft, ChevronRight, Gift } from 'lucide-react';

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

interface PrizeModeExplainer {
  title: string;
  description: string;
  features: string[];
  pros: string[];
  bestFor: string;
  example: string;
}

const prizeModeExplainers: Record<string, PrizeModeExplainer> = {
  split: {
    title: "Split Prize Pool by %",
    description: "Automatically distribute a percentage of the total USDGLOW collected via smart contract. No manual intervention needed!",
    features: ["100% automated payouts", "Scales with participation", "Instant distribution", "Transparent blockchain records"],
    pros: ["Fully automated", "Fair scaling", "No upfront cost", "Instant payouts"],
    bestFor: "Online events, crypto communities, automated fundraising",
    example: "1st: 50%, 2nd: 30%, 3rd: 20% of total USDGLOW collected"
  },
  assets: {
    title: "Digital Asset Prizes",
    description: "Award NFTs, tokens, or other digital assets from your wallet. Create unique, memorable prizes that participants will treasure!",
    features: ["NFT/token prizes", "Unique digital rewards", "Blockchain verified ownership", "Instant transfer"],
    pros: ["Unique prizes", "Collectible value", "No upfront cost", "Memorable rewards"],
    bestFor: "NFT communities, crypto events, creating collectible experiences",
    example: "1st: Rare Champion NFT, 2nd: 100 custom tokens, 3rd: Digital badge"
  },
  cash: {
    title: "Manual Prize List",
    description: "List specific prizes with descriptions, values, and optional sponsors. You handle distribution manually after the quiz.",
    features: ["Flexible prize descriptions", "Sponsor attribution", "Custom prize values", "Manual distribution"],
    pros: ["Complete flexibility", "Sponsor recognition", "Custom descriptions", "Any prize type"],
    bestFor: "Traditional events, sponsored prizes, mixed prize types",
    example: "1st: €500 + iPad (Sponsor: TechCorp), 2nd: €200, 3rd: €100"
  }
};

const StepPrizes: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const [error, setError] = useState('');
  const [activeExplainer, setActiveExplainer] = useState<PrizeModeExplainer | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const isWeb3 = config.paymentMethod === 'web3';
  const currency = isWeb3 ? 'USDGLOW' : config.currencySymbol || '€';
  const [prizeMode, setPrizeMode] = useState<'split' | 'assets' | 'cash'>(
    isWeb3 ? config.prizeMode || 'split' : 'cash'
  );

  const [splits, setSplits] = useState<Record<number, number>>(config.prizeSplits || { 1: 100 });
  const [prizes, setPrizes] = useState(config.prizes || []);

  const handleSplitChange = (place: number, value: number) => {
    setSplits((prev) => ({ ...prev, [place]: value }));
  };

  const handlePrizeChange = (index: number, field: string, value: string | number) => {
    const updated = [...prizes];
    (updated[index] as any)[field] = value;
    setPrizes(updated);
  };

  const handleAddPrize = () => {
    if (prizes.length >= 10) return;
    setPrizes([...prizes, { place: prizes.length + 1, description: '', value: 0 }]);
  };

  const handleRemovePrize = (index: number) => {
    const updated = [...prizes];
    updated.splice(index, 1);
    setPrizes(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (isWeb3 && prizeMode === 'split') {
      const total = Object.values(splits).reduce((acc, val) => acc + val, 0);
      if (!splits[1]) {
        return setError('At least a 1st place split is required.');
      }
      if (total > 100) {
        return setError('Total prize percentage cannot exceed 100%.');
      }
      updateConfig({ prizeMode: 'split', prizeSplits: splits, prizes: [] });
      return onNext();
    }

    if (!prizes.find((p) => p.place === 1)) {
      return setError('At least a 1st place prize must be defined.');
    }

    updateConfig({ prizeMode, prizes, prizeSplits: undefined });
    onNext();
  };

  const totalSplit = Object.values(splits).reduce((acc, val) => acc + val, 0);

  // Character component
  const Character = ({ expression, message }: { expression: string; message: any }) => {
    const getCharacterStyle = () => {
      const baseStyle = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      
      switch (expression) {
        case "prize":
          return `${baseStyle} bg-gradient-to-br from-yellow-400 to-orange-500 animate-bounce`;
        case "explaining":
          return `${baseStyle} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        case "web3":
          return `${baseStyle} bg-gradient-to-br from-blue-400 to-cyan-500`;
        case "strategic":
          return `${baseStyle} bg-gradient-to-br from-green-400 to-emerald-500`;
        default:
          return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "prize": return "🏆";
        case "explaining": return "💡";
        case "web3": return "🚀";
        case "strategic": return "🎯";
        default: return "😊";
      }
    };

    const isExplainer = typeof message === 'object' && message.title;

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>
          {getEmoji()}
        </div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-lg">
          {/* Speech bubble tail */}
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          
          {isExplainer ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">{message.title}</h4>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {message.description}
              </p>
              
              <div className="space-y-2">
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <strong className="text-blue-800">Key Features:</strong>
                  <ul className="mt-1 space-y-1">
                    {message.features.map((feature: string, index: number) => (
                      <li key={index} className="text-blue-700">• {feature}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <strong>Best for:</strong> {message.bestFor}
                </div>

                <div className="bg-green-50 p-2 rounded text-xs">
                  <strong className="text-green-800">Example:</strong>
                  <div className="text-green-700 mt-1">{message.example}</div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {message.pros.map((pro: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ {pro}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
          )}
        </div>
      </div>
    );
  };

  // Get current message
  const getCurrentMessage = () => {
    if (activeExplainer) {
      return {
        expression: "explaining",
        message: activeExplainer
      };
    }
    
    if (isWeb3 && prizeMode === 'assets') {
      return {
        expression: "web3",
        message: "Fantastic! Digital asset prizes create unique, collectible rewards. NFTs and tokens make your quiz memorable and valuable!"
      };
    }
    
    if (isWeb3 && prizeMode === 'split') {
      return {
        expression: "web3", 
        message: "Perfect choice! Smart contract percentage distribution is fully automated. Set your percentages and the blockchain handles everything!"
      };
    }
    
    if (prizeMode === 'cash') {
      return {
        expression: "strategic",
        message: "Great for flexibility! You can list any type of prize with custom descriptions and sponsor recognition. Perfect for traditional events!"
      };
    }
    
    return {
      expression: "prize",
      message: "Time to set up your prizes! This is what will motivate participants and make your quiz exciting. Choose the approach that fits your event and payment method best!"
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 5 of 7: Prizes</h2>
        <div className="text-sm text-gray-600">Motivate participants</div>
      </div>

      {/* Character Guide */}
      <div 
        onMouseEnter={() => {
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
          }
        }}
      >
        <Character 
          expression={getCurrentMessage().expression}
          message={getCurrentMessage().message}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-sm text-gray-600">
          Choose how you'd like to award prizes: split the pot by % for top finishers, offer specific digital assets, or list prizes manually.
        </p>

        {/* Prize Mode Selection for Web3 */}
        {isWeb3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
              <Trophy className="w-5 h-5" />
              <span>Prize Distribution Method</span>
            </h3>
            
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
                <Percent className="h-6 w-6 text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Split prize pool by %</p>
                  <p className="text-sm text-gray-600">Automated percentage distribution via smart contract</p>
                </div>
                <Info 
                  className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors"
                  onMouseEnter={() => {
                    if (hoverTimeout) clearTimeout(hoverTimeout);
                    setActiveExplainer(prizeModeExplainers.split);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setActiveExplainer(null), 150);
                    setHoverTimeout(timeout);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    const explainer = prizeModeExplainers.split;
                    setActiveExplainer(activeExplainer?.title === explainer.title ? null : explainer);
                  }}
                />
              </label>

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
                <Wallet className="h-6 w-6 text-indigo-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Give away digital assets</p>
                  <p className="text-sm text-gray-600">Award NFTs, tokens, or other digital assets</p>
                </div>
                <Info 
                  className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors"
                  onMouseEnter={() => {
                    if (hoverTimeout) clearTimeout(hoverTimeout);
                    setActiveExplainer(prizeModeExplainers.assets);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setActiveExplainer(null), 150);
                    setHoverTimeout(timeout);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    const explainer = prizeModeExplainers.assets;
                    setActiveExplainer(activeExplainer?.title === explainer.title ? null : explainer);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Split Prize Pool Section */}
        {prizeMode === 'split' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
              <Percent className="w-5 h-5" />
              <span>Percentage Distribution</span>
            </h3>
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((place) => (
                <div key={place} className="flex items-center space-x-3">
                  <div className="w-20 text-sm font-medium text-gray-700">
                    {place}{ordinal(place)} Place
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={splits[place] || ''}
                      onChange={(e) => handleSplitChange(place, parseFloat(e.target.value))}
                      placeholder="0"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                    />
                  </div>
                  <div className="text-sm text-gray-500">%</div>
                </div>
              ))}
            </div>
            
            <div className={`p-3 rounded-lg ${
              totalSplit === 100 ? 'bg-green-50 border border-green-200' : 
              totalSplit > 100 ? 'bg-red-50 border border-red-200' : 
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center space-x-2">
                <Percent className="w-4 h-4" />
                <span className="font-medium">Total: {totalSplit}%</span>
              </div>
              {totalSplit > 100 && (
                <p className="text-sm text-red-600 mt-1">Must not exceed 100%</p>
              )}
              {totalSplit < 100 && totalSplit > 0 && (
                <p className="text-sm text-yellow-600 mt-1">Remaining: {(100 - totalSplit).toFixed(1)}%</p>
              )}
            </div>
          </div>
        )}

        {/* Manual Prize List Section */}
        {(prizeMode === 'assets' || prizeMode === 'cash') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
                <Gift className="w-5 h-5" />
                <span>{prizeMode === 'assets' ? 'Digital Asset Prizes' : 'Prize List'}</span>
              </h3>
              <div className="flex items-center space-x-2">
                <Info 
                  className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors"
                  onMouseEnter={() => {
                    if (hoverTimeout) clearTimeout(hoverTimeout);
                    setActiveExplainer(prizeModeExplainers.cash);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => setActiveExplainer(null), 150);
                    setHoverTimeout(timeout);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    const explainer = prizeModeExplainers.cash;
                    setActiveExplainer(activeExplainer?.title === explainer.title ? null : explainer);
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {prizes.map((prize, index) => (
                <div key={index} className="border-2 border-gray-200 p-4 rounded-xl bg-white shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <strong className="text-gray-800">{prize.place}{ordinal(prize.place)} Place</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePrize(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prize Description</label>
                    <input
                      type="text"
                      value={prize.description || ''}
                      onChange={(e) => handlePrizeChange(index, 'description', e.target.value)}
                      placeholder="e.g., iPad Pro, Gift Card, Custom Trophy"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                    />
                  </div>

                  {prizeMode === 'assets' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token/Contract Address</label>
                      <input
                        type="text"
                        value={prize.tokenAddress || ''}
                        onChange={(e) => handlePrizeChange(index, 'tokenAddress', e.target.value)}
                        placeholder="0x..."
                        className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor (optional)</label>
                    <input
                      type="text"
                      value={prize.sponsor || ''}
                      onChange={(e) => handlePrizeChange(index, 'sponsor', e.target.value)}
                      placeholder="e.g., TechCorp, Local Business"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>Value ({currency})</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={prize.value || ''}
                      onChange={(e) => handlePrizeChange(index, 'value', parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                    />
                  </div>
                </div>
              ))}

              {prizes.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddPrize}
                  className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Prize
                </button>
              )}

              {prizes.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">
                      Total Prize Value: {prizes.reduce((acc, p) => acc + (p.value || 0), 0)} {currency}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-200 shadow-lg"
          >
            <span>Save Prizes & Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepPrizes;


