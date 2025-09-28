import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Sparkles,  Check, QrCode, PlayCircle } from 'lucide-react';

function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) { const p = path.startsWith('/') ? path : `/${path}`; return `${getOrigin()}${p}`; }

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3"><Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" /><span className="text-indigo-900/80">{children}</span></li>
);

const UsecaseCommunityGroupsPage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Community Groups', item: abs('/quiz/use-cases/community-groups') },
    ],
  };
  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Can small groups run this easily?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. Share a link or QR; players join on mobile. Setup is guided via a 4-step wizard.' } },
      { '@type': 'Question', name: 'How do we record payments?', acceptedAnswer: { '@type': 'Answer', text: 'Collect cash or instant links; admins mark paid + method. Reconciliation then updates automatically and exports audit-ready.' } },
      { '@type': 'Question', name: 'What capacity is in the free trial?', acceptedAnswer: { '@type': 'Answer', text: 'Up to 20 connected devices; upgrade options will expand capacity and admin seats.' } },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Use Case — Community Groups | FundRaisely Fundraising Quiz"
        description="Bring people together and fund local projects with an easy in-person quiz night. Automatic reconciliation once paid is marked."
        keywords="community quiz fundraiser, parish quiz, local group fundraising quiz"
        domainStrategy="geographic"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <Header />

      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Community Groups
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">Community Quiz Fundraisers</h1>
          <p className="mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Simple, social, and effective for local causes. Players join by link or <span className="inline-flex items-center gap-1"><QrCode className="h-4 w-4" /> QR</span>; you collect payments, mark paid + method, and export audit-ready reconciliation.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">Start Free Trial</a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2"><PlayCircle className="h-5 w-5" /> Watch the Demo</a>
          </div>
        </div>
      </section>

      <section className="px-4 pt-6 pb-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
            <h2 className="text-indigo-900 text-2xl font-bold">Why community groups use it</h2>
            <ul className="mt-3 grid gap-2 md:grid-cols-2">
              <Bullet>Easy setup with templates or custom rounds</Bullet>
              <Bullet>Mobile play; live scoring & leaderboards</Bullet>
              <Bullet>Collect cash or instant links; mark paid + method</Bullet>
              <Bullet>Auto reconciliation & exportable reports</Bullet>
            </ul>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UsecaseCommunityGroupsPage;
