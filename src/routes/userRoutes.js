import express from 'express';
import { 
  createUser, 
  getUsers, 
  getUserById,
  getProfile,
  updateUser, 
  deleteUser,
} from '../controllers/userController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { 
  createUserValidator,
  updateUserValidator,
  userIdValidator
} from '../middlewares/validators/userValidator.js';

const router = express.Router();

// Rutas de usuarios
router.post('/', authMiddleware, createUserValidator, createUser);
router.get('/', authMiddleware, getUsers);
router.get('/me/profile', authMiddleware, getProfile);
router.get('/:id', authMiddleware, userIdValidator, getUserById);
router.put('/:id', authMiddleware, updateUserValidator, updateUser);
router.delete('/:id', authMiddleware, userIdValidator, deleteUser);

export default router;