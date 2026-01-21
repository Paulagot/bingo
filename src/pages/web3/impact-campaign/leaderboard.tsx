// src/pages/public/ImpactCampaign/ImpactCampaignLeaderboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Users, 
  Network, 
  Calendar, 
  Award,
  Sparkles,
  Crown,
  Zap,
  Target,
  ArrowUp,
  Star
} from 'lucide-react';
import { SEO } from '../../../components/SEO';

type Period = 'all' | 'feb2026' | 'mar2026' | 'apr2026';

interface HostEntry {
  rank: number;
  hostWallet: string;
  hostName: string;
  points: number;
  events: number;
}

interface NetworkEntry {
  rank: number;
  network: string;
  chain: string;
  points: number;
  events: number;
}

interface Stats {
  totalEvents: number;
  uniqueHosts: number;
  uniqueNetworks: number;
  totalRaised: string;
  totalCharity: string;
  totalPlayers: number;
}

const periodLabels: Record<Period, string> = {
  all: 'All Time',
  feb2026: 'February 2026',
  mar2026: 'March 2026',
  apr2026: 'April 2026',
};

const ImpactCampaignLeaderboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>('all');
  const [activeTab, setActiveTab] = useState<'hosts' | 'networks'>('hosts');
  
  const [hostLeaderboard, setHostLeaderboard] = useState<HostEntry[]>([]);
  const [networkLeaderboard, setNetworkLeaderboard] = useState<NetworkEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [hostsRes, networksRes, statsRes] = await Promise.all([
          fetch(`/api/impact-campaign/leaderboard/hosts?period=${period}`),
          fetch(`/api/impact-campaign/leaderboard/networks?period=${period}`),
          fetch(`/api/impact-campaign/leaderboard/stats?period=${period}`),
        ]);

        if (!hostsRes.ok || !networksRes.ok || !statsRes.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }

        const hostsData = await hostsRes.json();
        const networksData = await networksRes.json();
        const statsData = await statsRes.json();

        setHostLeaderboard(hostsData.leaderboard || []);
        setNetworkLeaderboard(networksData.leaderboard || []);
        setStats(statsData.stats || null);
      } catch (err: any) {
        console.error('[Leaderboard] Error fetching data:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  // Format wallet address for display
  const formatWallet = (wallet: string) => {
    if (!wallet) return 'Unknown';
    if (wallet.length <= 12) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  // Get podium position styling
  const getPodiumStyle = (rank: number) => {
    if (rank === 1) return 'from-yellow-400 to-amber-500';
    if (rank === 2) return 'from-gray-300 to-gray-400';
    if (rank === 3) return 'from-amber-600 to-orange-700';
    return 'from-indigo-500 to-purple-600';
  };

  // Get podium height
  const getPodiumHeight = (rank: number) => {
    if (rank === 1) return 'h-40';
    if (rank === 2) return 'h-32';
    if (rank === 3) return 'h-28';
    return 'h-20';
  };

  // Format network name
  const formatNetwork = (network: string) => {
    const names: Record<string, string> = {
      baseSepolia: 'Base Sepolia',
      base: 'Base',
      avalancheFuji: 'Avalanche Fuji',
      avalanche: 'Avalanche',
      optimismSepolia: 'OP Sepolia',
      optimism: 'OP Mainnet',
      solanaDevnet: 'Solana Devnet',
      solanaMainnet: 'Solana Mainnet',
      mainnet: 'Solana Mainnet',
      devnet: 'Solana Devnet',
    };
    return names[network] || network;
  };

  const topThree = hostLeaderboard.slice(0, 3);
  const restOfLeaderboard = hostLeaderboard.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl animate-pulse" />
        <div className="absolute -right-20 top-40 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute left-1/2 -bottom-20 h-96 w-96 rounded-full bg-pink-500/20 blur-3xl animate-pulse delay-2000" />
      </div>

      <SEO
        title="Web3 Impact Campaign Leaderboard — Live Standings | FundRaisely"
        description="Track participating communities, funds raised on-chain, and live standings across blockchain networks."
        type="event"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-yellow-400/20 border border-yellow-400/30 px-4 py-2 backdrop-blur-sm">
            <Trophy className="h-5 w-5 text-yellow-400 animate-bounce" />
            <span className="text-yellow-300 text-sm font-semibold">Live Campaign Standings</span>
          </div>
          
          <h1 className="mb-4 bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent text-5xl md:text-7xl font-black">
            Impact Leaderboard
          </h1>
          
          <p className="mx-auto max-w-2xl text-purple-100 text-lg md:text-xl">
            Celebrating communities making the biggest impact through Web3 fundraising
          </p>
        </div>

        {/* Stats Dashboard */}
        {stats && (
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 backdrop-blur-sm border border-purple-400/30 p-6 shadow-2xl transition-all hover:scale-105 hover:shadow-purple-500/50">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple-400/10 blur-2xl group-hover:bg-purple-400/20 transition-all" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-full bg-purple-500/30 p-2">
                    <Users className="h-6 w-6 text-purple-200" />
                  </div>
                  <span className="text-purple-200 text-sm font-medium">Total Hosts</span>
                </div>
                <p className="text-5xl font-black text-white">{stats.uniqueHosts}</p>
                <p className="mt-1 text-purple-300 text-xs">communities competing</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-400/30 p-6 shadow-2xl transition-all hover:scale-105 hover:shadow-green-500/50">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green-400/10 blur-2xl group-hover:bg-green-400/20 transition-all" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-full bg-green-500/30 p-2">
                    <TrendingUp className="h-6 w-6 text-green-200" />
                  </div>
                  <span className="text-green-200 text-sm font-medium">Total Raised</span>
                </div>
                <p className="text-5xl font-black text-white">${parseFloat(stats.totalRaised).toLocaleString()}</p>
                <p className="mt-1 text-green-300 text-xs">on-chain</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-sm border border-pink-400/30 p-6 shadow-2xl transition-all hover:scale-105 hover:shadow-pink-500/50">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-pink-400/10 blur-2xl group-hover:bg-pink-400/20 transition-all" />
              <div className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-full bg-pink-500/30 p-2">
                    <Award className="h-6 w-6 text-pink-200" />
                  </div>
                  <span className="text-pink-200 text-sm font-medium">To Charity</span>
                </div>
                <p className="text-5xl font-black text-white">${parseFloat(stats.totalCharity).toLocaleString()}</p>
                <p className="mt-1 text-pink-300 text-xs">making real impact</p>
              </div>
            </div>
          </div>
        )}

        {/* Period & Tab Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Period Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-purple-200">
              <Calendar className="h-5 w-5" />
              <span className="font-medium text-sm">Period:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(periodLabels) as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                    period === p
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-indigo-900 shadow-lg shadow-yellow-500/50'
                      : 'bg-white/10 text-purple-200 hover:bg-white/20 backdrop-blur-sm border border-white/20'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 rounded-xl bg-white/10 p-1 backdrop-blur-sm border border-white/20">
            <button
              onClick={() => setActiveTab('hosts')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'hosts'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-purple-200 hover:bg-white/10'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Top Hosts</span>
            </button>
            <button
              onClick={() => setActiveTab('networks')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                activeTab === 'networks'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-purple-200 hover:bg-white/10'
              }`}
            >
              <Network className="h-4 w-4" />
              <span>Top Networks</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-16 text-center">
            <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-purple-200/30 border-t-yellow-400"></div>
            <p className="text-purple-200 text-lg font-medium">Loading leaderboard...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-6">
            <p className="text-red-200">❌ {error}</p>
          </div>
        )}

        {/* Host Leaderboard */}
        {!loading && !error && activeTab === 'hosts' && (
          <div className="space-y-8">
            {/* Podium - Top 3 */}
            {topThree.length > 0 && (
              <div className="relative">
                <div className="mb-4 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-yellow-400/20 border border-yellow-400/30 px-4 py-2 backdrop-blur-sm">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    <span className="text-yellow-300 text-sm font-semibold">Hall of Champions</span>
                  </div>
                </div>

                <div className="flex items-end justify-center gap-4 md:gap-8">
                  {/* 2nd Place */}
                  {topThree[1] && (
                    <div className="flex flex-col items-center w-32 md:w-40">
                      <div className="relative mb-4 group">
                        <div className={`absolute inset-0 bg-gradient-to-br ${getPodiumStyle(2)} rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                        <div className={`relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-gradient-to-br ${getPodiumStyle(2)} shadow-2xl ring-4 ring-white/20`}>
                          <span className="text-4xl">🥈</span>
                        </div>
                      </div>
                      <div className="mb-2 text-center">
                        <p className="text-white font-bold text-sm md:text-base truncate w-full">{topThree[1].hostName || 'Anonymous'}</p>
                        <p className="text-gray-300 text-xs">{topThree[1].points.toLocaleString()} pts</p>
                      </div>
                      <div className={`w-full ${getPodiumHeight(2)} rounded-t-2xl bg-gradient-to-br ${getPodiumStyle(2)} shadow-2xl flex items-center justify-center border-t-4 border-white/30`}>
                        <span className="text-white text-2xl md:text-4xl font-black">2</span>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {topThree[0] && (
                    <div className="flex flex-col items-center w-36 md:w-48">
                      <div className="relative mb-4 group">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full blur-2xl opacity-75 group-hover:opacity-100 transition-opacity animate-pulse" />
                        <div className="relative flex h-24 w-24 md:h-32 md:w-32 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-2xl ring-4 ring-yellow-300/50">
                          <Crown className="absolute -top-8 h-12 w-12 text-yellow-400 animate-bounce" />
                          <span className="text-5xl">🥇</span>
                        </div>
                      </div>
                      <div className="mb-2 text-center">
                        <p className="text-white font-black text-base md:text-lg truncate w-full">{topThree[0].hostName || 'Anonymous'}</p>
                        <p className="text-yellow-300 text-sm font-semibold">{topThree[0].points.toLocaleString()} pts</p>
                      </div>
                      <div className={`w-full ${getPodiumHeight(1)} rounded-t-2xl bg-gradient-to-br ${getPodiumStyle(1)} shadow-2xl flex items-center justify-center border-t-4 border-yellow-300/50`}>
                        <span className="text-indigo-900 text-3xl md:text-5xl font-black">1</span>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {topThree[2] && (
                    <div className="flex flex-col items-center w-32 md:w-40">
                      <div className="relative mb-4 group">
                        <div className={`absolute inset-0 bg-gradient-to-br ${getPodiumStyle(3)} rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity`} />
                        <div className={`relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-gradient-to-br ${getPodiumStyle(3)} shadow-2xl ring-4 ring-white/20`}>
                          <span className="text-4xl">🥉</span>
                        </div>
                      </div>
                      <div className="mb-2 text-center">
                        <p className="text-white font-bold text-sm md:text-base truncate w-full">{topThree[2].hostName || 'Anonymous'}</p>
                        <p className="text-gray-300 text-xs">{topThree[2].points.toLocaleString()} pts</p>
                      </div>
                      <div className={`w-full ${getPodiumHeight(3)} rounded-t-2xl bg-gradient-to-br ${getPodiumStyle(3)} shadow-2xl flex items-center justify-center border-t-4 border-white/30`}>
                        <span className="text-white text-2xl md:text-4xl font-black">3</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rest of Leaderboard */}
            {restOfLeaderboard.length > 0 && (
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-indigo-600/30 to-purple-600/30 px-6 py-4 border-b border-white/20">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Rising Stars
                  </h3>
                </div>
                <div className="divide-y divide-white/10">
                  {restOfLeaderboard.map((entry) => (
                    <div
                      key={entry.hostWallet}
                      className="group px-6 py-4 transition-all hover:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg">
                            #{entry.rank}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-semibold text-lg truncate group-hover:text-yellow-300 transition-colors">
                              {entry.hostName || 'Anonymous'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-xs text-purple-300 bg-black/20 px-2 py-0.5 rounded">
                                {formatWallet(entry.hostWallet)}
                              </code>
                              <span className="text-xs text-purple-300">·</span>
                              <span className="text-xs text-purple-300">{entry.events} event{entry.events !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-2xl font-black text-yellow-400">
                              {entry.points.toLocaleString()}
                            </p>
                            <p className="text-xs text-purple-300">points</p>
                          </div>
                          <ArrowUp className="h-5 w-5 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hostLeaderboard.length === 0 && (
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-16 text-center">
                <Trophy className="mx-auto h-16 w-16 text-purple-300 mb-4 opacity-50" />
                <p className="text-purple-200 text-lg">No hosts found for this period</p>
                <p className="text-purple-300 text-sm mt-2">Be the first to host a quiz!</p>
              </div>
            )}
          </div>
        )}

        {/* Network Leaderboard */}
        {!loading && !error && activeTab === 'networks' && (
          <div className="space-y-4">
            {networkLeaderboard.length === 0 ? (
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-16 text-center">
                <Network className="mx-auto h-16 w-16 text-purple-300 mb-4 opacity-50" />
                <p className="text-purple-200 text-lg">No networks found for this period</p>
              </div>
            ) : (
              networkLeaderboard.map((entry, index) => (
                <div
                  key={entry.network}
                  className={`group rounded-2xl overflow-hidden transition-all hover:scale-[1.02] ${
                    entry.rank <= 3
                      ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/40 shadow-2xl shadow-yellow-500/20'
                      : 'bg-white/10 border border-white/20'
                  } backdrop-blur-sm`}
                >
                  <div className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-full font-black text-xl shadow-lg ${
                        entry.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-indigo-900' :
                        entry.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                        entry.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white' :
                        'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                      }`}>
                        {entry.rank <= 3 ? (
                          <span className="text-3xl">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          `#${entry.rank}`
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-bold text-xl">
                            {formatNetwork(entry.network)}
                          </p>
                          {entry.rank <= 3 && (
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-purple-300">
                          <span className="capitalize">{entry.chain}</span>
                          <span>·</span>
                          <span>{entry.events} event{entry.events !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-black ${
                        entry.rank <= 3 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {entry.points.toLocaleString()}
                      </p>
                      <p className="text-sm text-purple-300">points</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Scoring Info */}
        <div className="mt-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-400/30 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-blue-400/30 p-3">
              <Zap className="h-6 w-6 text-blue-200" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-xl mb-3">Scoring System</h3>
              <div className="space-y-2 text-purple-100">
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  <span><strong>Standard tokens:</strong> Total Raised × 2 points</span>
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-green-400" />
                  <span><strong className="text-green-300">USDGLO (Glo Dollar):</strong> Total Raised × 2.5 points — <em>bonus for impact!</em></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactCampaignLeaderboard;
