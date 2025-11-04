import express from 'express';
import { foroController } from '../controllers/foroController.js';
import {
  crearForoValidators,
  actualizarForoValidators,
  idForoValidator,
  listarForosValidators
} from '../middlewares/validators/foroValidator.js';
import { authMiddleware as authenticate } from '../middlewares/authMiddleware.js';
import { requireRole as autorizeRoles } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/foros
 * @desc    Crear un nuevo foro
 * @access  Docentes y Administradores
 */
router.post(
  '/',
  authenticate,
  autorizeRoles(['docente', 'administrador']),
  crearForoValidators,
  foroController.crearForo
);

/**
 * @route   GET /api/foros
 * @desc    Obtener todos los foros accesibles para el usuario
 * @access  Privado (todos los roles autenticados)
 * @query   ?estado=abierto&cursoId=123&publico=true&page=1&limit=10
 */
router.get(
  '/',
  authenticate,
  listarForosValidators,
  foroController.obtenerForos
);

/**
 * @route   GET /api/foros/:id
 * @desc    Obtener un foro por ID
 * @access  Privado (usuarios con acceso al foro)
 */
router.get(
  '/:id',
  authenticate,
  idForoValidator,
  foroController.obtenerForoPorId
);

/**
 * @route   PUT /api/foros/:id
 * @desc    Actualizar un foro
 * @access  Creador del foro o Administradores
 */
router.put(
  '/:id',
  authenticate,
  actualizarForoValidators,
  foroController.actualizarForo
);

/**
 * @route   DELETE /api/foros/:id
 * @desc    Eliminar un foro
 * @access  Creador del foro o Administradores
 */
router.delete(
  '/:id',
  authenticate,
  idForoValidator,
  foroController.eliminarForo
);

export default router;