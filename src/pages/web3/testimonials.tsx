import React from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';

import {
  MessageSquare,
  Trophy,
  Crosshair,
  Target,
  Users,
  Zap,
  HeartHandshake,
  Star,
  Globe,
  MessageCircle,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                  */
/* -------------------------------------------------------------------------- */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/* -------------------------------------------------------------------------- */
/* Design tokens (identical to rest of Web3 hub)                               */
/* -------------------------------------------------------------------------- */

const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 ${className}`}>{children}</div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#a3f542]/30 bg-[#a3f542]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#a3f542]">
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3Testimonials: React.FC = () => {

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Testimonials', item: abs('/web3/testimonials') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Web3 Fundraising Stories: Hosts, Communities and Events | FundRaisely',
    description:
      'Stories from communities hosting quiz nights and elimination games on FundRaisely. Transparent on-chain fundraising with verified charity payouts. Share your story and be featured.',
    url: abs('/web3/testimonials'),
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#0a0e14]">

      {/* Grid texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(163,245,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163,245,66,0.03) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <SEO
        title="Web3 Fundraising Stories: Hosts, Communities and Events | FundRaisely"
        description="Stories from communities hosting quiz nights and elimination games on FundRaisely. Transparent on-chain fundraising with verified charity payouts. Share your story and be featured."
        keywords="web3 fundraising stories, crypto charity events, quiz night web3, elimination game fundraiser, community fundraising blockchain, on-chain charity"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd]}
        domainStrategy="geographic"
      />

      <Web3Header />

      {/* ================================================================== */}
      {/* Hero                                                                 */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-12 pt-16">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel><MessageSquare className="h-4 w-4" /> Community stories</SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Real events. Real payouts.<br />
              <span className="text-[#a3f542]">Real impact.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
              Every quiz night and elimination game on FundRaisely generates a public blockchain record.
              The charity receives their share automatically. The host gets paid. The winner walks away with
              the prize. All of it verifiable by anyone, any time.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Star className="h-4 w-4" /> Share your story
              </a>
              <a href="/web3" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                <Target className="h-4 w-4" /> Web3 overview
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Be the first                                                         */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-8 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#a3f542]/20 bg-[#a3f542]/10">
              <Star className="h-8 w-8 text-[#a3f542]" />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Coming soon</p>
            <h2 className="mt-3 font-mono text-3xl font-bold text-white">
              Be the first story on this page.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60">
              FundRaisely is live and events are running. We are building this page to showcase real hosts,
              real communities, and real results. If you have hosted a quiz night or elimination game on
              FundRaisely, we would love to feature your event here.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-white/60">
              Every featured story includes the on-chain transaction record, the payout breakdown, and the
              charity that benefited. Your community gets the credit. The proof is on the blockchain.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <MessageSquare className="h-5 w-5" /> Get in touch
              </a>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white">
                <Trophy className="h-5 w-5" /> Host a quiz
              </a>
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white">
                <Crosshair className="h-5 w-5" /> Host elimination
              </a>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* What a featured story looks like                                    */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Zap className="h-4 w-4" /> What gets featured</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Every story is backed by <span className="text-[#a3f542]">on-chain proof.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              This is not a review page. Every story we publish is tied to a real blockchain transaction
              that anyone can verify. The claim and the proof are inseparable.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">The event</h3>
              <p className="text-base leading-relaxed text-white/60">
                Who hosted, what game they ran, how many players joined, and what entry fee they set. The
                full picture of the event from setup to close.
              </p>
            </W3Card>
            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <HeartHandshake className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">The payout breakdown</h3>
              <p className="text-base leading-relaxed text-white/60">
                Exactly how the entry fee pool was split: what went to the winner, what went to the host,
                what went to the charity, and what went to the platform. With transaction links.
              </p>
            </W3Card>
            <W3Card className="border-[#a3f542]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Globe className="h-5 w-5 text-[#a3f542]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">The on-chain receipt</h3>
              <p className="text-base leading-relaxed text-white/60">
                A direct link to the blockchain transaction on Solscan or Basescan. Anyone can confirm
                the charity received their share, when it happened, and how much it was.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Why share your story                                                 */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                <SectionLabel><Star className="h-4 w-4" /> Why share</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Your event helps the next <span className="text-[#6ef0d4]">community get started.</span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/60">
                  The biggest barrier to hosting a Web3 fundraising event is not the technology. It is not
                  knowing whether it actually works and whether anyone will show up. A real story from a
                  real host answers both of those questions better than any feature list.
                </p>
                <p className="mt-3 text-base leading-relaxed text-white/60">
                  If your event went well, tell us about it. We will write it up, link to the on-chain proof,
                  and publish it here. Your community gets the recognition. The next host gets the confidence
                  to go live.
                </p>
                <a href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-6 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20">
                  <MessageCircle className="h-4 w-4" /> Share your story
                </a>
              </div>
              <div className="grid gap-3">
                {[
                  {
                    title: 'Your community gets the credit',
                    body: 'We feature the host, the event, and the community by name. The story belongs to you and the people who played.',
                  },
                  {
                    title: 'The proof is on the blockchain',
                    body: 'Every story we publish is linked to the actual transaction record. No claims without evidence. That is the point of Web3.',
                  },
                  {
                    title: 'You help others get started',
                    body: 'First-time hosts need to see that it works before they commit. Your story is more convincing than anything we could write.',
                  },
                  {
                    title: 'We promote it across our channels',
                    body: 'Featured stories get shared with our partners including Blockleaders, Superteam Ireland, Base Ireland, and more.',
                  },
                ].map(({ title, body }) => (
                  <div key={title} className="flex items-start gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6ef0d4]" />
                    <div>
                      <p className="mb-1 font-mono text-sm font-bold text-white">{title}</p>
                      <p className="text-xs leading-relaxed text-white/40">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Types of stories we want                                            */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><MessageSquare className="h-4 w-4" /> What we want to hear</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Any event. Any community. <span className="text-[#a3f542]">Any size.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              You do not need a thousand players or a record-breaking night. A good story is just an honest
              account of what happened.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <Trophy className="h-5 w-5 text-[#a3f542]" />,
                border: 'border-[#a3f542]/20',
                bg: 'bg-[#a3f542]/10',
                title: 'Quiz night hosts',
                body: 'You ran a live quiz for your pub crowd, Discord server, club, or DAO. You earned your 25%, the charity got their 30%, and the winner took the prize. Tell us how it went.',
              },
              {
                icon: <Crosshair className="h-5 w-5 text-orange-400" />,
                border: 'border-orange-400/20',
                bg: 'bg-orange-400/10',
                title: 'Elimination game hosts',
                body: 'You ran a fast, tense last-player-standing game. Twenty minutes, high drama, automatic payout. What was the crowd like? How did the charity payout land?',
              },
              {
                icon: <Users className="h-5 w-5 text-white/60" />,
                border: 'border-[#1e2d42]',
                bg: 'bg-white/5',
                title: 'Community organisers',
                body: 'You used FundRaisely to raise money for a cause your community cares about. Maybe it was a one-off event. Maybe it is becoming a regular thing. Either way, we want to hear about it.',
              },
              {
                icon: <HeartHandshake className="h-5 w-5 text-[#6ef0d4]" />,
                border: 'border-[#6ef0d4]/20',
                bg: 'bg-[#6ef0d4]/5',
                title: 'Charities and non-profits',
                body: 'Your organisation received an on-chain donation through a FundRaisely event. How did it arrive? What did it fund? A word from the recipient makes the whole ecosystem more real.',
              },
              {
                icon: <Globe className="h-5 w-5 text-white/60" />,
                border: 'border-[#1e2d42]',
                bg: 'bg-white/5',
                title: 'DAO and Web3 communities',
                body: 'Your DAO, protocol community, or crypto group ran an event. The entry fees were on-chain from the start. That is exactly the kind of story the broader Web3 ecosystem needs to hear.',
              },
              {
                icon: <Star className="h-5 w-5 text-amber-400" />,
                border: 'border-amber-400/20',
                bg: 'bg-amber-400/10',
                title: 'First-time hosts',
                body: 'You had never run a Web3 event before. You were nervous about the tech. Then it worked. That story is the most valuable one on this page.',
              },
            ].map(({ icon, border, bg, title, body }) => (
              <W3Card key={title} className={border}>
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border ${border} ${bg}`}>
                  {icon}
                </div>
                <h3 className="mb-2 font-mono text-sm font-bold text-white">{title}</h3>
                <p className="text-base leading-relaxed text-white/60">{body}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA                                                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Get started</p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Run an event. Create the story.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              You cannot share a story you have not got yet. Host your first quiz night or elimination game,
              see the payout land on-chain, and then come back and tell us how it went.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
                <Crosshair className="h-5 w-5" /> Explore Elimination
              </a>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Trophy className="h-5 w-5" /> Explore Quiz
              </a>
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white">
                <MessageCircle className="h-5 w-5" /> Share your story
              </a>
            </div>
          </W3Card>
        </div>
      </section>

    
    </div>
  );
};

export default Web3Testimonials;

