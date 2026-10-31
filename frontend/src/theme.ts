export type Theme = 'light' | 'dark';
const preferenceKey = 'fluxo.theme';

export function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(preferenceKey);
    return value === 'dark' || value === 'light' ? value : null;
  } catch { return null; }
}

export function preferredTheme(): Theme {
  return savedTheme() ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

export function applyTheme(theme: Theme, persist = false): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#17191e' : '#f3f2ee');
  if (persist) {
    try { localStorage.setItem(preferenceKey, theme); } catch { /* The toggle still works when storage is unavailable. */ }
  }
}
