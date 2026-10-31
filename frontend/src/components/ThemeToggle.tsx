import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { applyTheme, preferredTheme, savedTheme, type Theme } from '../theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => { const next = preferredTheme(); applyTheme(next); setTheme(next); };
    const systemChange = () => { if (!savedTheme()) sync(); };
    const storageChange = (event: StorageEvent) => { if (event.key === 'fluxo.theme' || event.key === null) sync(); };
    media.addEventListener('change', systemChange);
    window.addEventListener('storage', storageChange);
    return () => { media.removeEventListener('change', systemChange); window.removeEventListener('storage', storageChange); };
  }, []);
  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';
  return (
    <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={() => {
      const next = theme === 'dark' ? 'light' : 'dark'; applyTheme(next, true); setTheme(next);
    }}>{theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button>
  );
}
