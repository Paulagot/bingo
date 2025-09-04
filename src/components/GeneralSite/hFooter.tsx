
import type React from 'react';
import { Gamepad2 } from 'lucide-react';

const hFooter: React.FC = () => {
  return (
    <footer className="container mx-auto mt-12 max-w-6xl px-4 pb-8 pt-10">
      <div className="border-border flex flex-col items-center justify-between border-t pt-8 md:flex-row">
        <div className="mb-4 flex items-center gap-2 md:mb-0">
          <Gamepad2 className="h-6 w-6 text-indigo-600" />
          <h1 className="text-fg text-xl font-bold">FundRaisely</h1>
        </div>
        
        <div className="mb-4 flex flex-wrap justify-center gap-x-6 gap-y-2 md:mb-0">
          <a href="#" className="text-fg/70 text-sm transition-colors hover:text-indigo-600">Terms of Service</a>
          <a href="#" className="text-fg/70 text-sm transition-colors hover:text-indigo-600">Privacy Policy</a>
          <a href="#" className="text-fg/70 text-sm transition-colors hover:text-indigo-600">Contact Us</a>
        </div>
        
        <div className="text-fg/60 text-sm">
          © 2025 FundRaisely. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default hFooter;