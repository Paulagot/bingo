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
  Target,
  Gift
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

type PrizeSource = 'pool' | 'assets';

const StepWeb3Prizes: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();

  // Prize source decision
  const [prizeSource, setPrizeSource] = useState<PrizeSource>(
    setupConfig.prizeMode === 'assets' ? 'assets' : 'pool'
  );

  // Personal take (0-5%)
  const [personalTake, setPersonalTake] = useState(setupConfig.web3PrizeSplit?.host || 0);
  const [hostWallet, setHostWallet] = useState(setupConfig.hostWallet || '');

  // Pool prizes
  const [prizePoolPct, setPrizePoolPct] = useState(setupConfig.web3PrizeSplit?.prizes || 0);
  const [splits, setSplits] = useState<Record<number, number>>(setupConfig.prizeSplits || { 1: 100 });

  // External assets
  const [externalPrizes, setExternalPrizes] = useState<Prize[]>(
    setupConfig.prizes || [
      { place: 1, description: '', tokenAddress: '', value: 1 },
      { place: 2, description: '', tokenAddress: '', value: 1 },
      { place: 3, description: '', tokenAddress: '', value: 1 },
      { place: 4, description: '', tokenAddress: '', value: 1 }
    ]
  );

  const [error, setError] = useState('');

  // Calculations
  const maxPrizePool = 30 - personalTake;
  const charityPct = 50 + (30 - personalTake - (prizeSource === 'pool' ? prizePoolPct : 0));
  const platformPct = 20;

  const getCurrentMessage = () => {
    if (prizeSource === 'assets') {
      return {
        expression: "explaining",
        message: `Great! You'll provide your own assets as prizes. ${personalTake > 0 ? `You're taking ${personalTake}% personally, and` : 'The remaining'} ${charityPct}% goes to charity. Remember to have these assets ready before launching the game.`
      };
    }

    if (prizePoolPct === 0) {
      return {
        expression: "encouraging",
        message: `You're taking ${personalTake}% personally, and ${charityPct}% goes directly to charity! You can allocate up to ${maxPrizePool}% for prizes if you want.`
      };
    }

    if (prizePoolPct === maxPrizePool) {
      return {
        expression: "excited",
        message: `Perfect! You're using your full allocation: ${personalTake}% personal, ${prizePoolPct}% prizes, and ${charityPct}% to charity!`
      };
    }

    return {
      expression: "strategic",
      message: `You're allocating ${prizePoolPct}% to prizes and ${charityPct}% to charity. You could allocate up to ${maxPrizePool - prizePoolPct}% more to prizes if needed.`
    };
  };

  const handleSplitChange = (place: number, value: number) => {
    setSplits((prev) => ({ ...prev, [place]: value }));
  };

  const handleExternalPrizeChange = <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => {
    setExternalPrizes((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const totalPrizeSplit = Object.values(splits).reduce((acc, val) => acc + val, 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Validate personal take
    if (personalTake < 0 || personalTake > 5) {
      return setError('Personal take must be between 0% and 5%.');
    }

    // Validate host wallet if taking personal cut
    if (personalTake > 0 && !hostWallet.trim()) {
      return setError('Please enter a wallet address for your personal payout.');
    }

    if (prizeSource === 'pool') {
      // Validate prize pool allocation
      if (prizePoolPct < 0 || prizePoolPct > maxPrizePool) {
        return setError(`Prize pool must be between 0% and ${maxPrizePool}%.`);
      }

      // Ensure prizes are allocated when using pool mode
      if (prizePoolPct === 0) {
        return setError('You must allocate some percentage to prizes when using "Use Prize Pool" mode, or switch to "External Assets" mode.');
      }

      // Validate splits if prize pool is allocated
      if (prizePoolPct > 0) {
        if (totalPrizeSplit > 100) {
          return setError('Prize splits cannot total more than 100%.');
        }
        if (!splits[1]) {
          return setError('1st place split is required when using prize pool.');
        }
      }

      // Update config for pool mode
      updateSetupConfig({
        web3PrizeSplit: {
          charity: charityPct,
          host: personalTake,
          prizes: prizePoolPct,
        },
        hostWallet: personalTake > 0 ? hostWallet : '',
        prizeMode: 'split',
        prizeSplits: prizePoolPct > 0 ? splits : undefined,
        prizes: [],
      });
    } else {
      // Validate external assets
      const requiredPrizes = externalPrizes.filter(p => p.place <= 4);
      const incompletePrizes = requiredPrizes.filter(p => 
        !p.description.trim() || !p.tokenAddress?.trim() || !p.value || p.value <= 0
      );

      if (incompletePrizes.length > 0) {
        return setError('Please complete all prize details (description, contract address, and quantity).');
      }

      // Update config for assets mode
      updateSetupConfig({
        web3PrizeSplit: {
          charity: charityPct,
          host: personalTake,
          prizes: 0,
        },
        hostWallet: personalTake > 0 ? hostWallet : '',
        prizeMode: 'assets',
        prizeSplits: undefined,
        prizes: externalPrizes.filter(p => p.place <= 4),
      });
    }

    setError('');
    onNext();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 5 of 8: Prize Pool Configuration
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Configure Web3 prize distribution</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Pool Allocation Overview */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <Trophy className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Current Allocation</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs md:text-sm">
          <div className="p-2 bg-red-100 rounded border">
            <div className="font-bold text-red-700">{charityPct}%</div>
            <div className="text-red-600">Charity</div>
          </div>
          <div className="p-2 bg-blue-100 rounded border">
            <div className="font-bold text-blue-700">{personalTake}%</div>
            <div className="text-blue-600">Personal</div>
          </div>
          <div className="p-2 bg-yellow-100 rounded border">
            <div className="font-bold text-yellow-700">
              {prizeSource === 'pool' ? prizePoolPct : 0}%
            </div>
            <div className="text-yellow-600">Prizes</div>
          </div>
          <div className="p-2 bg-gray-100 rounded border">
            <div className="font-bold text-gray-700">{platformPct}%</div>
            <div className="text-gray-600">Platform</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Prize Source Decision */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-100">
              🎁
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Prize Source</h3>
              <p className="text-sm text-gray-600">How will you provide prizes to winners?</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
              prizeSource === 'pool' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400'
            }`}>
              <input 
                type="radio" 
                name="prizeSource" 
                checked={prizeSource === 'pool'} 
                onChange={() => {
                  setPrizeSource('pool');
                  setError('');
                }}
                className="hidden" 
              />
              <Percent className="w-6 h-6 text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">Use Prize Pool</p>
                <p className="text-sm text-gray-600">Allocate part of collected funds for automatic distribution</p>
              </div>
            </label>

            <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
              prizeSource === 'assets' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-400'
            }`}>
              <input 
                type="radio" 
                name="prizeSource" 
                checked={prizeSource === 'assets'} 
                onChange={() => {
                  setPrizeSource('assets');
                  setError('');
                }}
                className="hidden" 
              />
              <Gift className="w-6 h-6 text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">External Assets</p>
                <p className="text-sm text-gray-600">Provide your own NFTs, tokens, or digital assets</p>
              </div>
            </label>
          </div>
        </div>

        {/* Step 2: Personal Take */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100">
              💰
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Personal Take</h3>
              <p className="text-sm text-gray-600">How much do you want for yourself? (Optional)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>Personal Percentage</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{personalTake}%</span>
              </label>
              <div className="relative">
                <input 
                  type="range" 
                  min={0} 
                  max={5} 
                  step={0.5}
                  value={personalTake} 
                  onChange={(e) => {
                    setPersonalTake(parseFloat(e.target.value));
                    setError('');
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(personalTake / 5) * 100}%, #E5E7EB ${(personalTake / 5) * 100}%, #E5E7EB 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>2.5%</span>
                  <span>5%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Drag to select your personal take (0-5%)</p>
            </div>

            {personalTake > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Your Wallet Address <span className="text-red-500">*</span>
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
          </div>
        </div>

        {/* Step 3A: Prize Pool Configuration */}
        {prizeSource === 'pool' && (
          <>
            <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-yellow-100">
                  🏆
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">Prize Pool Allocation</h3>
                  <p className="text-sm text-gray-600">How much of your remaining {maxPrizePool}% for prizes?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span>Prize Pool Percentage</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{prizePoolPct}%</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="range" 
                      min={0} 
                      max={maxPrizePool} 
                      step={0.5}
                      value={prizePoolPct} 
                      onChange={(e) => {
                        setPrizePoolPct(parseFloat(e.target.value));
                        setError('');
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #EAB308 0%, #EAB308 ${(prizePoolPct / maxPrizePool) * 100}%, #E5E7EB ${(prizePoolPct / maxPrizePool) * 100}%, #E5E7EB 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>{Math.round(maxPrizePool / 2)}%</span>
                      <span>{maxPrizePool}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Remaining {maxPrizePool - prizePoolPct}% will go to charity
                  </p>
                </div>
              </div>
            </div>

            {/* Prize Splits */}
            {prizePoolPct > 0 && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100">
                    📊
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">Prize Distribution</h4>
                    <p className="text-sm text-gray-600">How to split the {prizePoolPct}% prize pool</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[1, 2, 3, 4].map((place) => (
                    <div key={place} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-700 w-20">
                        {place === 1 ? '1st' : place === 2 ? '2nd' : place === 3 ? '3rd' : '4th'} Place
                      </span>
                      <input 
                        type="number" 
                        value={splits[place] || ''} 
                        onChange={(e) => handleSplitChange(place, parseFloat(e.target.value) || 0)} 
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
                    {totalPrizeSplit < 100 && <span className="text-green-600 ml-2">✓ {100 - totalPrizeSplit}% unallocated returns to charity</span>}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 3B: External Assets Configuration */}
        {prizeSource === 'assets' && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-100">
                🎨
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">External Asset Prizes</h3>
                <p className="text-sm text-gray-600">Specify the assets you'll provide for each place</p>
              </div>
            </div>

            <div className="space-y-4">
              {externalPrizes.map((prize, index) => (
                <div key={index} className="border-2 border-gray-200 p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                      {prize.place}
                    </div>
                    <h4 className="font-medium text-gray-800">
                      {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : '4th'} Place Prize
                    </h4>
                  </div>

                  <div className="grid gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Prize Description <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={prize.description} 
                        onChange={(e) => handleExternalPrizeChange(index, 'description', e.target.value)} 
                        placeholder="e.g., Rare Dragon NFT, 500 USDC Tokens" 
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Contract Address <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={prize.tokenAddress || ''} 
                        onChange={(e) => handleExternalPrizeChange(index, 'tokenAddress', e.target.value)} 
                        placeholder="e.g., 0x1234...abcd or G1234...xyz" 
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity/Token ID <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="number" 
                        min={1}
                        value={prize.value || ''} 
                        onChange={(e) => handleExternalPrizeChange(index, 'value', parseFloat(e.target.value) || 0)} 
                        placeholder="e.g., 1 (for NFTs) or 500 (for tokens)" 
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Sponsor (Optional)
                      </label>
                      <input 
                        type="text" 
                        value={prize.sponsor || ''} 
                        onChange={(e) => handleExternalPrizeChange(index, 'sponsor', e.target.value)} 
                        placeholder="e.g., CompanyXYZ" 
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• You must have these assets ready before launching the game</li>
                    <li>• The smart contract will verify and escrow these assets</li>
                    <li>• Make sure contract addresses are correct for your blockchain</li>
                    <li>• For NFTs, use Token ID; for fungible tokens, use quantity</li>
                  </ul>
                </div>
              </div>
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
                <li>• Minimum 50% always goes to charity</li>
                <li>• You can take up to 5% personally (optional)</li>
                <li>• Remaining 30% is yours to allocate or donate back</li>
                <li>• Platform reserves 20% for operational costs</li>
                <li>• External assets are provided separately from the fund pool</li>
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
