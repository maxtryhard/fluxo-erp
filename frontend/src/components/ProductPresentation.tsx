import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowRight, BriefcaseBusiness, CircleDollarSign, GitBranch, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { Link } from '../routing/Link';
import { ScrollPresentation } from './ScrollPresentation';
import { DemandDemo } from './DemandDemo';

const topics = [
  { id: 'flow', label: 'Visão geral', icon: GitBranch, title: 'Uma demanda conecta todo o trabalho', description: 'Do primeiro orçamento à equipe em campo, cada setor recebe as informações e o parecer de quem veio antes. Experimente esse caminho na demonstração.', detail: 'As decisões acompanham a demanda.' },
  { id: 'commercial', label: 'Comercial', icon: BriefcaseBusiness, title: 'Uma proposta pronta para seguir em frente', description: 'Reúna cliente, serviço e orçamento. Registre o parecer comercial e encaminhe a proposta para a revisão financeira, com o contexto que o próximo setor precisa.', detail: 'Aprove a proposta no exemplo para continuar.' },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign, title: 'Condições claras antes de executar', description: 'Revise custos, condições de pagamento e faturamento. Na área financeira, acompanhe também contas a pagar, a receber e as baixas registradas.', detail: 'Conclua a revisão para encaminhar ao RH.' },
  { id: 'people', label: 'Pessoas e RH', icon: Users, title: 'As pessoas certas em cada serviço', description: 'Consulte competências e disponibilidade, defina o período e a dedicação de cada colaborador e confirme a equipe que vai executar a demanda.', detail: 'Escolha as funções da equipe no exemplo.' },
] as const;

function Showcase({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const topic = topics[selected];
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % topics.length : event.key === 'ArrowLeft' ? (index + topics.length - 1) % topics.length : event.key === 'Home' ? 0 : event.key === 'End' ? topics.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); onSelect(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  return <div className="entry-showcase" data-sector={topic.id}>
    <div key={topic.id} className="entry-mesh" aria-hidden="true" />
    <div className="entry-floating-content">
      <div className="entry-tabs" role="tablist" aria-label="Áreas do sistema">
        {topics.map(({ id, label, icon: TabIcon }, index) => <button key={id} id={`entry-tab-${id}`} type="button" role="tab" aria-selected={selected === index} aria-controls="entry-topic" tabIndex={selected === index ? 0 : -1} onClick={() => onSelect(index)} onKeyDown={(event) => navigate(event, index)}><TabIcon size={18} aria-hidden="true" /><span>{label}</span></button>)}
      </div>
      <div className="entry-topic" id="entry-topic" role="tabpanel" aria-labelledby={`entry-tab-${topic.id}`} tabIndex={0}>
        <div className="entry-topic-copy" key={topic.id}><span className="entry-topic-label">{topic.label}</span><h2>{topic.title}</h2><p>{topic.description}</p><p className="entry-topic-hint"><ArrowRight size={16} aria-hidden="true" />{topic.detail}</p><Link to="/entrar" className="entry-learn-link">Acessar minha conta<ArrowRight size={15} aria-hidden="true" /></Link></div>
        <DemandDemo selected={selected} onSelect={onSelect} />
      </div>
    </div>
    <a className="entry-scroll-skip" href="#funcionamento">Como as áreas se conectam<ArrowDown size={14} aria-hidden="true" /></a>
  </div>;
}

function WorkflowPresentation({ onExplore }: { onExplore: (index: number) => void }) {
  const stages = [
    { title: 'Comercial', icon: BriefcaseBusiness, description: 'Cliente, serviço e orçamento organizados antes de encaminhar a proposta.', target: 1 },
    { title: 'Financeiro', icon: CircleDollarSign, description: 'Revisão das demandas, contas e vencimentos em uma área própria.', target: 2 },
    { title: 'Pessoas e RH', icon: Users, description: 'Competências, disponibilidade e alocações para planejar a execução.', target: 3 },
    { title: 'Acompanhamento', icon: GitBranch, description: 'Andamento e histórico para entender cada etapa do trabalho.', target: 0 },
  ];
  return <section className="entry-workflow" id="funcionamento" aria-labelledby="entry-workflow-title">
    <div className="entry-workflow-heading"><h2 id="entry-workflow-title">Cada área tem seu espaço. O trabalho tem continuidade.</h2><p>As informações seguem com a demanda. Sua equipe consegue consultar o que já foi decidido e entender o próximo passo.</p></div>
    <div className="entry-workflow-grid">{stages.map(({ title, icon: Icon, description, target }) => <article key={title}><Icon size={23} strokeWidth={1.6} aria-hidden="true" /><h3>{title}</h3><p>{description}</p><button type="button" onClick={() => onExplore(target)} aria-label={`Ver na demonstração: ${title}`}>Ver na demonstração<ArrowRight size={16} aria-hidden="true" /></button></article>)}</div>
    <div className="entry-connections"><div><MessageSquare size={22} aria-hidden="true" /><h3>Converse com quem participa</h3><p>Mensagens entre setores e conversas privadas mantêm a comunicação perto do trabalho.</p></div><div><ShieldCheck size={22} aria-hidden="true" /><h3>Cada acesso tem seu limite</h3><p>Os módulos e as informações disponíveis respeitam as permissões de cada conta.</p></div></div>
    <div className="entry-closing"><div><h2>Conheça o Fluxo por dentro</h2><p>Solicite seu cadastro para participar do trabalho da equipe.</p></div><Link className="entry-hero-primary" to="/cadastro">Solicitar cadastro<ArrowRight size={17} aria-hidden="true" /></Link></div>
  </section>;
}

export function ProductPresentation() {
  const [selected, setSelected] = useState(0);
  // An explicit choice takes precedence over the scroll story for the rest of this visit.
  const interacted = useRef(false);
  const select = (index: number) => { interacted.current = true; setSelected(index); };
  const explore = (index: number) => {
    select(index);
    document.getElementById(`entry-tab-${topics[index].id}`)?.focus({ preventScroll: true });
    document.getElementById('demonstracao')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  };
  return <section className="entry-presentation" id="apresentacao" aria-labelledby="entry-title">
    <div className="entry-intro"><h1 id="entry-title" tabIndex={-1}>Sua equipe trabalhando<br /><span>no mesmo sistema</span></h1><p>Conecte Comercial, Financeiro e RH para organizar as demandas e acompanhar o trabalho até a entrega.</p><div className="entry-hero-actions"><Link className="entry-hero-primary" to="/cadastro">Começar no Fluxo<ArrowRight size={17} aria-hidden="true" /></Link><a className="entry-hero-secondary" href="#demonstracao">Explorar o sistema<ArrowDown size={16} aria-hidden="true" /></a></div></div>
    <div id="demonstracao" className="entry-demo-anchor"><ScrollPresentation onSectorChange={(index) => { if (!interacted.current) setSelected(index); }}><Showcase selected={selected} onSelect={select} /></ScrollPresentation></div>
    <WorkflowPresentation onExplore={explore} />
    <footer className="entry-footer"><span>Fluxo Gestão integrada</span><Link to="/entrar">Já tem uma conta? Entrar<ArrowRight size={14} aria-hidden="true" /></Link></footer>
  </section>;
}
