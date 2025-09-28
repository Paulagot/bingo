// src/pages/usecases/UsecaseSchoolPage.tsx

import type React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite/Header';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';
import { Sparkles, Check, QrCode, CreditCard, FileText, PlayCircle, Users, Shield, BookOpen, Heart } from 'lucide-react';

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

const UsecaseSchoolPage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
      { '@type': 'ListItem', position: 3, name: 'Schools & PTAs', item: abs('/quiz/use-cases/schools') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'School & PTA Fundraising Quizzes | Easy & Engaging Events | FundRaisely',
    description: 'Discover how FundRaisely helps schools and PTAs raise money with fun, interactive quiz nights. Easy setup, maximum engagement, and great results for your educational cause.',
    url: abs('/quiz/use-cases/schools'),
    mainEntity: {
      '@type': 'Organization',
      name: 'FundRaisely',
      url: abs('/'),
    },
    about: {
      '@type': 'Thing',
      name: 'School Fundraising Quiz',
      description: 'Interactive fundraising quiz platform designed specifically for schools and PTAs to raise funds through engaging quiz nights.',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      { 
        '@type': 'Question', 
        name: 'How can we ensure child-friendly content in our school fundraising quiz?', 
        acceptedAnswer: { 
          '@type': 'Answer', 
          text: 'FundRaisely offers pre-loaded General Trivia rounds that are family-friendly, plus we\`re developing tailored content packs specifically for schools. You can also customize rounds to match your audience age range, ensuring appropriate content for all participants.' 
        } 
      },
      { 
        '@type': 'Question', 
        name: 'Is it easy for PTA volunteers to manage a fundraising quiz event?', 
        acceptedAnswer: { 
          '@type': 'Answer', 
          text: 'Absolutely! Our 4-step setup wizard makes it simple for volunteers with no technical skills. The clear role separation (Host runs the quiz, Admin helps with payments and player management) means multiple volunteers can collaborate easily, reducing pressure on any single person.' 
        } 
      },
      { 
        '@type': 'Question', 
        name: 'How do we handle ticket sales and payments for school quiz events?', 
        acceptedAnswer: { 
          '@type': 'Answer', 
          text: 'FundRaisely supports real-world school fundraising. Collect cash at the door or share instant payment links (like Revolut). Admins simply mark who has paid and the payment method, and our reconciliation system automatically tracks everything with exportable reports perfect for school committees.' 
        } 
      },
      { 
        '@type': 'Question', 
        name: 'What about data privacy for students and families?', 
        acceptedAnswer: { 
          '@type': 'Answer', 
          text: 'We take data privacy seriously, especially for school events. Players join with just their name and team - no personal data collection required. All payment tracking is done by your volunteers, and we provide secure, professional reporting for your school records.' 
        } 
      },
      { 
        '@type': 'Question', 
        name: 'How big can our school quiz fundraiser be on the free trial?', 
        acceptedAnswer: { 
          '@type': 'Answer', 
          text: 'The free trial supports up to 20 connected player devices, perfect for testing with a smaller group or running a classroom-sized event. For larger school-wide fundraisers, our upgrade options expand capacity and add more admin seats for your volunteer team.' 
        } 
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="School & PTA Fundraising Quizzes | Easy & Engaging Events | FundRaisely"
        description="Discover how FundRaisely helps schools and PTAs raise money with fun, interactive quiz nights. Easy setup, maximum engagement, and great results for your educational cause."
        keywords="school fundraising quiz, PTA quiz fundraiser, school trivia night, fundraising ideas for schools, school event quiz, easy school fundraiser, virtual school quiz, PTA event planning, school community quiz, fundraising for education"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd]}
      />

      <Header />

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Schools & PTAs
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Boost School Funds with Engaging Fundraising Quizzes
          </h1>
          <p className="mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            Organize a fun and profitable school fundraising quiz with FundRaisely. Our platform makes it easy for PTAs and school staff to host interactive quiz nights that bring the community together and raise vital funds for your school. With features designed for ease of use and maximum engagement, you can run a successful quiz fundraiser with minimal effort.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
              Run a Free Trial Quiz
            </a>
            <a href="/pricing" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50">
              See Pricing
            </a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2">
              <PlayCircle className="h-5 w-5" /> Watch Demo
            </a>
          </div>
        </div>
      </section>

      {/* Why FundRaisely is Perfect for Your School Fundraiser */}
      <section className="px-4 pt-6 pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
            <h2 className="text-indigo-900 text-3xl font-bold mb-6">Why FundRaisely is the Perfect Quiz Fundraiser for Your School</h2>
            
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-indigo-900 text-xl font-semibold">Easy for Volunteers</h3>
                </div>
                <p className="text-indigo-900/70">
                  Our simple 4-step setup wizard means any PTA volunteer can create a professional quiz fundraiser without technical skills. 
                  Clear role separation lets multiple volunteers collaborate - the Host runs the quiz while Admins help with player management and payment tracking.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Heart className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-indigo-900 text-xl font-semibold">Builds School Community</h3>
                </div>
                <p className="text-indigo-900/70">
                  Bring together students, parents, teachers, and local businesses in fun, family-friendly quiz nights. 
                  Interactive gameplay with real-time leaderboards keeps everyone engaged while strengthening your school community bonds.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-indigo-900 text-xl font-semibold">Maximizes Fundraising</h3>
                </div>
                <p className="text-indigo-900/70">
                  Beyond entry fees, our unique Fundraising Extras (Freeze, Clue, Robin Hood, Restore Points) encourage additional spending during gameplay. 
                  Flexible payment options support cash collection and instant links like Revolut for modern school fundraising.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-indigo-900 text-xl font-semibold">Child-Friendly & Safe</h3>
                </div>
                <p className="text-indigo-900/70">
                  Pre-loaded family-friendly content with plans for school-specific question packs. 
                  Minimal data collection (just names and teams) ensures student privacy, while secure payment tracking gives school committees full transparency.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <QrCode className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-indigo-900 text-xl font-semibold">No App Downloads</h3>
                </div>
                <p className="text-indigo-900/70">
                  Students and parents join instantly via QR code or link, playing directly in their smartphone browser. 
                  No app installations mean no technical barriers for families, ensuring maximum participation in your school quiz fundraiser.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-indigo-600" />
                  <h3 className="text-indigo-900 text-xl font-semibold">Professional Reporting</h3>
                </div>
                <p className="text-indigo-900/70">
                  Automatic income reconciliation compares expected vs received funds with exportable reports perfect for school committees. 
                  Track entry fees, fundraising extras, and sponsor contributions with complete transparency and accountability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How a FundRaisely Quiz Night Works for Your School */}
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-indigo-900 text-3xl font-bold mb-8">How a FundRaisely Quiz Night Works for Your School</h2>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">1</div>
                <h3 className="text-indigo-900 text-lg font-semibold">Easy Setup</h3>
              </div>
              <ul className="space-y-3">
                <Bullet>4-step wizard guides you through setup</Bullet>
                <Bullet>Choose from family-friendly templates or customize rounds</Bullet>
                <Bullet>Set entry fees and select fundraising extras</Bullet>
                <Bullet>Add up to 10 prizes with sponsor recognition</Bullet>
              </ul>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">2</div>
                <h3 className="text-indigo-900 text-lg font-semibold">Invite & Join</h3>
              </div>
              <ul className="space-y-3">
                <Bullet>Share unique QR code or join link with families</Bullet>
                <Bullet>Students and parents join teams instantly</Bullet>
                <Bullet>Mobile play on any smartphone or tablet</Bullet>
                <Bullet>Admins can manually add teams and manage capacity</Bullet>
              </ul>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">3</div>
                <h3 className="text-indigo-900 text-lg font-semibold">Collect & Track</h3>
              </div>
              <ul className="space-y-3">
                <Bullet>Accept cash payments at the door</Bullet>
                <Bullet>Share instant payment links (Revolut, etc.)</Bullet>
                <Bullet>Admins mark payment status and method</Bullet>
                <Bullet>Real-time reconciliation tracks all income</Bullet>
              </ul>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">4</div>
                <h3 className="text-indigo-900 text-lg font-semibold">Play & Report</h3>
              </div>
              <ul className="space-y-3">
                <Bullet>Live scoring and leaderboards keep energy high</Bullet>
                <Bullet>Fundraising extras boost engagement and income</Bullet>
                <Bullet>Announce winners and celebrate fundraising success</Bullet>
                <Bullet>Export professional reports for school committees</Bullet>
              </ul>
            </div>
          </div>
        </div>
      </section>

            {/* Success Stories Section (New Section) */}
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-center text-indigo-900 text-3xl font-bold mb-8">Inspiring Success: Schools & PTAs Thriving with FundRaisely</h2>
          <p className="text-center max-w-3xl mx-auto text-indigo-900/70 text-lg mb-10">
            Join a growing community of schools and PTAs across the UK and Ireland who have transformed their fundraising efforts with FundRaisely. Hear how our platform has helped them raise significant funds, build stronger communities, and create unforgettable quiz night experiences.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">"Our PTA Quiz Night Raised Over £1,500!"</h3>
              <p className="text-indigo-900/70 italic mb-4">
                "FundRaisely made organizing our annual school quiz fundraiser incredibly easy. We raised over £1,500 for new playground equipment, and everyone had a fantastic time. The platform was so intuitive, even for our less tech-savvy volunteers!" - Sarah J., PTA Chair, St. Michael's Primary School
              </p>
              <div className="flex items-center gap-2 text-indigo-600">
                <BookOpen className="h-5 w-5" /> Read More Success Stories
              </div>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">"Engaging & Safe: Perfect for Our School Community"</h3>
              <p className="text-indigo-900/70 italic mb-4">
                "We were looking for a child-friendly fundraising idea, and FundRaisely delivered. The pre-loaded content was perfect, and the minimal data collection gave us peace of mind regarding student privacy. It was a huge hit with parents and kids alike!" - Mark T., Head Teacher, Green Valley Academy
              </p>
              <div className="flex items-center gap-2 text-indigo-600">
                <BookOpen className="h-5 w-5" /> Explore Case Studies
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 pb-12">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-center text-indigo-900 text-3xl font-bold mb-8">Common Questions About School Fundraising Quizzes</h2>
          
          <div className="space-y-6">
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">How can we ensure child-friendly content in our school fundraising quiz?</h3>
              <p className="text-indigo-900/70">
                FundRaisely offers pre-loaded General Trivia rounds that are family-friendly, plus we're developing tailored content packs specifically for schools. You can also customize rounds to match your audience age range, ensuring appropriate content for all participants.
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">Is it easy for PTA volunteers to manage a fundraising quiz event?</h3>
              <p className="text-indigo-900/70">
                Absolutely! Our 4-step setup wizard makes it simple for volunteers with no technical skills. The clear role separation (Host runs the quiz, Admin helps with payments and player management) means multiple volunteers can collaborate easily, reducing pressure on any single person.
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">How do we handle ticket sales and payments for school quiz events?</h3>
              <p className="text-indigo-900/70">
                FundRaisely supports real-world school fundraising. Collect cash at the door or share instant payment links (like Revolut). Admins simply mark who has paid and the payment method, and our reconciliation system automatically tracks everything with exportable reports perfect for school committees.
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">What about data privacy for students and families?</h3>
              <p className="text-indigo-900/70">
                We take data privacy seriously, especially for school events. Players join with just their name and team - no personal data collection required. All payment tracking is done by your volunteers, and we provide secure, professional reporting for your school records.
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">How big can our school quiz fundraiser be on the free trial?</h3>
              <p className="text-indigo-900/70">
                The free trial supports up to 20 connected player devices, perfect for testing with a smaller group or running a classroom-sized event. For larger school-wide fundraisers, our upgrade options expand capacity and add more admin seats for your volunteer team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default UsecaseSchoolPage;
