import express from 'express';
import { 
  createTarea, 
  getTareas, 
  getTareaById,
  updateTarea,
  closeTarea,
  deleteTarea 
} from '../controllers/tareaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { 
  createTareaValidator, 
  updateTareaValidator,
  tareaIdValidator 
} from '../middlewares/validators/tareaValidator.js';

const router = express.Router();

router.post('/', authMiddleware, createTareaValidator, createTarea);
router.get('/', authMiddleware, getTareas);
router.get('/:id', authMiddleware, tareaIdValidator, getTareaById);
router.put('/:id', authMiddleware, tareaIdValidator, updateTareaValidator, updateTarea);
router.patch('/:id/close', authMiddleware, tareaIdValidator, closeTarea);
router.delete('/:id', authMiddleware, tareaIdValidator, deleteTarea);

export default router;