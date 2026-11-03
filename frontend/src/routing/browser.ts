import { useEffect, useMemo, useSyncExternalStore } from 'react';

const navigationEvent = 'fluxo:navigation';
const snapshot = () => location.pathname + location.search + location.hash;
const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  window.addEventListener('hashchange', listener);
  window.addEventListener(navigationEvent, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener('hashchange', listener);
    window.removeEventListener(navigationEvent, listener);
  };
};

export function navigate(to: string, options: { replace?: boolean } = {}): void {
  const url = new URL(to, location.href);
  if (url.origin !== location.origin || !to.startsWith('/') || to.startsWith('//')) throw new Error('Destino de navegação inválido.');
  const destination = url.pathname + url.search + url.hash;
  if (destination === snapshot()) return;
  history[options.replace ? 'replaceState' : 'pushState'](null, '', destination);
  window.dispatchEvent(new Event(navigationEvent));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export function useBrowserRoute(): URL {
  const key = useSyncExternalStore(subscribe, snapshot, () => '/');
  useEffect(() => {
    // Preserve old public links; never reinterpret Supabase's auth callback fragments.
    if (location.pathname !== '/') return;
    const old = location.hash;
    const path = old === '#/' ? '/' : old === '#/entrar' ? '/entrar' : old === '#/cadastro' ? '/cadastro' : undefined;
    if (path) navigate(path + location.search, { replace: true });
  }, []);
  return useMemo(() => new URL(key, location.origin), [key]);
}
