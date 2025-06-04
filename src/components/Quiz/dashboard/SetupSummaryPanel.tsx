import React, { useState } from 'react';
import { useQuizConfig } from '../useQuizConfig';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Clock, Target, Users, Zap } from 'lucide-react';

// Round type explainers for display
const roundTypeExplainers: Record<string, { title: string; icon: string; difficulty: string }> = {
  general_trivia: { title: "General Trivia", icon: "🧠", difficulty: "Easy" },
  speed_round: { title: "Speed Round", icon: "⚡", difficulty: "Medium" },
  fastest_finger: { title: "Fastest Finger First", icon: "👆", difficulty: "Medium" },
  wipeout: { title: "Wipeout", icon: "💀", difficulty: "Hard" },
  head_to_head: { title: "Head to Head", icon: "⚔️", difficulty: "Hard" }
};

const SetupSummaryPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rounds: false,
    extras: false,
    prizes: false
  });

  if (!config) return null;

  const {
    hostName,
    entryFee,
    paymentMethod,
    fundraisingOptions,
    fundraisingPrices,
    currencySymbol,
    startTime,
    roomId,
    prizeMode,
    prizeSplits,
    prizes,
    roundDefinitions
  } = config;

  const activeFundraising = fundraisingOptions
    ? Object.entries(fundraisingOptions)
        .filter(([_, enabled]) => enabled)
        .map(([key]) =>
          key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
        )
    : [];

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'Hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Calculate total estimated time
  const estimatedTime = roundDefinitions?.reduce((total, round) => {
    const timePerRound = round.config.questionsPerRound * (round.config.timePerQuestion || 25) / 60;
    return total + timePerRound + 2; // Add 2 minutes buffer per round
  }, 0) || 0;

  return (
    <div className="bg-white p-8 rounded-xl shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📋 Quiz Setup Summary</h2>
      
      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
        <div className="bg-gray-50 p-3 rounded-lg">
          <strong className="text-gray-800">Host Name:</strong> 
          <div className="text-gray-700">{hostName || '—'}</div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <strong className="text-gray-800">Entry Fee:</strong>
          <div className="text-gray-700">
            {entryFee ? `${currencySymbol ?? ''}${entryFee}` : 'Free'}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <strong className="text-gray-800">Payment Method:</strong>
          <div className="text-gray-700">
            {paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash or Revolut'}
          </div>
        </div>

        {startTime && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <strong className="text-gray-800">Start Time:</strong>
            <div className="text-gray-700">
              {new Date(startTime).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Room Info */}
      {roomId && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <strong className="text-indigo-800">Room ID:</strong>
              <div className="text-indigo-700 font-mono">{roomId}</div>
            </div>
            <div>
              <strong className="text-indigo-800">Join Link:</strong>
              <div>
                <Link
                  to={`/join/${roomId}`}
                  className="text-indigo-600 hover:underline font-mono"
                >
                  /join/{roomId}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rounds Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('rounds')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-indigo-600" />
            <strong className="text-gray-800">Quiz Rounds</strong>
            <span className="text-sm text-gray-600">
              ({roundDefinitions?.length || 0} rounds, ~{Math.round(estimatedTime)} min)
            </span>
          </div>
          {expandedSections.rounds ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.rounds && (
          <div className="border-t border-gray-200 p-4 space-y-3">
            {roundDefinitions && roundDefinitions.length > 0 ? (
              <div className="space-y-2">
                {roundDefinitions.map((round, index) => {
                  const explainer = roundTypeExplainers[round.roundType];
                  return (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-600">Round {round.roundNumber}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{explainer?.icon}</span>
                          <span className="font-medium text-gray-800">{explainer?.title}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(explainer?.difficulty || 'Easy')}`}>
                            {explainer?.difficulty}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Target className="w-3 h-3" />
                          <span>{round.config.questionsPerRound}q</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{round.config.timePerQuestion}s</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No rounds configured</div>
            )}
          </div>
        )}
      </div>

      {/* Fundraising Extras Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('extras')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-green-600" />
            <strong className="text-gray-800">Fundraising Extras</strong>
            <span className="text-sm text-gray-600">
              ({activeFundraising.length} selected)
            </span>
          </div>
          {expandedSections.extras ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.extras && (
          <div className="border-t border-gray-200 p-4">
            {activeFundraising.length > 0 ? (
              <div className="space-y-2">
                {activeFundraising.map((key, index) => {
                  const rawKey = key.toLowerCase().replace(/ /g, '');
                  const price = fundraisingPrices?.[rawKey];
                  return (
                    <div key={index} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-800">{key}</span>
                      {price && (
                        <span className="text-green-700 font-medium">
                          {currencySymbol ?? ''}{price}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No fundraising extras selected</div>
            )}
          </div>
        )}
      </div>

      {/* Prizes Section */}
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection('prizes')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <Target className="w-5 h-5 text-yellow-600" />
            <strong className="text-gray-800">Prize Setup</strong>
            <span className="text-sm text-gray-600">
              ({prizeMode === 'split' ? 'Percentage Split' : 
                prizeMode === 'assets' || prizeMode === 'cash' ? 'Custom Prizes' : 
                'Not configured'})
            </span>
          </div>
          {expandedSections.prizes ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.prizes && (
          <div className="border-t border-gray-200 p-4">
            {prizeMode === 'split' && prizeSplits ? (
              <div className="space-y-2">
                {Object.entries(prizeSplits).map(([place, percent]) => (
                  <div key={place} className="flex items-center justify-between bg-yellow-50 p-3 rounded-lg">
                    <span className="font-medium text-gray-800 capitalize">{place} place</span>
                    <span className="text-yellow-700 font-medium">{percent}%</span>
                  </div>
                ))}
              </div>
            ) : (prizeMode === 'assets' || prizeMode === 'cash') && prizes ? (
              <div className="space-y-2">
                {prizes.map((prize, idx) => (
                  <div key={idx} className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800 capitalize">{prize.place} place</span>
                      {prize.value && (
                        <span className="text-yellow-700 font-medium">
                          {currencySymbol ?? ''}{prize.value}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {prize.description}
                      {prize.sponsor && (
                        <span className="text-gray-500"> • Sponsored by {prize.sponsor}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">No prizes configured</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupSummaryPanel;



