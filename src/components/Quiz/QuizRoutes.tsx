// src/components/Quiz/QuizRoutes.tsx
import { Routes, Route } from 'react-router-dom';

import HostDashboard from './dashboard/HostDashboard';
import QuizGameWaitingPage from './game/QuizGameWaitingPage';
import QuizGamePlayPage from './game/QuizGamePlayPage';
import AdminJoinPage from './game/AdminJoinPage';
import HostControlsPage from './game/HostControlsPage';
import OperatorPage from './game/OperatorPage';
import JoinRoomPage from './joinroom/JoinRoomPage';





import QuizEventDashboard from '../mgtsystem/components/dashboard/QuizEventDashboard';

export default function QuizRoutes() {
  return (
    <Routes>
      {/* game-only routes */}
      <Route path="host-dashboard/:roomId" element={<HostDashboard />} />
      <Route path="game/:roomId/:playerId" element={<QuizGameWaitingPage />} />
      <Route path="play/:roomId/:playerId" element={<QuizGamePlayPage />} />
      <Route path="join/:roomId" element={<JoinRoomPage />} />
      <Route path="admin-join/:roomId" element={<AdminJoinPage />} />
      <Route path="host-controls/:roomId" element={<HostControlsPage />} />
      <Route path="operate/:roomId" element={<OperatorPage />} />
      <Route path="eventdashboard" element={<QuizEventDashboard />} />

  
    </Routes>
  );
}
