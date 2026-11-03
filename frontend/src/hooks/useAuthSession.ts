import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import { canAccess } from '../routing/routes';
import { navigate } from '../routing/browser';

export function useAuthSession(onIdentityChange: () => void) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const current = useRef<User | null>(null);
  const epoch = useRef(0);
  const request = useRef(0);
  const reset = useRef(onIdentityChange);
  reset.current = onIdentityChange;
  const apply = useCallback((next: User | null, force = false) => {
    const valid = canAccess(next, 'overview') ? next : null;
    if (force || valid?.id !== current.current?.id || valid?.role !== current.current?.role) {
      epoch.current += 1;
      reset.current();
    }
    current.current = valid;
    setUser(valid);
  }, []);
  const acceptUser = useCallback((next: User) => {
    request.current += 1;
    apply(next);
    setSessionError(''); setLoading(false);
  }, [apply]);
  const clearSession = useCallback(() => {
    request.current += 1;
    apply(null, true);
    setLoading(false);
  }, [apply]);
  const updateUser = useCallback((update: (value: User) => User) => {
    if (current.current) { current.current = update(current.current); setUser(current.current); }
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer = 0;
    const verify = async () => {
      const version = ++request.current;
      try {
        const next = await api.currentUser();
        if (disposed || version !== request.current) return;
        apply(next); setSessionError('');
      } catch (error) {
        if (disposed || version !== request.current) return;
        apply(null);
        setSessionError(error instanceof Error ? error.message : 'Não foi possível verificar sua sessão.');
      } finally {
        if (!disposed && version === request.current) setLoading(false);
      }
    };
    const schedule = () => {
      if (document.hidden) return;
      clearTimeout(timer);
      timer = window.setTimeout(() => { void verify(); }, 0);
    };
    let unsubscribe = () => {};
    try {
      unsubscribe = api.observeSession((event) => {
        if (event === 'SIGNED_OUT') { const hadUser = !!current.current; clearSession(); if (hadUser) navigate('/entrar', { replace: true }); }
        else if (event !== 'INITIAL_SESSION') schedule();
      });
    } catch { /* Startup verification presents configuration errors through the existing UI. */ }
    void verify();
    window.addEventListener('focus', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      disposed = true; request.current += 1; clearTimeout(timer); unsubscribe();
      window.removeEventListener('focus', schedule); document.removeEventListener('visibilitychange', schedule);
    };
  }, [apply, clearSession]);
  return { user, loading, sessionError, acceptUser, clearSession, updateUser, epoch };
}
