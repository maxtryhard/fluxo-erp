import { Router } from 'express';
import {
  approveRegistrationHandler,
  approveRegistrationSchema,
  getProfileHandler,
  listRegistrationRequestsHandler,
  loginHandler,
  loginSchema,
  registerHandler,
  registrationSchema,
  rejectRegistrationHandler,
} from '../controllers/authController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/security.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { validateRequest } from '../middlewares/validate.js';

export const authRouter = Router();

// Rota protegida com rate limit estrito contra força bruta
authRouter.post('/login', authRateLimiter, validateRequest(loginSchema), asyncHandler(loginHandler));
authRouter.post('/register', authRateLimiter, validateRequest(registrationSchema), asyncHandler(registerHandler));

// Perfil do usuário autenticado
authRouter.get('/profile', authenticateToken, getProfileHandler);
authRouter.get('/registration-requests', authenticateToken, authorizeRoles('ADMIN'), listRegistrationRequestsHandler);
authRouter.patch(
  '/registration-requests/:id/approve',
  authenticateToken,
  authorizeRoles('ADMIN'),
  validateRequest(approveRegistrationSchema),
  approveRegistrationHandler
);
authRouter.delete(
  '/registration-requests/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  rejectRegistrationHandler
);
