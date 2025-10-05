import express from 'express';
import { 
  createEntrega, 
  getEntregas, 
  getEntregaById,
  updateEntrega,
  calificarEntrega,
  deleteEntrega 
} from '../controllers/entregaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { 
  createEntregaValidator, 
  updateEntregaValidator,
  calificarEntregaValidator,
  entregaIdValidator 
} from '../middlewares/validators/entregaValidator.js';

const router = express.Router();

router.post('/', authMiddleware, createEntregaValidator, createEntrega);
router.get('/', authMiddleware, getEntregas);
router.get('/:id', authMiddleware, entregaIdValidator, getEntregaById);
router.put('/:id', authMiddleware, updateEntregaValidator, updateEntrega);
router.patch('/:id/calificar', authMiddleware, calificarEntregaValidator, calificarEntrega);
router.delete('/:id', authMiddleware, entregaIdValidator, deleteEntrega);

export default router;