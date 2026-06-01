// client/src/components/shared/ComplianceNotice.tsx

import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

interface ComplianceNoticeProps {
  type: 'prize' | 'donation' | 'general';
  gdprConsent?: boolean;
  value?: number;
  country?: 'IE' | 'UK';
}

const ComplianceNotice: React.FC<ComplianceNoticeProps> = ({ 
  type, 
  gdprConsent = false, 
  value = 0,
  country = 'UK'
}) => {
  const getPrizeGuidance = () => {
    if (country === 'IE') {
      return {
        title: 'Irish Tax Compliance',
        text: `Prize recorded at fair market value (€${value.toFixed(2)}) for Revenue compliance. Restricted donation - must be used for specified purpose.`,
        link: 'https://www.revenue.ie/en/companies-and-charities/charities/index.aspx'
      };
    } else {
      return {
        title: 'UK Tax Compliance', 
        text: `Prize recorded at fair market value (£${value.toFixed(2)}) for HMRC compliance. Gift Aid may not apply to goods/services.`,
        link: 'https://www.gov.uk/charities-and-tax'
      };
    }
  };

  const guidance = type === 'prize' ? getPrizeGuidance() : null;

  if (type === 'prize' && guidance) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-amber-800">{guidance.title}</h4>
            <p className="text-sm text-amber-700 mt-1">
              {guidance.text}
              {!gdprConsent && ' GDPR consent required for detailed records.'}
            </p>
            <a 
              href={guidance.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-amber-600 hover:text-amber-800 mt-2"
            >
              View guidance
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ComplianceNotice;