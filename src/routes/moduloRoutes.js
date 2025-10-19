import express from 'express';
import { 
  createModulo, 
  getModulos, 
  getModuloById,
  getModulosByCurso,
  updateModulo, 
  deleteModulo,
  restoreModulo // Importar nueva función
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
router.get('/curso/:cursoId', authMiddleware, cursoIdValidator, getModulosByCurso);
router.get('/', authMiddleware, getModulos);
router.get('/:id', authMiddleware, moduloIdValidator, getModuloById);
router.put('/:id', authMiddleware, updateModuloValidator, updateModulo);
router.delete('/:id', authMiddleware, moduloIdValidator, deleteModulo);
router.patch('/:id/restore', authMiddleware, moduloIdValidator, restoreModulo); // Nueva ruta

export default router;