import { Routes, Route } from 'react-router-dom';
import HostDashboard from './dashboard/HostDashboard';
import QuizChallengePage from '../../pages/QuizChallengePage';
import QuizGameWaitingPage from './game/QuizGameWaitingPage';
import JoinQuizWeb2Page from './joinroom/JoinQuizWeb2Page';
import QuizGamePlayPage from './game/QuizGamePlayPage';
import AdminJoinPage from './game/AdminJoinPage';

import HostControlsPage from './game/HostControlsPage';

export default function QuizRoutes() {
  return (
    <Routes>
      <Route path="/" element={<QuizChallengePage />} />
      <Route path="/host-dashboard/:roomId" element={<HostDashboard />} />
      <Route path="/game/:roomId/:playerId" element={<QuizGameWaitingPage />} />
      <Route path="/join/:roomId" element={<JoinQuizWeb2Page />} />
      <Route path="/play/:roomId/:playerId" element={<QuizGamePlayPage />} />
      <Route path="/admin-join/:roomId" element={<AdminJoinPage />} />
      <Route path="/host-controls/:roomId" element={<HostControlsPage />} />
    </Routes>
  );
}

