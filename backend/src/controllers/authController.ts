import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, authorizeRoles } from '../middlewares/auth.js';
import {
  approveRegistration,
  authenticateUser,
  findUserById,
  getPendingRegistrations,
  rejectRegistration,
  submitRegistration,
} from '../services/authService.js';

export const loginSchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
});

export const registrationSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo.').max(100),
  email: z.string().trim().email('E-mail em formato inválido.').max(254),
  password: z.string().min(12, 'A senha deve ter no mínimo 12 caracteres.').max(128),
});

export const approveRegistrationSchema = z.object({
  role: z.enum(['COMERCIAL', 'FINANCEIRO', 'RH', 'GERENCIA']),
});

export const registerHandler = async (req: Request, res: Response): Promise<void> => {
  await submitRegistration(req.body.name, req.body.email, req.body.password);
  res.status(202).json({
    message: 'Solicitação recebida. Aguarde a aprovação de um administrador para acessar o sistema.',
  });
};

export const listRegistrationRequestsHandler = (_req: AuthenticatedRequest, res: Response): void => {
  res.status(200).json({ requests: getPendingRegistrations() });
};

export const approveRegistrationHandler = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const approvedUser = approveRegistration(id, req.body.role);
  if (!approvedUser) {
    res.status(404).json({ error: 'Solicitação de cadastro não encontrada.' });
    return;
  }
  res.status(200).json({ user: approvedUser });
};

export const rejectRegistrationHandler = (req: AuthenticatedRequest, res: Response): void => {
  if (!rejectRegistration(req.params.id)) {
    res.status(404).json({ error: 'Solicitação de cadastro não encontrada.' });
    return;
  }
  res.status(204).send();
};

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const result = await authenticateUser(email, password);

  if (!result) {
    res.status(401).json({ error: 'Credenciais inválidas ou conta inativa.' });
    return;
  }

  res.status(200).json({
    message: 'Autenticado com sucesso.',
    token: result.token,
    user: result.user,
  });
};

export const getProfileHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const profile = await findUserById(req.user.id);
  if (!profile) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  res.status(200).json({ profile });
};
