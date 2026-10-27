import { Router } from 'express';
import {
  createCommercialDemandHandler,
  createCommercialDemandSchema,
  approveCommercialDemandHandler,
  getDemandDetailsHandler,
  getGerencialReportHandler,
  listDemandsHandler,
  updateFinancialHandler,
  updateFinancialSchema,
  updateRhHandler,
  updateRhSchema,
} from '../controllers/erpController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { validateRequest } from '../middlewares/validate.js';

export const erpRouter = Router();

// Todas as rotas exigem autenticação
erpRouter.use(authenticateToken);

// Visualização geral das demandas
erpRouter.get('/demands', listDemandsHandler);
erpRouter.get('/demands/:id', getDemandDetailsHandler);

// Visão gerencial acessível a ADMIN e GERENCIA
erpRouter.get('/overview', authorizeRoles('ADMIN', 'GERENCIA'), getGerencialReportHandler);

// Comercial: cadastro de orçamento
erpRouter.post(
  '/commercial/demands',
  authorizeRoles('ADMIN', 'COMERCIAL'),
  validateRequest(createCommercialDemandSchema),
  createCommercialDemandHandler
);

erpRouter.post(
  '/commercial/demands/:id/approve',
  authorizeRoles('ADMIN', 'COMERCIAL'),
  approveCommercialDemandHandler
);

// Financeiro: aprovação e faturamento
erpRouter.patch(
  '/financial/demands/:id',
  authorizeRoles('ADMIN', 'FINANCEIRO'),
  validateRequest(updateFinancialSchema),
  updateFinancialHandler
);

// RH: alocação e aprovação de equipe
erpRouter.patch(
  '/rh/demands/:id',
  authorizeRoles('ADMIN', 'RH'),
  validateRequest(updateRhSchema),
  updateRhHandler
);
