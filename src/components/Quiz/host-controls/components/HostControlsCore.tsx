import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useHostControlsController } from '../../hooks/useHostControlsController';
import HostControlsView from './HostControlsView';

const HostControlsCore: React.FC = () => {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId!;

  const controller = useHostControlsController({ roomId });

  return <HostControlsView roomId={roomId} controller={controller} />;
};

export default HostControlsCore;
