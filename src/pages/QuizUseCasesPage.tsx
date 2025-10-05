import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite/Header';
import SiteFooter from '../components/GeneralSite2/SiteFooter';
import { Sparkles, GraduationCap, Trophy, Heart, Users, Check, PlayCircle, Zap, Target, TrendingUp, Award, Clock, Shield } from 'lucide-react';

/** Absolute URL helpers */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string): string { 
  const p = path.startsWith('/') ? path : `/${path}`; 
  return `${getOrigin()}${p}`; 
}

// Color scheme type
interface ColorScheme {
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverBg: string;
}

// Color scheme for each use case
const colorSchemes: Record<string, ColorScheme> = {
  schools: {
    iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    iconColor: 'text-white',
    borderColor: 'border-blue-100',
    hoverBg: 'hover:bg-blue-50'
  },
  clubs: {
    iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
    iconColor: 'text-white',
    borderColor: 'border-green-100',
    hoverBg: 'hover:bg-green-50'
  },
  charities: {
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    iconColor: 'text-white',
    borderColor: 'border-pink-100',
    hoverBg: 'hover:bg-pink-50'
  },
  community: {
    iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
    iconColor: 'text-white',
    borderColor: 'border-amber-100',
    hoverBg: 'hover:bg-amber-50'
  }
};

const Card: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  href: string;
  colorScheme: ColorScheme;
}> = ({ icon, title, desc, href, colorScheme }) => (
  <a href={href} className={`rounded-2xl border ${colorScheme.borderColor} bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 block group`}>
    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${colorScheme.iconBg} ${colorScheme.iconColor} shadow-md group-hover:shadow-lg transition-all`}>
      {icon}
    </div>
    <h3 className="text-indigo-900 text-lg font-semibold group-hover:text-indigo-700 transition-colors">{title}</h3>
    <p className="text-indigo-900/70 mt-1">{desc}</p>
  </a>
);

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const FeatureCard: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  desc: string;
}> = ({ icon, title, desc }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">{icon}</div>
    <h3 className="text-indigo-900 text-lg font-semibold mb-2">{title}</h3>
    <p className="text-indigo-900/70 text-sm">{desc}</p>
  </div>
);

const UseCaseSection: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  benefits: string[];
  ctaText: string;
  ctaHref: string;
  colorScheme: ColorScheme;
}> = ({ 
  icon, 
  title, 
  description, 
  benefits,
  ctaText,
  ctaHref,
  colorScheme
}) => (
  <div className={`rounded-2xl border ${colorScheme.borderColor} bg-white p-8 shadow-sm`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${colorScheme.iconBg} ${colorScheme.iconColor} shadow-lg`}>
        {icon}
      </div>
      <h2 className="text-indigo-900 text-2xl font-bold">{title}</h2>
    </div>
    <p className="text-indigo-900/80 mb-6 leading-relaxed">{description}</p>
    <ul className="space-y-3 mb-6">
      {benefits.map((benefit: string, index: number) => (
        <Bullet key={index}>{benefit}</Bullet>
      ))}
    </ul>
    <a href={ctaHref} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 transition-colors">
      {ctaText}
    </a>
  </div>
);

const FAQItem: React.FC<{ 
  question: string; 
  answer: string;
}> = ({ question, answer }) => (
  <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
    <h3 className="text-indigo-900 text-lg font-semibold mb-3">{question}</h3>
    <p className="text-indigo-900/70 leading-relaxed">{answer}</p>
  </div>
);

