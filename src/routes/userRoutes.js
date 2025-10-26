import express from 'express';
import { 
  createUser, 
  getUsers, 
  getUserById,
  getProfile,
  updateUser, 
  deleteUser,
  getFotosPredeterminadas,
  updateFotoPerfil
} from '../controllers/userController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadImagenCloudinary } from '../middlewares/cloudinaryMiddleware.js';
import { 
  createUserValidator,
  updateUserValidator,
  userIdValidator
} from '../middlewares/validators/userValidator.js';

const router = express.Router();

router.post('/', authMiddleware, createUserValidator, createUser);
router.get('/', authMiddleware, getUsers);

router.get('/me/profile', authMiddleware, getProfile);
router.put('/me/foto-perfil', 
  authMiddleware, 
  uploadImagenCloudinary.single('foto'), 
  updateFotoPerfil
);

router.get('/fotos-predeterminadas', authMiddleware, getFotosPredeterminadas);

router.get('/:id', authMiddleware, userIdValidator, getUserById);
router.put('/:id', authMiddleware, updateUserValidator, updateUser);
router.delete('/:id', authMiddleware, userIdValidator, deleteUser);

export default router;