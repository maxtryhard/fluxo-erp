import { ArrowDownLeft, ArrowUpRight, CalendarDays } from 'lucide-react';
import type { FinancialEntry } from '../types';
import { financeDate, formatCents, summarizeFinance } from '../utils/finance';

export function FinanceOverview({ entries, ready, from, to, today }: { entries: FinancialEntry[]; ready: boolean; from: string; to: string; today: string }) {
  const summary = summarizeFinance(entries, from, to, today);
  const stats: { label: string; value: number; note: string; icon: typeof CalendarDays; count?: boolean }[] = [
    { label: 'Recebido no período', value: summary.received, note: 'Pela data efetiva de recebimento', icon: ArrowDownLeft },
    { label: 'Pago no período', value: summary.paid, note: 'Pela data efetiva de pagamento', icon: ArrowUpRight },
    { label: 'Resultado do período', value: summary.result, note: 'Recebimentos menos pagamentos', icon: CalendarDays },
    { label: 'Total a receber', value: summary.receivable, note: 'Em aberto · todos os vencimentos', icon: ArrowDownLeft },
    { label: 'Total a pagar', value: summary.payable, note: 'Em aberto · todos os vencimentos', icon: ArrowUpRight },
    { label: 'Contas vencidas', value: summary.overdue.length, note: 'Em aberto · anteriores a hoje', icon: CalendarDays, count: true },
  ];
  const max = Math.max(1, ...summary.months.flatMap((item) => [item.received, item.paid]));
  return <div className="finance-overview">
    <div className="finance-summary">{stats.map(({ label, value, note, icon: Icon, count }) => <article key={label}><div><span>{label}</span><Icon size={16} aria-hidden="true" /></div><strong>{ready ? count ? String(value) : formatCents(value) : '—'}</strong><small>{note}</small></article>)}</div>
    <p className="finance-help">Resultado dos movimentos registrados; não representa saldo bancário. Orçamento e faturamento das demandas são acompanhados em Revisões e não são somados como recebimento.</p>
    <div className="finance-overview-grid">
      <section className="finance-panel"><div className="finance-section-heading"><h2>Movimento realizado por mês</h2></div><p className="finance-help">Baixas efetivas de {financeDate(from)} a {financeDate(to)}.</p>
        {summary.months.length ? <div className="finance-months">{summary.months.map((row) => <div className="finance-month" key={row.month}><strong>{row.month.split('-').reverse().join('/')}</strong><div><span>Recebido <b>{formatCents(row.received)}</b></span><div className="finance-bar-track" aria-hidden="true"><i className="finance-bar-in" style={{ width: `${row.received / max * 100}%` }} /></div><span>Pago <b>{formatCents(row.paid)}</b></span><div className="finance-bar-track" aria-hidden="true"><i className="finance-bar-out" style={{ width: `${row.paid / max * 100}%` }} /></div></div></div>)}</div> : <p className="finance-empty">{ready ? 'Nenhum pagamento ou recebimento registrado neste período.' : 'Os movimentos aparecerão após carregar os registros.'}</p>}
      </section>
      <section className="finance-panel"><div className="finance-section-heading"><h2>Contas vencidas</h2><span className="status-badge badge-amber">{ready ? summary.overdue.length : '—'}</span></div><p className="finance-help">Em aberto antes de {financeDate(today)} · todos os períodos.</p>
        {summary.overdue.length ? <ul className="finance-due-list">{[...summary.overdue].sort((a, b) => a.due_on.localeCompare(b.due_on)).slice(0, 8).map((entry) => <li key={entry.id}><div><strong>{entry.description}</strong><span>{entry.direction === 'RECEIVABLE' ? 'A receber' : 'A pagar'} · {financeDate(entry.due_on)}</span></div><b>{formatCents(entry.amount_cents)}</b></li>)}</ul> : <p className="finance-empty">{ready ? 'Nenhuma conta vencida.' : 'Aguardando os registros.'}</p>}
        {summary.overdue.length > 8 && <p className="finance-help">Veja todas nas abas de contas, usando o filtro Vencidos.</p>}
      </section>
    </div>
    <section className="finance-panel"><div className="finance-section-heading"><h2>Próximos vencimentos</h2></div><p className="finance-help">Até oito contas em aberto a partir de hoje.</p>
      {summary.upcoming.length ? <ul className="finance-due-list">{summary.upcoming.map((entry) => <li key={entry.id}><div><strong>{entry.description}</strong><span>{entry.counterparty} · {entry.direction === 'RECEIVABLE' ? 'A receber' : 'A pagar'} · {financeDate(entry.due_on)}</span></div><b>{formatCents(entry.amount_cents)}</b></li>)}</ul> : <p className="finance-empty">{ready ? 'Nenhum vencimento futuro registrado.' : 'Aguardando os registros.'}</p>}
    </section>
  </div>;
}
