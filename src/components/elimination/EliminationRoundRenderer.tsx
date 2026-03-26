import { TrueCentreRound } from './rounds/TrueCentreRound';
import { MidpointSplitRound } from './rounds/MidpointSplitRound';
import { StopTheBarRound } from './rounds/StopTheBarRound';
import { DrawAngleRound } from './rounds/DrawAngleRound';
import { FlashGridRound } from './rounds/FlashGridRound';
import { QuickCountRound } from './rounds/QuickCountRound';
import { FlashMathsRound } from './rounds/FlashMathsRound';
import { LineLengthRound } from './rounds/LineLengthRound';
import { BalancePointRound } from './rounds/BalancePointRound';
import { PatternAlignRound } from './rounds/PatternAlignRound';
import { SequenceGapRound } from './rounds/SequenceGapRound';
import { ColourCountRound } from './rounds/ColourCountRound';
import { TimeEstimationRound } from './rounds/TimeEstimationRound';
import { CharacterCountRound } from './rounds/CharacterCountRound';
import type { ActiveRound, RoundSubmission } from './types/elimination';

interface Props {
  activeRound: ActiveRound;
  playerId: string;
  hasSubmitted: boolean;
  onSubmit: (submission: RoundSubmission) => void;
}

export const EliminationRoundRenderer: React.FC<Props> = ({
  activeRound, playerId, hasSubmitted, onSubmit,
}) => {
  const { config } = activeRound;
  const common = {
    roundId: activeRound.roundId,
    playerId,
    hasSubmitted,
    endsAt: activeRound.endsAt,
    onSubmit: onSubmit as any,
  };

  switch (config.roundType) {
    case 'true_centre':    return <TrueCentreRound    config={config} {...common} />;
    case 'midpoint_split': return <MidpointSplitRound config={config} {...common} />;
    case 'stop_the_bar':   return <StopTheBarRound    config={config} {...common} />;
    case 'draw_angle':     return <DrawAngleRound     config={config} {...common} />;
    case 'flash_grid':     return <FlashGridRound     config={config} {...common} />;
    case 'quick_count':    return <QuickCountRound    config={config} {...common} />;
    case 'flash_maths':    return <FlashMathsRound    config={config} {...common} />;
    case 'line_length':    return <LineLengthRound    config={config} {...common} />;
    case 'balance_point':  return <BalancePointRound  config={config} {...common} />;
    case 'pattern_align':  return <PatternAlignRound  config={config} {...common} />;
    case 'sequence_gap':   return <SequenceGapRound   config={config} {...common} />;
    case 'colour_count':   return <ColourCountRound   config={config} {...common} />;
    case 'time_estimation':return <TimeEstimationRound config={config} {...common} />;
    case 'character_count':return <CharacterCountRound config={config} {...common} />;
    default:
      return (
        <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter', fontSize: '14px', textAlign: 'center', padding: '40px' }}>
          Unknown round type
        </div>
      );
  }
};