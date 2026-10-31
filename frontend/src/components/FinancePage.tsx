import { useEffect, useState, type ReactNode } from 'react';
import { CircleDollarSign, Plus, RefreshCw, Search } from 'lucide-react';
import type { Demand, FinancialEntry, User } from '../types';
import { getFinancialEntries } from '../services/finance';
import { financeDate, financialToday, formatCents } from '../utils/finance';
import { FinanceOverview } from './FinanceOverview';
import { FinancialEntryActions, FinancialEntryEditor } from './FinanceForms';

type FinanceTab = 'overview' | 'reviews' | 'receivables' | 'payables';
type EntryFilter = 'ALL' | 'OPEN' | 'OVERDUE' | 'SETTLED' | 'CANCELLED';
export function FinancePage({ user, demands, renderDemand, onRefresh }: { user: User; demands: Demand[]; renderDemand: (demand: Demand) => ReactNode; onRefresh: () => Promise<void> }) {
  const [tab, setTab] = useState<FinanceTab>('overview');
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EntryFilter>('ALL');
  const [editing, setEditing] = useState(false);
  const today = financialToday();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const canManage = user.role === 'ADMIN' || user.role === 'FINANCEIRO';
  useEffect(() => {
    let active = true;
    void getFinancialEntries().then((data) => { if (active) { setEntries(data); setReady(true); } })
      .catch((failure: unknown) => { if (active) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as contas.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const reload = async () => { const data = await getFinancialEntries(); setEntries(data); setReady(true); setError(''); };
  const refresh = async () => {
    setLoading(true);
    try { await Promise.all([reload(), onRefresh()]); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível atualizar o financeiro.'); }
    finally { setLoading(false); }
  };
  const changeTab = (next: FinanceTab) => { setTab(next); setSearch(''); setEditing(false); setFilter('ALL'); };
  const query = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const matches = (...values: string[]) => values.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(query);
  const pending = demands.filter((item) => item.status === 'APROVADO_COMERCIAL');
  const shownDemands = pending.filter((item) => matches(item.code, item.title, item.clientName));
  const demandById = new Map(demands.map((item) => [item.id, item]));
  const direction = tab === 'receivables' ? 'RECEIVABLE' : 'PAYABLE';
  const shown = entries.filter((entry) => {
    const linked = entry.demand_id ? demandById.get(entry.demand_id) : undefined;
    const open = !entry.settled_on && !entry.cancelled_at;
    return entry.direction === direction && matches(entry.description, entry.counterparty, linked?.code ?? '', linked?.title ?? '')
      && (filter === 'ALL' || (filter === 'OPEN' && open) || (filter === 'OVERDUE' && open && entry.due_on < today) || (filter === 'SETTLED' && !!entry.settled_on) || (filter === 'CANCELLED' && !!entry.cancelled_at));
  });
  if (!['ADMIN', 'FINANCEIRO', 'GERENCIA'].includes(user.role)) return <p className="alert" role="alert">Sua área não tem acesso aos registros financeiros.</p>;
  return <section className="finance-page"><div className="page-heading"><div><div className="eyebrow">OPERAÇÃO · FINANCEIRO</div><h1>Financeiro</h1><p>Acompanhe as revisões, os compromissos e os movimentos registrados.</p></div><button type="button" className="secondary-button" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} />{loading ? 'Atualizando...' : 'Atualizar'}</button></div>
    <div className="finance-tabs" role="group" aria-label="Áreas do financeiro">{([{ id: 'overview', label: 'Visão financeira' }, { id: 'reviews', label: `Revisões (${pending.length})` }, { id: 'receivables', label: 'Contas a receber' }, { id: 'payables', label: 'Contas a pagar' }] as const).map((item) => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => changeTab(item.id)}>{item.label}</button>)}</div>
    {error && <p className="alert" role="alert">{error}</p>}
    {!canManage && <p className="finance-help">Visão gerencial de consulta. Os registros são realizados por Financeiro e Administração.</p>}
    {loading && !ready && <p role="status" className="finance-help">Carregando os registros financeiros...</p>}
    {tab === 'overview' ? <>
      <div className="finance-period"><label className="field-label">Data inicial<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} required /></label><label className="field-label">Data final<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} required /></label></div>
      {from && to && from <= to ? <FinanceOverview entries={entries} ready={ready} from={from} to={to} today={today} /> : <p role="alert" className="alert">Escolha um período válido para consultar os movimentos.</p>}
    </> : <>
      <div className="finance-toolbar"><label className="search-box"><Search size={17} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label={tab === 'reviews' ? 'Buscar demandas em revisão' : 'Buscar contas'} placeholder={tab === 'reviews' ? 'Buscar demanda, cliente ou código...' : 'Buscar descrição, cliente, fornecedor ou demanda...'} /></label>
        {tab !== 'reviews' && <><label className="field-label">Situação<select value={filter} onChange={(event) => setFilter(event.target.value as EntryFilter)}><option value="ALL">Todas</option><option value="OPEN">Em aberto</option><option value="OVERDUE">Vencidas</option><option value="SETTLED">Baixadas</option><option value="CANCELLED">Canceladas</option></select></label>{canManage && <button type="button" className="primary-button" onClick={() => setEditing(true)}><Plus size={16} />Nova conta</button>}</>}
      </div>
      {tab === 'reviews' ? <div className="demand-list">{shownDemands.map((demand) => <div key={demand.id}>{renderDemand(demand)}</div>)}{!shownDemands.length && <div className="empty-state"><CircleDollarSign size={26} /><h3>Nenhuma demanda aguardando revisão</h3><p>As demandas aparecem aqui após a aprovação do Comercial.</p></div>}</div> : <>
        {editing && canManage && <FinancialEntryEditor key={tab} direction={direction} demands={demands} onCancel={() => setEditing(false)} onSaved={async () => { await reload(); setEditing(false); }} />}
        <p className="finance-help">Todos os vencimentos · {shown.length} registro(s). Baixas são integrais por parcela; pagamentos parciais ainda não são suportados.</p>
        <div className="finance-entries">{shown.map((entry) => {
          const status = entry.cancelled_at ? 'Cancelada' : entry.settled_on ? entry.direction === 'RECEIVABLE' ? 'Recebida' : 'Paga' : entry.due_on < today ? 'Vencida' : 'Em aberto';
          const linked = entry.demand_id ? demandById.get(entry.demand_id) : undefined;
          return <article className="finance-entry" key={entry.id}><div className="finance-section-heading"><div><h2>{entry.description}</h2><p>{entry.counterparty} · parcela {entry.installment_number}/{entry.installment_count}</p></div><div className="finance-entry-value"><strong>{formatCents(entry.amount_cents)}</strong><span className={`status-badge ${entry.cancelled_at ? 'badge-red' : entry.settled_on ? 'badge-green' : entry.due_on < today ? 'badge-amber' : 'badge-blue'}`}>{status}</span></div></div>
            <p className="finance-help">Vencimento: {financeDate(entry.due_on)}{linked ? ` · ${linked.code} · ${linked.title}` : ' · Sem demanda vinculada'}</p>
            {entry.notes && <p className="finance-entry-notes">{entry.notes}</p>}{entry.cancellation_reason && <p className="finance-help">Cancelamento: {entry.cancellation_reason}</p>}
            <FinancialEntryActions entry={entry} canManage={canManage} onSaved={reload} />
          </article>;
        })}</div>
        {!shown.length && !loading && <div className="empty-state"><CircleDollarSign size={26} /><h3>{search || filter !== 'ALL' ? 'Nenhum registro para estes filtros' : 'Nenhuma conta cadastrada'}</h3><p>{canManage ? 'Cadastre os compromissos para acompanhar vencimentos e registrar as baixas.' : 'As contas registradas pelo Financeiro aparecerão aqui.'}</p></div>}
      </>}
    </>}
  </section>;
}
