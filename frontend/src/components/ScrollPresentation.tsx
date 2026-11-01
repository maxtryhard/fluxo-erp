import { useEffect, useRef, type ReactNode } from 'react';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);

export function ScrollPresentation({ children, onSectorChange }: { children: ReactNode; onSectorChange: (index: number) => void }) {
  const scene = useRef<HTMLDivElement>(null);
  const changeSector = useRef(onSectorChange);
  changeSector.current = onSectorChange;

  useEffect(() => {
    const element = scene.current;
    const stage = element?.querySelector<HTMLElement>('.entry-showcase');
    const content = stage?.querySelector<HTMLElement>('.entry-floating-content');
    if (!element || !stage || !content) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let start = 0;
    let distance = 1;
    let baseHeight = 460;
    let baseWidth = 0;
    let fullHeight = 0;
    let fullWidth = 0;
    let enabled = false;
    let lastSector = -1;
    let previousProgress = -1;
    let previousTime = 0;
    let cardScale = 1;
    const paint = (time: number) => {
      frame = 0;
      if (!enabled) return;
      const target = clamp((scrollY - start) / distance);
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 16;
      previousTime = time;
      const difference = target - previousProgress;
      const progress = previousProgress < 0 || Math.abs(difference) < .0004 ? target : previousProgress + difference * (1 - Math.exp(-elapsed / 80));
      if (progress === previousProgress) return;
      previousProgress = progress;
      const growth = progress < .25 ? ease(progress / .25) : progress > .78 ? ease((1 - progress) / .22) : 1;
      stage.style.setProperty('--scene-width', `${baseWidth + (fullWidth - baseWidth) * growth}px`);
      stage.style.setProperty('--scene-height', `${baseHeight + (fullHeight - baseHeight) * growth}px`);
      stage.style.setProperty('--scene-radius', `${26 - growth * 10}px`);
      stage.style.setProperty('--scene-card-scale', String(1 + (cardScale - 1) * growth));
      if (progress > .25 && progress < .79) {
        const sector = Math.min(3, Math.floor((progress - .25) / .135));
        if (sector !== lastSector) { lastSector = sector; changeSector.current(sector); }
      }
      if (Math.abs(target - progress) >= .0004) schedule();
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const measure = () => {
      baseWidth = element.clientWidth;
      stage.style.setProperty('--scene-card-width', `${Math.min(820, baseWidth - 48)}px`);
      baseHeight = Math.max(460, content.offsetHeight + 96);
      fullHeight = innerHeight - 32;
      fullWidth = Math.max(baseWidth, document.documentElement.clientWidth - 32);
      cardScale = Math.max(1, Math.min(1.18, (fullWidth - 96) / content.offsetWidth, (fullHeight - 120) / content.offsetHeight));
      enabled = !motion.matches && fullHeight > baseHeight + 40;
      element.style.setProperty('--scene-tail', `${Math.max(0, fullHeight - baseHeight)}px`);
      element.dataset.scroll = enabled ? 'active' : 'static';
      if (!enabled) {
        stage.style.removeProperty('--scene-width'); stage.style.removeProperty('--scene-height'); stage.style.removeProperty('--scene-radius'); stage.style.removeProperty('--scene-card-scale');
      }
      start = element.getBoundingClientRect().top + scrollY - 16;
      distance = Math.max(1, element.offsetHeight - fullHeight);
      previousProgress = -1;
      previousTime = 0;
      schedule();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(content);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    motion.addEventListener('change', measure);
    measure();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure); motion.removeEventListener('change', measure);
    };
  }, []);

  return <div className="entry-scroll-scene" ref={scene}><div className="entry-scroll-pin">{children}</div></div>;
}
