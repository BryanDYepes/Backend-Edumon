import express from 'express';
import { 
  createUser, 
  getUsers, 
  getUserById, 
  updateUser, 
  deleteUser 
} from '../controllers/userController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createUserValidator } from '../middlewares/validators/userValidator.js';

const router = express.Router();

router.post('/', authMiddleware, createUserValidator, createUser);
router.get('/', authMiddleware, getUsers);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, deleteUser);

export default router;