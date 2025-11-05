import React from 'react';
import { Shield, Globe, DollarSign, CheckCircle } from 'lucide-react';

export const TrustStrip: React.FC = () => (
  <div className="border-border border-t bg-gray-50">
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="text-center">
        <h3 className="text-fg mb-8 text-2xl font-bold">Trusted & Transparent</h3>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="text-center"><Shield className="mx-auto mb-2 h-12 w-12 text-indigo-600" /><div className="font-semibold text-fg">On-Chain Tracking</div></div>
          <div className="text-center"><Globe className="mx-auto mb-2 h-12 w-12 text-green-600" /><div className="font-semibold text-fg">Direct-to-Charity Routing</div></div>
          <div className="text-center"><DollarSign className="mx-auto mb-2 h-12 w-12 text-blue-600" /><div className="font-semibold text-fg">Capped Fees</div></div>
          <div className="text-center"><CheckCircle className="mx-auto mb-2 h-12 w-12 text-purple-600" /><div className="font-semibold text-fg">Audit-Ready Reports</div></div>
        </div>
      </div>
    </div>
  </div>
);
