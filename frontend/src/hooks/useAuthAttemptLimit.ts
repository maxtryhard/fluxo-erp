import { useEffect, useState } from 'react';
import { authAttemptEvent, authAttemptStorageKey, getAuthAttemptState } from '../services/authAttempts';
import { authAttemptPolicies, formatAuthWait, waitUntil, type AuthMode } from '../utils/authAttemptPolicy';

export function useAuthAttemptLimit(mode: AuthMode) {
  const [state, setState] = useState(() => getAuthAttemptState(mode));
  const [now, setNow] = useState(Date.now);
  const deadline = waitUntil(state);
  useEffect(() => {
    const sync = () => { setState(getAuthAttemptState(mode)); setNow(Date.now()); };
    const storage = (event: StorageEvent) => { if (event.key === authAttemptStorageKey || event.key === null) sync(); };
    sync();
    window.addEventListener(authAttemptEvent, sync); window.addEventListener('storage', storage);
    window.addEventListener('focus', sync); document.addEventListener('visibilitychange', sync);
    const timer = deadline > Date.now() ? window.setInterval(sync, 1000) : undefined;
    return () => {
      clearInterval(timer); window.removeEventListener(authAttemptEvent, sync); window.removeEventListener('storage', storage);
      window.removeEventListener('focus', sync); document.removeEventListener('visibilitychange', sync);
    };
  }, [mode, deadline]);
  return { blocked: deadline > now, remaining: formatAuthWait(deadline - now),
    attemptsLeft: Math.max(0, authAttemptPolicies[mode].limit - state.attempts.length),
    hasAttempts: state.attempts.length > 0, lockout: state.blockedUntil > now };
}
