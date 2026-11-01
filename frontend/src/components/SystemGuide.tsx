import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, BookOpen, ChevronDown, ShieldCheck, X } from 'lucide-react';
import { systemGuide, type GuideDestination, type GuideId } from '../content/systemGuide';

const invitationKey = 'fluxo.guide.invitation.v1';

export function GuideInvitation({ onOpen }: { onOpen: () => void }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(invitationKey) === 'dismissed'; } catch { return false; }
  });
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(invitationKey, 'dismissed'); } catch { /* Current-session dismissal still works. */ }
  };
  if (dismissed) return null;
  return <aside className="guide-invitation" aria-label="Conheça o Fluxo">
    <span className="guide-invitation-icon" aria-hidden="true"><BookOpen size={23} /></span>
    <div><strong>Uma equipe conectada começa por entender o fluxo.</strong><p>Conheça as áreas, o que cada uma faz e como uma demanda avança.</p></div>
    <button type="button" className="secondary-button" onClick={() => { dismiss(); onOpen(); }}>Conhecer o Fluxo <ArrowRight size={15} /></button>
    <button type="button" className="guide-dismiss" aria-label="Não mostrar este convite novamente" onClick={dismiss}><X size={17} /></button>
  </aside>;
}

function WorkflowIllustration() {
  return <span className="guide-flow" aria-hidden="true">
    {['Propor', 'Revisar', 'Alocar'].map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, '0')}</i><b>{label}</b></span>)}
  </span>;
}

export function SystemGuide({ allowedPages, onNavigate, onStartTour, onClose }: { allowedPages: readonly string[]; onNavigate: (page: GuideDestination) => void; onStartTour: (page?: GuideDestination) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const detail = useRef<HTMLElement>(null);
  const [selectedId, setSelectedId] = useState<GuideId | null>(null);
  const topic = systemGuide.find((item) => item.id === selectedId);
  const canNavigate = !!topic && allowedPages.includes(topic.destination);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => { if (element?.open) element.close(); };
  }, []);
  useEffect(() => {
    if (selectedId) detail.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }, [selectedId]);

  return <dialog ref={dialog} className="system-guide" aria-labelledby="system-guide-title" aria-describedby="system-guide-description"
    onClose={() => { if (!dialog.current?.open) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="guide-content">
      <header className="guide-heading"><div><span className="guide-eyebrow"><Activity size={14} /> GUIA DO SISTEMA</span><h2 id="system-guide-title">Conheça o <span>Fluxo.</span></h2><p id="system-guide-description">Cada setor tem seu papel. O trabalho acontece em conjunto.</p></div><button type="button" className="guide-close" aria-label="Fechar guia" autoFocus onClick={onClose}><X size={20} /></button></header>
      <div className="guide-tour-intro"><div><strong>Prefere aprender na prática?</strong><p>Visite as telas com destaques e explicações. Avance ou volte no seu ritmo.</p></div><button type="button" className="primary-button" onClick={() => onStartTour()}>Iniciar tour guiado <ArrowRight size={16} /></button></div>
      <div className="guide-grid">
        {systemGuide.map(({ id, title, kicker, summary, icon: Icon }) => <button key={id} type="button" className={`guide-card guide-card-${id} ${selectedId === id ? 'guide-card-selected' : ''}`}
          aria-expanded={selectedId === id} aria-controls={selectedId === id ? 'guide-topic-detail' : undefined} onClick={() => setSelectedId(selectedId === id ? null : id)}>
          <span className="guide-card-top"><span className="guide-card-icon"><Icon size={22} strokeWidth={1.6} /></span><span className="guide-card-arrow"><ArrowRight size={17} /></span></span>
          <span className="guide-card-kicker">{kicker}</span><strong>{title}</strong><span className="guide-card-summary">{summary}</span>
          {id === 'workflow' && <WorkflowIllustration />}
          {id === 'finance' && <span className="guide-finance-motif" aria-hidden="true"><i /><i /><i /><i /><i /></span>}
          <span className="guide-card-more">{selectedId === id ? 'Fechar explicação' : 'Entender como funciona'}<ChevronDown size={14} /></span>
        </button>)}
      </div>
      {topic && <section className="guide-topic-detail" id="guide-topic-detail" ref={detail} aria-labelledby="guide-topic-title" key={topic.id}>
        <div className="guide-detail-heading"><div><span className="guide-eyebrow">PASSO A PASSO</span><h3 id="guide-topic-title">{topic.title}</h3></div><button type="button" className="text-button" onClick={() => { const id = selectedId; setSelectedId(null); dialog.current?.querySelector<HTMLButtonElement>(`.guide-card-${id}`)?.focus(); }}>Recolher</button></div>
        <ol className="guide-steps">{topic.steps.map((step) => <li key={step.title}><strong>{step.title}</strong><p>{step.body}</p></li>)}</ol>
        <p className="guide-note"><ShieldCheck size={17} aria-hidden="true" />{topic.note}</p>
        {canNavigate ? <div className="guide-topic-actions"><button type="button" className="primary-button" onClick={() => onStartTour(topic.destination)}>Ver na prática <ArrowRight size={15} /></button><button type="button" className="secondary-button" onClick={() => { if (allowedPages.includes(topic.destination)) onNavigate(topic.destination); }}>{topic.action}<ArrowRight size={15} /></button></div> : <p className="guide-access-note">Esta explicação apresenta o papel da área. O acesso à tela depende do perfil da sua conta.</p>}
      </section>}
      <footer className="guide-footer"><span><BookOpen size={16} aria-hidden="true" />Você pode consultar este guia em “Como usar”.</span><button type="button" className="primary-button" onClick={onClose}>Voltar ao sistema <ArrowRight size={15} /></button></footer>
    </div>
  </dialog>;
}
