import { Link } from 'react-router-dom';
import { useState } from 'react';

const SimpleHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (sectionId: string) => {
    // Close mobile menu after clicking
    setIsMobileMenuOpen(false);
    
    // Find the section element
    const section = document.getElementById(sectionId);
    if (section) {
      // Calculate position to scroll to (accounting for fixed header height)
      const headerHeight = 72; // Approximate height of your header in pixels
      const sectionPosition = section.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      
      // Smooth scroll to the section
      window.scrollTo({
        top: sectionPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header className="bg-muted fixed z-10 w-full shadow-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center">
          <Link to="/" className="text-xl font-bold text-indigo-700">Fundraisely</Link>
        </div>
        
        {/* Mobile menu button */}
        <button 
          className="text-fg/80 hover:text-indigo-600 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6">
            <li>
              <Link
                to="/"
                className="text-fg/80 font-medium transition-colors hover:text-indigo-600"
              >
                Home
              </Link>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('about-campaign')}
                className="text-fg/80 font-medium transition-colors hover:text-indigo-600"
              >
                About This Campaign
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('for-hosts')}
                className="text-fg/80 font-medium transition-colors hover:text-indigo-600"
              >
                For Hosts
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('for-players')}
                className="text-fg/80 font-medium transition-colors hover:text-indigo-600"
              >
                For Players
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('about-fundraisely')}
                className="text-fg/80 font-medium transition-colors hover:text-indigo-600"
              >
                About Fundraisely
              </button>
            </li>
            <li>
              <Link
                to="/pitch-deck"
                className="text-fg/80 font-medium transition-colors hover:text-indigo-600"
              >
                Pitch Deck
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="bg-muted border-border border-t py-2 md:hidden">
          <ul className="flex flex-col space-y-2 px-4">
            <li>
              <Link
                to="/"
                className="text-fg/80 block py-2 font-medium transition-colors hover:text-indigo-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('about-campaign')}
                className="text-fg/80 block w-full py-2 text-left font-medium transition-colors hover:text-indigo-600"
              >
                About This Campaign
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('for-hosts')}
                className="text-fg/80 block w-full py-2 text-left font-medium transition-colors hover:text-indigo-600"
              >
                For Hosts
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('for-players')}
                className="text-fg/80 block w-full py-2 text-left font-medium transition-colors hover:text-indigo-600"
              >
                For Players
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection('about-fundraisely')}
                className="text-fg/80 block w-full py-2 text-left font-medium transition-colors hover:text-indigo-600"
              >
                About Fundraisely
              </button>
            </li>
            <li>
              <Link
                to="/pitch-deck"
                className="text-fg/80 block py-2 font-medium transition-colors hover:text-indigo-600"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pitch Deck
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default SimpleHeader;