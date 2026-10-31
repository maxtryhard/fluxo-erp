import { useState, type FormEvent, type ReactNode } from 'react';
import { Check, Plus } from 'lucide-react';
import type { Demand, FinancialDirection, FinancialEntry, FinancialEvent } from '../types';
import { cancelFinancialEntry, createFinancialEntries, getFinancialEvents, settleFinancialEntry } from '../services/finance';
import { financeDate, financialToday, formatCents, installmentCents, parseCents } from '../utils/finance';

function FinanceActionForm({ action, onSaved, label, children }: { action: () => Promise<void>; onSaved: () => Promise<void>; label: string; children: ReactNode }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await action(); setSuccess('Registro salvo.');
      try { await onSaved(); } catch { setError('O registro foi salvo, mas a lista não atualizou. Clique em Atualizar.'); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Os dados foram mantidos.'); }
    finally { setSaving(false); }
  };
  return <form className="finance-form" onSubmit={(event) => void submit(event)}><fieldset disabled={saving}>{children}<button type="submit" className="primary-button"><Check size={15} />{saving ? 'Salvando...' : label}</button></fieldset>{error && <p role="alert" className="alert">{error}</p>}<span className="finance-success" role="status">{success}</span></form>;
}

export function FinancialEntryEditor({ direction, demands, onSaved, onCancel }: { direction: FinancialDirection; demands: Demand[]; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [batchId] = useState(() => crypto.randomUUID());
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [total, setTotal] = useState('');
  const [installments, setInstallments] = useState(1);
  const [firstDue, setFirstDue] = useState(financialToday());
  const [demandId, setDemandId] = useState('');
  const [notes, setNotes] = useState('');
  let totalCents = 0;
  try { totalCents = parseCents(total); } catch { /* Validation appears on submission; allow typing. */ }
  return <section className="finance-editor"><div className="finance-section-heading"><h2>Nova conta a {direction === 'RECEIVABLE' ? 'receber' : 'pagar'}</h2><button className="text-button" type="button" onClick={onCancel}>Fechar formulário</button></div>
    <p className="finance-help">Cadastre a previsão. O valor só entra no movimento realizado quando a baixa for registrada.</p>
    <FinanceActionForm label="Cadastrar conta" onSaved={onSaved} action={() => createFinancialEntries({ batchId, direction, description: description.trim(), counterparty: counterparty.trim(), totalCents: parseCents(total), firstDue, installments, demandId, notes: notes.trim() })}>
      <div className="finance-form-grid">
        <label className="field-label">Descrição<input autoFocus value={description} onChange={(event) => setDescription(event.target.value)} required minLength={3} maxLength={200} placeholder="Ex.: Serviço de instalação" /></label>
        <label className="field-label">{direction === 'RECEIVABLE' ? 'Cliente / origem' : 'Fornecedor / favorecido'}<input value={counterparty} onChange={(event) => setCounterparty(event.target.value)} required minLength={2} maxLength={200} /></label>
        <label className="field-label">Valor total (R$)<input type="text" inputMode="decimal" value={total} onChange={(event) => setTotal(event.target.value)} required maxLength={16} placeholder="6000,00" /></label>
        <label className="field-label">Número de parcelas mensais<input type="number" min={1} max={60} step={1} value={installments} onChange={(event) => setInstallments(Number(event.target.value))} required /></label>
        <label className="field-label">Primeiro vencimento<input type="date" value={firstDue} onChange={(event) => setFirstDue(event.target.value)} required /></label>
        <label className="field-label">Demanda vinculada (opcional)<select value={demandId} onChange={(event) => { setDemandId(event.target.value); if (direction === 'RECEIVABLE') setCounterparty(demands.find((item) => item.id === event.target.value)?.clientName ?? counterparty); }}><option value="">Sem vínculo com demanda</option>{demands.filter((item) => !['ORCAMENTO', 'CANCELADO'].includes(item.status)).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
      </div>
      {totalCents > 0 && installments >= 1 && installments <= 60 && Number.isInteger(installments) && <p className="finance-help">Total: {formatCents(totalCents)} · {installments} parcela(s). Primeira: {formatCents(installmentCents(totalCents, installments, 1))}; última: {formatCents(installmentCents(totalCents, installments, installments))}. Centavos são distribuídos nas primeiras parcelas.</p>}
      <label className="field-label">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={2000} /></label>
    </FinanceActionForm>
  </section>;
}

export function FinancialEntryActions({ entry, canManage, onSaved }: { entry: FinancialEntry; canManage: boolean; onSaved: () => Promise<void> }) {
  const [action, setAction] = useState<'settle' | 'cancel' | null>(null);
  const [date, setDate] = useState(financialToday());
  const [reason, setReason] = useState('');
  const [history, setHistory] = useState<FinancialEvent[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const loadHistory = async () => {
    setLoadingHistory(true); setHistoryError('');
    try { setHistory(await getFinancialEvents(entry.id)); } catch (failure) { setHistoryError(failure instanceof Error ? failure.message : 'Não foi possível carregar o histórico.'); }
    finally { setLoadingHistory(false); }
  };
  return <div className="finance-entry-actions"><div className="finance-action-buttons">
    {canManage && !entry.settled_on && !entry.cancelled_at && <><button type="button" className="secondary-button" onClick={() => setAction(action === 'settle' ? null : 'settle')}><Plus size={14} />Registrar {entry.direction === 'RECEIVABLE' ? 'recebimento' : 'pagamento'}</button><button className="text-button" type="button" onClick={() => setAction(action === 'cancel' ? null : 'cancel')}>Cancelar conta</button></>}
    <button type="button" className="text-button" disabled={loadingHistory} onClick={() => history ? setHistory(null) : void loadHistory()}>{loadingHistory ? 'Carregando...' : history ? 'Fechar histórico' : 'Ver histórico'}</button>
    </div>
    {historyError && <p className="alert" role="alert">{historyError}</p>}
    {history && <ul className="finance-history">{history.map((event) => <li key={event.id}><strong>{event.author_name}</strong><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('pt-BR')}</time><p>{event.details}</p></li>)}</ul>}
    {action && !entry.settled_on && !entry.cancelled_at && <FinanceActionForm action={() => action === 'settle' ? settleFinancialEntry(entry.id, date) : cancelFinancialEntry(entry.id, reason)} onSaved={async () => { setAction(null); setHistory(null); await onSaved(); }} label={action === 'settle' ? 'Confirmar baixa integral' : 'Confirmar cancelamento'}>
      {action === 'settle' ? <><p className="finance-help">Confirme que {formatCents(entry.amount_cents)} {entry.direction === 'RECEIVABLE' ? 'foi recebido' : 'foi pago'} integralmente. Este registro não realiza uma transferência bancária.</p><label className="field-label">Data efetiva<input type="date" required value={date} max={financialToday()} onChange={(event) => setDate(event.target.value)} /></label></> : <label className="field-label">Motivo do cancelamento<textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={5} maxLength={1000} required rows={2} /></label>}
    </FinanceActionForm>}
    {entry.settled_on && <p className="finance-help">Baixa integral registrada em {financeDate(entry.settled_on)}.</p>}
  </div>;
}
