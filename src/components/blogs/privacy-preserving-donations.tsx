// src/components/blogs/privacy-preserving-donations.tsx
import React from 'react';
import { SEO } from '../../components/SEO';
import { Header } from '../../components/GeneralSite2/Header';
import {
  Lock, Heart, Shield, CheckCircle, AlertCircle, Sparkles, ExternalLink,
  Eye, EyeOff, Users, Target,
} from 'lucide-react';
import SiteFooter from '../../components/GeneralSite2/SiteFooter';

/**
 * Privacy-Preserving Donations Blog Post
 * Styled to match FundRaisely brand: indigo/teal scheme, light backgrounds, gradient accents
 */

const PrototypeNotice = () => (
  <div className="mb-8 rounded-xl border-2 border-amber-200 bg-amber-50 p-6 shadow-sm">
    <div className="flex gap-3">
      <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-bold text-amber-900 text-lg mb-2">Prototype Notice</div>
        <p className="text-sm text-amber-900/80 leading-relaxed">
          This post describes a hackathon-stage prototype of FundRaisely's Privacy-Preserving Donations on a public blockchain (Solana), using Arcium for of chain multi party comoutation (MPC) to issue privacy-preserving receipts.
          It is not production software, legal advice, or a fundraising solicitation. Features, controls,
          and integrations will evolve with audits, regulatory input, and partner feedback.
        </p>
      </div>
    </div>
  </div>
);

