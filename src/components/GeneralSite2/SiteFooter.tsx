// src/components/GeneralSite2/SiteFooter.tsx
import type React from 'react';

const SiteFooter: React.FC = () => (
  <footer className="mt-16 border-t border-indigo-100/70 bg-white">
    <div className="container mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-4">
      <div>
        <h4 className="font-bold text-indigo-900">Quiz Fundraisers</h4>
        <ul className="mt-3 space-y-2 text-indigo-900/70 text-sm">
          <li><a href="/how-it-works">How It Works</a></li>
          <li><a href="/features">Features</a></li>
          <li><a href="/use-cases">Use Cases</a></li>
          <li><a href="/demo">Demo</a></li>
          <li><a href="/pricing">Pricing</a></li>
          <li><a href="/testimonials">Testimonials</a></li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-indigo-900">Impact Campaign</h4>
        <ul className="mt-3 space-y-2 text-indigo-900/70 text-sm">
          <li><a href="/impact/overview">Overview</a></li>
          <li><a href="/impact/join">Join</a></li>
          <li><a href="/impact/leaderboard">Leaderboard</a></li>
          <li><a href="/impact/stories">Stories</a></li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-indigo-900">Geography</h4>
        <ul className="mt-3 space-y-2 text-indigo-900/70 text-sm">
          <li><a href="/ireland">Fundraising Software Ireland</a></li>
          <li><a href="/uk">Fundraising Software UK</a></li>
        </ul>
      </div>

      <div>
        <h4 className="font-bold text-indigo-900">Company</h4>
        <ul className="mt-3 space-y-2 text-indigo-900/70 text-sm">
          <li><a href="/blog">Blog / Resources</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/contact">Contact / Support</a></li>
          <li><a href="/legal/privacy">Privacy</a></li>
          <li><a href="/legal/terms">Terms</a></li>
          <li><a href="/legal/compliance">Compliance Info</a></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-indigo-100/70 py-6 text-center text-sm text-indigo-900/60">
      © {new Date().getFullYear()} FundRaisely — All rights reserved.
    </div>
  </footer>
);

export default SiteFooter;
