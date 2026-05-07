// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/PersonalisedRoundPanel.tsx
// Same pattern as LatePaymentsPanel — keeps existing component logic intact,
// just mounts it always-open inside the drawer.

import { PersonalisedRoundModal } from '../../../modals/QuizPersonalisedRoundModal';
import type { PersonalisedRound } from '../../../services/QuizPersonalisedRoundsService';

interface PersonalisedRoundPanelProps {
  roomId: string;
  roomTitle?: string;
  onClose: () => void;
  onSuccess?: (round: PersonalisedRound) => void;
}

export default function PersonalisedRoundPanel({
  roomId,
  roomTitle,
  onClose,
  onSuccess,
}: PersonalisedRoundPanelProps) {
  return (
    <PersonalisedRoundModal
      isOpen={true}
      onClose={onClose}
      roomId={roomId}
      roomTitle={roomTitle}
      onSuccess={onSuccess}
    />
  );
}