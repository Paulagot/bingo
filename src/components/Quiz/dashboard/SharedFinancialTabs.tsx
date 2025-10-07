import React, { useMemo } from 'react';
import { Gift, CreditCard } from 'lucide-react';
import PrizesTab from './PrizesTab';
import PaymentReconciliationPanel from './PaymentReconciliation';

interface SharedFinancialTabsProps {
  // Role for permission control
  role: 'host' | 'admin';
  
  // Prize data
  prizeLeaderboard: Array<{
    id: string;
    name: string;
    score: number;
  }>;
  prizeWorkflowComplete: boolean;
  
  // Config data
  config: any;
  
  // Optional: control which tabs are visible
  availableTabs?: Array<'prizes' | 'payments'>;
  
  // Optional: default active tab
  defaultTab?: 'prizes' | 'payments';
}

export const SharedFinancialTabs: React.FC<SharedFinancialTabsProps> = ({
  role,
  prizeLeaderboard,
  prizeWorkflowComplete,
  config,
  availableTabs = ['prizes', 'payments'],
  defaultTab = 'prizes',
}) => {
  const [activeTab, setActiveTab] = React.useState<'prizes' | 'payments'>(defaultTab);

  // Determine if editing should be locked
  const lockEdits = !!(config?.reconciliation as any)?.approvedAt;

  // Build tab configuration
  const tabs = useMemo(() => {
    const allTabs = [
      {
        id: 'prizes' as const,
        label: 'Prizes',
        icon: <Gift className="h-4 w-4" />,
        count: ((config?.reconciliation?.prizeAwards || []) as any[]).filter(
          (a: any) => ['delivered', 'unclaimed', 'refused', 'returned', 'canceled'].includes(a?.status)
        ).length || 0,
      },
      {
        id: 'payments' as const,
        label: 'Payments',
        icon: <CreditCard className="h-4 w-4" />,
        count: null,
      },
    ];

    return allTabs.filter(tab => availableTabs.includes(tab.id));
  }, [config?.reconciliation?.prizeAwards, availableTabs]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-muted border-border rounded-xl border shadow-sm">
        <div className="border-border flex flex-wrap border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-2 px-4 py-4 text-sm font-medium transition-colors md:px-6 ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'text-fg/60 hover:text-fg/80 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    activeTab === tab.id ? 'bg-indigo-100 text-indigo-800' : 'text-fg/70 bg-gray-100'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'prizes' && (
            <div className="space-y-4">
              {role === 'admin' && (
                <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-purple-800">
                      🛡️ Admin View - You can view prize information and assist with prize distribution
                    </span>
                  </div>
                </div>
              )}
              <PrizesTab
                prizeLeaderboard={prizeLeaderboard}
                prizeWorkflowComplete={prizeWorkflowComplete}
                lockEdits={lockEdits}
              />
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              {role === 'admin' && (
                <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-purple-800">
                      🛡️ Admin View - You can view payment information and assist with reconciliation
                    </span>
                  </div>
                </div>
              )}
              <PaymentReconciliationPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedFinancialTabs;