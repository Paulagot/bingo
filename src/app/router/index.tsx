// src/app/router/index.tsx
// Router configuration

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense } from 'react';
import { routes } from './routes';

const LoadingSpinner = ({
  message = 'Loading...',
  subMessage,
}: {
  message?: string;
  subMessage?: string;
}) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <h2 className="heading-2">{message}</h2>
      {subMessage && <p className="text-fg/70 text-sm">{subMessage}</p>}
    </div>
  </div>
);

// Only the live game routes should be socket-enabled
const isGameRoute = (pathname: string) =>
  /^\/quiz\/(game|play|host-dashboard|host-controls|join|admin-join)\b/.test(pathname);

export function AppRouter() {
  const location = useLocation();
  const pathname = location.pathname;
  const hideOnPaths = ['/pitch-deck-content', '/BingoBlitz'];
  const hideOnPrefixes = ['/quiz/game', '/quiz/play', '/quiz/host-dashboard', '/quiz/host-controls'];
  const showHeader =
    !hideOnPaths.includes(pathname) &&
    !hideOnPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <Suspense fallback={<LoadingSpinner message="Loading page" />}>
              {route.element}
            </Suspense>
          }
        />
      ))}
      <Route
        path="*"
        element={
          <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="text-center">
              <h1 className="text-fg mb-4 text-2xl font-bold">Page Not Found</h1>
              <p className="text-fg/70 mb-4">The page you're looking for doesn't exist.</p>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

