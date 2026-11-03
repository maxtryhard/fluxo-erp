import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const key = randomBytes(48).toString('hex');
Object.assign(process.env, { NODE_ENV: 'test', JWT_SECRET: key, DEV_ADMIN_EMAIL: '', DEV_ADMIN_PASSWORD: '', BCRYPT_SALT_ROUNDS: '10' });
const jwt = require('jsonwebtoken');
const auth = require('../dist/services/authService.js');
const { app } = require('../dist/app.js');

// Only isolated, in-memory accounts. No production credentials or Supabase requests.
test('HTTP authorization uses current accounts and scopes reads and mutations', async () => {
  const users = {};
  const password = randomBytes(24).toString('hex');
  for (const role of ['COMERCIAL', 'FINANCEIRO', 'RH', 'GERENCIA']) {
    const request = await auth.submitRegistration('Access fixture', `${role.toLowerCase()}@example.invalid`, password);
    users[role] = auth.approveRegistration(request.id, role);
  }
  const originalLookup = auth.findUserById;
  let override;
  auth.findUserById = async (id) => override?.id === id ? override : originalLookup(id);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const token = (user, claims = {}) => jwt.sign({ id: user.id, ...claims }, key, { expiresIn: '5m' });
  const call = async (path, bearer, method = 'GET', body) => {
    const response = await fetch(base + path, { method, headers: { ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, data: await response.json() };
  };
  const checkFields = (demand, role) => {
    assert.ok(demand.id);
    assert.equal('budgetTotal' in demand, role !== 'RH');
    assert.equal('financialApproved' in demand, ['ADMIN', 'GERENCIA', 'FINANCEIRO'].includes(role));
    assert.equal('rhApproved' in demand, ['ADMIN', 'GERENCIA', 'RH'].includes(role));
  };
  try {
    for (const bearer of [undefined, 'invalid', jwt.sign({}, key), token({ id: 'missing' })]) assert.equal((await call('/erp/demands', bearer)).status, 401);
    const login = await call('/auth/login', undefined, 'POST', { email: users.COMERCIAL.email, password });
    assert.equal(login.status, 200);
    assert.ok(login.data.token);
    assert.equal((await call('/erp/demands', login.data.token)).status, 200);
    for (const [role, user] of Object.entries(users)) {
      const bearer = token(user, { role: 'ADMIN', department: 'Diretoria' });
      const list = await call('/erp/demands', bearer);
      assert.equal(list.status, 200);
      assert.ok(list.data.demands.length);
      list.data.demands.forEach((demand) => checkFields(demand, role));
      const details = await call(`/erp/demands/${list.data.demands[0].id}`, bearer);
      checkFields(details.data.demand, role);
      const departments = role === 'COMERCIAL' ? ['Comercial'] : role === 'FINANCEIRO' ? ['Comercial', 'Financeiro'] : role === 'RH' ? ['Comercial', 'RH'] : ['Comercial', 'Financeiro', 'RH', 'Diretoria'];
      assert.ok(details.data.history.every((event) => departments.includes(event.department)));
      assert.equal((await call('/auth/registration-requests', bearer)).status, 403);
      assert.equal((await call('/erp/overview', bearer)).status, role === 'GERENCIA' ? 200 : 403);
      if (role !== 'FINANCEIRO') assert.equal((await call('/erp/financial/demands/missing', bearer, 'PATCH', {})).status, 403);
      if (role !== 'RH') assert.equal((await call('/erp/rh/demands/missing', bearer, 'PATCH', {})).status, 403);
      if (role !== 'COMERCIAL') assert.equal((await call('/erp/commercial/demands', bearer, 'POST', {})).status, 403);
    }
    // Changes are read on every request, even with an older valid token.
    override = { ...users.COMERCIAL, role: 'ADMIN' };
    assert.equal((await call('/auth/registration-requests', token(users.COMERCIAL))).status, 200);
    const adminList = await call('/erp/demands', token(users.COMERCIAL));
    adminList.data.demands.forEach((demand) => checkFields(demand, 'ADMIN'));
    override = { ...users.COMERCIAL, active: false };
    assert.equal((await call('/erp/demands', token(users.COMERCIAL, { role: 'ADMIN' }))).status, 401);
    override = undefined;
    const commercialToken = token(users.COMERCIAL);
    const created = await call('/erp/commercial/demands', commercialToken, 'POST', { clientName: 'Fixture', title: 'Authorization fixture', description: 'Isolated authorization validation', budgetTotal: 200 });
    assert.equal(created.status, 201); checkFields(created.data.demand, 'COMERCIAL');
    const id = created.data.demand.id;
    const approved = await call(`/erp/commercial/demands/${id}/approve`, commercialToken, 'POST');
    assert.equal(approved.status, 200); checkFields(approved.data.demand, 'COMERCIAL');
    const finance = await call(`/erp/financial/demands/${id}`, token(users.FINANCEIRO), 'PATCH', { paymentTerms: '30 dias', costEstimate: 100, invoicedValue: 200, approved: true });
    assert.equal(finance.status, 200); checkFields(finance.data.demand, 'FINANCEIRO');
    const hr = await call(`/erp/rh/demands/${id}`, token(users.RH), 'PATCH', { requiredRoles: ['Operador'], assignedStaffCount: 1, approved: true });
    assert.equal(hr.status, 200); checkFields(hr.data.demand, 'RH');
  } finally {
    auth.findUserById = originalLookup;
    await new Promise((resolve) => server.close(resolve));
  }
});
