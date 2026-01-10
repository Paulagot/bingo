// src/components/Quiz/QuizRoutes.tsx
import { Routes, Route } from 'react-router-dom';

import HostDashboard from './dashboard/HostDashboard';
import QuizGameWaitingPage from './game/QuizGameWaitingPage';
import QuizGamePlayPage from './game/QuizGamePlayPage';
import AdminJoinPage from './game/AdminJoinPage';
import HostControlsPage from './game/HostControlsPage';
import JoinRoomPage from './joinroom/JoinRoomPage';
import DemoPage from '../../pages/QuizDemo';
import QuizFeaturesPage from '../../pages/QuizFeaturesPage';
import QuizUseCasesPage from '../../pages/QuizUseCasesPage';
import UsecaseSchoolPage from '../../pages/usecases/UsecaseSchoolPage';
import UsecaseClubsPage from '../../pages/usecases/UsecaseClubsPage';
import UsecaseCharitiesPage from '../../pages/usecases/UsecaseCharitiesPage';
import UsecaseCommunityGroupsPage from '../../pages/usecases/UsecaseCommunityGroupsPage';
import HowItWorksPage from '../../pages/HowItWorks'
import QuizEventDashboard from '../mgtsystem/components/dashboard/QuizEventDashboard'; // adjust path to where you created it

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
      <Route path="eventdashboard" element={<QuizEventDashboard />} />


      {/* marketing pages under /quiz/ */}
      <Route path="demo" element={<DemoPage />} />
      <Route path="features" element={<QuizFeaturesPage />} />
      <Route path="use-cases" element={<QuizUseCasesPage />} />
      <Route path="use-cases/schools" element={<UsecaseSchoolPage />} />
      <Route path="use-cases/clubs" element={<UsecaseClubsPage />} />
      <Route path="use-cases/charities" element={<UsecaseCharitiesPage />} />
      <Route path="use-cases/community-groups" element={<UsecaseCommunityGroupsPage />} />
      <Route path ="how-it-works" element={<HowItWorksPage/>}   /> 
    
    </Routes>
  );
}
