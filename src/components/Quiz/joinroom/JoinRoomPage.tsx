import React from 'react';
import { useNavigate } from 'react-router-dom';
import { JoinRoomFlow } from '../joinroom/JoinRoomFlow';

const JoinRoomPage = () => {
  const navigate = useNavigate();
  
  const handleClose = () => {
    navigate('/quiz'); // Navigate back to quiz homepage
  };
  
  return <JoinRoomFlow onClose={handleClose} />;
};

export default JoinRoomPage;