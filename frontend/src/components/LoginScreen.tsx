import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, ShieldCheck, UserRound } from 'lucide-react';

export type AccessMode = 'login' | 'register';
export type AccessCallbacks = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<boolean>;
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
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          setFormError('As senhas informadas não coincidem.');
          return;
        }
        setSubmitted(await onRegister(name, email, password));
      } else {
        await onLogin(email, password);
      }
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  };
  return (
      <section className="login-panel" id="acesso" aria-labelledby="access-title" tabIndex={-1}>
        <a className="entry-back" href="#/"><ArrowLeft size={16} />Voltar à apresentação</a>
        <header className="login-header">
          <div className="auth-switch">
            <span>{submitted ? 'Cadastro enviado' : mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}</span>
            <a href={submitted || mode === 'register' ? '#/entrar' : '#/cadastro'} aria-disabled={submitting || undefined} onClick={(event) => { if (submitting) event.preventDefault(); }}>
              {submitted ? 'Entrar' : mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </a>
          </div>
        </header>
        <div className="login-content">
          {submitted ? (
            <div className="login-form registration-success" role="status">
              <span className="success-mark"><Check size={23} /></span>
              <span className="login-overline">SOLICITAÇÃO ENVIADA</span>
              <h1 id="access-title" tabIndex={-1}>Cadastro em análise</h1>
              <p>Um administrador precisa aprovar seu acesso e definir sua área antes de você entrar no sistema.</p>
              <div className="pending-note"><ShieldCheck size={17} /><span>Você poderá entrar com este e-mail e senha após a aprovação.</span></div>
            </div>
          ) : (
            <form className="login-form" onSubmit={(event) => void submit(event)}>
              <span className="entry-form-icon" aria-hidden="true"><UserRound size={22} /></span>
              <span className="login-overline">{mode === 'login' ? 'BEM-VINDO(A) DE VOLTA' : 'ACESSO À PLATAFORMA'}</span>
              <h1 id="access-title" tabIndex={-1}>{mode === 'login' ? 'Acesse sua conta' : 'Solicite seu cadastro'}</h1>
              <p>{mode === 'login' ? 'Entre para acompanhar o trabalho da sua equipe.' : 'Um administrador aprovará seu acesso e atribuirá sua área.'}</p>
              {(error || formError) && <div className="alert login-alert" role="alert">{formError || error}</div>}
              {mode === 'register' && <label className="field-label">Nome completo<input type="text" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Seu nome" /></label>}
              <label className="field-label">E-mail corporativo<input type="email" autoComplete="username" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" /></label>
              <label className="field-label">Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'login' ? 6 : 12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'Mínimo de 12 caracteres' : 'Digite sua senha'} /></label>
              {mode === 'register' && <label className="field-label">Confirme a senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Digite a senha novamente" /></label>}
              <button className="primary-button login-submit" disabled={submitting}>{submitting ? 'Aguarde...' : mode === 'login' ? 'Entrar na plataforma' : 'Enviar solicitação'}<ArrowRight size={17} /></button>
            </form>
          )}
        </div>
        <footer className="login-footer">
          <span>Fluxo · Gestão integrada</span>
          <span><ShieldCheck size={15} /> Conexão protegida</span>
        </footer>
      </section>
  );
}
