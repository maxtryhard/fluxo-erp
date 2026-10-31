import { useState, type FormEvent } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { Demand } from '../types';
import { reviewDemand } from '../services/communication';

export function DemandReview({ demand, page, onComplete }: { demand: Demand; page: string; onComplete: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [terms, setTerms] = useState(demand.paymentTerms ?? '');
  const [cost, setCost] = useState(String(demand.costEstimate ?? 0));
  const [invoiced, setInvoiced] = useState(String(demand.invoicedValue ?? demand.budgetTotal ?? 0));
  const [roles, setRoles] = useState((demand.requiredRoles ?? []).join(', '));
  const [staff, setStaff] = useState(String(demand.assignedStaffCount ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const action = page === 'commercial' && demand.status === 'ORCAMENTO' ? 'COMMERCIAL'
    : page === 'finance' && demand.status === 'APROVADO_COMERCIAL' ? 'FINANCE'
      : page === 'people' && demand.status === 'ALOCACAO_RH' ? 'HR' : null;
  if (!action) return null;
  const destination = action === 'COMMERCIAL' ? 'Financeiro' : action === 'FINANCE' ? 'RH' : 'Execução';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(''); setStatus('');
    try {
      await reviewDemand(demand.id, action, note, action === 'FINANCE' ? { paymentTerms: terms, costEstimate: Number(cost), invoicedValue: Number(invoiced) }
        : action === 'HR' ? { requiredRoles: roles.split(',').map((role) => role.trim()).filter(Boolean), assignedStaffCount: Number(staff) } : {});
      setStatus('Análise registrada e demanda encaminhada.'); setOpen(false); setNote('');
      try { await onComplete(); } catch { setError('O envio foi concluído, mas a lista não atualizou. Atualize a página.'); }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível registrar a análise.'); }
    finally { setSaving(false); }
  };
  return (
    <section className="demand-review">
      <button type="button" className="secondary-button" onClick={() => setOpen(!open)} disabled={saving}><Check size={16} />{open ? 'Fechar revisão' : `Analisar e enviar para ${destination}`}</button>
      {error && <p className="alert" role="alert">{error}</p>}<p role="status">{status}</p>
      {open && <form onSubmit={(event) => void submit(event)} className="demand-review-form">
        <p>Registre seu parecer antes de encaminhar. {action === 'COMMERCIAL' ? 'Visível a todos os setores.' : `Parecer restrito a ${action === 'FINANCE' ? 'Financeiro' : 'RH'}, Gerência e Administração. Use a conversa entre setores para orientações compartilhadas.`}</p>
        {action === 'FINANCE' && <div className="review-fields"><label className="field-label">Condição de pagamento<input value={terms} maxLength={1000} onChange={(event) => setTerms(event.target.value)} required /></label><label className="field-label">Custo estimado (R$)<input type="number" min="0" step=".01" value={cost} onChange={(event) => setCost(event.target.value)} required /></label><label className="field-label">Valor faturado (R$)<input type="number" min="0" step=".01" value={invoiced} onChange={(event) => setInvoiced(event.target.value)} required /></label></div>}
        {action === 'HR' && <div className="review-fields"><label className="field-label">Perfis necessários<input value={roles} maxLength={1000} onChange={(event) => setRoles(event.target.value)} required placeholder="Analista, Desenvolvedor..." /></label><label className="field-label">Pessoas alocadas<input type="number" min="0" step="1" value={staff} onChange={(event) => setStaff(event.target.value)} required /></label></div>}
        <label className="field-label">Parecer e orientações<textarea value={note} onChange={(event) => setNote(event.target.value)} minLength={10} maxLength={4000} required rows={4} placeholder="O que foi analisado? Quais condições, cuidados ou próximos passos precisam ficar registrados?" /></label>
        <button type="submit" className="primary-button" disabled={saving || note.trim().length < 10}>{saving ? 'Registrando...' : `Registrar parecer e enviar para ${destination}`}<ArrowRight size={15} /></button>
      </form>}
    </section>
  );
}
