import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, Plus, RefreshCw, Search, Users } from 'lucide-react';
import type { Demand, Employee, TeamAllocation, User } from '../types';
import { getPeople } from '../services/people';
import { AllocationCancellation, AllocationEditor, EmployeeEditor, TeamConfirmation, peopleToday } from './PeopleForms';

const dateLabel = (value: string) => value.split('-').reverse().join('/');
type Tab = 'team' | 'allocations' | 'demands';

export function PeoplePage({ user, demands, renderDemand, onRefresh }: { user: User; demands: Demand[]; renderDemand: (demand: Demand) => ReactNode; onRefresh: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>('team');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allocations, setAllocations] = useState<TeamAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employee | null | undefined>();
  const [planning, setPlanning] = useState<string | null>(null);
  const canManage = user.role === 'ADMIN' || user.role === 'RH';
  const today = peopleToday();
  const load = useCallback(async () => {
    const data = await getPeople(); setEmployees(data.employees); setAllocations(data.allocations); setReady(true); setError('');
  }, []);
  useEffect(() => {
    let active = true;
    void getPeople().then((data) => {
      if (active) { setEmployees(data.employees); setAllocations(data.allocations); setReady(true); }
    }).catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar a equipe.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const refresh = async () => {
    setLoading(true);
    try { await Promise.all([load(), onRefresh()]); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar os dados.'); }
    finally { setLoading(false); }
  };
  const saved = async () => { await Promise.all([load(), onRefresh()]); };
  const pending = demands.filter((item) => item.status === 'ALOCACAO_RH' && !item.rhApproved);
  const demandById = new Map(demands.map((item) => [item.id, item]));
  const live = allocations.filter((item) => !item.cancelled_at && !['ENTREGUE', 'CANCELADO'].includes(demandById.get(item.demand_id)?.status ?? 'CANCELADO'));
  const loadToday = (id: string) => live.filter((item) => item.employee_id === id && item.starts_on <= today && item.ends_on >= today).reduce((sum, item) => sum + item.dedication, 0);
  const available = employees.filter((item) => item.active && item.capacity_percent > loadToday(item.id));
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const matches = (...values: string[]) => normalize(values.join(' ')).includes(normalize(search.trim()));
  const shownEmployees = employees.filter((item) => matches(item.name, item.job_title, ...item.skills));
  const shownAllocations = allocations.filter((item) => matches(employees.find((person) => person.id === item.employee_id)?.name ?? '', demandById.get(item.demand_id)?.title ?? '', demandById.get(item.demand_id)?.code ?? '', item.assignment_role));
  const shownDemands = pending.filter((item) => matches(item.title, item.code, item.clientName));
  const changeTab = (value: Tab) => { setTab(value); setSearch(''); setEditing(undefined); setPlanning(null); };
  if (!['ADMIN', 'RH', 'GERENCIA'].includes(user.role)) return <p className="alert" role="alert">Sua área não tem acesso ao cadastro de pessoas.</p>;
  return <section className="people-page">
    <div className="page-heading"><div><div className="eyebrow">OPERAÇÃO · EQUIPE</div><h1>Pessoas & RH</h1><p>Organize a equipe, planeje alocações e acompanhe as demandas recebidas.</p></div>
      <button type="button" className="secondary-button" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} />{loading ? 'Atualizando...' : 'Atualizar'}</button></div>
    <div className="people-summary" aria-label="Resumo da equipe"><div><span>Colaboradores ativos</span><strong>{ready ? employees.filter((item) => item.active).length : '—'}</strong></div><div><span>Com disponibilidade hoje</span><strong>{ready ? available.length : '—'}</strong></div><div><span>Alocações em curso hoje</span><strong>{ready ? live.filter((item) => item.starts_on <= today && item.ends_on >= today).length : '—'}</strong></div><div><span>Demandas aguardando equipe</span><strong>{pending.length}</strong></div></div>
    <div className="people-tabs" role="group" aria-label="Áreas de Pessoas e RH">{([{ id: 'team', label: 'Equipe' }, { id: 'allocations', label: 'Alocações' }, { id: 'demands', label: `Demandas recebidas (${pending.length})` }] as const).map((item) => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => changeTab(item.id)}>{item.label}</button>)}</div>
    {error && <p className="alert" role="alert">{error}</p>}
    {!canManage && <p className="people-help">Visão gerencial de consulta. Cadastro e alocação são realizados por RH e Administração.</p>}
    <div className="people-toolbar"><label className="search-box"><Search size={17} aria-hidden="true" /><input type="search" aria-label={`Buscar em ${tab === 'team' ? 'equipe' : tab === 'allocations' ? 'alocações' : 'demandas recebidas'}`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tab === 'team' ? 'Buscar nome, função ou competência...' : 'Buscar colaborador ou demanda...'} /></label>
      {canManage && tab === 'team' && <button type="button" className="primary-button" onClick={() => setEditing(null)}><Plus size={16} />Novo colaborador</button>}
      {canManage && tab === 'allocations' && <button type="button" className="primary-button" disabled={!ready || !pending.length || !employees.some((item) => item.active && item.capacity_percent > 0)} onClick={() => setPlanning('')}><Plus size={16} />Nova alocação</button>}
    </div>
    {editing !== undefined && tab === 'team' && <EmployeeEditor key={editing?.id ?? 'new'} employee={editing} onCancel={() => setEditing(undefined)} onSaved={async () => { await saved(); setEditing(undefined); }} />}
    {planning !== null && tab === 'allocations' && <AllocationEditor key={planning} initialDemandId={planning} employees={employees} demands={demands} onCancel={() => setPlanning(null)} onSaved={async () => { await saved(); setPlanning(null); }} />}
    {loading && !ready && <p role="status" className="people-help">Carregando equipe e alocações...</p>}
    {tab === 'team' && <div className="people-cards">{shownEmployees.map((employee) => {
      const occupied = loadToday(employee.id);
      const free = employee.active ? Math.max(0, employee.capacity_percent - occupied) : 0;
      return <article className="people-person" key={employee.id}><header><span className="people-initial" aria-hidden="true">{employee.name.slice(0, 1).toUpperCase()}</span><div><h2>{employee.name}</h2><p>{employee.job_title}</p></div></header>
        <span className={`status-badge ${!employee.active || !free ? 'badge-amber' : 'badge-green'}`}>{!employee.active ? 'Inativo' : free ? `${free}% disponível hoje` : 'Sem disponibilidade hoje'}</span>
        <p className="people-help">Capacidade: {employee.capacity_percent}% · Alocado hoje: {occupied}%</p>
        <div className="people-skills">{employee.skills.length ? employee.skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>) : <span>Competências não informadas</span>}</div>
        {canManage && <button type="button" className="secondary-button" onClick={() => { setEditing(employee); window.scrollTo({ top: 0, behavior: 'instant' }); }}>Editar colaborador</button>}
      </article>;
    })}</div>}
    {tab === 'allocations' && <><p className="people-help">Datas incluem início e fim. Alocações encerradas ou canceladas ficam disponíveis para consulta.</p><div className="people-allocation-list">{shownAllocations.map((item) => {
      const demand = demandById.get(item.demand_id);
      const closed = ['ENTREGUE', 'CANCELADO'].includes(demand?.status ?? 'CANCELADO');
      const status = item.cancelled_at ? 'Cancelada' : closed ? 'Demanda encerrada' : item.ends_on < today ? 'Período concluído' : item.starts_on > today ? 'Programada' : 'Em curso';
      return <article className="people-allocation" key={item.id}><div className="people-section-heading"><div><h2>{employees.find((person) => person.id === item.employee_id)?.name ?? 'Colaborador'}</h2><p>{demand?.code} · {demand?.title ?? 'Demanda indisponível'}</p></div><span className={`status-badge ${status === 'Em curso' ? 'badge-green' : 'badge-blue'}`}>{status}</span></div>
        <div className="people-allocation-meta"><span>{item.assignment_role}</span><span><CalendarDays size={14} />{dateLabel(item.starts_on)} a {dateLabel(item.ends_on)}</span><strong>{item.dedication}% de dedicação</strong></div>
        {item.cancellation_reason && <p className="people-help">Motivo: {item.cancellation_reason}</p>}
        {canManage && !item.cancelled_at && !closed && item.ends_on >= today && <AllocationCancellation allocation={item} onSaved={saved} />}
      </article>;
    })}</div></>}
    {tab === 'demands' && <div className="people-demand-list">{shownDemands.map((demand) => <article className="people-demand" key={demand.id}>{renderDemand(demand)}<TeamConfirmation demand={demand} employees={employees} allocations={allocations} canManage={canManage && ready} onPlan={() => { changeTab('allocations'); setPlanning(demand.id); }} onSaved={saved} /></article>)}</div>}
    {!loading && (tab === 'team' ? !shownEmployees.length : tab === 'allocations' ? !shownAllocations.length : !shownDemands.length) && <div className="empty-state"><Users size={28} /><h3>{search ? 'Nenhum resultado encontrado' : tab === 'team' ? 'Sua equipe começa aqui' : tab === 'allocations' ? 'Nenhuma alocação registrada' : 'Nenhuma demanda aguardando equipe'}</h3><p>{search ? 'Tente outro nome, função ou código.' : tab === 'team' ? 'Cadastre colaboradores mesmo antes de receber uma demanda.' : tab === 'allocations' ? 'Cadastre a equipe e planeje as pessoas nas demandas recebidas.' : 'As demandas aparecem aqui após a aprovação do Financeiro.'}</p></div>}
  </section>;
}
