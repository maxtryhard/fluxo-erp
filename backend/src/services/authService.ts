import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { Role, SafeRegistrationRequest, SafeUser, User } from '../models/types.js';
import { comparePassword, hashPassword } from '../utils/crypto.js';

const mockUsers: User[] = [];
const registrationRequests: (SafeRegistrationRequest & { passwordHash: string })[] = [];

export const initDefaultUsers = async (): Promise<void> => {
  if (mockUsers.length > 0) return;
  if (env.NODE_ENV !== 'development' || !env.DEV_ADMIN_EMAIL || !env.DEV_ADMIN_PASSWORD) return;

  mockUsers.push({
    id: 'usr-dev-admin',
    name: 'Administrador de Desenvolvimento',
    email: env.DEV_ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(env.DEV_ADMIN_PASSWORD),
    role: 'ADMIN',
    department: 'Diretoria',
    active: true,
    createdAt: new Date().toISOString(),
  });
};

export const submitRegistration = async (
  name: string,
  email: string,
  password: string
): Promise<SafeRegistrationRequest | null> => {
  await initDefaultUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const alreadyRegistered = mockUsers.some((user) => user.email === normalizedEmail)
    || registrationRequests.some((request) => request.email === normalizedEmail);
  if (alreadyRegistered) return null;

  const request = {
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  registrationRequests.push(request);
  const { passwordHash: _passwordHash, ...safeRequest } = request;
  return safeRequest;
};

export const getPendingRegistrations = (): SafeRegistrationRequest[] =>
  registrationRequests.map(({ passwordHash: _passwordHash, ...request }) => request);

export const approveRegistration = (id: string, role: Exclude<Role, 'ADMIN'>): SafeUser | null => {
  const index = registrationRequests.findIndex((request) => request.id === id);
  if (index < 0) return null;

  const [request] = registrationRequests.splice(index, 1);
  const departmentByRole: Record<Exclude<Role, 'ADMIN'>, User['department']> = {
    COMERCIAL: 'Comercial',
    FINANCEIRO: 'Financeiro',
    RH: 'RH',
    GERENCIA: 'Diretoria',
  };
  const user: User = {
    ...request,
    role,
    department: departmentByRole[role],
    active: true,
  };
  mockUsers.push(user);
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
};

export const rejectRegistration = (id: string): boolean => {
  const index = registrationRequests.findIndex((request) => request.id === id);
  if (index < 0) return false;
  registrationRequests.splice(index, 1);
  return true;
};

export const authenticateUser = async (email: string, password: string): Promise<{ token: string; user: SafeUser } | null> => {
  await initDefaultUsers();

  const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.active);
  if (!user) {
    return null;
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return null;
  }

  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  };

  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  const { passwordHash: _, ...safeUser } = user;
  return { token, user: safeUser };
};

export const findUserById = async (id: string): Promise<SafeUser | null> => {
  await initDefaultUsers();
  const user = mockUsers.find((u) => u.id === id);
  if (!user) return null;
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
};
