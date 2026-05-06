// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/LatePaymentsPanel.tsx
// The original MarkLatePaymentModal uses a headlessui Dialog for its own overlay.
// Here we strip that outer Dialog and render the inner content directly.
// All the logic is unchanged — just re-exported without the modal wrapper.

import MarkLatePaymentModal from '../../../modals/QuizMarkLatePaymentModal';

interface LatePaymentsPanelProps {
  roomId: string;
  currencySymbol?: string;
  confirmedBy: string;
  confirmedByName?: string;
  confirmedByRole?: 'host' | 'admin';
  onClose: () => void;
}

/**
 * Thin wrapper: opens the modal in "always open" mode so its content
 * renders inline inside the drawer without its own backdrop/overlay.
 * The isOpen=true + onClose wired to the drawer's onClose keeps
 * all the existing logic (including the headlessui Dialog) working
 * correctly — it just appears inside the drawer panel instead of
 * floating over the whole page.
 */
export default function LatePaymentsPanel({
  roomId,
  currencySymbol,
  confirmedBy,
  confirmedByName,
  confirmedByRole,
  onClose,
}: LatePaymentsPanelProps) {
  return (
    <MarkLatePaymentModal
      isOpen={true}
      onClose={onClose}
      roomId={roomId}
      currencySymbol={currencySymbol}
      confirmedBy={confirmedBy}
      confirmedByName={confirmedByName}
      confirmedByRole={confirmedByRole}
    />
  );
}