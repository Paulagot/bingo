import React from 'react';
import { Link } from 'react-router-dom';
import Headers from './Headers';
import Hfooter from './hFooter';

const FundRaiselyWhereYouSave: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
     
      
      {/* Hero Section */}
      <div className="container mx-auto max-w-4xl px-4 pb-12 pt-16">
        <div className="mb-16 text-center">
          <h1 className="text-fg mb-6 text-4xl font-bold">
            💸 Where You Save with FundRaisely
          </h1>
          <p className="text-fg/70 mx-auto max-w-3xl text-xl">
            FundRaisely isn't just fundraising software, it's your <strong>legal, logistical, and admin co-pilot</strong>. 
            Here's where you save money, time, and stress on every event.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Legal & Compliance Savings */}
          <div className="bg-muted rounded-xl p-8 shadow-md">
            <h2 className="text-fg mb-6 text-2xl font-bold">✅ 1. Legal & Compliance Savings</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">Without FundRaisely:</h3>
                <p className="text-fg/70">You'd spend hours researching complex regulations or even pay for legal help.</p>
              </div>
              
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">With FundRaisely:</h3>
                <ul className="text-fg/70 space-y-2">
                  <li>• Instant legal status based on your answers</li>
                  <li>• Auto-filled Garda permit and court licence templates</li>
                  <li>• Built-in thresholds, prize caps, and exemptions</li>
                  <li>• Automatic reminders for deadlines and renewals</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 rounded-lg bg-indigo-50 p-4">
              <p className="font-medium text-indigo-800">💡 Estimated Savings: €100–€250 per event in legal fees and admin time</p>
            </div>
          </div>

          {/* Admin & Paperwork Savings */}
          <div className="bg-muted rounded-xl p-8 shadow-md">
            <h2 className="text-fg mb-6 text-2xl font-bold">📋 2. Admin & Paperwork Savings</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">Without FundRaisely:</h3>
                <p className="text-fg/70">You manage messy spreadsheets, ticket logs, and reports manually.</p>
              </div>
              
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">With FundRaisely:</h3>
                <ul className="text-fg/70 space-y-2">
                  <li>• Auto-generated logs for ticket sales, prize value, and beneficiaries</li>
                  <li>• Event templates and digital ticketing included</li>
                  <li>• Post-event audit and income reporting automation</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 rounded-lg bg-indigo-50 p-4">
              <p className="font-medium text-indigo-800">💡 Estimated Savings: €50–€150 in volunteer time per event</p>
            </div>
          </div>

          {/* Setup & Tooling Savings */}
          <div className="bg-muted rounded-xl p-8 shadow-md">
            <h2 className="text-fg mb-6 text-2xl font-bold">🎟️ 3. Setup & Tooling Savings</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">Without FundRaisely:</h3>
                <p className="text-fg/70">You might need Eventbrite, Google Forms, or even hire a designer.</p>
              </div>
              
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">With FundRaisely:</h3>
                <ul className="text-fg/70 space-y-2">
                  <li>• Built-in tools for bingo cards, raffle ticketing, and quiz scoring</li>
                  <li>• Hosted event pages and checkouts — no website needed</li>
                  <li>• Cash and card buyer tracking included</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 rounded-lg bg-indigo-50 p-4">
              <p className="font-medium text-indigo-800">💡 Estimated Savings: €50–€500 depending on complexity</p>
            </div>
          </div>

          {/* Transparency & Continuity */}
          <div className="bg-muted rounded-xl p-8 shadow-md">
            <h2 className="text-fg mb-6 text-2xl font-bold">📂 4. Transparency & Continuity</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">Without FundRaisely:</h3>
                <p className="text-fg/70">No permanent records, risk of compliance failure, and disjointed volunteer handovers.</p>
              </div>
              
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">With FundRaisely:</h3>
                <ul className="text-fg/70 space-y-2">
                  <li>• Timestamped event logs</li>
                  <li>• Multi-user access with role permissions</li>
                  <li>• Exportable PDF compliance reports</li>
                  <li>• Blockchain-anchored proof of transparency (optional)</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 rounded-lg bg-indigo-50 p-4">
              <p className="font-medium text-indigo-800">💡 Value: Legal confidence + audit readiness</p>
            </div>
          </div>

          {/* Peace of Mind & Reputation */}
          <div className="bg-muted rounded-xl p-8 shadow-md">
            <h2 className="text-fg mb-6 text-2xl font-bold">🧠 5. Peace of Mind & Reputation</h2>
            
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">Without FundRaisely:</h3>
                <p className="text-fg/70">You're guessing if you're compliant.</p>
              </div>
              
              <div>
                <h3 className="text-fg/80 mb-3 font-semibold">With FundRaisely:</h3>
                <ul className="text-fg/70 space-y-2">
                  <li>• Live visual compliance dashboard (Red / Yellow / Green)</li>
                  <li>• Templates for all legal steps</li>
                  <li>• Safer events, happier teams, more trust from donors</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 rounded-lg bg-indigo-50 p-4">
              <p className="font-medium text-indigo-800">💡 Value: Event security + long-term credibility</p>
            </div>
          </div>

          {/* Pricing Section */}
        
        </div>
      </div>

     
    </div>
  );
};

export default FundRaiselyWhereYouSave;