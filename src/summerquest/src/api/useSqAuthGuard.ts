import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredToken, clearStoredToken, SummerQuestApiError } from './sqApiClient';

// Call at the top of any protected page. Redirects immediately if
// there's no token at all, and exposes handleApiError so pages can
// redirect on a 401 from an expired/invalid token too (e.g. token
// expired mid-session).

export function useSummerQuestAuthGuard(loginPath: string) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getStoredToken()) {
      navigate(loginPath, { replace: true });
    }
  }, [loginPath, navigate]);

  function handleApiError(err: unknown) {
    if (err instanceof SummerQuestApiError && err.status === 401) {
      clearStoredToken();
      navigate(loginPath, { replace: true });
      return true;
    }
    return false;
  }

  return { handleApiError };
}
