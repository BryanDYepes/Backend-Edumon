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
// GET /api/calendario/:cursoId
// Query params opcionales: ?mes=11&anio=2025
router.get('/:cursoId', obtenerCalendarioCurso);

// Obtener eventos de un día específico
// GET /api/calendario/:cursoId/dia?fecha=2025-11-15
router.get('/:cursoId/dia', obtenerEventosDia);

// Obtener próximos eventos
// GET /api/calendario/:cursoId/proximos?limite=10
router.get('/:cursoId/proximos', obtenerProximosEventos);

export default router;