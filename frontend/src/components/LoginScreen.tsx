import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from '../routing/Link';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, UserRound } from 'lucide-react';
import { useAuthAttemptLimit } from '../hooks/useAuthAttemptLimit';
import { emailValidationError, normalizeAuthEmail } from '../utils/authValidation';

export type AccessMode = 'login' | 'register';
export type AccessCallbacks = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  error: string;
};

export function LoginScreen({ onLogin, onRegister, error, mode }: AccessCallbacks & { mode: AccessMode }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const [emailError, setEmailError] = useState('');
  const pending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const confirmation = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const limit = useAuthAttemptLimit(mode);
  const passwordsDiffer = mode === 'register' && formError === 'As senhas informadas não coincidem.';
  useEffect(() => {
    if (passwordsDiffer) confirmation.current?.focus();
    else if (error || formError) feedback.current?.focus();
  }, [error, formError, passwordsDiffer]);
  useEffect(() => {
    if (submitted) document.getElementById('access-title')?.focus();
  }, [submitted]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current || limit.blocked) return;
    setFormError('');
    const validation = emailValidationError(email);
    setEmailError(validation ?? '');
    if (validation) { emailInput.current?.focus(); return; }
    if (!(event.currentTarget as HTMLFormElement).reportValidity()) return;
    if (mode === 'register' && password !== confirmPassword) {
      setFormError('As senhas informadas não coincidem.'); return;
    }
    pending.current = true;
    setSubmitting(true);
    try {
      if (mode === 'register') {
        await onRegister(name, normalizeAuthEmail(email), password);
        setSubmitted(true);
      } else {
        await onLogin(normalizeAuthEmail(email), password);
      }
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : 'Não foi possível concluir. Tente novamente.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };
  return (
      <section className="login-panel" id="acesso" aria-labelledby="access-title" tabIndex={-1}>
        <Link className="entry-back" to="/"><ArrowLeft size={16} aria-hidden="true" />Voltar à apresentação</Link>
        <header className="login-header">
          <div className="auth-switch">
            <span>{submitted ? 'Cadastro enviado' : mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}</span>
            <Link to={submitted || mode === 'register' ? '/entrar' : '/cadastro'} aria-disabled={submitting || undefined} onClick={(event) => { if (submitting) event.preventDefault(); }}>
              {submitted ? 'Entrar' : mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </Link>
          </div>
        </header>
        <div className="login-content">
          {submitted ? (
            <div className="login-form registration-success" role="status">
              <span className="success-mark"><Check size={23} aria-hidden="true" /></span>
              <h1 id="access-title" tabIndex={-1}>Cadastro em análise</h1>
              <p>Um administrador precisa aprovar seu acesso e definir sua área antes de você entrar no sistema.</p>
              <div className="pending-note"><ShieldCheck size={17} aria-hidden="true" /><span>Você poderá entrar com este e-mail e senha após a aprovação.</span></div>
            </div>
          ) : (
            <form className="login-form" noValidate onSubmit={(event) => void submit(event)}>
              <span className="entry-form-icon" aria-hidden="true"><UserRound size={22} /></span>
              <h1 id="access-title" tabIndex={-1}>{mode === 'login' ? 'Acesse sua conta' : 'Solicite seu cadastro'}</h1>
              <p>{mode === 'login' ? 'Entre para acompanhar o trabalho da sua equipe.' : 'Um administrador aprovará seu acesso e atribuirá sua área.'}</p>
              {(error || formError) && <div ref={feedback} id="auth-form-feedback" className="alert login-alert" role="alert" tabIndex={-1}>{formError || error}</div>}
              {mode === 'register' && <label className="field-label">Nome completo<input type="text" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></label>}
              <label className="field-label">E-mail<input ref={emailInput} type="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required value={email}
                aria-invalid={emailError ? true : undefined} aria-describedby={emailError ? 'auth-email-error' : undefined}
                onChange={(event) => { setEmail(event.target.value); if (emailError) setEmailError(emailValidationError(event.target.value) ?? ''); }}
                onBlur={() => { if (email) setEmailError(emailValidationError(email) ?? ''); setEmail(normalizeAuthEmail(email)); }} placeholder="voce@empresa.com" />
                {emailError && <span id="auth-email-error" className="auth-field-error" role="alert">{emailError}</span>}
              </label>
              <label className="field-label">Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 6 : 12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'Mínimo de 12 caracteres' : 'Digite sua senha'} /></label>
              {mode === 'register' && <label className="field-label">Confirme a senha<input ref={confirmation} type="password" autoComplete="new-password" minLength={12} maxLength={128} required aria-invalid={passwordsDiffer || undefined} aria-describedby={passwordsDiffer ? 'auth-form-feedback' : undefined} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" /></label>}
              {limit.blocked ? <div className="auth-wait" aria-live="polite"><span>{limit.lockout ? 'Limite de tentativas atingido neste navegador.' : 'Aguarde antes de enviar novamente.'}</span><span role="timer" aria-live="off">Tente novamente em {limit.remaining}.</span></div>
                : limit.hasAttempts && <p className="auth-attempts" role="status">{limit.attemptsLeft === 1 ? 'Resta 1 tentativa antes da pausa.' : `Restam ${limit.attemptsLeft} tentativas antes da pausa.`}</p>}
              <button className="primary-button login-submit" disabled={submitting || limit.blocked} aria-describedby={limit.blocked ? 'auth-wait-hint' : undefined}>{submitting ? 'Aguarde…' : limit.blocked ? `Aguarde ${limit.remaining}` : mode === 'login' ? 'Entrar na plataforma' : 'Enviar solicitação'}<ArrowRight size={17} aria-hidden="true" /></button>
              {limit.blocked && <span id="auth-wait-hint" className="auth-attempts">O envio será liberado ao terminar a espera.</span>}
            </form>
          )}
        </div>
        <footer className="login-footer">
          <span>Fluxo · Gestão integrada</span>
          <span><ShieldCheck size={15} aria-hidden="true" /> Conexão protegida</span>
        </footer>
      </section>
  );
}
