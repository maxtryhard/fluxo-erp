import { useEffect, useRef } from 'react';

export function LandingBackground() {
  const background = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sync = () => { if (background.current) background.current.dataset.paused = String(document.hidden); };
    document.addEventListener('visibilitychange', sync);
    sync();
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  return <div className="entry-ambient" ref={background} aria-hidden="true"><svg viewBox="0 0 1600 1100" preserveAspectRatio="xMidYMid slice" fill="none"><path d="M-180 720C160 110 390 1120 760 550S1260 120 1770 380" /><path d="M-120 820C230 210 420 1220 810 650S1320 210 1810 480" /></svg></div>;
}
