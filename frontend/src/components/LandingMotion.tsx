import { useEffect, useRef, useState, type RefObject } from 'react';
import { Pause, Play } from 'lucide-react';

const preferenceKey = 'fluxo.landing.motion';

export function useLandingMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(preferenceKey) !== 'paused'; } catch { return true; }
  });
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(preferenceKey, next ? 'enabled' : 'paused'); } catch { /* Motion remains controllable without storage. */ }
  };
  return { paused: reduced || !enabled, reduced, toggle };
}

export function MotionControl({ paused, reduced, onToggle }: { paused: boolean; reduced: boolean; onToggle: () => void }) {
  const Icon = paused ? Play : Pause;
  return <button type="button" className="entry-motion-control" disabled={reduced} aria-pressed={paused} onClick={onToggle}
    title={reduced ? 'A preferência de movimento reduzido do seu dispositivo está ativa.' : undefined}>
    <Icon size={14} aria-hidden="true" />{reduced ? 'Movimento reduzido' : paused ? 'Ativar animações' : 'Pausar animações'}
  </button>;
}

/** Reveal once, with content visible by default if observers are unavailable. */
export function useLandingReveals(root: RefObject<HTMLElement>, paused: boolean) {
  const seen = useRef(new WeakSet<Element>());
  useEffect(() => {
    const elements = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-reveal]') ?? []);
    if (paused || !('IntersectionObserver' in window)) {
      elements.forEach((element) => { element.dataset.revealed = 'true'; seen.current.add(element); });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.revealed = 'true';
        seen.current.add(entry.target);
        observer.unobserve(entry.target);
      }
    }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
    for (const element of elements) {
      if (seen.current.has(element)) { element.dataset.revealed = 'true'; continue; }
      element.dataset.revealed = 'false';
      observer.observe(element);
    }
    return () => observer.disconnect();
  }, [root, paused]);
}
