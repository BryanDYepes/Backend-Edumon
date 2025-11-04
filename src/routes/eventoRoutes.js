import express from 'express';
import {
  createEvento,
  getEventos,
  getEventoById,
  updateEvento,
  deleteEvento,
  getEventosHoy
} from '../controllers/eventoController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { uploadArchivoCloudinary } from '../middlewares/cloudinaryMiddleware.js';
import {
  createEventoValidator,
  updateEventoValidator,
  eventoIdValidator
} from '../middlewares/validators/eventoValidator.js';

const router = express.Router();

// Rutas públicas (requieren autenticación)
router.get('/', authMiddleware, getEventos);
router.get('/hoy', authMiddleware, getEventosHoy);
router.get('/:id', authMiddleware, eventoIdValidator, getEventoById);

// Rutas protegidas (solo administrador y docente)
router.post(
  '/',
  authMiddleware,
  uploadArchivoCloudinary.single('adjunto'),
  createEventoValidator,
  createEvento
);

router.put(
  '/:id',
  authMiddleware,
  uploadArchivoCloudinary.single('adjunto'),
  updateEventoValidator,
  updateEvento
);

router.delete(
  '/:id',
  authMiddleware,
  eventoIdValidator,
  deleteEvento
);

export default router;