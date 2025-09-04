import React, { useState } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Clock, Target, Users, Zap, Globe } from 'lucide-react';
import { roundTypeDefinitions, fundraisingExtraDefinitions } from '../constants/quizMetadata';

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
  const normalized = difficulty.toLowerCase();
  switch (normalized) {
    case 'easy': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'hard': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-fg/80';
  }
};

  // Calculate total estimated time - improved to handle different round types
  const estimatedTime = roundDefinitions?.reduce((total, round) => {
    const config = round.config;
    let roundTime = 2.5; // base time for transitions/setup
    
    if (config.totalTimeSeconds) {
      // For speed rounds and other time-based rounds
      roundTime += config.totalTimeSeconds / 60;
    } else if (config.questionsPerRound && config.timePerQuestion) {
      // For question-based rounds
      roundTime += (config.questionsPerRound * config.timePerQuestion) / 60;
    } else {
      // Fallback for rounds without clear timing
      roundTime += 5; // 5 minute fallback
    }
    
    return total + roundTime;
  }, 0) || 0;

  return (
    <div className="bg-muted space-y-6 rounded-xl p-8 shadow-md">
      <h2 className="text-fg mb-6 text-2xl font-bold">📋 Quiz Setup Summary</h2>
      
      {/* Basic Info Grid */}
      <div className="text-fg/70 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-3">
          <strong className="text-fg">Host Name:</strong> 
          <div className="text-fg/80">{hostName || '—'}</div>
        </div>
        
        <div className="rounded-lg bg-gray-50 p-3">
          <strong className="text-fg">Entry Fee:</strong>
          <div className="text-fg/80">
            {entryFee ? `${currencySymbol ?? ''}${entryFee}` : 'Free'}
          </div>
        </div>
        
        <div className="rounded-lg bg-gray-50 p-3">
          <strong className="text-fg">Payment Method:</strong>
          <div className="text-fg/80">
            {paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash or Card'}
          </div>
        </div>

        {startTime && (
          <div className="rounded-lg bg-gray-50 p-3">
            <strong className="text-fg">Start Time:</strong>
            <div className="text-fg/80">
              {new Date(startTime).toLocaleString()}
            </div>
          </div>
        )}
   {/* Room Info */}
      {roomId && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <strong className="text-indigo-800">Room ID:</strong>
              <div className="font-mono text-indigo-700">{roomId}</div>
            </div>
           
          </div>
        </div>
      )}

      </div>

    

      {/* Rounds Section */}
      <div className="border-border rounded-lg border">
        <button
          onClick={() => toggleSection('rounds')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 text-indigo-600" />
            <strong className="text-fg">Quiz Rounds</strong>
            <span className="text-fg/70 text-sm">
              ({roundDefinitions?.length || 0} rounds, ~{Math.round(estimatedTime)} min)
            </span>
          </div>
          {expandedSections.rounds ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.rounds && (
          <div className="border-border space-y-3 border-t p-4">
            {roundDefinitions && roundDefinitions.length > 0 ? (
              <div className="space-y-2">
                {roundDefinitions.map((round, index) => {
                  // Get round type data from metadata instead of hardcoded object
                  const roundTypeDef = roundTypeDefinitions[round.roundType];
                  
                  // Find applicable fundraising extras for this round
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
                    // Fallback for unknown round types
                    return (
                      <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-fg/70 text-sm font-medium">Round {round.roundNumber}</span>
                          <span className="text-fg font-medium">Unknown Round Type</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="space-y-2 rounded-lg bg-gray-50 p-3">
                      {/* Round header info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-fg/70 text-sm font-medium">Round {round.roundNumber}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{roundTypeDef.icon}</span>
                            <span className="text-fg font-medium">{roundTypeDef.name}</span>
                           {round.difficulty && (
  <span className={`rounded-full px-2 py-1 text-xs ${getDifficultyColor(round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1))}`}>
    {round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)}
  </span>
)}
{round.category && (
  <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
    {round.category}
  </span>
)}
                          </div>
                        </div>
                        <div className="text-fg/70 flex items-center space-x-4 text-sm">
                          {/* Show questions count if available */}
                          {round.config.questionsPerRound && (
                            <span className="flex items-center space-x-1">
                              <Target className="h-3 w-3" />
                              <span>{round.config.questionsPerRound}q</span>
                            </span>
                          )}
                          {/* Show time per question if available */}
                          {round.config.timePerQuestion && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{round.config.timePerQuestion}s</span>
                            </span>
                          )}
                          {/* Show total time if available (for speed rounds) */}
                          {round.config.totalTimeSeconds && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{Math.round(round.config.totalTimeSeconds / 60)}m total</span>
                            </span>
                          )}
                          {/* Show answer time if available (for head-to-head) */}
                          {round.config.timeToAnswer && (
                            <span className="flex items-center space-x-1">
                              <Target className="h-3 w-3" />
                              <span>{round.config.timeToAnswer}s to answer</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Show applicable fundraising extras */}
                      {applicableExtras.length > 0 && (
                        <div className="border-border border-t pt-2">
                          <div className="text-fg/70 mb-1 text-xs">Available extras:</div>
                          <div className="flex flex-wrap gap-1">
                            {applicableExtras.map(({ key, extraDef }, extraIdx) => {
                              const price = fundraisingPrices?.[key];
                              return (
                                <div key={extraIdx} className="inline-flex items-center space-x-1 rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
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
              <div className="text-fg/60 py-4 text-center">No rounds configured</div>
            )}
          </div>
        )}
      </div>

      {/* Fundraising Extras Section */}
      <div className="border-border rounded-lg border">
        <button
          onClick={() => toggleSection('extras')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3">
            <Users className="h-5 w-5 text-green-600" />
            <strong className="text-fg">Fundraising Extras</strong>
            <span className="text-fg/70 text-sm">
              ({activeFundraising.length} selected)
            </span>
          </div>
          {expandedSections.extras ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.extras && (
          <div className="border-border border-t p-4">
            {activeFundraising.length > 0 ? (
              <div className="space-y-3">
                {activeFundraising.map((key, index) => {
                  const rawKey = key.toLowerCase().replace(/ /g, '');
                  const price = fundraisingPrices?.[rawKey];
                  
                  // More robust lookup for fundraising extra definition
                  const extraDef = Object.values(fundraisingExtraDefinitions).find(def => {
                    // Try multiple matching strategies
                    const defId = def.id.toLowerCase();
                    const defLabel = def.label.toLowerCase().replace(/ /g, '');
                    const searchKey = rawKey.toLowerCase();
                    
                    return defId === searchKey || 
                           defLabel === searchKey ||
                           defId.includes(searchKey) ||
                           searchKey.includes(defId);
                  });

                  console.log(`Looking for key: "${rawKey}", found:`, extraDef); // Debug log

                  return (
                    <div key={index} className="space-y-2 rounded-lg bg-green-50 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{extraDef?.icon || '💰'}</span>
                          <span className="text-fg font-medium">{extraDef?.label || key}</span>
                        </div>
                        {price && (
                          <span className="font-medium text-green-700">
                            {currencySymbol ?? ''}{price}
                          </span>
                        )}
                      </div>
                      
                      {extraDef && (
                        <div className="text-sm">
                          <div className="text-fg/70 mb-1">Available in:</div>
                          {extraDef.applicableTo === 'global' ? (
                            <div className="inline-flex items-center space-x-1 rounded-full bg-purple-100 px-2 py-1 text-xs text-purple-700">
                              <Globe className="h-3 w-3" />
                              <span>All rounds</span>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {extraDef.applicableTo.map((roundType, idx) => {
                                const roundDef = roundTypeDefinitions[roundType];
                                return (
                                  <div key={idx} className="inline-flex items-center space-x-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
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
              <div className="text-fg/60 py-4 text-center">No fundraising extras selected</div>
            )}
          </div>
        )}
      </div>

      {/* Prizes Section */}
      <div className="border-border rounded-lg border">
        <button
          onClick={() => toggleSection('prizes')}
          className="flex w-full items-center justify-between p-4 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center space-x-3">
            <Target className="h-5 w-5 text-yellow-600" />
            <strong className="text-fg">Prize Setup</strong>
            <span className="text-fg/70 text-sm">
              ({prizeMode === 'split' ? 'Percentage Split' : 
                prizeMode === 'assets' || prizeMode === 'cash' ? 'Custom Prizes' : 
                'Not configured'})
            </span>
          </div>
          {expandedSections.prizes ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.prizes && (
          <div className="border-border border-t p-4">
            {prizeMode === 'split' && prizeSplits ? (
              <div className="space-y-2">
                {Object.entries(prizeSplits).map(([place, percent]) => (
                  <div key={place} className="flex items-center justify-between rounded-lg bg-yellow-50 p-3">
                    <span className="text-fg font-medium capitalize">{place} place</span>
                    <span className="font-medium text-yellow-700">{percent}%</span>
                  </div>
                ))}
              </div>
            ) : (prizeMode === 'assets' || prizeMode === 'cash') && prizes ? (
              <div className="space-y-2">
                {prizes.map((prize, idx) => (
                  <div key={idx} className="rounded-lg bg-yellow-50 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-fg font-medium capitalize">{prize.place} place</span>
                      {prize.value && (
                        <span className="font-medium text-yellow-700">
                          {currencySymbol ?? ''}{prize.value}
                        </span>
                      )}
                    </div>
                    <div className="text-fg/70 text-sm">
                      {prize.description}
                      {prize.sponsor && (
                        <span className="text-fg/60"> • Sponsored by {prize.sponsor}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-fg/60 py-4 text-center">No prizes configured</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupSummaryPanel;



