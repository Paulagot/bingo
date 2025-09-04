// src/components/Quiz/QuizRoutes.tsx
import { Routes, Route } from 'react-router-dom';

// Auth components
import AuthPage from '../auth/AuthPage';
import AuthGuard from '../auth/AuthGuard';

// Pages
import FundraisingQuizPage from '../../pages/FundraisingQuizPage';
import HostDashboard from './dashboard/HostDashboard';
import QuizGameWaitingPage from './game/QuizGameWaitingPage';
import QuizGamePlayPage from './game/QuizGamePlayPage';
import AdminJoinPage from './game/AdminJoinPage';
import HostControlsPage from './game/HostControlsPage';
import JoinRoomPage from './joinroom/JoinRoomPage';


export default function QuizRoutes() {
  return (
    <Routes>
      {/* Public auth page */}
      <Route path="/auth" element={<AuthPage />} />
      
     
    <Route path="/" element={<FundraisingQuizPage />} />
      
      {/* PUBLIC: Host dashboard - Web3 users need this! */}
      <Route path="/host-dashboard/:roomId" element={<HostDashboard />} />
      
      {/* PUBLIC: All other pages remain public */}
      <Route path="/game/:roomId/:playerId" element={<QuizGameWaitingPage />} />
      <Route path="/play/:roomId/:playerId" element={<QuizGamePlayPage />} />
     <Route path="/join/:roomId" element={<JoinRoomPage />} />
      <Route path="/admin-join/:roomId" element={<AdminJoinPage />} />
      <Route path="/host-controls/:roomId" element={<HostControlsPage />} />
    </Routes>
  );
}