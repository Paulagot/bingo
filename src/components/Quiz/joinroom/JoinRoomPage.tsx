
import { useNavigate, useParams } from 'react-router-dom';
import { JoinRoomFlow } from './JoinRoomFlow.tsx';

const JoinRoomPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  console.log('[JoinRoomPage] roomId from params:', roomId);

  const handleClose = () => {
    navigate('/');
  };
  
  return <JoinRoomFlow onClose={handleClose} prefilledRoomId={roomId} />;
};

export default JoinRoomPage;