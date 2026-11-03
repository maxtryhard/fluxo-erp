import type { Demand, DemandHistory, Role } from '../models/types.js';

/** Mirror the existing Supabase field boundaries; never expose new fields by default. */
export function visibleDemand(demand: Demand, role: Role) {
  return {
    id: demand.id, code: demand.code, clientName: demand.clientName, title: demand.title,
    description: demand.description, status: demand.status, commercialResponsibleId: demand.commercialResponsibleId,
    createdAt: demand.createdAt, updatedAt: demand.updatedAt,
    ...(role !== 'RH' ? { budgetTotal: demand.budgetTotal } : {}),
    ...(['ADMIN', 'GERENCIA', 'FINANCEIRO'].includes(role) ? {
      paymentTerms: demand.paymentTerms, invoicedValue: demand.invoicedValue,
      costEstimate: demand.costEstimate, financialApproved: demand.financialApproved,
    } : {}),
    ...(['ADMIN', 'GERENCIA', 'RH'].includes(role) ? {
      requiredRoles: demand.requiredRoles, assignedStaffCount: demand.assignedStaffCount, rhApproved: demand.rhApproved,
    } : {}),
  };
}
export function visibleHistory(events: DemandHistory[], role: Role): DemandHistory[] {
  if (role === 'ADMIN' || role === 'GERENCIA') return events;
  const departments = role === 'COMERCIAL' ? ['Comercial'] : role === 'FINANCEIRO' ? ['Comercial', 'Financeiro'] : ['Comercial', 'RH'];
  return events.filter((event) => departments.includes(event.department));
}
