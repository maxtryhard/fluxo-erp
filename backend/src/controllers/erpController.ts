import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import * as erpService from '../services/erpService.js';

export const createCommercialDemandSchema = z.object({
  clientName: z.string().min(2, 'Nome do cliente é obrigatório'),
  title: z.string().min(3, 'Título é obrigatório'),
  description: z.string().min(5, 'Descrição detalhada é obrigatória'),
  budgetTotal: z.number().positive('Orçamento deve ser um valor positivo'),
});

export const updateFinancialSchema = z.object({
  paymentTerms: z.string().min(2, 'Condição de pagamento é obrigatória'),
  costEstimate: z.number().nonnegative('Estimativa de custo inválida'),
  invoicedValue: z.number().nonnegative('Valor faturado inválido'),
  approved: z.boolean(),
});

export const updateRhSchema = z.object({
  requiredRoles: z.array(z.string()).min(1, 'Informe pelo menos um cargo necessário'),
  assignedStaffCount: z.number().int().nonnegative('Quantidade de alocação inválida'),
  approved: z.boolean(),
});

export const listDemandsHandler = (req: AuthenticatedRequest, res: Response): void => {
  const demands = erpService.getAllDemands();
  res.status(200).json({ demands });
};

export const getDemandDetailsHandler = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const demand = erpService.getDemandById(id);

  if (!demand) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  const history = erpService.getHistoriesByDemandId(id);
  res.status(200).json({ demand, history });
};

export const createCommercialDemandHandler = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const newDemand = erpService.createDemand({
    ...req.body,
    commercialResponsibleId: req.user.id,
    authorName: req.user.name,
  });

  res.status(201).json({
    message: 'Orçamento comercial cadastrado e iniciado no fluxo integrado.',
    demand: newDemand,
  });
};

export const approveCommercialDemandHandler = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const { id } = req.params;
  const current = erpService.getDemandById(id);
  if (!current) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }
  if (current.status !== 'ORCAMENTO') {
    res.status(409).json({ error: 'Somente demandas em orçamento podem ser aprovadas pelo Comercial.' });
    return;
  }

  const updated = erpService.approveCommercialDemand(id, req.user.id, req.user.name);
  if (!updated) {
    res.status(409).json({ error: 'A etapa comercial da demanda já foi alterada.' });
    return;
  }
  res.status(200).json({ message: 'Proposta aprovada e encaminhada ao Financeiro.', demand: updated });
};

export const updateFinancialHandler = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const { id } = req.params;
  const current = erpService.getDemandById(id);
  if (!current) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }
  if (current.status !== 'APROVADO_COMERCIAL') {
    res.status(409).json({ error: 'A demanda precisa ser aprovada pelo Comercial antes da análise Financeira.' });
    return;
  }
  const updated = erpService.updateFinancialDemand(id, {
    ...req.body,
    authorId: req.user.id,
    authorName: req.user.name,
  });

  if (!updated) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  res.status(200).json({ message: 'Dados financeiros atualizados.', demand: updated });
};

export const updateRhHandler = (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  const { id } = req.params;
  const current = erpService.getDemandById(id);
  if (!current) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }
  if (current.status !== 'ALOCACAO_RH' || !current.financialApproved) {
    res.status(409).json({ error: 'A demanda precisa ser aprovada pelo Financeiro antes da alocação de RH.' });
    return;
  }
  const updated = erpService.updateRhDemand(id, {
    ...req.body,
    authorId: req.user.id,
    authorName: req.user.name,
  });

  if (!updated) {
    res.status(404).json({ error: 'Demanda não encontrada.' });
    return;
  }

  res.status(200).json({ message: 'Dados de RH e alocação atualizados.', demand: updated });
};

export const getGerencialReportHandler = (_req: AuthenticatedRequest, res: Response): void => {
  const overview = erpService.getGerencialOverview();
  res.status(200).json({ overview });
};
