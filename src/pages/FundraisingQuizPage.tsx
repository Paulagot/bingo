import { useState, useRef, useEffect } from 'react';
import QuizWizard from '../components/Quiz/Wizard/QuizWizard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';

// ✅ Debug toggle - set to false for production
const DEBUG = false;

const debugLog = (source: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`🐛 [${source}] ${message}`, data ? data : '');
  }
};

/** ────────────────────────────────────────────────────────────────────────────
 * YouTube embed (privacy-enhanced, CLS-safe, lazy)
 * Accepts either a full YouTube URL or just the 11-char ID
 * ─────────────────────────────────────────────────────────────────────────── */
type YouTubeBlockProps = {
  title: string;
  youtubeUrlOrId: string;
  className?: string;
};
const YouTubeBlock: React.FC<YouTubeBlockProps> = ({ title, youtubeUrlOrId, className }) => {
  const idMatch = youtubeUrlOrId.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  const id = idMatch ? idMatch[1] : youtubeUrlOrId; // assume raw ID if not matched
  const embed = `https://www.youtube-nocookie.com/embed/${id}`;
  const poster = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className={`relative w-full ${className ?? ''}`}>
      {/* Maintain 16:9 ratio to prevent layout shift */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          title={title}
          loading="lazy"
          src={`${embed}?rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full rounded-2xl"
        />
      </div>
      {/* Noscript fallback for SEO + no-JS */}
      <noscript>
        <a href={`https://www.youtube.com/watch?v=${id}`} aria-label={title}>
          <img src={poster} alt={title} className="h-full w-full object-contain" />
        </a>
      </noscript>
    </div>
  );
};

/** Replace these with your real YouTube IDs or full URLs */
const SETUP_VIDEO_ID = '10xGLZNTmMQ';      // e.g. 'AbCdEfGhIJK'
const DASHBOARD_VIDEO_ID = 'DASHBOARD1D_';
const INGAME_VIDEO_ID = 'INGAMEVID01_';
const REPORTING_VIDEO_ID = 'REPORTING01_';

const FundraisingQuizPage = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [fullscreenGif, setFullscreenGif] = useState<'setup' | 'dashboard' | 'ingame' | 'reporting' | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  debugLog('FundraisingQuizPage', `Render #${renderCountRef.current}`, { showWizard });

  const handleWizardComplete = () => {
    debugLog('FundraisingQuizPage', 'handleWizardComplete called');
    setShowWizard(false);
    navigate('/quiz/dashboard');
  };

  useEffect(() => {
    debugLog('FundraisingQuizPage', 'State changed', { showWizard });
  }, [showWizard]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openWizard') && isAuthenticated) {
      setShowWizard(true);
      navigate('/quiz');
    }
  }, [isAuthenticated, navigate]);

  const handleStartClick = () => {
    debugLog('FundraisingQuizPage', 'Host quiz button clicked');

    if (isAuthenticated) {
      setShowWizard(true);
      return;
    }

    const returnTo = encodeURIComponent('/quiz?openWizard=1');
    navigate(`/auth?returnTo=${returnTo}`);
  };

  useEffect(() => {
    debugLog('FundraisingQuizPage', 'State changed', { showWizard, isAuthenticated });
  }, [showWizard, isAuthenticated]);

  return (
    <div className={showWizard ? '' : 'mx-auto max-w-7xl p-8'}>
      {!showWizard && (
        <div className="space-y-16">
          {/* Row 1: Hero */}
          <div className="text-center space-y-6 py-8">
            <div className="inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700">
              ⚡ Quick Setup
            </div>

            <h1 className="text-5xl font-bold leading-tight">
              Launch Your Fundraising Quiz in{' '}
              <span className="text-indigo-600">4 Simple Steps</span>
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Create a professional quiz night in under 1 minute. Perfect for clubs, charities, and community organizations.
            </p>

            <div className="pt-4">
              <button
                className="group relative overflow-hidden rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl"
                onClick={handleStartClick}
              >
                <span className="relative z-10 flex items-center gap-2">
                  🎤 Start Creating Your Quiz
                  <svg
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>

              <p className="mt-3 text-sm text-gray-500">No credit card required • Free to get started</p>
            </div>
          </div>

          {/* Row 2: Setup Wizard */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Setup Wizard</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-lg">Set Basic Details</h3>
                    <p className="text-gray-600">Add your name and quiz entry fee</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-lg">Configure Rounds</h3>
                    <p className="text-gray-600">Select a preconfigured quiz</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-lg">Select Fundraising Extras</h3>
                    <p className="text-gray-600">Boost your fundraising and increase game excitement and fun</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-lg">Add Prizes and Sponsors</h3>
                    <p className="text-gray-600">Add up to 10 prizes and highlight sponsors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Setup Video (YouTube) */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-2xl max-h-[700px] group">
                <YouTubeBlock
                  title="Quiz setup walkthrough - 4 easy steps"
                  youtubeUrlOrId={SETUP_VIDEO_ID}
                  className="h-full w-full"
                />

                <button
                  onClick={() => setFullscreenGif('setup')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>

              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-yellow-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-indigo-400 opacity-20 blur-2xl"></div>
            </div>
          </div>

          {/* Row 3: Dashboard View */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Dashboard Video (YouTube) */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 shadow-2xl max-h-[700px] group">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                  <YouTubeBlock
                    title="Quiz dashboard overview"
                    youtubeUrlOrId={DASHBOARD_VIDEO_ID}
                    className="h-full w-full"
                  />
                </div>

                <button
                  onClick={() => setFullscreenGif('dashboard')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>

              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-purple-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-pink-400 opacity-20 blur-2xl"></div>
            </div>

            {/* Right: Dashboard Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Dashboard View</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-lg">Overview Tab</h3>
                    <p className="text-gray-600">Displays the quiz setting from the setup wizard</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-lg">Admin Panel</h3>
                    <p className="text-gray-600">Add admins to help with the event. They can collect payment and add players. Share the QR code or link for them to join your quiz room.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-lg">Player Panel</h3>
                    <p className="text-gray-600">Add players, upsell extras for excitement and funding, choose payment method, and mark as paid. Share a unique QR code or link so they can join.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-lg">Payments panel</h3>
                    <p className="text-gray-600">Track fundraising totals. Reconciliations are locked until game ends.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-semibold text-lg">Launch</h3>
                    <p className="text-gray-600">When all players have joined, launch the game</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: In-Game View */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">In-Game View - Host</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-lg">Between Round Screens</h3>
                    <p className="text-gray-600">At the start of each quiz and before each round, the host sees round info like question count and points.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-lg">Asking Phase</h3>
                    <p className="text-gray-600">Questions auto-advance after timer ends. Host reads questions for wipeout/general; Speed round shows a live stats board.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-lg">Round Review Phase</h3>
                    <p className="text-gray-600">Review each question and show round leaderboard.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-lg">Player Activity Notifications</h3>
                    <p className="text-gray-600">Extras like Restore/Steal points show as notifications.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-semibold text-lg">Tie-Breaker</h3>
                    <p className="text-gray-600">Automatically detected and scored — host initiates when needed.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">6</div>
                  <div>
                    <h3 className="font-semibold text-lg">Leaderboard</h3>
                    <p className="text-gray-600">Round and overall leaderboards reveal top players.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">7</div>
                  <div>
                    <h3 className="font-semibold text-lg">Game End</h3>
                    <p className="text-gray-600">Wrap with fun, detailed quiz stats.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: In-Game Video (YouTube) */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-2xl max-h-[700px] group">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                  <YouTubeBlock
                    title="In-game player/host view demo"
                    youtubeUrlOrId={INGAME_VIDEO_ID}
                    className="h-full w-full"
                  />
                </div>

                <button
                  onClick={() => setFullscreenGif('ingame')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>

              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-emerald-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-teal-400 opacity-20 blur-2xl"></div>
            </div>
          </div>

          {/* Row 5: End of Game Reporting */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Reporting Video (YouTube) */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-2xl max-h-[700px] group">
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                  <YouTubeBlock
                    title="End of game reporting and analytics"
                    youtubeUrlOrId={REPORTING_VIDEO_ID}
                    className="h-full w-full"
                  />
                </div>

                <button
                  onClick={() => setFullscreenGif('reporting')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>

              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-amber-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-orange-400 opacity-20 blur-2xl"></div>
            </div>

            {/* Right: Reporting Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">End of Game Reporting</h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">1</div>
                  <div>
                    <h3 className="font-semibold text-lg">Final Results & Winners</h3>
                    <p className="text-gray-600">View complete leaderboard and announce prize winners</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">2</div>
                  <div>
                    <h3 className="font-semibold text-lg">Fundraising Summary</h3>
                    <p className="text-gray-600">See total funds raised, breakdown by source, and payment status</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">3</div>
                  <div>
                    <h3 className="font-semibold text-lg">Financial Reconciliation</h3>
                    <p className="text-gray-600">Add adjustments like refunds or fees — your treasurer’s best friend.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">4</div>
                  <div>
                    <h3 className="font-semibold text-lg">Engagement Analytics</h3>
                    <p className="text-gray-600">Review participation stats, round performance, and team insights</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">5</div>
                  <div>
                    <h3 className="font-semibold text-lg">Export Audit Ready Reports</h3>
                    <p className="text-gray-600">Own your data. Download and share results with stakeholders.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Fullscreen Modal (YouTube) */}
      {fullscreenGif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setFullscreenGif(null)}
        >
          <button
            onClick={() => setFullscreenGif(null)}
            className="absolute top-4 right-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close fullscreen"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="max-h-[90vh] max-w-[90vw] w-full" onClick={(e) => e.stopPropagation()}>
            {fullscreenGif === 'setup' && (
              <YouTubeBlock title="Quiz setup walkthrough - fullscreen" youtubeUrlOrId={SETUP_VIDEO_ID} />
            )}
            {fullscreenGif === 'dashboard' && (
              <YouTubeBlock title="Dashboard overview - fullscreen" youtubeUrlOrId={DASHBOARD_VIDEO_ID} />
            )}
            {fullscreenGif === 'ingame' && (
              <YouTubeBlock title="In-game view - fullscreen" youtubeUrlOrId={INGAME_VIDEO_ID} />
            )}
            {fullscreenGif === 'reporting' && (
              <YouTubeBlock title="End-of-game reporting - fullscreen" youtubeUrlOrId={REPORTING_VIDEO_ID} />
            )}
          </div>
        </div>
      )}

      {/* Debug info */}
      {DEBUG && (
        <div className="fixed right-4 top-4 z-50 max-w-xs rounded bg-black p-2 font-mono text-xs text-white">
          <div>Host Page Render: #{renderCountRef.current}</div>
          <div>Wizard: {showWizard ? 'open' : 'closed'}</div>
        </div>
      )}

      {/* Quiz Wizard */}
      {showWizard && <QuizWizard onComplete={handleWizardComplete} />}
    </div>
  );
};

export default FundraisingQuizPage;