const InfoBox = ({
  type = 'info',
  title,
  children
}: {
  type?: 'info' | 'caregiver' | 'magician';
  title?: string;
  children: React.ReactNode;
}) => {
  const styles = {
    info: { border: 'border-blue-200', bg: 'bg-blue-50/50', icon: 'text-blue-600' },
    caregiver: { border: 'border-pink-200', bg: 'bg-pink-50/50', icon: 'text-pink-600' },
    magician: { border: 'border-purple-200', bg: 'bg-purple-50/50', icon: 'text-purple-600' },
  };

  const icons = {
    info: <AlertCircle className="h-5 w-5" />,
    caregiver: <Heart className="h-5 w-5" />,
    magician: <Sparkles className="h-5 w-5" />,
  };

  return (
    <div className={`rounded-xl border ${styles[type].border} ${styles[type].bg} p-5 my-6`}>
      <div className="flex gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${styles[type].icon}`}>{icons[type]}</div>
        <div className="text-sm text-indigo-900/80 leading-relaxed">
          {title && <div className="font-semibold text-indigo-900 mb-2">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
};

const SectionDivider = () => (
  <div className="my-12 flex items-center justify-center">
    <div className="h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent w-full max-w-md" />
  </div>
);

const FeatureHighlight = ({
  icon,
  title,
  description
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-cyan-50/50 p-6 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-start gap-4">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 shadow-md">
        {icon}
      </div>
      <div>
        <div className="font-bold text-indigo-900 text-lg mb-2">{title}</div>
        <div className="text-sm text-indigo-900/70 leading-relaxed">{description}</div>
      </div>
    </div>
  </div>
);

export default function PrivacyPreservingDonationsBlog() {
  const title =
    "Anonymous Donations in 2025: How FundRaisely Brings Cash-Like Privacy to Digital Giving";
  const description =
    "Cash is fading, but dignity in giving shouldn't. See how FundRaisely's hackathon prototype on a public Blockchain uses privacy-preserving receipts to protect donors while keeping charities confident and compliant.";

  // Build absolute URLs for JSON-LD (SEO component will handle canonical/hreflang itself)
  const slug = "anonymous-donations-privacy-preserving-digital-giving";
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : "https://www.fundraisely.ie"; // SSR fallback; change if UK is your x-default

  const canonical = `${origin}/blog/${slug}`;
  const ogImage = `${origin}/images/blog/privacy/hero-privacy-preserving-donations.jpg`;

  // Optional: surface breadcrumbs via SEO (it already knows how to render BreadcrumbList JSON-LD)
  const breadcrumbs = [
    { name: 'Blog', item: '/blog' },
    { name: title, item: `/blog/${slug}` },
  ];

  // Keep absolute URLs inside Article JSON-LD
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: title,
        description,
        url: canonical,
        mainEntityOfPage: canonical,
        inLanguage: "en",
        image: {
          "@type": "ImageObject",
          url: ogImage,
          width: 1200,
          height: 630,
        },
        author: { "@type": "Organization", name: "FundRaisely" },
        publisher: {
          "@type": "Organization",
          name: "FundRaisely",
          logo: {
            "@type": "ImageObject",
            url: `${origin}/images/brand/fundraisely-og.png`,
            width: 512,
            height: 512,
          },
        },
        datePublished: "2025-10-25",
        dateModified: "2025-10-25",
        articleSection: "Privacy, Product R&D",
        keywords:
          "anonymous donations, donor privacy, privacy-preserving receipts, digital giving, blockchain privacy, charitable giving, MPC receipts, cash alternatives",
      },
    ],
  };

  return (
    <>
      <SEO
        title={title}
        description={description}
        type="article"
        image={ogImage}
        article={{
          publishedTime: "2025-10-25",
          modifiedTime: "2025-10-25",
          section: "Privacy, Product R&D",
          tags: [
            "anonymous donations",
            "donor privacy",
            "privacy-preserving receipts",
            "digital giving",
            "blockchain privacy",
            "charitable giving",
            "MPC receipts",
            "cash alternatives",
          ],
        }}
        breadcrumbs={breadcrumbs}
        structuredData={structuredData}
      />

      <Header />



      {/* HERO */}
      <section className="px-4 pt-20 pb-12 bg-gradient-to-br from-indigo-50 via-purple-50 to-cyan-50">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-indigo-900 leading-tight mb-6">
            Anonymous Donations in 2025: How FundRaisely Brings Cash-Like Privacy to Digital Giving
          </h1>
          
          <p className="text-xl text-indigo-900/70 leading-relaxed mb-8">
            Cash is fading, but dignity in giving shouldn't.  See how FundRaisely's hackathon prototype on a public Blockchain 
            uses privacy-preserving receipts to protect donors while keeping charities confident and compliant.
          </p>

            <InfoBox type="caregiver">
              FundRaisely is committed to building tech for good, tech that will help clubs, charities, and communities thrive.  We are innovating with care, balancing privacy with compliance, and always putting people first.
            </InfoBox>

          <PrototypeNotice />

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <a
              href="https://cypherpunk-tipjar-web-production.up.railway.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg"
            >
              Try the Demo
              <ExternalLink className="ml-2 h-5 w-5" />
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-6 py-4 text-indigo-900 font-semibold hover:bg-indigo-50 transition-all duration-300 shadow-sm text-lg"
            >
              Book a Walkthrough
            </a>
          </div>
        </div>
      </section>

      {/* ARTICLE BODY */}
      <article className="px-4 py-12 bg-white">
        <div className="container mx-auto max-w-3xl">
          
          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Generosity doesn't always want a spotlight
            </h2>
            
            <p className="text-indigo-900/80 leading-relaxed mb-6">
              Some gifts are given to be seen. Others are given to be felt.
            </p>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              A parent tops up a community club's gear fund but doesn't want other parents comparing 
              wallets. A local business quietly supports a literacy program without inviting cold calls 
              from ten more committees. A donor backs a sensitive cause and prefers dignity over discourse. 
              None of this is secrecy for its own sake; it's kindness with boundaries. Privacy protects 
              people from social pressure, reputational misreads, and unnecessary exposure.
            </p>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              For decades, <strong className="text-indigo-900">cash</strong> made this simple. You could 
              drop a tenner in a collection box and go on with your day. But as everyday payments go digital, 
              the quiet layer that cash once provided is thinning. That creates a <em>privacy gap</em> for 
              donors — and a practical problem for small charities and clubs that want to welcome gifts 
              without inviting unintended scrutiny.
            </p>

            <p className="text-indigo-900/80 leading-relaxed">
              FundRaisely's hackathon prototype explores a path forward: <strong className="text-indigo-900">
              Privacy-Preserving Donations</strong> that keep donors out of the spotlight while preserving 
              what matters to charities — authenticity, and responsible stewardship.
            </p>
          </section>

          <SectionDivider />

          {/* Why Privacy Matters */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Why donor privacy matters (and always has)
            </h2>

            <div className="space-y-6">
              <FeatureHighlight
                icon={<Heart className="h-6 w-6" />}
                title="Privacy lowers the barrier to giving"
                description="For many donors, the friction isn't the amount; it's the attention. People give modestly because they can. They give quietly because they prefer it that way. Sector literature and adviser summaries list familiar reasons for choosing anonymity: to avoid more solicitations, to keep personal finances private, to keep relationships even, to focus on impact rather than recognition."
              />

              <FeatureHighlight
                icon={<Users className="h-6 w-6" />}
                title="Privacy is inclusive"
                description="When only large public gifts get celebrated, smaller donors can feel 'less than.' Quiet giving removes the scoreboard. Everyone contributes what they can, without turning generosity into theatre."
              />

              <FeatureHighlight
                icon={<Shield className="h-6 w-6" />}
                title="Privacy can be safer"
                description="Some gifts touch sensitive topics — health, identity, local politics, even school fees in small communities. Discretion reassures donors that support won't snowball into exposure."
              />

              <FeatureHighlight
                icon={<Heart className="h-6 w-6" />}
                title="Privacy has ethical dimension"
                description="In the Caregiver spirit, privacy respects people as ends in themselves, not lists in a CRM. Recognition can be wonderful; it should never be mandatory."
              />

                   <FeatureHighlight
                icon={<Shield className="h-6 w-6" />}
                title="Privacy preserves dignity"
                description="Smaller donors often give in proportion to their means. Publicising small gifts can inadvertently shame or pressure them. Privacy lets everyone give according to their values, without spotlighting their wallet."
              />
            </div>
          </section>

          <SectionDivider />

          {/* Cash Decline */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Cash used to be our "built-in privacy layer." It isn't anymore.
            </h2>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              As digital payments dominate, governments now legislate to preserve access to cash, acknowledging 
              its role for inclusion and choice. Ireland's Finance (Provision of Access to Cash Infrastructure) 
              Act 2025 exists precisely because cash use has been declining while still remaining important for 
              many consumers - including for privacy.
            </p>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              Central Bank data show ongoing declines in cash withdrawals year-over-year, reflecting steady 
              behavioural change toward cards and digital rails. That's progress for convenience — and pressure 
              for privacy. As cash recedes, so does an easy, widely understood way to give without fanfare.
            </p>

            <InfoBox type="caregiver">
              We're not anti-digital. We're pro-dignity. The question is: how do we bring cash-like discretion 
              into digital giving without losing transparency and trust?
            </InfoBox>
          </section>

          <SectionDivider />

          {/* Compliance */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Compliance and ethics: the line we won't cross (and how we draw it)
            </h2>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              Privacy is not a synonym for permissiveness. Good governance draws bright lines around source 
              of funds and unacceptable risk. UK guidance for charities emphasises risk-based due diligence 
              ("know your donor"), monitoring, and the ability to refuse or return problematic donations, 
              including thresholds for reporting serious incidents (e.g., large anonymous gifts).
            </p>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              The principle here is simple: we want discreet donors and transparent outcomes. That means:
            </p>

            <ul className="space-y-3 mb-6">
              {[
                'Charities can see what they need to steward funds: totals, timing, funds received, and that donations passed policy checks.',
                'Charities do not need to see a donor\'s public wallet or personal identity by default.',
                'Escalation routes exist for edge cases (e.g., unusually large or suspicious activity) to meet legal obligations.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-indigo-900/80">{item}</span>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-cyan-50/30 p-6">
              <p className="text-indigo-900/80 leading-relaxed text-sm">
                <strong>In Ireland, a practical trade-off:</strong> tax relief on donations (via CHY3/CHY4 
                authorisations) is available when a donor explicitly authorises the charity to claim it — 
                but there's no obligation to do so. Donors can prioritise privacy over tax uplift if that's 
                their choice, and charities can explain the implications clearly.
              </p>
            </div>
          </section>

          <SectionDivider />

          {/* Blockchain Transparency */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              "But blockchains are transparent" - yes, and that's both strength and challenge
            </h2>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              Public ledgers make totals auditable and time-stamped. That's valuable. But they also make 
              addresses and flows observable, which can be reconstructed into behavioural profiles - great 
              for reconciling program wallets, not great for donor privacy.
            </p>

            <InfoBox type="magician">
              FundRaisely's stance: keep what blockchains do best (integrity, immutability, verifiable state) 
              and wrap donor-side data with privacy so people aren't exposed while outcomes remain transparent.
            </InfoBox>
          </section>

          <SectionDivider />

          {/* What We Built */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              What we built (hackathon prototype): Privacy-Preserving Donations
            </h2>

            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-8 mb-8 shadow-lg">
              <div className="flex items-start gap-4 mb-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0 shadow-md">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-bold text-indigo-900 text-xl mb-2">Goal</div>
                  <p className="text-indigo-900/80 leading-relaxed">
                   Enable a streamlined donation flow that issues a privacy-preserving receipt proving your tier (Bronze/Silver/Gold/Platinum) — enough to unlock benefits, without revealing your exact amount or tying the receipt to your identity in public UIs. Organisers get aggregate insights in the Impact Dashboard; donors redeem benefits via a simple Claims Portal.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-indigo-900 mb-4">How it works (plain English)</h3>
            
            <p className="text-indigo-900/80 leading-relaxed mb-6">
              We use a privacy computation network (Multi-Party Computation, or MPC) to verify donation 
              facts — for example, "a valid payment of at least Tier Gold occurred to this campaign" — 
              without revealing the donor's address on a public ledger. The system then issues a 
              privacy-preserving receipt that the charity can store, audit internally, and match with totals. 
              Think of it as <strong>"proof without exposure."</strong>
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-green-200 bg-green-50/50 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5 text-green-600" />
                  <h4 className="font-bold text-indigo-900">What the charity sees</h4>
                </div>
                <ul className="space-y-2">
                  {[
                    'Aggregate totals and timestamps for reconciliation',
                    '"Tier met" or similar policy checks (e.g., benefits eligibility)',
                    'A verifiable receipt object (for internal audits and refunds logic)'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-600 flex-shrink-0 mt-2" />
                      <span className="text-sm text-indigo-900/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <EyeOff className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-indigo-900">What stays private by default</h4>
                </div>
                <ul className="space-y-2">
                  {[
                    'The donor\'s public wallet address',
                    'Actual amount donated (beyond tier checks)',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 flex-shrink-0 mt-2" />
                      <span className="text-sm text-indigo-900/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6">
              <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Safeguards in scope for production (future work)
              </h4>
              <ul className="space-y-2">
                {[
                  'Rate limits and velocity checks',
                  'Caps requiring additional verification',
                  'Suspicious-activity review workflows and auditor views aligned to jurisdictional guidance'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 flex-shrink-0 mt-2" />
                    <span className="text-sm text-amber-900/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/50 p-5">
              <p className="text-sm text-indigo-900/80 leading-relaxed">
                <strong>Clarity check:</strong> Today's build is a prototype intended to demonstrate the 
                concept and user flow. Before any production release, we'll conduct security reviews, expand 
                policy controls, and work with compliance advisors.
              </p>
            </div>
          </section>

          <SectionDivider />

          {/* Design Choices */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Human-first design choices
            </h2>

            <div className="space-y-4">
              {[
                {
                  title: 'Language that lowers pressure',
                  desc: 'We avoid pushing fixed preset buttons that "anchor" donation amounts. Instead, we invite the donor to enter the amount they\'re comfortable with — and we format it clearly (e.g., 4 decimal places where relevant) to prevent mistakes.'
                },
                {
                  title: 'Receipt that proves what matters',
                  desc: 'Donors can choose a privacy-preserving receipt that proves eligibility for perks without revealing who they are. A sealed envelope, with a trustworthy timestamp.'
                },
                {
                  title: 'Tier perks, not peacocking',
                  desc: 'A club can still recognise supporters with perks (access to updates, event invites, community chat), while the donor\'s identity remains private by default.'
                },
                {
                  title: 'Opt-ins over assumptions',
                  desc: 'If a donor wants follow-up or to claim tax treatment, they can opt-in to share more - deliberately, not automatically.'
                }
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                  <h4 className="font-bold text-indigo-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-indigo-900/70 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />



          {/* Charity Playbook */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Charity playbook: enabling privacy responsibly
            </h2>

            <div className="space-y-6">
              {[
                {
                  num: 1,
                  title: 'Explain the choice clearly',
                  content: (
                    <>
                      <p className="mb-3">Offer donors a simple, honest comparison:</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
                          <span><strong>Privacy-Preserving Receipt:</strong> protects identity; proves eligibility; 
                          doesn't enable the charity to claim individual tax relief in Ireland unless the donor authorises it.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0 mt-2" />
                          <span><strong>Tax-Authorised Receipt (Ireland: CHY3/CHY4):</strong> donor authorises the 
                          charity to claim tax relief on their gift; this reduces privacy and may share personal details as required.</span>
                        </li>
                      </ul>
                    </>
                  )
                },
                {
                  num: 2,
                  title: 'Set thresholds and flags',
                  content: (
                    <p>
                      Adopt a risk-based approach (amount, velocity, provenance). Small, routine gifts should be easy. 
                      Large or unusual patterns should prompt review. Use clear escalation workflows.
                    </p>
                  )
                },
                {
                  num: 3,
                  title: 'Document decisions',
                  content: (
                    <p>
                      Maintain an internal log (even for private gifts): date, amount, channel, verification result 
                      ("receipt valid"), any flags, and reviewer notes. UK and fundraising regulator materials emphasise 
                      documenting due diligence and decisions.
                    </p>
                  )
                },
                {
                  num: 4,
                  title: 'Plan for refunds and disputes',
                  content: (
                    <p>
                      Your policy should state what information is required to process a refund when donor identity is 
                      private. The privacy receipt can act as a cryptographic claim ticket - enough to validate that this 
                      donor made that gift, without outing them publicly.
                    </p>
                  )
                },
                {
                  num: 5,
                  title: 'Communicate values',
                  content: (
                    <p>
                      Tell supporters why you support dignified, private giving: "We care more about your support than 
                      your spotlight." This lowers social pressure and invites broader participation.
                    </p>
                  )
                }
              ].map((step) => (
                <div key={step.num} className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
                  <div className="flex gap-4 mb-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-lg font-bold flex-shrink-0">
                      {step.num}
                    </div>
                    <h4 className="font-bold text-indigo-900 text-lg mt-1">{step.title}</h4>
                  </div>
                  <div className="ml-14 text-sm text-indigo-900/70 leading-relaxed">
                    {step.content}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* Try the Demo */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Try the prototype: privacy-preserving donations in action
            </h2>

            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 mb-8">
              <div className="flex gap-3">
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-900 text-lg mb-2">Prototype Notice (reminder)</div>
                  <p className="text-sm text-amber-900/80 leading-relaxed">
                    This is a hackathon-stage demo designed to show the concept and gather feedback. 
                    It's not production software yet.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-cyan-50 p-6 mb-6">
              <h3 className="font-bold text-indigo-900 text-xl mb-4">What this demo does today</h3>
              <ul className="space-y-2">
                {[
                  'Lets you make a privacy-preserving donation (your public wallet isn\'t linked in the receipt)',
                  'Issues a privacy-preserving receipt that proves a valid donation occurred (and, if applicable, met a tier)',
                  'Let\'s you claim tier based benefits, in this example it lets you vote for a charity to receive a free FundRaisely subscription when the pooled fund crosses a threshold'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-indigo-900/80">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <h3 className="text-2xl font-bold text-indigo-900 mb-4">How to test it (5–7 minutes)</h3>

            <div className="space-y-3 mb-8">
              {[
                {
                  step: 'Open the demo',
                  detail: (
                    <a 
                      href="https://cypherpunk-tipjar-web-production.up.railway.app/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-700 font-semibold"
                    >
                      Try the demo now
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )
                },
                {
                  step: 'Select Donate Now',
                  detail: 'For this prototype, we\'re focusing on the donation flow. Click "Donate Now" to begin.'
                },
                {
                  step: 'Enter your amount',
                  detail: 'We avoid fixed buttons that pressure amounts. Type the donation amount (supports up to 4 decimal places for precision).'
                },
                {
                  step: 'Connect your wallet (Solana)',
                  detail: 'Use Phantom, Solflare, or a compatible wallet. You can also use Solana Pay/QR if shown.'
                },
                {
                  step: 'Confirm the transaction',
                  detail: 'Follow your wallet prompts. For the privacy flow, an encrypted compute step runs to validate the donation without exposing your wallet publicly.'
                },
                {
                  step: 'Get your receipt',
                  detail: 'You\'ll see a privacy-preserving receipt (a short code or hash). Save it—it\'s your claim ticket for perks and (in production) for refunds if ever required.'
                },
                {
                  step: 'Cast your vote (optional, recommended)',
                  detail: 'In this demo you can choose a charity to receive a free FundRaisely subscription once the pooled balance reaches the threshold. Your vote helps direct impact. The chartity doesnt need to worry about crypto complexity; we handle it on their behalf.'
                },
                  {
                  step: 'Check out the Impact Dashboard',
                  detail: 'The impact dashboard shows aggregate totals and tier breakdowns without exposing individual donors. This is what a charity would see to reconcile funds.'
                }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start rounded-xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-sm font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-900 mb-1">{item.step}</div>
                    <div className="text-sm text-indigo-900/70">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5">
                <h4 className="font-bold text-indigo-900 mb-3">What to look for as a tester</h4>
                <ul className="space-y-2 text-sm text-indigo-900/70">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    <span>How the wording makes you feel (less pressure, more dignity?)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    <span>Whether the privacy receipt is understandable without jargon</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    <span>If the vote step is clear and feels fair</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    <span>Any rough edges: timeouts, confusing states, unclear errors</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-5">
                <h4 className="font-bold text-indigo-900 mb-3">Share feedback (please!)</h4>
                <ul className="space-y-2 text-sm text-indigo-900/70">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                    <span>Tell us what felt human and where it felt techy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                    <span>Did you trust the receipt?</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                    <span>Would your club/charity use this? What controls would you need?</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* Roadmap */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              From demo to full product (how we'll graduate this safely)
            </h2>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              We're actively considering turning this demo into a full product. Here's the path we're charting:
            </p>

            <div className="space-y-4">
              {[
                {
                  title: 'Security & privacy reviews',
                  desc: 'Independent review of the privacy computation flow, receipt format, storage policies, and wallet UX. Threat modeling for abuse scenarios (velocity spikes, patterned attacks).',
                  color: 'from-purple-500 to-indigo-500'
                },
                {
                  title: 'Compliance guardrails',
                  desc: 'Risk-based thresholds and flags (amount, frequency, provenance). Escalation workflows for unusual activity. Jurisdictional settings (e.g., Ireland CHY forms for tax relief vs privacy; UK "know your donor" guidance templates). Audit views—visible only to authorised staff.',
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  title: 'Donor-side clarity',
                  desc: 'Cleaner explanations of privacy vs tax uplift trade-offs. Friction-free opt-in for perks delivery (email or alt contact), still unlinking public wallet data. More accessible error messages and refund guidance using the privacy receipt as a claim token.',
                  color: 'from-teal-500 to-green-500'
                },
                {
                  title: 'Charity-side reconciliation',
                  desc: 'Clear totals and timestamps, exportable logs, and privacy receipts. A "suspicious patterns" panel with gentle defaults and one-click escalation. Sandbox data for training staff on when to refuse/return gifts.',
                  color: 'from-green-500 to-emerald-500'
                },
                {
                  title: 'Rollout & measurement',
                  desc: 'Limited pilots with clubs/charities. Success metrics: conversion rate, donor satisfaction, average gift size without public recognition, time-to-reconcile, resolved flags.',
                  color: 'from-emerald-500 to-teal-500'
                }
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.color} text-white text-sm font-bold flex-shrink-0`}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-indigo-900 mb-1">{item.title}</div>
                      <div className="text-sm text-indigo-900/70">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/30 to-cyan-50/30 p-5">
              <p className="text-sm text-indigo-900/80 leading-relaxed">
                When we go live, we'll swap the demo link for the production page and keep a /demo link for 
                posterity. For now, we'll label the current link clearly as Demo across the site.
              </p>
            </div>
          </section>

          <SectionDivider />

          {/* Design Principles */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Design principles we won't compromise
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  icon: <Heart className="h-5 w-5" />,
                  title: 'Human first, cryptography second',
                  desc: 'The donor experience is simple and kind. The math is there — it shouldn\'t be loud.'
                },
                {
                  icon: <Eye className="h-5 w-5" />,
                  title: 'Transparent outcomes, private donors',
                  desc: 'Totals, timestamps, and program wallets can be verifiable without turning donors into public ledgers of their own lives.'
                },
                {
                  icon: <Lock className="h-5 w-5" />,
                  title: 'Opt-in disclosure',
                  desc: 'If a donor wants perks that require contact, or wants to authorise tax relief (Ireland: CHY forms), they can choose it knowingly.'
                },
                {
                  icon: <Shield className="h-5 w-5" />,
                  title: 'Guardrails by default',
                  desc: 'Privacy pairs with thresholds, monitoring, and the right to refuse gifts that break policy.'
                }
              ].map((principle, i) => (
                <div key={i} className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-cyan-50/50 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex-shrink-0">
                      {principle.icon}
                    </div>
                    <div>
                      <div className="font-bold text-indigo-900 mb-1">{principle.title}</div>
                      <div className="text-sm text-indigo-900/70">{principle.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <SectionDivider />

          {/* Closing */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-indigo-900 mb-6">
              Looking Forward: Privacy is a kindness we can program
            </h2>

            <p className="text-xl text-indigo-900/80 leading-relaxed mb-6 font-medium">
              The world is going cash-light. Let's not let it go kindness-light.
            </p>

            <InfoBox type="caregiver">
              Generosity shouldn't invite scrutiny. Not every gift needs a spotlight. Sometimes the best 
              recognition is knowing your help quietly landed where it matters.
            </InfoBox>

            <InfoBox type="magician">
              Proof without exposure. A sealed envelope with a trustworthy timestamp. Cash-like discretion, 
              digital confidence.
            </InfoBox>

            <p className="text-indigo-900/80 leading-relaxed mb-6">
              FundRaisely's hackathon prototype shows a path to Privacy-Preserving Donations for real clubs, 
              charities, schools, and community groups — a future where donors stay human and outcomes stay 
              transparent.
            </p>

            <p className="text-indigo-900/80 leading-relaxed">
              If you're a charity, compliance expert, or privacy researcher who wants to shape this with us, 
              we'd love to hear from you.
            </p>
          </section>

        </div>
      </article>

      {/* FOOTER CTA */}
      <section className="px-4 py-12 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="container mx-auto max-w-4xl">
          <div className="rounded-3xl border border-teal-200 bg-white p-8 md:p-10 shadow-xl">
            <h3 className="text-3xl font-bold text-indigo-900 mb-4">
              Ready to explore or help us test?
            </h3>
            <p className="text-indigo-900/70 text-lg leading-relaxed mb-8">
              Start with the demo, then book a short walkthrough. We'll collect your feedback and 
              shape the production roadmap with you.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://cypherpunk-tipjar-web-production.up.railway.app/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-lg"
              >
                Try the Demo
                <ExternalLink className="ml-2 h-5 w-5" />
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-6 py-4 text-indigo-900 font-semibold hover:bg-indigo-50 transition-all duration-300 shadow-sm text-lg"
              >
                Book a Walkthrough
              </a>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl border-2 border-indigo-200 bg-white px-6 py-4 text-indigo-900 font-semibold hover:bg-indigo-50 transition-all duration-300 shadow-sm text-lg"
              >
                Join the Waitlist
              </a>
            </div>
          </div>
        </div>
      </section>

   <SiteFooter />
    </>
  );
}
