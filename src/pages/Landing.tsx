import { useEffect } from 'react';
// USE SAFE HOOK - No Web3 imports, no zustand store imports!
import { resetGameStateForLanding } from '../hooks/useLandingGameStore';

import { Header } from '../components/GeneralSite/Header';
import HeroSection from '../components/GeneralSite/HeroSection';
import HowItWorks from '../components/GeneralSite/HowItWorks';
import FAQ from '../components/GeneralSite/FAQ';
import Benefit from '../components/GeneralSite/Benefits';
import Hfooter from '../components/GeneralSite/hFooter';
import { SEO } from '../components/SEO';

export function Landing() {
  useEffect(() => {
    // Use the safe reset function
    resetGameStateForLanding();
    
    try {
      // Clean up any additional Web3 storage
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('@appkit/portfolio_cache');
      localStorage.removeItem('lace-wallet-mode');
      localStorage.removeItem('debug');
    } catch (e) {
      console.error('Error cleaning up storage:', e);
    }
  }, []);  // No dependencies needed

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <SEO
        title="Fundraising Platform for Clubs & Charities | FundRaisely"
        description="Empower your club or charity with FundRaisely's innovative fundraising platform. Engage supporters with interactive quiz events, manage campaigns effortlessly, and maximize your fundraising impact."
        
        // Default keywords (for localhost/other domains)
        keywords="fundraising platform, charity fundraising, club events, nonprofit management, campaign management"
        
        // UK-specific keywords
        ukKeywords="fundraising platform UK, charity fundraising software, club events Britain, nonprofit management UK, fundraising tools United Kingdom"
        
        // Ireland-specific keywords  
        ieKeywords="fundraising platform Ireland, charity events Ireland, club fundraising Ireland, nonprofit tools Ireland, community fundraising Ireland"
        
        domainStrategy="geographic"
      />
      
      {/* Keep commented for testing - no impact on performance when commented */}
      {/* <SolanaWalletOperations /> */}
   
      <Header />
      <HeroSection />
      
      {/* Beta Program Invite Section - Reduced height with 2-row subtitle */}
      <div className="container mx-auto mb-2 mt-4 max-w-6xl px-4">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
          <div className="px-8 py-6 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white">
              Fundraising is Changing. Be Part of It.
            </h2>
            <div className="mx-auto mb-5 max-w-2xl space-y-1 text-white/80">
              <p>We're inviting a small number of clubs, charities, and communities to join our early beta.</p>
              <p>Test our fundraising quiz platform with cash, card or bank payments — or join our blockchain pilot to help shape the future of compliant, blockchain-powered fundraising.</p>
            </div>
            <div className="flex justify-center space-x-4">
              <a
                href="https://x.com/Fundraisely"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-muted inline-block rounded-xl px-8 py-3 font-semibold text-indigo-600 shadow-md transition hover:bg-indigo-50"
              >
                DM us on Twitter
              </a>
              {/* Keep commented for testing */}
              {/* <a
                href="mailto:beta@fundraisely.io"
                className="bg-muted text-indigo-600 px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-50 transition inline-block"
              >
                Apply to Join Beta
              </a> */}
            </div>
          </div>
        </div>
      </div>
         
      <HowItWorks />
      <Benefit />
      <FAQ />
      {/* Keep these commented for testing */}
      {/* <FundRaiselyWhereYouSave /> */}
      {/* <CTASection /> */}
      <Hfooter />
    </div>
  );
}



