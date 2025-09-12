import { useEffect } from 'react';
// USE SAFE HOOK - No Web3 imports, no zustand store imports!
import { resetGameStateForLanding } from '../hooks/useLandingGameStore';

import { Header } from '../components/GeneralSite/Header';
import HeroSection from '../components/GeneralSite/HeroSection';
import HowItWorks from '../components/GeneralSite/HowItWorks';
import FAQ from '../components/GeneralSite/FAQ';
import Benefit from '../components/GeneralSite/Benefits';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import ImpactRibbon from '../components/GeneralSite2/ImpactRibbon';
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
      
      <ImpactRibbon />   
      <HowItWorks />
      <Benefit />
      <FAQ />
      {/* Keep these commented for testing */}
      {/* <FundRaiselyWhereYouSave /> */}
      {/* <CTASection /> */}
      <SiteFooter />
    </div>
  );
}



