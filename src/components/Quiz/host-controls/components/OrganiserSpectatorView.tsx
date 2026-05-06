// src/components/Quiz/host-controls/components/OrganiserSpectatorView.tsx
//
// Full-screen read-only game view for the organiser.
// Wraps HostControlsView but replaces every action handler with a no-op
// so buttons either don't appear (isOperator=true hides postgame buttons)
// or do nothing if clicked (belt-and-braces for any we missed).

import * as React from 'react';
import { LayoutDashboard, Eye } from 'lucide-react';
import HostControlsView from './HostControlsView';
import type { HostControlsController } from '../../hooks/useHostControlsController';

interface OrganiserSpectatorViewProps {
  roomId: string;
  controller: HostControlsController;
  onBackToDashboard: () => void;
}

const noop = () => {};
const noopAsync = async () => {};

const OrganiserSpectatorView: React.FC<OrganiserSpectatorViewProps> = ({
  roomId,
  controller,
  onBackToDashboard,
}) => {
  const spectatorController: HostControlsController = {
    ...controller,

    // Mark as operator so HostPostgamePanel hides "Return to Dashboard" /
    // "End Game" buttons and shows "Thanks for hosting" instead —
    // which we also override to just go back to dashboard.
    isOperator: true,

    // Replace every action with a no-op so nothing fires if clicked
    handleStartRound: noop,
    handleNextReview: noop,
    handleShowRoundResults: noop,
    handleContinueToOverallLeaderboard: noop,
    handleEndGame: noopAsync,
    handleReturnToDashboard: onBackToDashboard,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-gradient-to-b from-indigo-50 to-white">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-indigo-700 px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <Eye className="h-4 w-4 text-white" />
          <span className="text-sm font-bold text-white">Live View</span>
          <span className="hidden rounded-full bg-white/20 px-2.5 py-0.5 text-xs text-white sm:inline">
            Read only — the operator controls the game
          </span>
        </div>
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      {/* Game view — controls are no-ops */}
      <HostControlsView roomId={roomId} controller={spectatorController} />

    </div>
  );
};

export default OrganiserSpectatorView;