import React, { lazy, Suspense, useMemo } from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite2/Header';
import {
  Check, Trophy, Users, Zap, Target, CreditCard, BarChart3, 
  CheckCircle, ArrowRight, PlayCircle, Settings, Share2, 
  DollarSign, Clock, ShieldCheck, Sparkles, UserPlus, Gift,
  Award, TrendingUp, QrCode, Coins
} from 'lucide-react';

const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

/** Absolute URL helpers */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

export default function HowItWorksPage() {
  const structuredData = useMemo(() => {
    const breadcrumbsJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'How It Works', item: abs('/quiz/how-it-works') },
      ],
    };

    const webPageJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'How to Run a Fundraising Quiz | Step-by-Step Guide | FundRaisely',
      url: abs('/quiz/how-it-works'),
      description: 'Learn how to set up and host your own fundraising quiz with FundRaisely. Follow our step-by-step guide to create, promote, and run a quiz fundraiser that raises more for your cause.',
      isPartOf: { '@type': 'WebSite', url: getOrigin() },
    };

    const howToJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Run a Fundraising Quiz',
      description: 'Complete guide to setting up and running a successful fundraising quiz event',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Create Your Account',
          text: 'Sign up for a FundRaisely account to access your host dashboard'
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Set Up Your Event',
          text: 'Use our 4-step wizard to configure entry fees, quiz rounds, fundraising extras, and prizes'
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Promote Your Quiz',
          text: 'Share unique links and QR codes to invite participants'
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'Host the Event',
          text: 'Run your quiz with automated question delivery and real-time leaderboards'
        },
        {
          '@type': 'HowToStep',
          position: 5,
          name: 'Manage Payouts',
          text: 'Track payments and reconcile income with built-in financial reporting tools'
        }
      ]
    };

    return [breadcrumbsJsonLd, webPageJsonLd, howToJsonLd];
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-teal-50 via-white to-white">
      <SEO
        title="How to Run a Fundraising Quiz | Step-by-Step Guide | FundRaisely"
        description="Learn how to set up and host your own fundraising quiz with FundRaisely. Follow our step-by-step guide to create, promote, and run a quiz fundraiser that raises more for your cause."
        type="website"
        structuredData={structuredData}
        keywords="how to run a fundraising quiz, fundraising quiz setup guide, online quiz event steps, create a charity quiz, fundraising quiz process, interactive quiz flow, quiz night planning guide, get started with fundraising quiz, quiz platform tutorial, fundraising quiz management"
        ukKeywords="fundraising quiz UK, quiz night fundraiser UK, charity quiz UK, how to run quiz night UK"
        ieKeywords="fundraising quiz Ireland, quiz night fundraiser Ireland, charity quiz Ireland, how to run quiz night Ireland"
        domainStrategy="geographic"
      />

      <Header />

      {/* HERO */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-teal-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-teal-900 text-sm font-medium shadow-sm">
            <Sparkles className="h-4 w-4" /> Step-by-Step Guide
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-indigo-900">
            How to Run a <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">Fundraising Quiz</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-indigo-900/70 leading-relaxed max-w-4xl mx-auto">
            Transform your fundraising with innovative quiz events for charities, schools & clubs. 
            Learn how to set up, promote, and host your own quiz fundraiser with FundRaisely.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href={abs('/free-trial')}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Run a Free Trial Quiz
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <a
              href={abs('/quiz/demo')}
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 border border-indigo-200 transition-colors"
            >
              <PlayCircle className="mr-2 h-5 w-5" /> Watch the Demo
            </a>
          </div>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-indigo-900/80 leading-relaxed mb-6">
              Are you looking for a fun, engaging, and highly effective way to raise money for your charity, school, or club? 
              Look no further than the fundraising quiz! These events are a fantastic way to bring communities together, spark 
              friendly competition, and generate vital funds for your cause. But how do you go about organising one, especially 
              if you're not a tech wizard or an event planning expert?
            </p>
            <p className="text-lg text-indigo-900/80 leading-relaxed mb-6">
              At FundRaisely, we believe that fundraising should be accessible, enjoyable, and impactful for everyone. That's 
              why we've created the easiest way to host your own fundraising quiz, designed specifically for grassroots 
              organisations in the UK and Ireland. With FundRaisely, you don't need any technical skills, setup is instant, 
              and best of all, 100% of the proceeds go directly to your organisation. We empower you to turn your vision into 
              reality, transforming fundraising challenges into opportunities for growth and community engagement.
            </p>
            <p className="text-lg text-indigo-900/80 leading-relaxed">
              Whether you're a seasoned fundraiser or organising your very first event, this comprehensive guide will walk you 
              through every step of setting up, promoting, playing, and managing payouts for your FundRaisely quiz fundraiser. 
              Get ready to unlock new possibilities for your mission and make a real difference, one question at a time.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 1: WHAT IS A FUNDRAISING QUIZ */}
      <section className="px-4 py-12 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">1. What is a Fundraising Quiz and Why Does it Work?</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            A fundraising quiz is an interactive event where participants answer questions, often in teams, 
            with the primary goal of raising money for a charitable cause, school project, or club activity. 
            It's a powerful fundraising tool because it combines entertainment with philanthropy, offering a 
            social and engaging experience that encourages participation and donations.
          </p>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">Why fundraising quizzes are so effective:</h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-indigo-900 text-lg font-semibold mb-2">Community Engagement</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Quizzes bring people together, fostering a sense of community and shared purpose. Friends, families, and colleagues 
                can team up, creating a lively and inclusive atmosphere.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                <Target className="h-6 w-6" />
              </div>
              <h4 className="text-indigo-900 text-lg font-semibold mb-2">Broad Appeal</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                From general knowledge enthusiasts to pop culture buffs, quizzes appeal to a wide demographic. This broad appeal 
                helps attract a diverse range of participants and potential donors.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h4 className="text-indigo-900 text-lg font-semibold mb-2">Cost-Effective</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                With FundRaisely, the overheads are minimal. You can host an engaging event without significant upfront costs, 
                ensuring more of the money raised goes directly to your cause.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h4 className="text-indigo-900 text-lg font-semibold mb-2">Scalability</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Whether you're hosting a small local event or a larger gathering, FundRaisely can adapt to your needs, making it 
                easy to manage any size of quiz.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="text-indigo-900 text-lg font-semibold mb-2">Fun and Memorable</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                People love a good quiz! A well-organised quiz night creates lasting memories and encourages participants to return 
                for future events, building long-term support for your organisation.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-white p-6 shadow-sm">
            <p className="text-indigo-900/80 leading-relaxed">
              FundRaisely simplifies the entire process, making it possible for anyone to host a professional and successful fundraising 
              quiz. We handle the technical complexities so you can focus on what matters most: engaging your community and raising funds 
              for your vital work.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: STEP-BY-STEP SETUP */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">2. Step-by-Step: How to Set Up Your Fundraising Quiz</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            Setting up your fundraising quiz with FundRaisely is designed to be straightforward and intuitive, guiding you through 
            each stage with ease. Our 4-step Event Setup Wizard ensures you can create a professional event in minutes, even if 
            you've never hosted a quiz before. Here's how to get started:
          </p>

          {/* Step 2.1: Create Account */}
          <div className="mb-10 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
                <UserPlus className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-indigo-900">Step 2.1: Create Your FundRaisely Account</h3>
            </div>
            <p className="text-indigo-900/70 leading-relaxed">
              First things first, you'll need a FundRaisely account. Visit our website and sign up for a free trial. 
              Our platform is designed to be user-friendly, so you'll be up and running in no time. Once registered, 
              you'll gain access to your host dashboard, your central hub for managing all your fundraising quizzes.
            </p>
          </div>

          {/* Step 2.2: Event Setup Wizard */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
                <Settings className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-indigo-900">Step 2.2: Set Up Your Event with the Wizard</h3>
            </div>
            <p className="text-indigo-900/70 leading-relaxed mb-6">
              Navigate to the event creation section and follow the intuitive 4-step wizard:
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4 mb-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md flex-shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-semibold mb-2">
                      Step 1
                    </div>
                    <h4 className="text-lg font-bold text-indigo-900">Entry Fee</h4>
                  </div>
                </div>
                <p className="text-indigo-900/70 leading-relaxed">
                  Decide on the ticket price per player or per team. FundRaisely offers flexibility, allowing you to set a fee that 
                  suits your fundraising goals and audience.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4 mb-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md flex-shrink-0">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-semibold mb-2">
                      Step 2
                    </div>
                    <h4 className="text-lg font-bold text-indigo-900">Quiz Template & Customisation</h4>
                  </div>
                </div>
                <p className="text-indigo-900/70 leading-relaxed">
                  Choose from our pre-configured round types like General Trivia, Wipeout, or Speed Round. You can select a ready-made 
                  quiz template or customise your own by picking and arranging various round types to keep your participants engaged. 
                  The demo video showed how easy it is to select and configure rounds.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4 mb-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md flex-shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-semibold mb-2">
                      Step 3
                    </div>
                    <h4 className="text-lg font-bold text-indigo-900">Fundraising Extras</h4>
                  </div>
                </div>
                <p className="text-indigo-900/70 leading-relaxed">
                  This is where you can significantly boost your fundraising! FundRaisely offers optional upsells such as 'Freeze' 
                  (block another team), 'Clue' (unlock a hint), 'Robin Hood' (steal points), and 'Restore Points' (recover points in 
                  Wipeout rounds). You set the fundraising price for each extra, and players can purchase one of each per quiz. The 
                  demo clearly illustrated how these extras can strategically impact gameplay and fundraising.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-start gap-4 mb-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md flex-shrink-0">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-xs font-semibold mb-2">
                      Step 4
                    </div>
                    <h4 className="text-lg font-bold text-indigo-900">Prizes</h4>
                  </div>
                </div>
                <p className="text-indigo-900/70 leading-relaxed">
                  Add details for up to 10 prizes. You can include the sponsor's name (optional), the local value of the prize, and 
                  a brief description. This is a great way to recognise your sponsors and add excitement for participants.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2.3: Roles */}
          <div className="mb-10 rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-indigo-900 mb-6">Step 2.3: Roles and Access Management</h3>
            <p className="text-indigo-900/70 leading-relaxed mb-6">
              FundRaisely simplifies event management by defining clear roles:
            </p>
            <ul className="space-y-3">
              <Bullet>
                <strong>Host:</strong> The person who runs the quiz, sets fees and extras, controls the flow of rounds, and awards prizes.
              </Bullet>
              <Bullet>
                <strong>Admin:</strong> Supports the host by adding players, marking payments, and managing participants as needed. 
                This collaborative approach means multiple volunteers can help, reducing pressure on a single individual.
              </Bullet>
              <Bullet>
                <strong>Players:</strong> Participants who join the quiz via a unique link or QR code, play the game, and utilise any 
                purchased extras.
              </Bullet>
            </ul>
          </div>

          {/* Step 2.4: Player Onboarding */}
          <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-bold text-indigo-900 mb-6">Step 2.4: Player Onboarding and Payment Tracking</h3>
            <p className="text-indigo-900/70 leading-relaxed mb-6">
              Getting players into your quiz is seamless:
            </p>
            <ul className="space-y-3">
              <Bullet>
                <strong>Manual Addition:</strong> You can manually add players by entering their name and team.
              </Bullet>
              <Bullet>
                <strong>Unique Join Links & QR Codes:</strong> Each player or team receives a unique join link and QR code, making it 
                incredibly easy to distribute access. The demo showed how players can quickly join by scanning a QR code or entering a 
                room ID.
              </Bullet>
              <Bullet>
                <strong>Payment Status Tracking:</strong> FundRaisely supports real-world community fundraising by allowing manual 
                tracking of payments (e.g., cash or Revolut). This helps treasurers and volunteers keep a clear record of who has paid.
              </Bullet>
              <Bullet>
                <strong>Capacity Limits:</strong> If you've set a capacity limit for your event, FundRaisely will enforce it automatically.
              </Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 3: QUIZ ROUNDS */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">3. Choosing Quiz Rounds and Question Types</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            Variety is the spice of life, and it's key to keeping your fundraising quiz engaging and memorable. 
            FundRaisely offers a range of round types and question formats to ensure your event is dynamic and appeals to all participants. 
            Our pre-loaded content and scripted intros make it easy for hosts to deliver a professional-quality trivia experience.
          </p>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">3.1: Explore Diverse Round Types</h3>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <h4 className="text-indigo-900 font-semibold mb-2">General Knowledge</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                The classic quiz round, covering a broad spectrum of topics to test everyone's general awareness.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <h4 className="text-indigo-900 font-semibold mb-2">Wipeout</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                A high-stakes round where incorrect answers can lead to point deductions, adding an exciting element of risk.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <h4 className="text-indigo-900 font-semibold mb-2">Speed Round</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Challenges participants to answer quickly, rewarding both knowledge and rapid decision-making.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <h4 className="text-indigo-900 font-semibold mb-2">Music Rounds</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Play snippets of songs and have teams guess the artist or title. A fantastic way to get people singing along!
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <h4 className="text-indigo-900 font-semibold mb-2">Picture Rounds</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Display images and ask questions related to them, such as identifying famous landmarks, celebrities, or objects.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <h4 className="text-indigo-900 font-semibold mb-2">Timed Rounds</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Questions with strict time limits, increasing the pressure and excitement.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-teal-100 bg-white p-6 shadow-sm mb-10">
            <p className="text-indigo-900/80 leading-relaxed">
              By mixing and matching these round types, you can create a unique quiz experience that caters to different interests 
              and keeps energy levels high throughout the event. The demo highlighted how these rounds flow seamlessly, with hosts 
              seeing round details and participants having countdown timers.
            </p>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">3.2: Crafting Engaging Questions</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            While FundRaisely provides pre-loaded question sets, you also have the flexibility to customise or add your own. 
            Consider these tips for crafting engaging questions:
          </p>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6">
            <ul className="space-y-3">
              <Bullet>
                <strong>Balance Difficulty:</strong> Include a mix of easy, medium, and challenging questions to keep all participants motivated.
              </Bullet>
              <Bullet>
                <strong>Localise Content:</strong> For community events, incorporate questions about local history, landmarks, or famous 
                personalities to make the quiz more personal and relevant.
              </Bullet>
              <Bullet>
                <strong>Visual and Audio Elements:</strong> Utilise picture and music rounds to break up text-based questions and add 
                sensory variety.
              </Bullet>
              <Bullet>
                <strong>Clear and Concise:</strong> Ensure questions are unambiguous and easy to understand to avoid confusion and disputes.
              </Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 4: FUNDRAISING EXTRAS */}
      <section className="px-4 py-12 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">4. Adding Extras to Raise More Money</h2>
          <p className="text-lg leading-relaxed mb-8 opacity-95 max-w-4xl">
            FundRaisely's unique Fundraising Extras are a game-changer for boosting your event's income without increasing ticket prices. 
            These interactive power-ups add an exciting layer of strategy and fun to your quiz, encouraging participants to spend a little 
            extra to gain an advantage or recover from a setback. The demo video clearly illustrated the dynamic impact these extras have 
            during gameplay.
          </p>

          <h3 className="text-2xl font-bold mb-6">4.1: The Power of Strategic Purchases</h3>
          <p className="leading-relaxed mb-6 opacity-90">
            Each extra is a one-time purchase per player per quiz, and you, as the host, set the fundraising price. This flexibility 
            allows you to tailor the value of these extras to your audience and fundraising goals. Here are the core extras available:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5" />
                <h4 className="text-lg font-bold">Freeze</h4>
              </div>
              <p className="mb-3 leading-relaxed">
                A tactical move that allows a team to block another team from answering the next question.
              </p>
              <p className="text-sm font-medium opacity-90">
                Imagine the suspense as a rival team is frozen out of a crucial round!
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5" />
                <h4 className="text-lg font-bold">Clue</h4>
              </div>
              <p className="mb-3 leading-relaxed">
                For those tricky questions, a 'Clue' can unlock a hint, giving a team the edge they need to find the correct answer.
              </p>
              <p className="text-sm font-medium opacity-90">
                It's a lifeline that can turn the tide of a round.
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5" />
                <h4 className="text-lg font-bold">Robin Hood</h4>
              </div>
              <p className="mb-3 leading-relaxed">
                This extra lets a team steal points from another team during the leaderboard phase.
              </p>
              <p className="text-sm font-medium opacity-90">
                A true game-changer, the Robin Hood extra can dramatically shift standings and create thrilling moments of rivalry.
              </p>
            </div>

            <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5" />
                <h4 className="text-lg font-bold">Restore Points</h4>
              </div>
              <p className="mb-3 leading-relaxed">
                In high-stakes 'Wipeout' rounds where incorrect answers lead to point deductions, 'Restore Points' allows a team to 
                recover lost points.
              </p>
              <p className="text-sm font-medium opacity-90">
                Keeps them in the game and motivated.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold mb-6">4.2: Creative Ways to Utilise Extras</h3>
          <p className="leading-relaxed mb-6 opacity-90">
            Organisers can use these extras creatively to maximise engagement and funds:
          </p>

          <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 flex-shrink-0" />
                <span>
                  <strong>Golden Question:</strong> Announce that a particularly challenging question will be coming up, encouraging 
                  teams to purchase a 'Clue' extra in advance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 flex-shrink-0" />
                <span>
                  <strong>Strategic Freezes:</strong> Teams might strategically save their 'Freeze' for the top-performing team, adding 
                  a layer of competitive fun.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="mt-1 h-5 w-5 flex-shrink-0" />
                <span>
                  <strong>Leaderboard Drama:</strong> The 'Robin Hood' and 'Restore Points' extras create exciting shifts on the 
                  leaderboard, especially between rounds, keeping everyone on the edge of their seats.
                </span>
              </li>
            </ul>
          </div>

          <p className="mt-6 leading-relaxed opacity-90">
            These extras not only add a dynamic element to your quiz but also provide a significant boost to your fundraising efforts, 
            allowing clubs and charities to raise more money without solely relying on increasing entry fees.
          </p>
        </div>
      </section>

      {/* SECTION 5: MARKETING */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">5. How to Market Your Quiz Night</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            A successful fundraising quiz isn't just about a great game; it's also about getting the word out and encouraging participation. 
            FundRaisely provides tools and advice to help you promote your event effectively and reach your fundraising goals. Remember, 
            the more people who know about your quiz, the more funds you can raise for your cause!
          </p>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">5.1: Leverage FundRaisely's Built-in Sharing Tools</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            Once your quiz is set up, FundRaisely makes it easy to share your event with potential participants:
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
                <Share2 className="h-5 w-5" />
              </div>
              <h4 className="text-indigo-900 font-semibold mb-2">Unique Event Link</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Every quiz you create gets a unique, shareable URL. This link can be distributed across all your communication channels.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
                <QrCode className="h-5 w-5" />
              </div>
              <h4 className="text-indigo-900 font-semibold mb-2">QR Codes</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                For in-person promotions, FundRaisely generates a QR code for your event. Participants can simply scan it with their 
                smartphones to join or get more information.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-md">
                <Share2 className="h-5 w-5" />
              </div>
              <h4 className="text-indigo-900 font-semibold mb-2">Direct Sharing Options</h4>
              <p className="text-indigo-900/70 text-sm leading-relaxed">
                Our platform integrates with popular social media and email services, allowing you to share your event directly from your 
                dashboard with just a few clicks.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">5.2: Practical Promotion Strategies</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            Beyond our built-in tools, here are some proven strategies to market your fundraising quiz night:
          </p>

          <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-8">
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 mt-1">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-1">Email Campaigns</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Send out engaging emails to your existing supporter base, detailing the event, the cause it supports, and how to 
                    participate. Include compelling visuals and a clear call-to-action to sign up or buy tickets.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 mt-1">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-1">Social Media Blitz</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Create eye-catching posts for platforms like Facebook, Instagram, and X (formerly Twitter). Use relevant hashtags 
                    (e.g., #fundraisingquiz, #charityquiznight, #quizfundraiser) and encourage your followers to share the event with 
                    their networks. Consider running a countdown to build anticipation.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 mt-1">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-1">Local Posters & Flyers</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    For community-based organisations, traditional methods still work! Design attractive posters and flyers to display 
                    in local community centres, schools, shops, and notice boards. Include the QR code for easy access.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 mt-1">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-1">Word-of-Mouth</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Encourage your volunteers, members, and early registrants to spread the word. Personal recommendations are incredibly 
                    powerful. Provide them with key talking points and your event link.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 mt-1">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-1">Encourage Team Sharing</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    If teams are participating, ask them to share their unique team link with friends and family to recruit more players. 
                    This can significantly expand your reach.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 mt-1">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-1">Local Media Outreach</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Contact local newspapers, radio stations, or community websites. They might be interested in featuring your fundraising 
                    event, especially if it supports a local cause.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          <p className="mt-6 text-indigo-900/70 leading-relaxed">
            By combining FundRaisely's seamless sharing capabilities with a multi-channel marketing approach, you can ensure your fundraising 
            quiz reaches a wide audience and generates maximum participation and donations.
          </p>
        </div>
      </section>

      {/* SECTION 6: TICKETING & PAYMENTS */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">6. Ticketing, Payments, and Donations</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            Managing tickets, collecting payments, and tracking donations can often be a complex part of organising a fundraising event. 
            FundRaisely simplifies this process, providing secure and transparent solutions that ensure all funds are accounted for and 
            directed towards your cause. Our system is designed to support the unique needs of grassroots organisations, whether you're 
            collecting payments online or in person.
          </p>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">6.1: Flexible Ticketing Options</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            FundRaisely offers flexibility in how you manage access to your quiz:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-teal-600" />
                Free vs. Paid Tickets
              </h4>
              <p className="text-indigo-900/70 leading-relaxed">
                You can choose to offer free entry to your quiz, relying solely on donations and 'Extras' for fundraising, or set a 
                specific ticket price per player or team. This allows you to tailor your approach to your audience and fundraising strategy.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                Secure Fund Collection
              </h4>
              <p className="text-indigo-900/70 leading-relaxed">
                For paid tickets, FundRaisely facilitates secure collection of funds. Our platform ensures that transactions are processed 
                smoothly, giving you peace of mind.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">6.2: Seamless Payment Tracking and Reconciliation</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            We understand that many community events involve various payment methods. FundRaisely supports this reality with robust tracking features:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                Multiple Payment Methods
              </h4>
              <p className="text-indigo-900/70 leading-relaxed">
                Our system is designed to accommodate multiple payment methods, including traditional cash payments and digital options 
                like Revolut, which are common in UK and Irish community fundraising.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Manual Payment Tracking
              </h4>
              <p className="text-indigo-900/70 leading-relaxed">
                For payments collected offline, our platform allows you to manually mark payments as received for each player or team. 
                This ensures that your records are always up-to-date.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Reconciliation Panel
              </h4>
              <p className="text-indigo-900/70 leading-relaxed">
                The FundRaisely dashboard includes a dedicated reconciliation panel. This powerful tool compares expected income (from 
                tickets and extras) against actual received payments, helping you identify any discrepancies. You can add comments and 
                approve entries before finalising your financial records.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                Transparent Tracking
              </h4>
              <p className="text-indigo-900/70 leading-relaxed">
                This feature reduces the administrative burden on treasurers and volunteers, providing transparent tracking of all 
                fundraising income. It's crucial for financial accountability and reporting to your committee or for grant applications.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">6.3: Real-World Fundraising Success</h3>
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-6">
            <p className="text-indigo-900/80 leading-relaxed">
              FundRaisely is built to help you maximise your fundraising potential. By making it easy to collect entry fees and offering 
              engaging 'Extras', we empower organisations to achieve impressive results. Imagine a local school raising £500 from ticket 
              sales and an additional £200 from 'Freeze' and 'Clue' purchases, all while providing a fun evening for the community. These 
              real-world successes are a testament to the effectiveness of a well-organised FundRaisely quiz.
            </p>
          </div>
        </div>
      </section>
       {/* SECTION 7: PLAYING THE QUIZ */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">7. Playing the Quiz and Event Tips</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            Once your quiz is set up and promoted, it's time for the main event! FundRaisely ensures a smooth and engaging experience 
            for both the host and the players, whether your event is online, in-person, or a hybrid of both. Our intuitive interface 
            and automated features allow you to focus on creating a fun and interactive atmosphere.
          </p>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">7.1: The Player Experience: Interactive and Engaging</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            Players join the quiz effortlessly using their smartphones or tablets, transforming their devices into interactive answer pads. 
            The gamified experience keeps them engaged throughout:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <ul className="space-y-3">
                <Bullet>
                  <strong>Pre-Round Intro:</strong> Before each round, players see a clear introduction with rules and scoring information, 
                  ensuring everyone understands how to play.
                </Bullet>
                <Bullet>
                  <strong>Live Question Delivery:</strong> Questions are delivered automatically to their devices with built-in timers, 
                  adding an element of excitement and urgency.
                </Bullet>
                <Bullet>
                  <strong>Using Extras:</strong> Players can strategically deploy any purchased 'Extras' (like 'Clue' or 'Freeze') directly 
                  from their devices, influencing the game in real-time.
                </Bullet>
              </ul>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
              <ul className="space-y-3">
                <Bullet>
                  <strong>Review Phase:</strong> After each question, players receive instant feedback, seeing the correct answer and whether 
                  their response was right or wrong.
                </Bullet>
                <Bullet>
                  <strong>Leaderboard Updates:</strong> Between rounds, the leaderboard is revealed, showcasing rankings and any dramatic 
                  shifts caused by 'Robin Hood' or 'Restore Points' extras. This fosters friendly competition and keeps energy levels high.
                </Bullet>
              </ul>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">7.2: Host Game Controls and Smooth Flow</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            As the host, you're in control, but FundRaisely handles the technical heavy lifting:
          </p>

          <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm mb-10">
            <ul className="space-y-3">
              <Bullet>
                <strong>Pre-Round Briefing:</strong> You'll see detailed information for each round, allowing you to provide clear 
                instructions and build anticipation for your audience.
              </Bullet>
              <Bullet>
                <strong>Automated Question Delivery:</strong> Questions, timers, and answers are all managed by the platform, ensuring 
                a seamless flow without technical glitches.
              </Bullet>
              <Bullet>
                <strong>Review and Statistics:</strong> After each question, you can review answers and statistics, providing talking 
                points to engage your audience and celebrate correct responses.
              </Bullet>
              <Bullet>
                <strong>No Pause Button:</strong> The quiz flows smoothly from round to round, maintaining momentum and ensuring your 
                event runs on time. This continuous flow keeps participants immersed in the game.
              </Bullet>
            </ul>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">7.3: Event Hosting Tips for a Memorable Night</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            To make your quiz night truly unforgettable, consider these practical tips:
          </p>

          <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 p-8">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-teal-600" />
                  Be an Engaging Host
                </h4>
                <p className="text-indigo-900/70 leading-relaxed">
                  Your enthusiasm is contagious! Read questions clearly, interact with the audience, and inject humour. FundRaisely 
                  provides scripted round intros to help you.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Encourage Interaction
                </h4>
                <p className="text-indigo-900/70 leading-relaxed">
                  Facilitate banter between teams, celebrate correct answers, and acknowledge clever (or not-so-clever) guesses. 
                  The gamified nature of FundRaisely naturally encourages this.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-600" />
                  Manage the Atmosphere
                </h4>
                <p className="text-indigo-900/70 leading-relaxed">
                  Use music during breaks, keep the energy high, and ensure everyone feels included. A well-paced quiz keeps 
                  participants entertained from start to finish.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-teal-600" />
                  Technical Check
                </h4>
                <p className="text-indigo-900/70 leading-relaxed">
                  Before the event, do a quick run-through to ensure your internet connection is stable and all devices are charged. 
                  While FundRaisely is robust, a little preparation goes a long way.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-teal-600" />
                  Highlight the Cause
                </h4>
                <p className="text-indigo-900/70 leading-relaxed">
                  Periodically remind participants why they are there and how their contributions are making a difference. 
                  This reinforces the fundraising aspect and motivates further engagement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: AFTER THE EVENT */}
      <section className="px-4 py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-6">8. After the Event: Results, Payouts, and Sharing Success</h2>
          <p className="text-lg text-indigo-900/70 leading-relaxed mb-8 max-w-4xl">
            The quiz might be over, but your fundraising journey with FundRaisely continues. Our platform provides comprehensive tools 
            to manage results, process payouts, and help you celebrate and share the success of your event. This post-event phase is 
            crucial for transparency, accountability, and building lasting relationships with your supporters.
          </p>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">8.1: Transparent Payouts and Financial Reconciliation</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            FundRaisely streamlines the process of managing the funds you've raised:
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-teal-600" />
                Income Reconciliation Report
              </h4>
              <p className="text-indigo-900/70 leading-relaxed text-sm">
                Our detailed reconciliation panel allows you to compare expected income from tickets and extras against actual 
                payments received. You can add comments, make adjustments, and approve the final figures, ensuring complete 
                financial transparency.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                Secure Payout Processing
              </h4>
              <p className="text-indigo-900/70 leading-relaxed text-sm">
                Once reconciled, FundRaisely facilitates the secure processing of payouts, ensuring that the funds raised are 
                transferred efficiently to your organisation. This reduces administrative burden and provides peace of mind.
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-teal-600" />
                Professional Documentation
              </h4>
              <p className="text-indigo-900/70 leading-relaxed text-sm">
                The platform generates professional reports (exportable as CSV or PDF) for your fundraising committees, providing 
                clear documentation for financial audits or grant applications.
              </p>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-indigo-900 mb-6">8.2: Celebrating Success and Engaging Supporters</h3>
          <p className="text-indigo-900/70 leading-relaxed mb-6">
            FundRaisely helps you highlight the impact of your event and keep your supporters engaged:
          </p>

          <ul className="space-y-4 mb-8">
            <li className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Award className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-2">Player Stats and Impact</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    After the quiz, players can view their personal statistics (accuracy, extra usage) and, crucially, see the total 
                    amount raised and their personal contribution. This reinforces their impact and fosters a sense of achievement.
                  </p>
                </div>
              </div>
            </li>

            <li className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <BarChart3 className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-2">Host Statistics</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    As the host, you'll have access to full quiz statistics, including question difficulty, extras usage, and team 
                    performance. These insights are invaluable for celebrating success and planning future events.
                  </p>
                </div>
              </div>
            </li>

            <li className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Trophy className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-2">Sponsor Recognition</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Prizes with sponsor details are clearly shown to players, ensuring your local sponsors receive valuable 
                    recognition for their support.
                  </p>
                </div>
              </div>
            </li>

            <li className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Users className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-2">Thank Donors</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Use the post-event communication channels to thank all participants and donors. A heartfelt thank you goes a 
                    long way in building loyalty and encouraging future support.
                  </p>
                </div>
              </div>
            </li>

            <li className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Share2 className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-2">Share Results</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Share the overall fundraising total and key highlights on your social media channels and website. Celebrate your 
                    collective achievement and inspire others.
                  </p>
                </div>
              </div>
            </li>

            <li className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-teal-600 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-900 mb-2">Re-use Quiz Templates</h4>
                  <p className="text-indigo-900/70 leading-relaxed">
                    FundRaisely allows you to save and re-use your quiz templates for future events. This makes repeat fundraising 
                    even easier and more efficient, building on your past successes.
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 9: CALL TO ACTION */}
      <section className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-teal-600 to-cyan-600 p-10 md:p-12 shadow-xl text-center text-white">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6">9. Call-to-Action Section</h2>
            <h3 className="text-2xl md:text-3xl font-bold mb-4">Ready to Transform Your Fundraising?</h3>
            <p className="text-lg md:text-xl leading-relaxed mb-6 opacity-95 max-w-3xl mx-auto">
              FundRaisely makes it simple to create memorable events that bring communities together and raise vital funds for your cause. 
              Join the growing number of charities, schools, and clubs in the UK and Ireland who are revolutionising their fundraising with us.
            </p>
            
            <div className="mb-8">
              <h4 className="text-xl font-bold mb-6">Take the Next Step Towards Fundraising Success:</h4>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <a
                href={abs('/free-trial')}
                className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-teal-700 font-bold shadow-lg hover:bg-indigo-50 transition-all duration-300 hover:scale-105 text-lg"
              >
                Run a Free Trial Quiz
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href={abs('/pricing')}
                className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-8 py-4 text-white font-semibold shadow-md hover:bg-teal-800 border-2 border-white/30 transition-colors text-lg"
              >
                See Pricing
              </a>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-6 text-left">
                <h5 className="font-bold mb-2 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Run a Free Trial Quiz:
                </h5>
                <p className="text-white/90 leading-relaxed">
                  Experience the magic of FundRaisely firsthand! Set up a free trial quiz today and discover how easy it is to create, host, 
                  and manage your event. No commitment, just pure fundraising potential.
                </p>
              </div>

              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-6 text-left">
                <h5 className="font-bold mb-2 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  See Pricing:
                </h5>
                <p className="text-white/90 leading-relaxed">
                  Explore our flexible pricing plans designed to suit organisations of all sizes. Find the perfect package that aligns with 
                  your fundraising goals and budget. Start your journey to impactful fundraising today!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

     </div> )}