// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/ReportPanel.tsx
// The QuizFinancialReportModal is a large, self-contained component.
// We mount it always-open inside the drawer. Its internal scroll and
// print logic all continue to work correctly.

import { QuizFinancialReportModal } from '../../../modals/QuizFinancialReportModal';

interface ReportPanelProps {
  roomId: string;
  roomName: string;
  currency?: string;
  onClose: () => void;
}

export default function ReportPanel({
  roomId,
  roomName,
  currency,
  onClose,
}: ReportPanelProps) {
  return (
    <QuizFinancialReportModal
      roomId={roomId}
      roomName={roomName}
      currency={currency}
      onClose={onClose}
    />
  );
}