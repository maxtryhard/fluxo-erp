import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Save } from 'lucide-react';
import type { Demand, Employee, TeamAllocation } from '../types';
import { allocateEmployee, cancelAllocation, confirmTeam, saveEmployee } from '../services/people';

export function peopleToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function PeopleActionForm({ action, onSaved, label, children }: { action: () => Promise<void>; onSaved: () => Promise<void>; label: string; children: ReactNode }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await action(); setSuccess('Registro salvo.');
      try { await onSaved(); } catch { setError('O registro foi salvo, mas a lista não atualizou. Clique em Atualizar.'); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Seus dados foram mantidos.'); }
    finally { setSaving(false); }
  };
  return <form className="people-form" onSubmit={(event) => void submit(event)}>
    <fieldset disabled={saving}>{children}<button type="submit" className="primary-button"><Save size={15} />{saving ? 'Salvando...' : label}</button></fieldset>
    {error && <p role="alert" className="alert">{error}</p>}<span className="people-success" role="status">{success}</span>
  </form>;
}

export function EmployeeEditor({ employee, onSaved, onCancel }: { employee: Employee | null; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(employee?.name ?? '');
  const [job, setJob] = useState(employee?.job_title ?? '');
  const [skills, setSkills] = useState(employee?.skills.join(', ') ?? '');
  const [capacity, setCapacity] = useState(employee?.capacity_percent ?? 100);
  const [active, setActive] = useState(employee?.active ?? true);
  return <section className="people-editor"><div className="people-section-heading"><h2>{employee ? 'Editar colaborador' : 'Novo colaborador'}</h2><button className="text-button" type="button" onClick={onCancel}>Fechar formulário</button></div>
    <p className="people-help">Este cadastro organiza a equipe e não cria uma conta de acesso ao sistema.</p>
    <PeopleActionForm label="Salvar colaborador" action={() => saveEmployee({ name, job_title: job, skills: skills.split(',').map((item) => item.trim()).filter(Boolean), capacity_percent: capacity, active }, employee?.id ?? null)} onSaved={onSaved}>
      <div className="people-form-grid"><label className="field-label">Nome<input autoFocus value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={100} /></label>
        <label className="field-label">Função<input value={job} onChange={(event) => setJob(event.target.value)} required minLength={2} maxLength={100} placeholder="Ex.: Técnico de manutenção" /></label>
        <label className="field-label">Disponibilidade para demandas<select value={capacity} onChange={(event) => setCapacity(Number(event.target.value))}><option value={100}>Disponível · até 100%</option><option value={50}>Parcialmente disponível · até 50%</option><option value={0}>Indisponível · 0%</option></select></label>
        <label className="field-label">Situação do cadastro<select value={String(active)} onChange={(event) => setActive(event.target.value === 'true')}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
      </div>
      <label className="field-label">Competências, separadas por vírgula<input value={skills} onChange={(event) => setSkills(event.target.value)} maxLength={3029} placeholder="Ex.: Redes, atendimento, instalação" /></label>
      <p className="people-help">Para reduzir a disponibilidade ou inativar alguém, reorganize primeiro suas alocações atuais e futuras.</p>
    </PeopleActionForm>
  </section>;
}

export function AllocationEditor({ employees, demands, initialDemandId, onSaved, onCancel }: { employees: Employee[]; demands: Demand[]; initialDemandId: string; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [employeeId, setEmployeeId] = useState('');
  const [demandId, setDemandId] = useState(initialDemandId);
  const [role, setRole] = useState('');
  const [start, setStart] = useState(peopleToday());
  const [end, setEnd] = useState(peopleToday());
  const [dedication, setDedication] = useState(100);
  return <section className="people-editor"><div className="people-section-heading"><h2>Planejar alocação</h2><button className="text-button" type="button" onClick={onCancel}>Fechar formulário</button></div>
    <p className="people-help">Escolha uma pessoa e informe sua dedicação no período. O banco verifica conflitos entre todas as demandas.</p>
    <PeopleActionForm label="Salvar alocação" onSaved={onSaved} action={() => allocateEmployee({ employee_id: employeeId, demand_id: demandId, assignment_role: role, starts_on: start, ends_on: end, dedication })}>
      <div className="people-form-grid">
        <label className="field-label">Demanda<select autoFocus value={demandId} onChange={(event) => setDemandId(event.target.value)} required><option value="">Selecione a demanda</option>{demands.filter((item) => item.status === 'ALOCACAO_RH').map((item) => <option value={item.id} key={item.id}>{item.code} · {item.title}</option>)}</select></label>
        <label className="field-label">Colaborador<select value={employeeId} onChange={(event) => { const selected = employees.find((item) => item.id === event.target.value); setEmployeeId(event.target.value); setRole(selected?.job_title ?? ''); setDedication(selected?.capacity_percent ?? 100); }} required><option value="">Selecione o colaborador</option>{employees.filter((item) => item.active && item.capacity_percent > 0).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.job_title}</option>)}</select></label>
        <label className="field-label">Função nesta demanda<input value={role} onChange={(event) => setRole(event.target.value)} required minLength={2} maxLength={100} /></label>
        <label className="field-label">Dedicação (%)<input type="number" min={1} max={100} step={1} value={dedication} onChange={(event) => setDedication(Number(event.target.value))} required /></label>
        <label className="field-label">Início<input type="date" value={start} min={peopleToday()} onChange={(event) => setStart(event.target.value)} required /></label>
        <label className="field-label">Fim<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} required /></label>
      </div>
    </PeopleActionForm>
  </section>;
}

