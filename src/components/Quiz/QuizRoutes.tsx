import { Routes, Route } from 'react-router-dom';
import HostDashboard from './dashboard/HostDashboard';
import QuizChallengePage from '../../pages/QuizChallengePage';
import QuizGameWaitingPage from '../../pages/QuizGameWaitingPage';
import JoinQuizWeb2Page from './joinroom/JoinQuizWeb2Page';
import QuizGamePlayPage from '../../pages/QuizGamePlayPage';
import AdminJoinPage from '../../pages/AdminJoinPage';

export default function QuizRoutes() {
  return (
    <Routes>
      <Route path="/" element={<QuizChallengePage />} />
      <Route path="/host-dashboard/:roomId" element={<HostDashboard />} />
      <Route path="/game/:roomId/:playerId" element={<QuizGameWaitingPage />} />
      <Route path="/join/:roomId" element={<JoinQuizWeb2Page />} />
      <Route path="/play/:roomId/:playerId" element={<QuizGamePlayPage />} />
      <Route path="/admin-join/:roomId" element={<AdminJoinPage />} />
    </Routes>
  );
}

