
import { useNavigate, useParams } from 'react-router-dom';
import { JoinRoomFlow } from '../joinroom/JoinRoomFlow';

const JoinRoomPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  
  const handleClose = () => {
    navigate('/');
  };
  
  return <JoinRoomFlow onClose={handleClose} prefilledRoomId={roomId} />;
};

export default JoinRoomPage;