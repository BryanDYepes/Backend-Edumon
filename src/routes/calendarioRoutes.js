import express from 'express';
import {
  obtenerCalendarioCurso,
  obtenerEventosDia,
  obtenerProximosEventos
} from '../controllers/calendarioController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Obtener calendario completo de un curso
router.get('/:cursoId', obtenerCalendarioCurso);

// Obtener eventos de un día específico
router.get('/:cursoId/dia', obtenerEventosDia);

// Obtener próximos eventos
router.get('/:cursoId/proximos', obtenerProximosEventos);

export default router;