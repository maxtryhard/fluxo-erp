import { useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LoginScreen, type AccessCallbacks } from './LoginScreen';
import { ProductPresentation } from './ProductPresentation';
import { LandingBackground } from './LandingBackground';

import type { PublicPage } from '../routing/routes';
import { Link } from '../routing/Link';

export function PublicEntry({ page, ...props }: AccessCallbacks & { page: PublicPage }) {
  const initialPage = useRef(page);
  useEffect(() => {
    if (initialPage.current === page) return;
    initialPage.current = page;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById(page === 'home' ? 'entry-title' : 'access-title')?.focus({ preventScroll: true });
  }, [page]);
  return <div className={`login-layout entry-page entry-${page}`}>
    {page === 'home' && <LandingBackground />}
    <header className="entry-header">
      <Link className="brand entry-brand" to="/" aria-label="Fluxo — início"><span className="brand-icon"><Activity size={23} /></span><span>fluxo</span></Link>
      {page === 'home' && <nav className="entry-section-nav" aria-label="Sobre o sistema"><a href="#apresentacao">O sistema</a><a href="#funcionamento">Como funciona</a></nav>}
      <nav className="entry-header-nav" aria-label="Acesso ao Fluxo"><Link to="/entrar" aria-current={page === 'login' ? 'page' : undefined}>Entrar</Link><Link to="/cadastro" className="entry-register-link" aria-current={page === 'register' ? 'page' : undefined}>Cadastrar</Link></nav>
      <ThemeToggle />
    </header>
    {page === 'home' ? <main className="entry-main"><ProductPresentation /></main> : <main className="entry-auth-main"><LoginScreen key={page} {...props} mode={page} /></main>}
  </div>;
}