export function AllocationCancellation({ allocation, onSaved }: { allocation: TeamAllocation; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  return <div><button className="text-button" type="button" onClick={() => setOpen(!open)}>{open ? 'Manter alocação' : 'Cancelar alocação'}</button>
    {open && <PeopleActionForm action={() => cancelAllocation(allocation.id, reason)} onSaved={onSaved} label="Confirmar cancelamento"><label className="field-label">Motivo do cancelamento<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={5} maxLength={1000} rows={2} /></label></PeopleActionForm>}
  </div>;
}

export function TeamConfirmation({ demand, allocations, employees, canManage, onPlan, onSaved }: { demand: Demand; allocations: TeamAllocation[]; employees: Employee[]; canManage: boolean; onPlan: () => void; onSaved: () => Promise<void> }) {
  const [note, setNote] = useState('');
  const planned = allocations.filter((item) => item.demand_id === demand.id && !item.cancelled_at && item.ends_on >= peopleToday());
  const count = new Set(planned.map((item) => item.employee_id)).size;
  return <section className="people-team-confirmation"><div className="people-section-heading"><h3>Equipe planejada · {count} {count === 1 ? 'pessoa' : 'pessoas'}</h3>{canManage && <button type="button" className="secondary-button" onClick={onPlan}>Montar equipe <ArrowRight size={15} /></button>}</div>
    {planned.length ? <ul className="people-team-list">{planned.map((item) => <li key={item.id}><strong>{employees.find((person) => person.id === item.employee_id)?.name ?? 'Colaborador'}</strong><span>{item.assignment_role} · {item.dedication}% · {item.starts_on.split('-').reverse().join('/')} a {item.ends_on.split('-').reverse().join('/')}</span></li>)}</ul> : <p className="people-help">Nenhuma pessoa alocada. Monte a equipe antes de confirmar o envio para execução.</p>}
    {canManage && count > 0 && <PeopleActionForm action={() => confirmTeam(demand.id, note)} onSaved={onSaved} label="Confirmar equipe e enviar para execução"><label className="field-label">Parecer e orientações do RH<textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} required minLength={10} maxLength={4000} placeholder="Registre a composição da equipe, os cuidados e as orientações para execução." /></label><p className="people-help">Parecer restrito a RH, Gerência e Administração. O envio mantém o fluxo de aprovação existente.</p></PeopleActionForm>}
  </section>;
}
