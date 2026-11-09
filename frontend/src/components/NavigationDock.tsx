import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Highlight = { left: number; width: number };
type Hint = { text: string; anchor: number; bottom: number };

function DockHint({ hint }: { hint: Hint }) {
  const label = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ left: hint.anchor, top: hint.bottom - 42, arrow: 0 });
  useLayoutEffect(() => {
    if (!label.current) return;
    const { width, height } = label.current.getBoundingClientRect();
    const left = Math.max(width / 2 + 12, Math.min(innerWidth - width / 2 - 12, hint.anchor));
    setPosition({ left, top: Math.max(8, hint.bottom - height - 10), arrow: hint.anchor - left });
  }, [hint]);
  return <span ref={label} className="dock-hint" aria-hidden="true" style={{ left: position.left, top: position.top }}>
    {hint.text}<span className="dock-hint-arrow" style={{ left: `calc(50% + ${position.arrow}px)` }} />
  </span>;
}

/** Preserve existing authorized destinations while presenting them as an icon dock. */
export function NavigationDock({ activePage, children }: { activePage: string; children: ReactNode }) {
  const nav = useRef<HTMLElement>(null);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);

  useEffect(() => {
    if (!hint) return;
    const hide = () => setHint(null);
    window.addEventListener('scroll', hide, { passive: true });
    window.addEventListener('resize', hide);
    return () => { window.removeEventListener('scroll', hide); window.removeEventListener('resize', hide); };
  }, [hint]);

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
    element.querySelectorAll('button, a[href]').forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [activePage, children]);

  const showHint = (target: EventTarget | null) => {
    const button = target instanceof Element ? target.closest<HTMLElement>('button[aria-label], a[aria-label]') : null;
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    const next = { text: button.getAttribute('aria-label') ?? '', anchor: bounds.left + bounds.width / 2, bottom: bounds.top };
    setHint((previous) => previous?.text === next.text && previous.anchor === next.anchor && previous.bottom === next.bottom ? previous : next);
  };

  return <>
    <nav ref={nav} className="horizontal-nav navigation-capsule" data-tour="navigation" aria-label="Navegação principal" data-highlight={!!highlight}
      onPointerOver={(event) => { if (event.pointerType === 'mouse') showHint(event.target); }}
      onClick={() => setHint(null)} onPointerLeave={() => setHint(null)} onFocus={(event) => showHint(event.target)} onBlur={() => setHint(null)} onScroll={() => setHint(null)}
      onKeyDown={(event) => { if (event.key === 'Escape') setHint(null); }}>
      {highlight && <span className="dock-highlight" aria-hidden="true" style={{ width: highlight.width, transform: `translateX(${highlight.left}px)` }} />}
      {children}
    </nav>
    {hint && createPortal(<DockHint hint={hint} />, document.body)}
  </>;
}
