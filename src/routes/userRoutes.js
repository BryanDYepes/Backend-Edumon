import express from 'express';
import { 
  createUser, 
  getUsers, 
  getUserById,
  getProfile,
  updateUser, 
  deleteUser,
  updateFotoPerfil,
  uploadFotoPerfilCustom,
  deleteFotoPerfil
} from '../controllers/userController.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadFotoPerfil } from '../config/multerConfig.js';
import { 
  createUserValidator,
  updateUserValidator,
  userIdValidator
} from '../middlewares/validators/userValidator.js';

const router = express.Router();

// Rutas de usuarios
router.post('/', authMiddleware, createUserValidator, createUser);
router.get('/', authMiddleware, getUsers);
router.get('/me/profile', authMiddleware, getProfile); // ⚠️ Debe ir ANTES de '/:id'
router.get('/:id', authMiddleware, userIdValidator, getUserById);
router.put('/:id', authMiddleware, updateUserValidator, updateUser);
router.delete('/:id', authMiddleware, userIdValidator, deleteUser);

// 📸 Rutas para fotos de perfil
router.put('/me/foto-perfil', authMiddleware, updateFotoPerfil); // Seleccionar predeterminada
router.post(
  '/me/foto-perfil/upload', 
  authMiddleware, 
  uploadFotoPerfil.single('foto'), 
  uploadFotoPerfilCustom
); // Subir personalizada
router.delete('/me/foto-perfil', authMiddleware, deleteFotoPerfil); // Eliminar foto

export default router;