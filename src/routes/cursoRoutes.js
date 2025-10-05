// routes/cursoRoutes.js
import express from 'express';
import {
  createCurso,
  getCursos,
  getCursoById,
  getMisCursos,
  updateCurso,
  archivarCurso,
  agregarParticipante,
  removerParticipante,
  registrarUsuariosMasivo
} from '../controllers/cursoController.js';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware.js';
import {
  createCursoValidator,
  updateCursoValidator,
  participanteValidator,
  cursoIdValidator
} from '../middlewares/validators/cursoValidator.js';
import { csvUpload } from '../middlewares/csvMiddleware.js';

const router = express.Router();

// Crear curso (CON OPCIÓN de archivo CSV)
router.post('/', 
  authMiddleware, 
  requireRole(['administrador', 'docente']),
  csvUpload.single('archivo'), // Agregar middleware de CSV (opcional)
  createCursoValidator, 
  createCurso
);

router.get('/', 
  authMiddleware, 
  requireRole(['administrador']), 
  getCursos
);

router.get('/mis-cursos', 
  authMiddleware, 
  getMisCursos
);

router.get('/:id', 
  authMiddleware, 
  cursoIdValidator, 
  getCursoById
);

router.put('/:id', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  updateCursoValidator, 
  updateCurso
);

router.delete('/:id', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  cursoIdValidator, 
  archivarCurso
);

// Gestión de participantes
router.post('/:id/participantes', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  participanteValidator, 
  agregarParticipante
);

router.delete('/:id/participantes/:usuarioId', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  removerParticipante
);

// Carga masiva independiente (mantener para agregar usuarios después)
router.post('/:id/usuarios-masivo', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  cursoIdValidator,
  csvUpload.single('archivo'),
  registrarUsuariosMasivo
);

export default router;