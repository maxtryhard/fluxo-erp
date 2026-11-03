import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '../models/types.js';
import { findUserById } from '../services/authService.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization;
  const match = header?.match(/^Bearer ([^\s]+)$/i);
  if (!match) { res.status(401).json({ error: 'Token de autenticação não fornecido.' }); return; }
  let payload: string | jwt.JwtPayload;
  try { payload = jwt.verify(match[1], env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { res.status(401).json({ error: 'Token inválido ou expirado.' }); return; }
  if (typeof payload === 'string' || typeof payload.id !== 'string') {
    res.status(401).json({ error: 'Token inválido ou expirado.' }); return;
  }
  try {
    // The signed token identifies the account; current account data authorizes the request.
    const user = await findUserById(payload.id);
    if (!user?.active || !['ADMIN', 'COMERCIAL', 'FINANCEIRO', 'RH', 'GERENCIA'].includes(user.role)) {
      res.status(401).json({ error: 'Conta não encontrada ou inativa.' }); return;
    }
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role, department: user.department };
  } catch (error) { next(error); return; }
  next();
};

export const authorizeRoles = (...roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }

    if (!roles.includes(req.user.role) && req.user.role !== 'ADMIN') {
      res.status(403).json({
        error: `Acesso negado para o perfil ${req.user.role}. Permissão necessária: ${roles.join(', ')}.`,
      });
      return;
    }

    next();
  };
};
