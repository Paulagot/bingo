import type React from 'react';
import { Shield, CheckCircle,  Heart, Wallet, Gamepad2 } from 'lucide-react';

const Benefit: React.FC = () => {
  return (
    <div id="benefits" className="container mx-auto mt-6 max-w-6xl px-4 pt-6 pb-16">
      <div className="mb-12 text-center">
        <h2 className="text-indigo-900 mb-4 text-3xl font-bold">Benefits for Clubs & Charities</h2>
        <p className="text-indigo-900/70 mx-auto max-w-2xl">Everything you need to run engaging, transparent, and trusted fundraising  quizzes, no headaches, no paperwork.</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <div className="bg-muted flex gap-4 rounded-xl p-6 shadow-md">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-indigo-900 mb-2 text-xl font-bold">Fundraising Quiz in a Box</h3>
            <p className="text-indigo-900/70">Everything you need to run a fun, fully-managed fundraising quiz night — questions, scoring, fundraising extras, and payments — all handled for you. No spreadsheets, no technical setup, just a great event.</p>
          </div>
        </div>
        
        <div className="bg-muted flex gap-4 rounded-xl p-6 shadow-md">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-indigo-900 mb-2 text-xl font-bold">Payment Reconciliation</h3>
            <p className="text-indigo-900/70">Track both cash and digital payments, player-by-player, and get clean reports to support your financial records.</p>
          </div>
        </div>
        
        {/* <div className="bg-muted flex gap-4 rounded-xl p-6 shadow-md">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-fg mb-2 text-xl font-bold">Tamper-Proof Records</h3>
            <p className="text-fg/70">Hash event outcomes and transactions on-chain for transparency and accountability, build donor trust with audit-ready reports.</p>
          </div>
        </div> */}
        
        <div className="bg-muted flex gap-4 rounded-xl p-6 shadow-md">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
          </div>
          <div>
            <h3 className="text-indigo-900 mb-2 text-xl font-bold">Grow Participation</h3>
            <p className="text-indigo-900/70">Offer exciting, modern formats that attract younger supporters while keeping it simple for clubs to run.</p>
          </div>
        </div>
        
        <div className="bg-muted flex gap-4 rounded-xl p-6 shadow-md">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <Wallet className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <h3 className="text-indigo-900 mb-2 text-xl font-bold">Fundraising Software Built for Clubs & Charities</h3>
            <p className="text-indigo-900/70">Purpose-built for clubs, schools & charities. Maximize fundraising with built-in extras like clues, freeze, robbinhood, and restores — all designed to boost donations and fun without adding work for your team.</p>
          </div>
        </div>
        
        <div className="bg-muted flex gap-4 rounded-xl p-6 shadow-md">
          <div className="flex-shrink-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Gamepad2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-indigo-900 mb-2 text-xl font-bold">Public Trust Builder</h3>
            <p className="text-indigo-900/70">Build donor confidence with transparent processes that showcase your integrity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Benefit;