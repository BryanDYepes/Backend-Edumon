import express from 'express';
import { 
  register, 
  login, 
  getProfile, 
  changePassword, 
  logout 
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { 
  registerValidator, 
  loginValidator, 
  changePasswordValidator 
} from '../middlewares/validators/authValidator.js';

const router = express.Router();

// Rutas públicas
router.post('/register', registerValidator, register);
router.post('/login', loginValidator, login);

// Rutas protegidas
router.get('/profile', authMiddleware, getProfile);
router.post('/change-password', authMiddleware, changePasswordValidator, changePassword);
router.post('/logout', authMiddleware, logout);

export default router;