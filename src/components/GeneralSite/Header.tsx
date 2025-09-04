import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad2, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isGamePage = location.pathname.startsWith('/game/');
  const roomId = isGamePage ? location.pathname.split('/').pop() : '';

  // For game pages, we'll conditionally load the players count
  const [players, setPlayers] = useState<any[]>([]);

  // Lazy load game store only on game pages
  useEffect(() => {
    if (isGamePage) {
      import('../bingo/store/gameStore').then(({ useGameStore }) => {
        // Get initial state
        setPlayers(useGameStore.getState().players);
        
        // Subscribe to store changes
        const unsubscribe = useGameStore.subscribe((state: any) => {
          setPlayers(state.players);
        });
        
        return unsubscribe;
      }).catch((error) => {
        console.error('Failed to load game store:', error);
        setPlayers([]); // Fallback to empty array
      });
    } else {
      setPlayers([]); // Reset players when not on game page
    }
  }, [isGamePage]);

  const handleBack = () => {
    if (isGamePage) {
      if (window.confirm('Are you sure you want to leave the game? All progress will be lost.')) {
        navigate('/');
      }
    }
  };

  return (
    <header className="bg-muted/90 fixed left-0 right-0 top-0 z-50 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {isGamePage ? (
          <>
            {/* Game Page Header */}
            <button
              type="button"
              onClick={handleBack}
              className="text-fg/70 flex items-center gap-2 transition-colors hover:text-indigo-600"
              aria-label="Leave game"
            >
              <ArrowLeft size={20} />
              <span className="hidden font-medium sm:inline">Leave Game</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Player Count */}
              <div className="flex items-center gap-1.5 rounded-full bg-indigo-100 px-2 py-1.5 text-xs sm:px-3 sm:text-sm">
                <Users size={14} className="text-indigo-600 sm:size-4" />
                <span className="font-medium text-indigo-800">{players.length}</span>
              </div>

              {/* Room ID */}
              <div className="rounded-full bg-green-100 px-2 py-1.5 sm:px-3">
                <span className="text-xs font-medium text-green-800 sm:text-sm">
                  <span className="xs:inline hidden">Room: </span>{roomId}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Non-Game Page Header */}
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6" />
                <h1 className="bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
                  FundRaisely
                </h1>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden items-center gap-4 md:flex">
              <Link
                to="/Web3-Impact-Event"
                className="text-sm font-medium text-pink-600 transition-colors hover:text-pink-800"
              >
                Join the Web3 Impact Event 🚀
              </Link>

              <Link
                to="/whats-new"
                className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
              >
                Inside FundRaisely
              </Link>

              <Link
                to="/quiz"
                className="text-sm font-medium text-purple-600 transition-colors hover:text-purple-800"
              >
                Quiz Platform
              </Link>
            </div>

            {/* Mobile Menu Button - FIXED: Added proper accessibility attributes */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-fg/70 p-2 transition-colors hover:text-indigo-600 md:hidden"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div 
                className="bg-muted/95 border-border absolute left-0 right-0 top-16 border-t shadow-lg backdrop-blur-sm md:hidden"
                id="mobile-menu"
                role="navigation"
                aria-label="Mobile navigation menu"
              >
                <div className="container mx-auto space-y-3 px-4 py-4">
                  <Link
                    to="/Web3-Impact-Event"
                    className="block py-2 text-sm font-medium text-pink-600 transition-colors hover:text-pink-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Join the Web3 Impact Event 🚀
                  </Link>

                  <Link
                    to="/whats-new"
                    className="block py-2 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inside FundRaisely
                  </Link>

                  <Link
                    to="/quiz"
                    className="block py-2 text-sm font-medium text-purple-600 transition-colors hover:text-purple-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Quiz Platform
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

