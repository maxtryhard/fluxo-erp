import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/routing/routes.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } });
const { modules, canAccess, resolveRoute, safeReturnPath } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const expected = {
  ADMIN: ['overview', 'demands', 'chat', 'commercial', 'finance', 'people', 'registrations', 'profile'],
  COMERCIAL: ['overview', 'demands', 'chat', 'commercial', 'profile'],
  FINANCEIRO: ['overview', 'demands', 'chat', 'finance', 'profile'],
  RH: ['overview', 'demands', 'chat', 'people', 'profile'],
  GERENCIA: ['overview', 'demands', 'chat', 'finance', 'people', 'profile'],
};
for (const [role, pages] of Object.entries(expected)) {
  test(`${role}: menu and manual URLs use the same access boundaries`, () => {
    const user = { id: 'fixture', active: true, role, department: 'Diretoria' };
    for (const [page, { path }] of Object.entries(modules)) {
      const allowed = pages.includes(page);
      assert.equal(canAccess(user, page), allowed);
      assert.deepEqual(resolveRoute(path, '', user), { kind: allowed ? 'protected' : 'forbidden', page });
      assert.deepEqual(resolveRoute(`${path}/`, '', user), resolveRoute(path, '', user));
      assert.deepEqual(resolveRoute(path, '', null), { kind: 'redirect', to: `/entrar?retorno=${encodeURIComponent(path)}` });
    }
  });
}
test('inactive, missing and invented identities cannot authorize a route', () => {
  for (const user of [null, { id: 'fixture', role: 'ADMIN', active: false }, { id: '', role: 'ADMIN', active: true }, { id: 'fixture', role: 'OWNER', active: true }]) {
    assert.equal(canAccess(user, 'overview'), false);
    assert.equal(resolveRoute('/financeiro', '', user).kind, 'redirect');
  }
});
test('public routes, unknown paths and post-login return destinations are safe', () => {
  for (const [path, page] of [['/', 'home'], ['/entrar', 'login'], ['/cadastro', 'register']]) assert.deepEqual(resolveRoute(path, '', null), { kind: 'public', page });
  for (const value of ['https://evil.invalid', '//evil.invalid', '/entrar', '/financeiro?url=evil', '/usuarios', '/seguranca', '/financeiro/../entrar', null]) assert.equal(safeReturnPath(value), undefined);
  assert.equal(safeReturnPath('/financeiro/'), '/financeiro');
  const user = { id: 'fixture', active: true, role: 'RH' };
  assert.deepEqual(resolveRoute('/entrar', '?retorno=%2Ffinanceiro', user), { kind: 'redirect', to: '/financeiro' });
  assert.equal(resolveRoute('/financeiro', '', user).kind, 'forbidden');
  assert.deepEqual(resolveRoute('/unknown', '', user), { kind: 'not-found' });
});
