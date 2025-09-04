// client/src/components/auth/AuthPage.tsx
import  { useState } from 'react';
import ClubRegistrationForm from './ClubRegistrationForm';
import LoginForm from './LogInForm';

export default function AuthPage() {
  const [showRegister, setShowRegister] = useState(false);

  const switchToLogin = () => setShowRegister(false);
  const switchToRegister = () => setShowRegister(true);

  if (showRegister) {
    return (
      <ClubRegistrationForm
        onSwitchToLogin={switchToLogin}
      />
    );
  }

  return (
    <LoginForm
      onSwitchToRegister={switchToRegister}
    />
  );
}