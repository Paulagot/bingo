// src/components/mgtsystem/components/dashboard/TotalIncomeReportButton.tsx
//
// Single import for QuizEventDashboard — owns its own open/close state
// so the dashboard file doesn't grow by more than one line + one import.
// All fetching, calculation, and rendering lives in the modal it opens.

import { useState } from 'react';
import { FileBarChart } from 'lucide-react';
import TotalIncomeReportModal from './TotalIncomeReportModal';

interface TotalIncomeReportButtonProps {
  clubId: string;
  clubName: string;
}

export default function TotalIncomeReportButton({ clubId, clubName }: TotalIncomeReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap border-2"
        style={{ background: '#ffffff', borderColor: '#157f85', color: '#157f85' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(21,127,133,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
      >
        <FileBarChart className="h-4 w-4" />
        <span className="hidden sm:inline">Income Report</span>
        <span className="sm:hidden">Report</span>
      </button>

      {open && (
        <TotalIncomeReportModal
          clubId={clubId}
          clubName={clubName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}