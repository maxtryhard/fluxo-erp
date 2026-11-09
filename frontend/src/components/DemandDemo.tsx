import { useState } from 'react';
import { ArrowRight, Check, CheckCheck, FileText, RotateCcw } from 'lucide-react';

const stages = ['Comercial', 'Financeiro', 'Pessoas e RH'] as const;
const statuses = ['Em análise comercial', 'Em revisão financeira', 'Aguardando equipe', 'Em execução'];
const updates = [
  'Escolha um setor ou experimente o encaminhamento da demanda.',
  'Proposta aprovada. O Financeiro recebeu a demanda com o parecer comercial.',
  'Revisão financeira concluída. O RH já pode organizar a equipe.',
  'Equipe confirmada. A demanda está pronta para execução.',
];

/** A public, local-only illustration. It never calls an ERP service or stores records. */
export function DemandDemo({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState<string[]>(['Técnico']);
  const [update, setUpdate] = useState(updates[0]);
  const current = selected - 1;
  const finished = step === 3;
  const reset = () => {
    setStep(0); setTeam(['Técnico']); setUpdate('Demonstração reiniciada. A proposta está no Comercial.'); onSelect(1);
  };
  const advance = () => {
    if (finished || current !== step || (step === 2 && team.length === 0)) return;
    const next = step + 1;
    setStep(next); setUpdate(updates[next]); onSelect(Math.min(next + 1, 3));
  };
  const toggleRole = (role: string) => setTeam((previous) => previous.includes(role) ? previous.filter((item) => item !== role) : [...previous, role]);

  return <div className="entry-demo" aria-label="Demonstração de uma demanda">
    <div className="entry-demo-top"><span><FileText size={15} aria-hidden="true" />Demanda de exemplo</span><button type="button" className="entry-demo-reset" onClick={reset} aria-label="Reiniciar demonstração" title="Reiniciar demonstração"><RotateCcw size={16} aria-hidden="true" /></button></div>
    <div className="entry-demo-record"><h3>Manutenção preventiva</h3><span className={`entry-demo-status${finished ? ' is-complete' : ''}`}>{finished && <CheckCheck size={14} aria-hidden="true" />}{statuses[step]}</span></div>
    <ol className="entry-demo-pipeline" aria-label="Encaminhamento da demanda">
      {stages.map((name, index) => <li key={name} data-state={step > index ? 'done' : step === index ? 'current' : 'waiting'}><span className="entry-demo-node">{step > index ? <Check size={13} aria-hidden="true" /> : <span />}</span><span>{name}</span><span className="sr-only">{step > index ? ': concluído' : step === index ? ': etapa atual' : ': aguardando'}</span></li>)}
    </ol>
    <div className="entry-demo-work" key={selected}>
      {selected === 0 ? <div className="entry-demo-overview"><p>O mesmo registro acompanha todo o serviço.</p><span>Proposta, análise financeira e equipe ficam conectadas pelo histórico da demanda.</span></div>
        : selected === 1 ? <dl><div><dt>Serviço</dt><dd>Manutenção preventiva</dd></div><div><dt>Parecer comercial</dt><dd>Escopo revisado e proposta pronta para análise financeira.</dd></div></dl>
          : selected === 2 ? <dl><div><dt>Revisão financeira</dt><dd>Custos, faturamento e condições de pagamento.</dd></div><div><dt>Próximo responsável</dt><dd>Pessoas e RH</dd></div></dl>
            : <fieldset className="entry-demo-team"><legend>Equipe para este exemplo</legend><div>{['Técnico', 'Supervisor'].map((role) => <label key={role}><input type="checkbox" checked={team.includes(role)} disabled={step !== 2} onChange={() => toggleRole(role)} /><span>{role}</span></label>)}</div><p>{finished ? 'Equipe definida para a execução.' : step < 2 ? 'A seleção é liberada após a revisão financeira.' : 'Selecione ao menos uma função para continuar.'}</p></fieldset>}
    </div>
    <div className="entry-demo-action">
      {selected === 0 ? <button type="button" onClick={() => onSelect(Math.min(step + 1, 3))}>Experimentar o fluxo<ArrowRight size={16} aria-hidden="true" /></button>
        : finished ? <button type="button" onClick={reset}>Experimentar novamente<RotateCcw size={15} aria-hidden="true" /></button>
          : current !== step ? <button type="button" onClick={() => onSelect(step + 1)}>Continuar no {stages[step] === 'Pessoas e RH' ? 'RH' : stages[step]}<ArrowRight size={16} aria-hidden="true" /></button>
            : <button type="button" onClick={advance} disabled={step === 2 && team.length === 0}>{['Aprovar proposta', 'Concluir revisão', 'Confirmar equipe'][step]}<ArrowRight size={16} aria-hidden="true" /></button>}
    </div>
    <p className="entry-demo-update" role="status" aria-live="polite" aria-atomic="true">{update}</p>
    <p className="entry-demo-disclaimer">Exemplo local. Nenhum registro é criado.</p>
  </div>;
}