const QuizUsecaseIndexPage: React.FC = () => {
  // JSON-LD
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Use Cases', item: abs('/quiz/use-cases') },
    ],
  };
  
  const webPageJsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Fundraising Quiz Use Cases | Schools, Sports Clubs, Charities & Community Groups',
    url: abs('/quiz/use-cases'),
    description: 'Discover how FundRaisely helps schools, sports clubs, charities, and community groups raise funds with engaging quiz nights. Explore real use cases and see how easy fundraising can be.',
    isPartOf: { '@type': 'WebSite', url: abs('/') },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Fundraising Quiz Use Cases',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Schools & PTAs', url: abs('/quiz/use-cases/schools') },
        { '@type': 'ListItem', position: 2, name: 'Sports Clubs', url: abs('/quiz/use-cases/clubs') },
        { '@type': 'ListItem', position: 3, name: 'Charities & Nonprofits', url: abs('/quiz/use-cases/charities') },
        { '@type': 'ListItem', position: 4, name: 'Community Groups', url: abs('/quiz/use-cases/community-groups') },
      ],
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What are the best fundraising quiz ideas for schools?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Schools achieve great success with family-friendly quiz nights featuring mixed-age teams, educational rounds that showcase student learning, and prizes that appeal to both children and adults. Consider themes like "Around the World" to tie into geography lessons or "Through the Decades" for intergenerational appeal.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can sports clubs use quizzes for equipment fundraising?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Absolutely! Sports clubs find quiz nights particularly effective for equipment fundraising because they can engage the entire club community - players, families, and supporters. The competitive element appeals to sporting personalities, while sponsor recognition opportunities help secure local business support.'
        }
      },
      {
        '@type': 'Question',
        name: 'How do charities raise money with quiz nights?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Charities use quiz nights to engage supporters in a relaxed, social setting while educating them about the cause. The key is balancing entertainment with mission awareness, using quiz content that subtly reinforces your charitable work while ensuring everyone has fun.'
        }
      },
      {
        '@type': 'Question',
        name: 'What makes FundRaisely different from other quiz platforms?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FundRaisely is specifically designed for fundraising, with features like automated income reconciliation, sponsor recognition, and fundraising extras that other quiz platforms lack. We support hosted in-person events and soon we will be adding virtual/hybrid events, making us uniquely versatile for community fundraising needs.'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Fundraising Quiz Ideas & Use Cases | Raise More with FundRaisely"
        description="Discover how FundRaisely helps schools, sports clubs, charities, and community groups raise funds with engaging quiz nights. Explore real use cases and see how easy fundraising can be."
        keywords="fundraising quiz use cases, best fundraising quiz ideas, how to run a quiz fundraiser, interactive quiz fundraiser, quiz fundraising platform, school charity sports community fundraising quizzes"
        structuredData={[webPageJsonLd, breadcrumbsJsonLd, faqJsonLd]}
        domainStrategy="geographic"
      />

      <Header />

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Transform your fundraising
          </span>
          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Fundraising Quiz Use Cases | Schools, Sports Clubs, Charities & Community Groups
          </h1>
          <p className="mx-auto mt-4 max-w-4xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
            Transform your fundraising with engaging quiz nights that bring communities together while raising vital funds. FundRaisely empowers schools, sports clubs, charities, and community groups across Ireland and the UK to unlock new fundraising potential through interactive quiz experiences.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 transition-colors">Run a Free Trial Quiz</a>
               {/* New: Founding Partner CTA */}
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
            <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2 transition-colors">
              <PlayCircle className="h-5 w-5" /> Watch the Demo
            </a>
          </div>
        </div>
      </section>

      {/* Use Case Cards */}
      <section className="px-4 pt-6 pb-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card 
              icon={<GraduationCap className="h-5 w-5" />} 
              title="Schools & PTAs" 
              desc="Fund classroom resources, trips, and sports kits with family-friendly quiz nights that engage the entire school community." 
              href="/quiz/use-cases/schools"
              colorScheme={colorSchemes.schools}
            />
            <Card 
              icon={<Trophy className="h-5 w-5" />} 
              title="Sports Clubs" 
              desc="Raise funds for equipment, travel, and facilities with high-energy clubhouse quiz events that strengthen team bonds." 
              href="/quiz/use-cases/clubs"
              colorScheme={colorSchemes.clubs}
            />
            <Card 
              icon={<Heart className="h-5 w-5" />} 
              title="Charities & Non-Profits" 
              desc="Engage supporters and communicate your mission while raising funds for campaigns and ongoing programs." 
              href="/quiz/use-cases/charities"
              colorScheme={colorSchemes.charities}
            />
            <Card 
              icon={<Users className="h-5 w-5" />} 
              title="Community Groups" 
              desc="Fund local projects and build stronger neighborhoods through accessible, fun quiz events that bring people together." 
              href="/quiz/use-cases/community-groups"
              colorScheme={colorSchemes.community}
            />
          </div>
        </div>
      </section>

      {/* Why FundRaisely Transforms Fundraising */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Why FundRaisely Transforms Fundraising</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              FundRaisely revolutionizes how community organizations approach fundraising by combining innovative technology with the warmth of community connection. Our platform supports both hosted events using mobiles and tablets, and fully online quizzes.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={<Zap className="h-5 w-5" />} 
              title="Fast Setup & Professional Results" 
              desc="4-step wizard transforms anyone into a quiz host with pre-loaded question banks and customizable rounds." 
            />
            <FeatureCard 
              icon={<Target className="h-5 w-5" />} 
              title="Engaging Gamified Experience" 
              desc="Interactive gameplay with fundraising extras that encourage additional spending without raising entry fees." 
            />
            <FeatureCard 
              icon={<TrendingUp className="h-5 w-5" />} 
              title="Automated Financial Management" 
              desc="Mark payments as received and watch reconciliation reports update automatically for transparent tracking." 
            />
            <FeatureCard 
              icon={<Award className="h-5 w-5" />} 
              title="Community-Focused Support" 
              desc="Tools and guidance to maximize your impact while building stronger community connections." 
            />
          </div>
        </div>
      </section>

      {/* Detailed Use Case Sections */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl space-y-12">
          <UseCaseSection
            icon={<GraduationCap className="h-6 w-6" />}
            title="Schools & PTAs - Funding the Future"
            description="Schools and Parent Teacher Associations face constant pressure to fund essential resources, from classroom supplies to educational trips and sports equipment. FundRaisely's fundraising quiz platform transforms the traditional school fundraiser into an engaging family event that brings the entire school community together."
            benefits={[
              "Classroom Resources & Educational Trips: Host family-friendly quiz nights that raise funds for interactive whiteboards, library books, science equipment, or that special Year 6 trip to France",
              "Sports Kits & Equipment: Transform your school hall into a quiz arena where parents, teachers, and older students compete for glory while raising money for new football kits or playground equipment",
              "Volunteer-Friendly Organization: Clear role separation means multiple volunteers can help manage the event, reducing pressure on busy parents and teachers",
              "Professional Documentation: Generate comprehensive reports for school committees with transparent income tracking that meets educational sector requirements"
            ]}
            ctaText="Start a quiz for your school"
            ctaHref="/free-trial"
            colorScheme={colorSchemes.schools}
          />

          <UseCaseSection
            icon={<Trophy className="h-6 w-6" />}
            title="Sports Clubs - Powering Performance"
            description="Sports clubs across Ireland and the UK rely on creative fundraising to support their teams, from grassroots youth development to senior competitive squads. FundRaisely's quiz platform brings the competitive spirit of sport into fundraising, creating high-energy events that strengthen club bonds while raising essential funds."
            benefits={[
              "Equipment & Kit Funding: Whether you need new jerseys for the under-16s, training equipment for the seniors, or safety gear for contact sports",
              "Travel & Tournament Support: Raise funds for away matches, tournament entry fees, or that important cup final trip with sponsor recognition features",
              "Facility Improvements: From new goalposts to clubhouse renovations, larger fundraising goals become achievable through engaging quiz events",
              "Team Building Beyond the Pitch: Create opportunities for different age groups and teams within your club to interact and build community spirit"
            ]}
            ctaText="Power your club's fundraising"
            ctaHref="/free-trial"
            colorScheme={colorSchemes.clubs}
          />

          <UseCaseSection
            icon={<Heart className="h-6 w-6" />}
            title="Charities & Non-Profits - Amplifying Impact"
            description="Charitable organizations need innovative ways to engage supporters and communicate their mission while raising vital funds for their causes. FundRaisely's quiz platform provides charities with a fresh approach to supporter engagement that goes beyond traditional fundraising methods."
            benefits={[
              "Campaign Funding & Mission Support: Raise funds for specific campaigns, ongoing programs, or building reserves for future initiatives through interactive quiz experiences",
              "Supporter Engagement & Retention: Transform passive donors into active participants while educating about your cause through entertaining quiz content",
              "Volunteer Appreciation & Recruitment: Use quiz nights as volunteer appreciation events or recruitment opportunities, creating positive associations with your organization",
              "Corporate Partnership Opportunities: Sponsor recognition features provide valuable visibility for corporate partners, making it easier to secure business support"
            ]}
            ctaText="Amplify your charity's impact"
            ctaHref="/free-trial"
            colorScheme={colorSchemes.charities}
          />

          <UseCaseSection
            icon={<Users className="h-6 w-6" />}
            title="Community Groups - Building Stronger Communities"
            description="Local community groups are the backbone of vibrant neighborhoods, organizing everything from residents' associations to hobby clubs and local improvement societies. FundRaisely's quiz platform helps these groups fund their initiatives while strengthening the social bonds that make communities thrive."
            benefits={[
              "Local Project Funding: Raise funds for playground improvements, community garden supplies, or local festival organization through accessible quiz nights",
              "Social Connection & Engagement: Offer genuine face-to-face interaction that builds lasting relationships within your community with both in-person and online options",
              "Accessible Event Management: Simple setup process and ready-made question banks ensure anyone can host a professional quiz event without stress",
              "Transparent Financial Management: Automated reconciliation and reporting features provide the transparency that builds trust among members"
            ]}
            ctaText="Strengthen your community"
            ctaHref="/free-trial"
            colorScheme={colorSchemes.community}
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">How FundRaisely Makes It Simple</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              From setup to celebration, our platform guides you through every step of creating successful fundraising quiz events.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mb-4">
                <Clock className="h-8 w-8" />
              </div>
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">Event Setup Wizard</h3>
              <p className="text-indigo-900/70">Transform your fundraising vision into reality with our 4-step setup process. Set entry fees, choose quiz rounds, add fundraising extras, and showcase prizes with sponsor recognition.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mb-4">
                <Target className="h-8 w-8" />
              </div>
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">Gamified Player Experience</h3>
              <p className="text-indigo-900/70">Keep participants engaged with interactive rounds including General Trivia, Wipeout challenges, and Speed rounds. Fundraising extras add excitement while boosting funds raised.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mb-4">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">Automated Income Reconciliation</h3>
              <p className="text-indigo-900/70">Mark payments as received using multiple methods and watch our system automatically calculate totals and generate professional reports for your committee or board.</p>
            </div>
            <div className="text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-indigo-900 text-xl font-semibold mb-3">Professional Question Content</h3>
              <p className="text-indigo-900/70">Access our curated question banks with General Trivia, Wipeout, and Speed Round content, or create custom questions tailored to your audience and cause.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories Placeholder */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm text-center">
            <h2 className="text-indigo-900 text-3xl font-bold mb-4">Success Stories & Impact</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Join the growing community of schools, sports clubs, charities, and community groups who are transforming their fundraising with FundRaisely. Real stories of impact and success coming soon.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/contact" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800 transition-colors">Share Your Success Story</a>
              <a href="/quiz/testimonials" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 border border-indigo-200 transition-colors">View Testimonials</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Get answers to common questions about using FundRaisely for your fundraising quiz events.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FAQItem
              question="What are the best fundraising quiz ideas for schools?"
              answer="Schools achieve great success with family-friendly quiz nights featuring mixed-age teams, educational rounds that showcase student learning, and prizes that appeal to both children and adults. Consider themes like 'Around the World' to tie into geography lessons or 'Through the Decades' for intergenerational appeal."
            />
            <FAQItem
              question="Can sports clubs use quizzes for equipment fundraising?"
              answer="Absolutely! Sports clubs find quiz nights particularly effective for equipment fundraising because they can engage the entire club community - players, families, and supporters. The competitive element appeals to sporting personalities, while sponsor recognition opportunities help secure local business support."
            />
            <FAQItem
              question="How do charities raise money with quiz nights?"
              answer="Charities use quiz nights to engage supporters in a relaxed, social setting while educating them about the cause. The key is balancing entertainment with mission awareness, using quiz content that subtly reinforces your charitable work while ensuring everyone has fun."
            />
            <FAQItem
              question="What makes FundRaisely different from other quiz platforms?"
              answer="FundRaisely is specifically designed for fundraising, with features like automated income reconciliation, sponsor recognition, and fundraising extras that other quiz platforms lack. We support hosted in-person events and soon we will be adding virtual/hybrid events, making us uniquely versatile for community fundraising needs."
            />
            <FAQItem
              question="Do I need technical skills to run a FundRaisely quiz?"
              answer="Not at all! Our 4-step setup wizard guides you through the entire process, from setting entry fees to adding prizes. Pre-loaded question banks mean you don't need to write content, and our host prompts ensure smooth event delivery even for first-time quiz hosts."
            />
            <FAQItem
              question="How much can we expect to raise with a quiz night?"
              answer="Fundraising results vary based on your audience size, entry fees, and use of optional extras. However, our automated reconciliation shows exactly how much you've raised from entry fees versus fundraising extras, helping you optimize future events for maximum impact."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-700 to-purple-600 p-8 shadow-lg text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Fundraising?</h2>
            <p className="text-lg max-w-3xl mx-auto leading-relaxed mb-8 text-indigo-100">
              Join schools, sports clubs, charities, and community groups across Ireland and the UK who are discovering the power of engaging quiz fundraisers. Whether you're planning your first quiz night or looking to enhance existing events, FundRaisely provides the tools and support you need to unlock your fundraising potential.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/free-trial" className="rounded-xl bg-white px-8 py-4 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 transition-colors text-lg">Run a Free Trial Quiz</a>
                 {/* New: Founding Partner CTA */}
              <a
                href="/founding-partners"
                className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-4 text-white font-bold shadow-lg hover:scale-105 hover:shadow-xl transition"
              >
                Become a Founding Partner
              </a>
              <a href="/pricing" className="rounded-xl bg-indigo-800 px-8 py-4 text-white font-semibold shadow-md hover:bg-indigo-900 border border-indigo-600 transition-colors text-lg">See Pricing</a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default QuizUsecaseIndexPage;

