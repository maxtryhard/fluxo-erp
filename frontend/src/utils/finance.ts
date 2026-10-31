import type { FinancialEntry } from '../types';

export const formatCents = (cents: number): string => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const financeDate = (value: string): string => value.split('-').reverse().join('/');
export function financialToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function parseCents(value: string): number {
  const match = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Informe um valor com até duas casas decimais, sem separador de milhar.');
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 1000000000000) throw new Error('Informe um valor positivo de até R$ 10 bilhões.');
  return cents;
}
export function installmentCents(total: number, count: number, number: number): number {
  return Math.floor(total / count) + (number <= total % count ? 1 : 0);
}
export function summarizeFinance(entries: FinancialEntry[], from: string, to: string, today: string) {
  const current = entries.filter((entry) => !entry.cancelled_at);
  const realized = current.filter((entry) => entry.settled_on && entry.settled_on >= from && entry.settled_on <= to);
  const open = current.filter((entry) => !entry.settled_on);
  const sum = (list: FinancialEntry[], direction: FinancialEntry['direction']) => list.filter((entry) => entry.direction === direction).reduce((total, entry) => total + entry.amount_cents, 0);
  const received = sum(realized, 'RECEIVABLE');
  const paid = sum(realized, 'PAYABLE');
  const months = new Map<string, { month: string; received: number; paid: number }>();
  for (const entry of realized) {
    const month = entry.settled_on!.slice(0, 7);
    const row = months.get(month) ?? { month, received: 0, paid: 0 };
    if (entry.direction === 'RECEIVABLE') row.received += entry.amount_cents;
    else row.paid += entry.amount_cents;
    months.set(month, row);
  }
  return {
    received, paid, result: received - paid, receivable: sum(open, 'RECEIVABLE'), payable: sum(open, 'PAYABLE'),
    overdue: open.filter((entry) => entry.due_on < today),
    upcoming: open.filter((entry) => entry.due_on >= today).sort((a, b) => a.due_on.localeCompare(b.due_on)).slice(0, 8),
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
