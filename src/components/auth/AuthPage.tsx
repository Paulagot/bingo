// client/src/components/auth/AuthPage.tsx
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ClubRegistrationForm from './ClubRegistrationForm';
import LoginForm from './LogInForm';


type AuthMode = 'login' | 'register';

interface AuthPageProps {
  initialMode?: AuthMode;
}

export default function AuthPage({ initialMode }: AuthPageProps) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const modeFromQuery = params.get('mode') as AuthMode | null;

  const startInRegister = useMemo(() => {
    if (modeFromQuery) return modeFromQuery === 'register';
    if (initialMode) return initialMode === 'register';
    return false;
  }, [modeFromQuery, initialMode]);

  const [showRegister, setShowRegister] = useState<boolean>(startInRegister);

  const switchToLogin = () => setShowRegister(false);
  const switchToRegister = () => setShowRegister(true);

  return showRegister ? (
    <ClubRegistrationForm onSwitchToLogin={switchToLogin} />
  ) : (
    <LoginForm onSwitchToRegister={switchToRegister} />
  );
}
