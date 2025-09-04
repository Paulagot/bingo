import React from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

const Headers: React.FC = () => {
  return (
    <header className="bg-muted/90 fixed left-0 right-0 top-0 z-50 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-6 w-6 text-indigo-600" />
          <h1 className="bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-xl font-bold text-transparent">FundRaisely</h1>
        </div>
        <div className="flex items-center gap-4">
          <a href="#how-it-works" className="text-fg/70 text-sm font-medium transition-colors hover:text-indigo-600">How It Works</a>
          <a href="#benefits" className="text-fg/70 text-sm font-medium transition-colors hover:text-indigo-600">Benefits</a>
          <a href="#faq" className="text-fg/70 text-sm font-medium transition-colors hover:text-indigo-600">FAQ</a>
          {/* <Link to="/pitch-deck" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Pitch Deck</Link> */}
          <Link to="/whats-new" className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-800">Whats New</Link>
          {/* <Link to="/partners" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">Partners</Link> */}
        </div>
      </div>
    </header>
  );
};

export default Headers;
