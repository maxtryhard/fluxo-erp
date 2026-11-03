import { authAttemptPolicies, cleanAttemptState, emptyAttemptState, recordAuthAttempt, waitUntil, type AttemptState, type AuthMode } from '../utils/authAttemptPolicy';
import { AuthActionError } from './authErrors';

export const authAttemptStorageKey = 'fluxo.auth-attempts.v1';
export const authAttemptEvent = 'fluxo:auth-attempts';
type AttemptStore = Record<AuthMode, AttemptState>;
let fallback: AttemptStore = { login: emptyAttemptState(), register: emptyAttemptState() };
let running = false;
function readStore(): AttemptStore {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(authAttemptStorageKey) ?? '{}');
    const input = value && typeof value === 'object' ? value as Partial<AttemptStore> : {};
    fallback = { login: cleanAttemptState(input.login, 'login', Date.now()), register: cleanAttemptState(input.register, 'register', Date.now()) };
  } catch { /* Storage may be unavailable; retain the in-memory policy. */ }
  return fallback;
}
export function getAuthAttemptState(mode: AuthMode): AttemptState {
  return cleanAttemptState(readStore()[mode], mode, Date.now());
}
function update(mode: AuthMode, change: (current: AttemptState) => AttemptState): void {
  const store = readStore();
  fallback = { ...store, [mode]: change(cleanAttemptState(store[mode], mode, Date.now())) };
  try { localStorage.setItem(authAttemptStorageKey, JSON.stringify(fallback)); } catch { /* In-memory fallback still prevents bursts within this page. */ }
  window.dispatchEvent(new Event(authAttemptEvent));
}

async function attempt<T>(mode: AuthMode, action: () => Promise<T>): Promise<T> {
  const now = Date.now(), state = getAuthAttemptState(mode);
  if (waitUntil(state) > now) throw new AuthActionError('Aguarde antes de tentar novamente.', 'rate_limit', waitUntil(state));
  update(mode, (current) => ({ ...current, nextAllowedAt: now + authAttemptPolicies[mode].intervalMs }));
  // Signup limits requests, not incorrect passwords. Validation precedes this call.
  if (mode === 'register') update(mode, (current) => recordAuthAttempt(current, mode, now));
  try {
    const result = await action();
    if (mode === 'login') update(mode, emptyAttemptState);
    return result;
  } catch (error) {
    if (error instanceof AuthActionError) {
      if (mode === 'login' && error.kind === 'credentials') update(mode, (current) => recordAuthAttempt(current, mode, Date.now()));
      if (error.kind === 'rate_limit') update(mode, (current) => ({ ...current, nextAllowedAt: Math.max(current.nextAllowedAt, error.retryAt ?? Date.now() + 60_000) }));
    }
    throw error;
  }
}

export async function withAuthAttempt<T>(mode: AuthMode, action: () => Promise<T>): Promise<T> {
  if (running) throw new AuthActionError('Já existe uma solicitação em andamento. Aguarde.', 'busy');
  running = true;
  try {
    if (navigator.locks) {
      // One outstanding request across tabs on browsers supporting Web Locks.
      return await navigator.locks.request('fluxo:auth-submit', { ifAvailable: true }, (lock) => {
        if (!lock) throw new AuthActionError('Existe uma solicitação em outra aba. Aguarde.', 'busy');
        return attempt(mode, action);
      });
    }
    // Stored intervals synchronize tabs; exact cross-tab exclusion requires Web Locks.
    return await attempt(mode, action);
  } finally { running = false; }
}
