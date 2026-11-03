export type AuthErrorKind = 'credentials' | 'rate_limit' | 'busy' | 'validation' | 'other';
export class AuthActionError extends Error {
  constructor(message: string, public readonly kind: AuthErrorKind, public readonly retryAt?: number) {
    super(message); this.name = 'AuthActionError';
  }
}
export function authServiceError(error: { message: string; status?: number; code?: string }): AuthActionError {
  const legacyCredentials = !error.code && error.status === 400 && /^invalid login credentials\.?$/i.test(error.message);
  if (error.code === 'invalid_credentials' || legacyCredentials) return new AuthActionError('Não foi possível entrar. Confira seu e-mail e sua senha.', 'credentials');
  if (error.status === 429 || ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(error.code ?? '')) {
    // Supabase's SDK does not expose a reliable Retry-After for every Auth response.
    // This is a local pause before retrying, not a claim about the server's reset time.
    return new AuthActionError('Muitas solicitações ao serviço. Aguarde antes de tentar novamente.', 'rate_limit', Date.now() + 60_000);
  }
  if (error.code === 'email_not_confirmed') return new AuthActionError('Confirme seu e-mail antes de entrar.', 'other');
  return new AuthActionError(error.message, 'other');
}
