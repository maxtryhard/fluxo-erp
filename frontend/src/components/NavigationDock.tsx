import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Highlight = { left: number; width: number };
type Hint = { text: string; left: number; top: number };

/** Preserve existing authorized destinations while presenting them as an icon dock. */
export function NavigationDock({ activePage, children }: { activePage: string; children: ReactNode }) {
  const nav = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);

  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    const active = element.querySelector<HTMLElement>('[aria-current="page"]');
    const measure = () => {
      if (!active) { setHighlight(null); return; }
      const next = { left: active.offsetLeft, width: active.offsetWidth };
      setHighlight((previous) => previous?.left === next.left && previous.width === next.width ? previous : next);
    };
    measure();
    if (active) {
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < element.scrollLeft + 8) element.scrollLeft = Math.max(0, left - 8);
      else if (right > element.scrollLeft + element.clientWidth - 8) element.scrollLeft = right - element.clientWidth + 8;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll('button').forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [activePage, children]);

  const showHint = (target: EventTarget | null) => {
    const button = target instanceof Element ? target.closest<HTMLButtonElement>('button[aria-label]') : null;
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    setHint({ text: button.getAttribute('aria-label') ?? '', left: Math.max(115, Math.min(window.innerWidth - 115, bounds.left + bounds.width / 2)), top: Math.max(8, bounds.top - 42) });
  };

  return <>
    <nav ref={nav} className="horizontal-nav navigation-capsule" data-tour="navigation" aria-label="Navegação principal" data-highlight={!!highlight}
      onPointerOver={(event) => { if (event.pointerType === 'mouse') showHint(event.target); }}
      onClick={() => setHint(null)} onPointerLeave={() => setHint(null)} onFocus={(event) => showHint(event.target)} onBlur={() => setHint(null)} onScroll={() => setHint(null)}
      onKeyDown={(event) => { if (event.key === 'Escape') setHint(null); }}>
      {highlight && <span className="dock-highlight" aria-hidden="true" style={{ width: highlight.width, transform: `translateX(${highlight.left}px)` }} />}
      {children}
    </nav>
    {hint && createPortal(<span className="dock-hint" aria-hidden="true" style={{ left: hint.left, top: hint.top }}>{hint.text}</span>, document.body)}
  </>;
}
