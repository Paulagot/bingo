/**
 * StepReviewLaunch Component
 *
 * Review and launch step for the quiz wizard.
 * Displays configuration review and handles quiz room creation.
 */

import { FC } from 'react';
import { ChevronLeft, Rocket, AlertTriangle } from 'lucide-react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { WizardStepProps } from '../WizardStepProps';
import ClearSetupButton from '../ClearSetupButton';
import Character from '../shared/components/Character';
import { useLaunch } from './hooks/useLaunch';
import { formatEventDateTime } from './utils/formatting';
import { getCurrentMessage } from './utils/messages';
import { RoomIdsBanner } from './components/RoomIdsBanner';
import {
  HostEventSection,
  PaymentSection,
  QuizStructureSection,
  PrizesSection,
  FundraisingSection,
} from './components/ReviewSections';

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack, onResetToFirst }) => {
  const { setupConfig, roomId, hostId, flow } = useQuizSetupStore();
  const { isLaunching, handleLaunch } = useLaunch();

  const currency = setupConfig.currencySymbol || '€';
  const hasHostName = !!setupConfig.hostName;
  const hasRounds = setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0;
  const configComplete = hasHostName && hasRounds;

  const statusMessage = getCurrentMessage(configComplete);
  const eventDateTime = formatEventDateTime(setupConfig.eventDateTime || '');

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Review & Launch</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Final configuration check</div>
      </div>

      <Character message={statusMessage.message} tone={statusMessage.tone} />

      {/* IDs banner */}
      <RoomIdsBanner roomId={roomId} hostId={hostId} />

      {/* Warning banner */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <span className="text-xs font-medium text-yellow-900 sm:text-sm">Final Configuration Check</span>
        </div>
        <div className="text-xs text-yellow-800 sm:text-sm">
          Review everything carefully. Changes to the basic quiz structure can't be made after launching.
        </div>
      </div>

      {/* Overview grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <HostEventSection
          setupConfig={setupConfig}
          eventDateTime={eventDateTime}
          hasHostName={hasHostName}
        />
        <PaymentSection setupConfig={setupConfig} currency={currency} />
      </div>

      {/* Quiz Structure */}
      <QuizStructureSection
        roundDefinitions={setupConfig.roundDefinitions || []}
        hasRounds={hasRounds}
      />

      {/* Prizes & Fundraising */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <PrizesSection setupConfig={setupConfig} currency={currency} />
        <FundraisingSection setupConfig={setupConfig} currency={currency} />
      </div>

      {/* Launch CTA */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-2 text-sm font-medium text-indigo-900 sm:text-base">Ready to launch</div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Your quiz configuration is complete and ready to go live.
        </div>
      </div>

      {/* Navigation */}
      <div className="border-border flex justify-between border-t pt-4 sm:pt-6">
        <button type="button" onClick={onBack} className="btn-muted">
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        <ClearSetupButton
          variant="ghost"
          flow={flow ?? 'web2'}
          onCleared={onResetToFirst}
        />

        <button
          type="button"
          onClick={handleLaunch}
          className="btn-primary disabled:opacity-60"
          disabled={isLaunching}
        >
          <Rocket className="h-4 w-4" />
          <span>{isLaunching ? 'Launching…' : 'Launch Quiz'}</span>
        </button>
      </div>
    </div>
  );
};

export default StepReviewLaunch;

