import { useEffect, lazy, Suspense } from 'react';
// SAFE hook – no Web3/zustand imports
import { resetGameStateForLanding } from '../hooks/useLandingGameStore';

import { Header } from '../components/GeneralSite2/Header';
import HeroPrimary from '../components/GeneralSite2/HeroPrimary';
import { SEO } from '../components/SEO';

// Defer below-the-fold content
const HowItWorks   = lazy(() => import('../components/GeneralSite2/HowitWorks'));
// const Benefit      = lazy(() => import('../components/GeneralSite/Benefits'));
const ImpactRibbon = lazy(() => import('../components/GeneralSite2/ImpactRibbon'));
const FAQ          = lazy(() => import('../components/GeneralSite2/FAQ'));
const FinalCTA     = lazy(() => import('../components/GeneralSite2/FinalCTA'));
const SiteFooter   = lazy(() => import('../components/GeneralSite2/SiteFooter'));
const FeaturesHighlightGrid = lazy(() => import('../components/GeneralSite2/FeaturesHighlightGrid'));
const UseCasesTriptych = lazy(() => import('../components/GeneralSite2/UseCasesTriptych'));
const TestimonialsStrip = lazy(() => import('../components/GeneralSite2/TestimonialsStrip'));

export function Landing() {
  useEffect(() => {
    resetGameStateForLanding();
    try {
      localStorage.removeItem('wagmi.store');
      localStorage.removeItem('@appkit/portfolio_cache');
      localStorage.removeItem('lace-wallet-mode');
      localStorage.removeItem('debug');
    } catch (e) {
      console.error('Error cleaning up storage:', e);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <SEO
        title="Transform Your Fundraising: Innovative Quiz Events for Charities, Schools & Clubs | FundRaisely"        description="Unlock the full potential of your cause with FundRaisely. Our innovative platform transforms fundraising for clubs, charities, and schools through engaging, easy-to-manage quiz events, ensuring maximum impact and effortless campaign success."
        keywords="fundraising platform, charity fundraising, club events, nonprofit management, Fundraising Quiz, transformative fundraising, innovative quiz solutions, community empowerment"
        ukKeywords="fundraising quiz platform UK, charity fundraising quiz software, club events Britain, nonprofit management UK, fundraising tools United Kingdom"
        ieKeywords="fundraising quiz Ireland, charity events Ireland, club fundraising Ireland, nonprofit tools Ireland, community fundraising Ireland"
        domainStrategy="geographic"
        // Optional: page-level JSON-LD for WebPage
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'FundRaisely — The Transformative Platform for Fundraising Quiz Events',
          description:
            "Experience the magic of effortless fundraising. FundRaisely empowers your club or charity with interactive quiz events, turning traditional challenges into opportunities for unprecedented community engagement and financial growth.",
          isPartOf: { '@type': 'WebSite', name: 'FundRaisely' }
        }}
      />

      <header>
        <Header />
      </header>

      <main id="main-content" className="pb-20">
        {/* Ensure HeroPrimary contains a single <h1> for the page */}
        <HeroPrimary />

        <Suspense fallback={null}>
          <HowItWorks />
          <FeaturesHighlightGrid />
         
          <ImpactRibbon />
          <UseCasesTriptych />
          <TestimonialsStrip />
          {/* <Benefit /> */}
           <FAQ />
          <FinalCTA />
        </Suspense>
      </main>

      <footer>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </footer>
    </div>
   );
}









