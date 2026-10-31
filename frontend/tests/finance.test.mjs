import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Load only the pure calculation module; no browser, credentials or database calls.
const source = readFileSync(new URL('../src/utils/finance.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const { parseCents, installmentCents, summarizeFinance } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('decimal currency parsing rejects rounding, malformed, negative and unsafe values', () => {
  assert.equal(parseCents('0,01'), 1);
  assert.equal(parseCents('6000.10'), 600010);
  assert.equal(parseCents('10'), 1000);
  for (const value of ['0', '-1', '1.005', '1.234,56', '1e9', 'Infinity', '', '10000000000.01']) assert.throws(() => parseCents(value));
});
test('installment cents always preserve the total', () => {
  for (const total of [1, 100, 10000, 600001, 1000000000000]) {
    for (let count = 1; count <= Math.min(total, 60); count++) {
      const values = Array.from({ length: count }, (_, index) => installmentCents(total, count, index + 1));
      assert.equal(values.reduce((sum, value) => sum + value, 0), total);
      assert.ok(Math.max(...values) - Math.min(...values) <= 1);
      assert.ok(values.every((value) => value > 0));
    }
  }
});
test('realized movement uses settlement dates; forecasts and cancelled entries do not inflate cash', () => {
  const entry = (id, direction, amount_cents, due_on, settled_on = null, cancelled_at = null) => ({ id, direction, amount_cents, due_on, settled_on, cancelled_at });
  const data = [
    entry('received', 'RECEIVABLE', 10000, '2026-09-01', '2026-10-02'),
    entry('paid', 'PAYABLE', 3000, '2026-12-01', '2026-10-03'),
    entry('previous', 'RECEIVABLE', 9000, '2026-10-01', '2026-09-30'),
    entry('late', 'RECEIVABLE', 5000, '2026-10-01'),
    entry('future', 'PAYABLE', 2000, '2026-11-01'),
    entry('cancelled', 'PAYABLE', 99999, '2026-10-01', null, '2026-10-02'),
  ];
  const result = summarizeFinance(data, '2026-10-01', '2026-10-31', '2026-10-31');
  assert.equal(result.received, 10000);
  assert.equal(result.paid, 3000);
  assert.equal(result.result, 7000);
  assert.equal(result.receivable, 5000);
  assert.equal(result.payable, 2000);
  assert.deepEqual(result.overdue.map((item) => item.id), ['late']);
  assert.deepEqual(result.upcoming.map((item) => item.id), ['future']);
  assert.deepEqual(result.months, [{ month: '2026-10', received: 10000, paid: 3000 }]);
});
