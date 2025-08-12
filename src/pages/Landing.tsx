import { useEffect } from 'react';
import { useGameStore } from '../components/bingo/store/gameStore';
import { clearAllRoomData } from '../components/bingo/utils/localStorageUtils';
import { Header } from '../components/GeneralSite/Header';
import HeroSection from '../components/GeneralSite/HeroSection';
import HowItWorks from '../components/GeneralSite/HowItWorks';
import FAQ from '../components/GeneralSite/FAQ';
import Benefit from '../components/GeneralSite/Benefits';
import Hfooter from '../components/GeneralSite/hFooter';
import { SEO } from '../components/SEO';

// Keep your commented imports for testing - they won't affect bundle size when commented
// import SolanaWalletOperations from '../components/SolanaWalletOperations';

export function Landing() {
  const { resetGameState } = useGameStore((state) => ({
    resetGameState: state.resetGameState,
  }));
  
  useEffect(() => {
    resetGameState();
    clearAllRoomData();
    
    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('@appkit/portfolio_cache');
      localStorage.removeItem('lace-wallet-mode');
      localStorage.removeItem('debug');
    } catch (e) {
      console.error('Error cleaning up storage:', e);
    }
  }, [resetGameState]);

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
      <div className="container mx-auto px-4 max-w-6xl mt-4 mb-2">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-8 py-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-3">
              Fundraising is Changing. Be Part of It.
            </h2>
            <div className="text-white/80 max-w-2xl mx-auto mb-5 space-y-1">
              <p>We're inviting a small number of clubs, charities, and communities to join our early beta.</p>
              <p>Test our fundraising quiz platform with cash, card or bank payments — or join our blockchain pilot to help shape the future of compliant, blockchain-powered fundraising.</p>
            </div>
            <div className="flex justify-center space-x-4">
              <a
                href="https://x.com/Fundraisely"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-50 transition inline-block"
              >
                DM us on Twitter
              </a>
              {/* Keep commented for testing */}
              {/* <a
                href="mailto:beta@fundraisely.io"
                className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-50 transition inline-block"
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



