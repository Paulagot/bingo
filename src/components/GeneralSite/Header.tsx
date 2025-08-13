import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Users, Gamepad2, Menu, X } from 'lucide-react';
// TEMPORARILY COMMENT OUT WEB3 IMPORTS FOR PERFORMANCE
// import { useGameStore } from '../bingo/store/gameStore';
import { useState } from 'react';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  // TEMPORARILY COMMENT OUT FOR PERFORMANCE - Web3 features disabled
  // const { players } = useGameStore();
  const players: any[] = []; // Temporary placeholder
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isGamePage = location.pathname.startsWith('/game/');
  const roomId = isGamePage ? location.pathname.split('/').pop() : '';

  const handleBack = () => {
    if (isGamePage) {
      if (window.confirm('Are you sure you want to leave the game? All progress will be lost.')) {
        navigate('/');
      }
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm shadow-sm z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {isGamePage ? (
          <>
            {/* Game Page Header */}
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors"
              aria-label="Leave game"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline font-medium">Leave Game</span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Player Count */}
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-indigo-100 rounded-full text-xs sm:text-sm">
                <Users size={14} className="text-indigo-600 sm:size-4" />
                <span className="text-indigo-800 font-medium">{players.length}</span>
              </div>

              {/* Room ID */}
              <div className="px-2 sm:px-3 py-1.5 bg-green-100 rounded-full">
                <span className="text-xs sm:text-sm text-green-800 font-medium">
                  <span className="hidden xs:inline">Room: </span>{roomId}
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Non-Game Page Header */}
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent">
                  FundRaisely
                </h1>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              {/* TEMPORARILY DISABLED - Web3 features under optimization */}
              <span className="text-sm font-medium text-gray-400 line-through">
                Web3 Impact Event (Coming Soon)
              </span>

              <Link
                to="/whats-new"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Inside FundRaisely
              </Link>

              <Link
                to="/quiz"
                className="text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
              >
                Quiz Platform
              </Link>
            </div>

            {/* Mobile Menu Button - FIXED: Added proper accessibility attributes */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-indigo-600 transition-colors"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Mobile Menu Dropdown - FIXED: Added proper ARIA attributes */}
            {mobileMenuOpen && (
              <div 
                className="absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-lg border-t border-gray-200 md:hidden"
                id="mobile-menu"
                role="navigation"
                aria-label="Mobile navigation menu"
              >
                <div className="container mx-auto px-4 py-4 space-y-3">
                  {/* TEMPORARILY DISABLED - Web3 features under optimization */}
                  <span className="block text-sm font-medium text-gray-400 line-through py-2">
                    Web3 Impact Event (Coming Soon)
                  </span>

                  <Link
                    to="/whats-new"
                    className="block text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Inside FundRaisely
                  </Link>

                  <Link
                    to="/quiz"
                    className="block text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors py-2"
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

