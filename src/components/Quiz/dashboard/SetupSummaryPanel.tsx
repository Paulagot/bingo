import React, { useState } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Target, 
  Users, 
  Zap, 
  Globe,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  Wallet,
  Gift
} from 'lucide-react';
import { roundTypeDefinitions, fundraisingExtraDefinitions } from '../constants/quizMetadata';
import { useRoomIdentity } from '../hooks/useRoomIdentity';
import QRCodeShare from './QRCodeShare';

const SetupSummaryPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const { roomId, hostId } = useRoomIdentity();
  const isWeb3 = config?.paymentMethod === 'web3';

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    rounds: false,
    extras: false,
    prizes: false
  });

  if (!config || !config.hostName) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 shadow-md">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="rounded-lg bg-indigo-100 p-2">
            <FileText className="h-6 w-6 text-indigo-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Setup Summary</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz configuration...</p>
        </div>
      </div>
    );
  }

  const {
    hostName,
    entryFee,
    paymentMethod,
    fundraisingOptions,
    fundraisingPrices,
    currencySymbol,
    startTime,
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
    const normalized = difficulty.toLowerCase();
    switch (normalized) {
      case 'easy': return 'bg-green-100 text-green-700 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'hard': return 'bg-red-100 text-red-700 border-red-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const estimatedTime = roundDefinitions?.reduce((total, round) => {
    const config = round.config;
    let roundTime = 2.5;
    
    if (config.totalTimeSeconds) {
      roundTime += config.totalTimeSeconds / 60;
    } else if (config.questionsPerRound && config.timePerQuestion) {
      roundTime += (config.questionsPerRound * config.timePerQuestion) / 60;
    } else {
      roundTime += 5;
    }
    
    return total + roundTime;
  }, 0) || 0;

  return (
    <div className="bg-gray-50 rounded-xl p-6 md:p-8 shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <div className="rounded-lg bg-indigo-100 p-2">
          <FileText className="h-6 w-6 text-indigo-700" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quiz Setup Summary</h2>
          <p className="text-sm text-gray-600 mt-0.5">Review your quiz configuration</p>
        </div>
      </div>
      
      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Host</span>
          </div>
          <div className="font-semibold text-gray-900">{hostName || '—'}</div>
        </div>
        
        <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Entry Fee</span>
          </div>
          <div className="font-semibold text-gray-900">
            {entryFee ? `${currencySymbol ?? ''}${entryFee}` : 'Free'}
          </div>
        </div>
        
        <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-2">
            {paymentMethod === 'web3' ? (
              <Wallet className="h-4 w-4 text-purple-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-blue-600" />
            )}
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment</span>
          </div>
          <div className="font-semibold text-gray-900">
            {paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash or Card'}
          </div>
        </div>

        {startTime && (
          <div className="rounded-lg border-2 border-gray-200 bg-white p-4 sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Start Time</span>
            </div>
            <div className="font-semibold text-gray-900">
              {new Date(startTime).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Room Info */}
      {roomId && (
        <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-indigo-700" />
            <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">Room ID</span>
          </div>
          <div className="font-mono text-lg font-bold text-indigo-900">{roomId}</div>
        </div>
      )}

      {/* QR Code Sharing Section */}
      {isWeb3 && roomId && (
        <div className="mb-6">
          <QRCodeShare
            roomId={roomId}
            hostName={hostName}
            gameType={config?.gameType}
          />
        </div>
      )}

      {/* Rounds Section */}
      <div className="rounded-xl border-2 border-gray-200 bg-white mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('rounds')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-1.5">
              <Zap className="h-5 w-5 text-indigo-700" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Quiz Rounds</div>
              <div className="text-sm text-gray-600">
                {roundDefinitions?.length || 0} rounds • ~{Math.round(estimatedTime)} min
              </div>
            </div>
          </div>
          {expandedSections.rounds ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.rounds && (
          <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
            {roundDefinitions && roundDefinitions.length > 0 ? (
              <div className="space-y-3">
                {roundDefinitions.map((round, index) => {
                  const roundTypeDef = roundTypeDefinitions[round.roundType];
                  
                  const applicableExtras = Object.entries(fundraisingOptions || {})
                    .filter(([_, enabled]) => enabled)
                    .map(([key]) => {
                      const extraDef = Object.values(fundraisingExtraDefinitions).find(def => {
                        const defId = def.id.toLowerCase();
                        const searchKey = key.toLowerCase();
                        return defId === searchKey || 
                               defId.includes(searchKey) ||
                               searchKey.includes(defId);
                      });
                      return { key, extraDef };
                    })
                    .filter(({ extraDef }) => {
                      if (!extraDef) return false;
                      return extraDef.applicableTo === 'global' || 
                             (Array.isArray(extraDef.applicableTo) && extraDef.applicableTo.includes(round.roundType));
                    });
                  
                  if (!roundTypeDef) {
                    return (
                      <div key={index} className="rounded-lg border-2 border-gray-200 bg-white p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-600">Round {round.roundNumber}</span>
                          <span className="font-medium text-gray-900">Unknown Round Type</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="rounded-lg border-2 border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                            {round.roundNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{roundTypeDef.icon}</span>
                              <span className="font-semibold text-gray-900">{roundTypeDef.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {round.difficulty && (
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getDifficultyColor(round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1))}`}>
                                  {round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)}
                                </span>
                              )}
                              {round.category && (
                                <span className="rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                                  {round.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                          {round.config.questionsPerRound && (
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" />
                              <span>{round.config.questionsPerRound} questions</span>
                            </div>
                          )}
                          {round.config.timePerQuestion && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{round.config.timePerQuestion}s each</span>
                            </div>
                          )}
                          {round.config.totalTimeSeconds && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{Math.round(round.config.totalTimeSeconds / 60)}m total</span>
                            </div>
                          )}
                          {round.config.timeToAnswer && (
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" />
                              <span>{round.config.timeToAnswer}s to answer</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {applicableExtras.length > 0 && (
                        <div className="border-t border-gray-200 pt-3">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Available Extras
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {applicableExtras.map(({ key, extraDef }, extraIdx) => {
                              const price = fundraisingPrices?.[key];
                              return (
                                <div key={extraIdx} className="inline-flex items-center gap-1.5 rounded-full border border-green-300 bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                                  <span>{extraDef?.icon || '💰'}</span>
                                  <span>{extraDef?.label || key}</span>
                                  {price && <span>({currencySymbol ?? ''}{price})</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No rounds configured</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fundraising Extras Section */}
      <div className="rounded-xl border-2 border-gray-200 bg-white mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('extras')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-1.5">
              <Users className="h-5 w-5 text-green-700" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Fundraising Extras</div>
              <div className="text-sm text-gray-600">
                {activeFundraising.length} selected
              </div>
            </div>
          </div>
          {expandedSections.extras ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.extras && (
          <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
            {activeFundraising.length > 0 ? (
              <div className="space-y-3">
                {activeFundraising.map((key, index) => {
                  const rawKey = key.toLowerCase().replace(/ /g, '');
                  const price = fundraisingPrices?.[rawKey];
                  
                  const extraDef = Object.values(fundraisingExtraDefinitions).find(def => {
                    const defId = def.id.toLowerCase();
                    const defLabel = def.label.toLowerCase().replace(/ /g, '');
                    const searchKey = rawKey.toLowerCase();
                    
                    return defId === searchKey || 
                           defLabel === searchKey ||
                           defId.includes(searchKey) ||
                           searchKey.includes(defId);
                  });

                  return (
                    <div key={index} className="rounded-lg border-2 border-green-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{extraDef?.icon || '💰'}</span>
                          <span className="font-semibold text-gray-900">{extraDef?.label || key}</span>
                        </div>
                        {price && (
                          <span className="rounded-full border border-green-300 bg-green-100 px-3 py-1 text-sm font-bold text-green-800">
                            {currencySymbol ?? ''}{price}
                          </span>
                        )}
                      </div>
                      
                      {extraDef && (
                        <div>
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                            Available In
                          </div>
                          {extraDef.applicableTo === 'global' ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
                              <Globe className="h-3 w-3" />
                              <span>All rounds</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {extraDef.applicableTo.map((roundType, idx) => {
                                const roundDef = roundTypeDefinitions[roundType];
                                return (
                                  <div key={idx} className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                                    <span>{roundDef?.icon || '❓'}</span>
                                    <span>{roundDef?.name || roundType}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No fundraising extras selected</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prizes Section */}
      <div className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
        <button
          onClick={() => toggleSection('prizes')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-1.5">
              <Gift className="h-5 w-5 text-yellow-700" />
            </div>
            <div className="text-left">
              <div className="font-bold text-gray-900">Prize Setup</div>
              <div className="text-sm text-gray-600">
                {prizeMode === 'split' ? 'Percentage Split' : 
                 prizeMode === 'assets' || prizeMode === 'cash' ? 'Custom Prizes' : 
                 'Not configured'}
              </div>
            </div>
          </div>
          {expandedSections.prizes ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.prizes && (
          <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
            {prizeMode === 'split' && prizeSplits ? (
              <div className="space-y-2">
                {Object.entries(prizeSplits).map(([place, percent]) => (
                  <div key={place} className="flex items-center justify-between rounded-lg border-2 border-yellow-200 bg-white p-3">
                    <span className="font-semibold text-gray-900 capitalize">{place} place</span>
                    <span className="rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                      {percent}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (prizeMode === 'assets' || prizeMode === 'cash') && prizes ? (
              <div className="space-y-3">
                {prizes.map((prize, idx) => (
                  <div key={idx} className="rounded-lg border-2 border-yellow-200 bg-white p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white text-xs font-bold">
                          {prize.place}
                        </div>
                        <span className="font-semibold text-gray-900 capitalize">{prize.place} place</span>
                      </div>
                      {prize.value && (
                        <span className="rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-sm font-bold text-yellow-800">
                          {currencySymbol ?? ''}{prize.value}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-700">
                      {prize.description}
                      {prize.sponsor && (
                        <span className="text-purple-600"> • Sponsored by {prize.sponsor}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gift className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 text-sm">No prizes configured</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupSummaryPanel;



