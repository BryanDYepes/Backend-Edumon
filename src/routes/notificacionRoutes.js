import express from 'express';
import { 
  createNotificacion,
  getMisNotificaciones,
  getNotificacionById,
  marcarComoLeida,
  marcarVariasLeidas,
  marcarTodasLeidas,
  deleteNotificacion,
  eliminarLeidasAntiguas,
  getConteoNoLeidas
} from '../controllers/notificacionController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { 
  createNotificacionValidator,
  updateNotificacionValidator,
  marcarVariasLeidasValidator,
  getNotificacionesValidator,
  notificacionIdValidator
} from '../middlewares/validators/notificacionValidator.js';

const router = express.Router();

// ============ RUTAS PROTEGIDAS ============

// Obtener mis notificaciones (con paginación y filtros)
router.get(
  '/',
  authMiddleware,
  getNotificacionesValidator,
  getMisNotificaciones
);

// Obtener conteo de no leídas
router.get(
  '/conteo-no-leidas',
  authMiddleware,
  getConteoNoLeidas
);

// Obtener notificación específica
router.get(
  '/:id',
  authMiddleware,
  notificacionIdValidator,
  getNotificacionById
);

// Crear notificación (normalmente para uso interno/admin)
router.post(
  '/',
  authMiddleware,
  createNotificacionValidator,
  createNotificacion
);

// Marcar una notificación como leída
router.patch(
  '/:id/leer',
  authMiddleware,
  updateNotificacionValidator,
  marcarComoLeida
);

// Marcar múltiples notificaciones como leídas
router.patch(
  '/leer-multiples',
  authMiddleware,
  marcarVariasLeidasValidator,
  marcarVariasLeidas
);

// Marcar todas como leídas
router.patch(
  '/leer-todas',
  authMiddleware,
  marcarTodasLeidas
);

// Eliminar notificación
router.delete(
  '/:id',
  authMiddleware,
  notificacionIdValidator,
  deleteNotificacion
);

// Eliminar notificaciones leídas antiguas
router.delete(
  '/limpiar/antiguas',
  authMiddleware,
  eliminarLeidasAntiguas
);

export default router;