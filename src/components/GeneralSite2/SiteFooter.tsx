import type React from 'react';

const SiteFooter: React.FC = () => (
  <>
    <footer className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 mt-16">
      {/* Background decorative elements */}
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="absolute -right-16 top-32 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="absolute bottom-10 left-1/2 h-32 w-32 rounded-full bg-pink-400/20 blur-3xl" />
      
      {/* Geometric background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-1/4 h-2 w-2 bg-white rotate-45" />
        <div className="absolute top-40 right-1/3 h-3 w-3 bg-white/60 rotate-12" />
        <div className="absolute bottom-32 left-1/3 h-2 w-2 bg-white rotate-45" />
        <div className="absolute bottom-20 right-1/4 h-3 w-3 bg-white/40 rotate-12" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-16 grid gap-8 md:grid-cols-5 relative z-10">
        <div>
          <h4 className="font-bold text-white mb-4">Quiz Fundraisers</h4>
          <ul className="mt-3 space-y-3 text-white/80 text-sm">
            <li><a href="/quiz/how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
            <li><a href="/quiz/features" className="hover:text-white transition-colors">Features</a></li>
            <li><a href="/quiz/use-cases" className="hover:text-white transition-colors">Use Cases</a></li>
            <li><a href="/quiz/demo" className="hover:text-white transition-colors">Demo Video</a></li>
            <li><a href="/pricing" className="hover:text-white transition-colors">Pricing</a></li>
            <li><a href="/testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
            <li><a href="/free-trial" className="hover:text-white transition-colors">Free Trial</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-4">Web3 Quiz Fundraisers</h4>
          <ul className="mt-3 space-y-3 text-white/80 text-sm">
            <li><a href="/web3-fundraising-quiz" className="hover:text-white transition-colors">How It Works</a></li>
            <li><a href="/web3-fundraising-quiz/features" className="hover:text-white transition-colors">Crypto-Powered Features</a></li>
            <li><a href="/web3-fundraising-quiz/partners" className="hover:text-white transition-colors">Web3 Fundraising Partners</a></li>
            <li><a href="/web3-fundraising-quiz/testimonials" className="hover:text-white transition-colors">Crypto Fundraising Testimonials</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-4">Web3 Impact Campaign</h4>
          <ul className="mt-3 space-y-3 text-white/80 text-sm">
            <li><a href="/web3-impact-event" className="hover:text-white transition-colors">Overview</a></li>
            <li><a href="/web3-impact-event" className="hover:text-white transition-colors">Join</a></li>
            <li><a href="/web3-impact-event/leaderboard" className="hover:text-white transition-colors">Leaderboard</a></li>
            <li><a href="/web3-impact-event/stories" className="hover:text-white transition-colors">Stories</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-4">Geography</h4>
          <ul className="mt-3 space-y-3 text-white/80 text-sm">
            <li><a href="/ireland" className="hover:text-white transition-colors">Fundraising Software Ireland</a></li>
            <li><a href="/uk" className="hover:text-white transition-colors">Fundraising Software UK</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-white mb-4">Company</h4>
          <ul className="mt-3 space-y-3 text-white/80 text-sm">
            <li><a href="/blog" className="hover:text-white transition-colors">Blog / Resources</a></li>
            <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
            <li><a href="/whats-new" className="hover:text-white transition-colors">Inside FundRaisely</a></li>
            <li><a href="/contact" className="hover:text-white transition-colors">Contact / Support</a></li>
            <li><a href="/legal/privacy" className="hover:text-white transition-colors">Privacy</a></li>
            <li><a href="/legal/terms" className="hover:text-white transition-colors">Terms</a></li>
            <li><a href="/legal/compliance" className="hover:text-white transition-colors">Compliance Info</a></li>
          </ul>
        </div>
      </div>
    </footer>
    
    <div className="border-t border-indigo-100/70 bg-white py-6 text-center text-sm text-indigo-900/60">
      © {new Date().getFullYear()} FundRaisely — All rights reserved.
    </div>
  </>
);

export default SiteFooter;
