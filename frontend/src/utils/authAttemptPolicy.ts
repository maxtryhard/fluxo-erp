export type AuthMode = 'login' | 'register';
export type AttemptState = { attempts: number[]; blockedUntil: number; nextAllowedAt: number };
export const authAttemptPolicies = {
  login: { limit: 5, windowMs: 10 * 60_000, pauseMs: 5 * 60_000, intervalMs: 2_000 },
  register: { limit: 3, windowMs: 10 * 60_000, pauseMs: 10 * 60_000, intervalMs: 60_000 },
} as const;
export const emptyAttemptState = (): AttemptState => ({ attempts: [], blockedUntil: 0, nextAllowedAt: 0 });

export function cleanAttemptState(value: unknown, mode: AuthMode, now: number): AttemptState {
  if (!value || typeof value !== 'object') return emptyAttemptState();
  const input = value as Partial<AttemptState>;
  const policy = authAttemptPolicies[mode];
  const timestamp = (n: unknown): number => typeof n === 'number' && Number.isFinite(n) && n > now ? n : 0;
  const blockedUntil = timestamp(input.blockedUntil);
  // Completing a lockout starts a fresh attempt window.
  if (typeof input.blockedUntil === 'number' && input.blockedUntil > 0 && !blockedUntil) {
    return { ...emptyAttemptState(), nextAllowedAt: timestamp(input.nextAllowedAt) };
  }
  return {
    attempts: Array.isArray(input.attempts) ? input.attempts.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n <= now && n > now - policy.windowMs).slice(-policy.limit) : [],
    blockedUntil, nextAllowedAt: timestamp(input.nextAllowedAt),
  };
}
export function recordAuthAttempt(state: AttemptState, mode: AuthMode, now: number): AttemptState {
  const current = cleanAttemptState(state, mode, now);
  const policy = authAttemptPolicies[mode];
  const attempts = [...current.attempts, now].slice(-policy.limit);
  return { ...current, attempts, blockedUntil: attempts.length >= policy.limit ? now + policy.pauseMs : current.blockedUntil };
}
export function waitUntil(state: AttemptState): number { return Math.max(state.blockedUntil, state.nextAllowedAt); }
export function formatAuthWait(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
