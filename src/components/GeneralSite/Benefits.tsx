import type React from 'react';
import { Shield, CheckCircle, Users, Heart, Wallet, Gamepad2 } from 'lucide-react';

const Benefit: React.FC = () => {
  return (
    <div id="benefits" className="container mx-auto px-4 max-w-6xl mt-12 pt-10">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Benefits for Clubs & Charities</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">Everything you need to run engaging, transparent, and trusted fundraising events, no headaches, no paperwork.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Event in a Box</h3>
            <p className="text-gray-600">Everything you need to run a fun, fully-managed fundraising quiz night — questions, scoring, fundraising extras, and payments — all handled for you. No spreadsheets, no technical setup, just a great event.</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Payment Reconciliation</h3>
            <p className="text-gray-600">Track both cash and digital payments, player-by-player, and get clean reports to support your financial records.</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Tamper-Proof Records</h3>
            <p className="text-gray-600">Hash event outcomes and transactions on-chain for transparency and accountability, build donor trust with audit-ready reports.</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <Heart className="h-6 w-6 text-pink-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Grow Participation</h3>
            <p className="text-gray-600">Offer exciting, modern formats that attract younger supporters while keeping it simple for clubs to run.</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <Wallet className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Built for Fundraising</h3>
            <p className="text-gray-600">Maximize fundraising with built-in extras like clues, lifelines, and second chances — all designed to boost donations without adding work for your team.</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Gamepad2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2 text-gray-800">Public Trust Builder</h3>
            <p className="text-gray-600">Build donor confidence with transparent processes and verifiable audit trails that showcase your integrity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Benefit;