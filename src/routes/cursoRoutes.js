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
  csvUpload.single('archivo'), // Middleware de CSV (opcional)
  createCursoValidator, 
  createCurso
);

// Listar todos los cursos
router.get('/', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  getCursos
);

// ⚠️ IMPORTANTE: Las rutas específicas DEBEN ir ANTES de las rutas con parámetros
// Obtener mis cursos (DEBE IR ANTES de /:id)
router.get('/mis-cursos', 
  authMiddleware, 
  getMisCursos
);

// Obtener curso por ID (DEBE IR DESPUÉS de /mis-cursos)
router.get('/:id', 
  authMiddleware, 
  cursoIdValidator, 
  getCursoById
);

// Actualizar curso
router.put('/:id', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  updateCursoValidator, 
  updateCurso
);

// Archivar curso (soft delete) - CAMBIADO A DELETE ✅
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

// Carga masiva independiente (para agregar usuarios después de crear el curso)
router.post('/:id/usuarios-masivo', 
  authMiddleware, 
  requireRole(['administrador', 'docente']), 
  cursoIdValidator,
  csvUpload.single('archivo'),
  registrarUsuariosMasivo
);

export default router;