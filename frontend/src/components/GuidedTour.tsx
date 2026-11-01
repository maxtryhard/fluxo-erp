import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import type { GuideDestination } from '../content/systemGuide';
import type { TourStep } from '../content/systemTour';

type Box = { x: number; y: number; width: number; height: number };

export default function GuidedTour({ steps, onNavigate, onClose }: { steps: TourStep[]; onNavigate: (page: GuideDestination) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const bubble = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const navigation = useRef(onNavigate);
  navigation.current = onNavigate;
  const maskId = useId().replace(/:/g, '');
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [missing, setMissing] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const step = steps[index];

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);

  useEffect(() => {
    setBox(null); setMissing(false);
    navigation.current(step.page);
    let active = true;
    let prepared = false;
    let scrolled = false;
    let located = false;
    let frame = 0;
    let attempts = 0;
    const locate = () => {
      if (!active) return;
      const currentPage = document.querySelector('[data-tour-page]')?.getAttribute('data-tour-page');
      if (currentPage !== step.page) return;
      if (step.activate && !prepared) {
        const control = document.querySelector<HTMLButtonElement>(step.activate);
        if (!control) return;
        prepared = true;
        if (control.getAttribute('aria-pressed') !== 'true') { control.click(); return; }
      }
      const element = document.querySelector<HTMLElement>(step.target);
      if (!element || !element.getClientRects().length) return;
      if (!scrolled) {
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        scrolled = true;
      }
      located = true;
      const rect = element.getBoundingClientRect();
      const x = Math.max(6, rect.left - 7), y = Math.max(6, rect.top - 7);
      const next = { x, y, width: Math.max(0, Math.min(document.documentElement.clientWidth - 6, rect.right + 7) - x), height: Math.max(0, Math.min(innerHeight - 6, rect.bottom + 7) - y) };
      setMissing(false);
      setBox((previous) => previous && Object.keys(next).every((key) => Math.abs(previous[key as keyof Box] - next[key as keyof Box]) < 1) ? previous : next);
    };
    const retry = () => { locate(); if (active && ++attempts < 90) frame = requestAnimationFrame(retry); };
    frame = requestAnimationFrame(retry);
    const observer = new MutationObserver(locate);
    const page = document.querySelector('.main-area');
    if (page) observer.observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'data-tour-page'] });
    const timeout = window.setTimeout(() => {
      if (active && !located) setMissing(true);
    }, 2500);
    window.addEventListener('resize', locate);
    window.addEventListener('scroll', locate, true);
    title.current?.focus({ preventScroll: true });
    return () => {
      active = false; cancelAnimationFrame(frame); observer.disconnect(); clearTimeout(timeout);
      window.removeEventListener('resize', locate); window.removeEventListener('scroll', locate, true);
    };
  }, [step]);

  useEffect(() => {
    const element = bubble.current;
    if (!element) return;
    const place = () => {
      const width = element.offsetWidth, height = element.offsetHeight;
      const viewportWidth = document.documentElement.clientWidth;
      let top = box ? box.y + box.height + 18 : (innerHeight - height) / 2;
      if (top + height > innerHeight - 12) top = box && box.y - height - 18 > 12 ? box.y - height - 18 : innerHeight - height - 12;
      const left = Math.max(12, Math.min(viewportWidth - width - 12, box ? box.x + box.width / 2 - width / 2 : (viewportWidth - width) / 2));
      setPosition({ left, top: Math.max(12, top) });
    };
    place();
    const observer = new ResizeObserver(place); observer.observe(element);
    window.addEventListener('resize', place);
    return () => { observer.disconnect(); window.removeEventListener('resize', place); };
  }, [box, step]);

  return <dialog ref={dialog} className="guided-tour" aria-labelledby="tour-step-title" aria-describedby="tour-step-description"
    onClose={() => { if (!dialog.current?.open) onClose(); }}>
    <svg className="tour-shade" aria-hidden="true" width="100%" height="100%"><defs><mask id={maskId}><rect width="100%" height="100%" fill="white" />{box && <rect x={box.x} y={box.y} width={box.width} height={box.height} rx={16} fill="black" />}</mask></defs><rect width="100%" height="100%" fill="#11131bd9" mask={`url(#${maskId})`} /></svg>
    {box && <div className="tour-spotlight" aria-hidden="true" style={{ left: box.x, top: box.y, width: box.width, height: box.height }}><span>{index + 1}</span></div>}
    <section ref={bubble} className="tour-bubble" style={position}>
      <div className="tour-bubble-top"><span className="tour-progress" aria-live="polite">GUIA INTERATIVO · {index + 1} DE {steps.length}</span><button type="button" className="tour-close" aria-label="Sair do tour" onClick={onClose}><X size={18} /></button></div>
      <h2 id="tour-step-title" ref={title} tabIndex={-1}>{step.title}</h2><p id="tour-step-description">{step.body}</p>
      {!box && <p className="tour-wait" role="status">{missing ? 'Este elemento não está disponível agora. Você pode avançar ou voltar.' : 'Abrindo a área...'}</p>}
      <div className="tour-track" aria-hidden="true"><span style={{ width: `${(index + 1) / steps.length * 100}%` }} /></div>
      <footer><button type="button" className="secondary-button" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={15} />Voltar</button><button type="button" className="primary-button" onClick={() => index === steps.length - 1 ? onClose() : setIndex(index + 1)}>{index === steps.length - 1 ? 'Concluir' : 'Avançar'}{index === steps.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</button></footer>
    </section>
  </dialog>;
}
