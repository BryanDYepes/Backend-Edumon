import express from 'express';
import { 
  createModulo, 
  getModulos, 
  getModuloById,
  getModulosByCurso,
  updateModulo, 
  deleteModulo 
} from '../controllers/moduloController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { 
  createModuloValidator, 
  updateModuloValidator,
  moduloIdValidator,
  cursoIdValidator
} from '../middlewares/validators/moduloValidator.js';

const router = express.Router();

// Rutas protegidas
router.post('/', authMiddleware, createModuloValidator, createModulo);
router.get('/curso/:cursoId', authMiddleware, cursoIdValidator, getModulosByCurso); // 👈 2. MOVER esta línea ANTES de '/:id'
router.get('/', authMiddleware, getModulos);
router.get('/:id', authMiddleware, moduloIdValidator, getModuloById);
router.put('/:id', authMiddleware, updateModuloValidator, updateModulo);
router.delete('/:id', authMiddleware, moduloIdValidator, deleteModulo);

export default router;