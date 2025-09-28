import { useEffect, lazy, Suspense } from 'react';
// SAFE hook – no Web3/zustand imports
import { resetGameStateForLanding } from '../hooks/useLandingGameStore';

import { Header } from '../components/GeneralSite/Header';
import HeroPrimary from '../components/GeneralSite2/HeroPrimary';
import { SEO } from '../components/SEO';

// Defer below-the-fold content
const HowItWorks   = lazy(() => import('../components/GeneralSite/HowItWorks'));
// const Benefit      = lazy(() => import('../components/GeneralSite/Benefits'));
const ImpactRibbon = lazy(() => import('../components/GeneralSite2/ImpactRibbon'));
const FAQ          = lazy(() => import('../components/GeneralSite/FAQ'));
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
        title="Quiz Fundraisers for Clubs & Charities | FundRaisely"
        description="Empower your club or charity with FundRaisely's innovative fundraising platform. Engage supporters with interactive quiz events, manage campaigns effortlessly, and maximize your fundraising impact."
        keywords="fundraising platform, charity fundraising, club events, nonprofit management, Fundraising Quiz "
        ukKeywords="fundraising quiz platform UK, charity fundraising quiz software, club events Britain, nonprofit management UK, fundraising tools United Kingdom"
        ieKeywords="fundraising qiuz Ireland, charity events Ireland, club fundraising Ireland, nonprofit tools Ireland, community fundraising Ireland"
        domainStrategy="geographic"
        // Optional: page-level JSON-LD for WebPage
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'FundRaisely — Quiz Fundraisers for Clubs & Charities',
          description:
            "Empower your club or charity with interactive quiz events optimized to raise more than a tradational fundraising quiz event.",
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




