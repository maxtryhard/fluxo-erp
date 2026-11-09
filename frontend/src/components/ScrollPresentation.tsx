import { useEffect, useRef, type ReactNode } from 'react';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => value * value * (3 - 2 * value);

export function ScrollPresentation({ children, onSectorChange, paused = false }: { children: ReactNode; onSectorChange: (index: number) => void; paused?: boolean }) {
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
    let enabled = false;
    let lastSector = -1;
    let progress = -1;
    let previousTime = 0;
    let baseHeight = 460;
    let fullHeight = 460;
    let widthRatio = 1;
    let heightRatio = 1;
    let cardScale = 1;

    const paint = (time: number) => {
      frame = 0;
      if (!enabled || document.hidden) return;
      const target = clamp((scrollY - start) / distance);
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 16;
      previousTime = time;
      const difference = target - progress;
      const next = progress < 0 || Math.abs(difference) < .0004 ? target : progress + difference * (1 - Math.exp(-elapsed / 85));
      if (next === progress) return;
      progress = next;
      const growth = progress < .24 ? ease(progress / .24) : progress > .8 ? ease((1 - progress) / .2) : 1;
      // Geometry is cached on resize. Scroll only changes transforms and opacity, never layout dimensions.
      stage.style.setProperty('--scene-mesh-x', String(1 + (widthRatio - 1) * growth));
      stage.style.setProperty('--scene-mesh-y', String(1 + (heightRatio - 1) * growth));
      stage.style.setProperty('--scene-shift', `${(fullHeight - baseHeight) / 2 * growth}px`);
      stage.style.setProperty('--scene-card-scale', String(1 + (cardScale - 1) * growth));
      stage.style.setProperty('--scene-card-tilt', `${1.5 * Math.sin(Math.PI * growth)}deg`);
      if (progress > .25 && progress < .79) {
        const sector = Math.min(3, Math.floor((progress - .25) / .135));
        if (sector !== lastSector) { lastSector = sector; changeSector.current(sector); }
      }
      if (Math.abs(target - progress) >= .0004) schedule();
    };
    const schedule = () => { if (enabled && !document.hidden && !frame) frame = requestAnimationFrame(paint); };
    const measure = () => {
      const baseWidth = element.clientWidth;
      stage.style.setProperty('--scene-card-width', `${Math.min(1040, baseWidth - 48)}px`);
      baseHeight = Math.max(460, content.offsetHeight + 96);
      fullHeight = innerHeight - 32;
      const fullWidth = Math.max(baseWidth, document.documentElement.clientWidth - 32);
      cardScale = Math.max(1, Math.min(1.10, (fullWidth - 96) / content.offsetWidth, (fullHeight - 120) / content.offsetHeight));
      enabled = !paused && !motion.matches && fullHeight > baseHeight + 40;
      widthRatio = fullWidth / baseWidth;
      heightRatio = fullHeight / baseHeight;
      stage.style.setProperty('--scene-base-height', `${baseHeight}px`);
      element.style.setProperty('--scene-tail', `${Math.max(0, fullHeight - baseHeight)}px`);
      element.dataset.scroll = enabled ? 'active' : 'static';
      if (!enabled) {
        cancelAnimationFrame(frame); frame = 0;
        for (const name of ['--scene-mesh-x', '--scene-mesh-y', '--scene-shift', '--scene-card-scale', '--scene-card-tilt']) stage.style.removeProperty(name);
      }
      start = element.getBoundingClientRect().top + scrollY - 16;
      distance = Math.max(1, element.offsetHeight - fullHeight);
      progress = -1; previousTime = 0;
      schedule();
    };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
      else schedule();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(content);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', measure);
    measure();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', measure);
    };
  }, [paused]);

  return <div className="entry-scroll-scene" ref={scene}><div className="entry-scroll-pin">{children}</div></div>;
}
