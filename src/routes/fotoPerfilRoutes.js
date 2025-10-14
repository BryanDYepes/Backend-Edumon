import express from 'express';
import { 
  getFotosPredeterminadas,
  uploadFotoPredeterminada,
  deleteFotoPredeterminada
} from '../controllers/fotoPerfilController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { uploadFotoPredeterminada as uploadMiddleware } from '../config/multerConfig.js';

const router = express.Router();

// Obtener fotos predeterminadas (público o autenticado)
router.get('/predeterminadas', authMiddleware, getFotosPredeterminadas);

// Subir foto predeterminada (solo admin)
router.post(
  '/predeterminadas', 
  authMiddleware, 
  uploadMiddleware.single('foto'), 
  uploadFotoPredeterminada
);

// Eliminar foto predeterminada (solo admin)
router.delete(
  '/predeterminadas/:nombreArchivo', 
  authMiddleware, 
  deleteFotoPredeterminada
);

export default router;