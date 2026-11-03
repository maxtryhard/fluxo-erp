import { useState, type KeyboardEvent } from 'react';
import { BriefcaseBusiness, CircleDollarSign, GitBranch, Users } from 'lucide-react';
import { Link } from '../routing/Link';
import { ScrollPresentation } from './ScrollPresentation';

const topics = [
  { id: 'flow', label: 'Visão geral', icon: GitBranch, title: 'Acompanhe cada demanda do orçamento à entrega', description: 'Comercial, Financeiro e RH trabalham com as informações da mesma demanda. As decisões e conversas ficam no histórico para que o próximo setor saiba o que já foi feito.', diagram: ['Comercial', 'Financeiro', 'Pessoas e RH'] },
  { id: 'commercial', label: 'Comercial', icon: BriefcaseBusiness, title: 'Organize a proposta antes de encaminhar', description: 'Cadastre o cliente, descreva o serviço e informe o orçamento. Depois da análise comercial, encaminhe a demanda para o Financeiro com o seu parecer.', diagram: ['Cliente e contato', 'Descrição do serviço', 'Orçamento e parecer'] },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign, title: 'Revise as demandas e acompanhe as contas', description: 'Confira custos, condições de pagamento e faturamento. Organize contas a receber e a pagar, registre as baixas e consulte os movimentos do período.', diagram: ['Revisão das demandas', 'Contas a receber', 'Contas a pagar'] },
  { id: 'people', label: 'Pessoas e RH', icon: Users, title: 'Planeje a equipe para executar o serviço', description: 'Mantenha o cadastro dos colaboradores e suas competências. Defina quem vai trabalhar na demanda, em qual período e com qual dedicação, verificando a disponibilidade da equipe.', diagram: ['Competências', 'Disponibilidade', 'Alocações nas demandas'] },
] as const;
type Topic = typeof topics[number];

function SectorIllustration({ topic }: { topic: Topic }) {
  const Icon = topic.icon;
  return <div className="entry-illustration" aria-hidden="true"><div className="entry-mini-window"><div className="entry-mini-heading"><Icon size={18} /><span>{topic.label}</span></div><div className="entry-mini-steps">{topic.diagram.map((label) => <div key={label}>{label}</div>)}</div></div></div>;
}

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
        {topics.map(({ id, label, icon: TabIcon }, index) => <button key={id} id={`entry-tab-${id}`} type="button" role="tab" aria-label={label} aria-selected={selected === index} aria-controls="entry-topic" tabIndex={selected === index ? 0 : -1} onClick={() => onSelect(index)} onKeyDown={(event) => navigate(event, index)}><TabIcon size={19} aria-hidden="true" /><span className="entry-tab-tooltip" aria-hidden="true">{label}</span></button>)}
      </div>
      <div className="entry-topic" id="entry-topic" role="tabpanel" aria-labelledby={`entry-tab-${topic.id}`} tabIndex={0}>
        <div className="entry-topic-copy" key={topic.id}><span className="entry-topic-label">{topic.label}</span><h2>{topic.title}</h2><p>{topic.description}</p><Link to="/entrar" className="entry-learn-link">Entrar no sistema</Link></div>
        <div key={`illustration-${topic.id}`} className="entry-illustration-wrap"><SectorIllustration topic={topic} /></div>
      </div>
    </div>
    <a className="entry-scroll-skip" href="#funcionamento">Continuar a página</a>
  </div>;
}

function WorkflowPresentation() {
  const stages = [
    { title: 'Comercial', icon: BriefcaseBusiness, description: 'Reúne as informações do cliente e do serviço, prepara o orçamento e encaminha a demanda com um parecer.' },
    { title: 'Financeiro', icon: CircleDollarSign, description: 'Analisa as condições da demanda e acompanha contas, vencimentos e pagamentos registrados.' },
    { title: 'Pessoas e RH', icon: Users, description: 'Organiza os colaboradores e planeja a equipe necessária para executar cada serviço.' },
    { title: 'Acompanhamento', icon: GitBranch, description: 'Permite consultar o andamento, o histórico e as conversas de cada demanda, conforme o acesso da conta.' },
  ];
  return <section className="entry-workflow" id="funcionamento" aria-labelledby="entry-workflow-title">
    <div className="entry-workflow-heading"><h2 id="entry-workflow-title">Cada setor acompanha sua parte do trabalho</h2><p>Uma demanda passa pelo Comercial, pelo Financeiro e pelo RH, com o histórico disponível para quem participa.</p><Link className="entry-hero-primary" to="/cadastro">Solicitar cadastro</Link></div>
    <div className="entry-workflow-grid">{stages.map(({ title, icon: Icon, description }) => <article key={title}><Icon size={21} strokeWidth={1.6} /><h3>{title}</h3><p>{description}</p></article>)}</div>
  </section>;
}

export function ProductPresentation() {
  const [selected, setSelected] = useState(0);
  return <section className="entry-presentation" id="apresentacao" aria-labelledby="entry-title">
    <div className="entry-intro"><h1 id="entry-title" tabIndex={-1}>Sua equipe trabalhando<br />no mesmo sistema</h1><p>Conecte Comercial, Financeiro e RH para organizar as demandas e acompanhar o trabalho até a entrega.</p><div className="entry-hero-actions"><Link className="entry-hero-primary" to="/cadastro">Criar conta</Link><Link className="entry-hero-secondary" to="/entrar">Entrar</Link></div></div>
    <ScrollPresentation onSectorChange={setSelected}><Showcase selected={selected} onSelect={setSelected} /></ScrollPresentation>
    <WorkflowPresentation />
  </section>;
}
