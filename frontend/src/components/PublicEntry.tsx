import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { LoginScreen, type AccessCallbacks } from './LoginScreen';
import { ProductPresentation } from './ProductPresentation';
import { LandingBackground } from './LandingBackground';

type PublicPage = 'home' | 'login' | 'register';
function currentPage(): PublicPage {
  return location.hash === '#/entrar' ? 'login' : location.hash === '#/cadastro' ? 'register' : 'home';
}

export function PublicEntry(props: AccessCallbacks) {
  const [page, setPage] = useState(currentPage);
  const initialPage = useRef(page);
  useEffect(() => {
    const sync = () => setPage(currentPage());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => {
    if (initialPage.current === page) return;
    initialPage.current = page;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById(page === 'home' ? 'entry-title' : 'access-title')?.focus({ preventScroll: true });
  }, [page]);
  return <div className={`login-layout entry-page entry-${page}`}>
    {page === 'home' && <LandingBackground />}
    <header className="entry-header">
      <a className="brand entry-brand" href="#/" aria-label="Fluxo — início"><span className="brand-icon"><Activity size={23} /></span><span>fluxo</span></a>
      {page === 'home' && <nav className="entry-section-nav" aria-label="Sobre o sistema"><a href="#apresentacao">O sistema</a><a href="#funcionamento">Como funciona</a></nav>}
      <nav className="entry-header-nav" aria-label="Acesso ao Fluxo"><a href="#/entrar" aria-current={page === 'login' ? 'page' : undefined}>Entrar</a><a href="#/cadastro" className="entry-register-link" aria-current={page === 'register' ? 'page' : undefined}>Cadastrar</a></nav>
      <ThemeToggle />
    </header>
    {page === 'home' ? <main className="entry-main"><ProductPresentation /></main> : <main className="entry-auth-main"><LoginScreen key={page} {...props} mode={page} /></main>}
  </div>;
}
