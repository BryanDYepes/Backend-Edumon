import express from 'express';
import { mensajeForoController } from '../controllers/mensajeForoController.js';
import {
  crearMensajeValidators,
  actualizarMensajeValidators,
  idMensajeValidator,
  listarMensajesValidators,
  likeValidators
} from '../middlewares/validators/mensajeForoValidator.js';
import { authMiddleware as authenticate } from '../middlewares/authMiddleware.js';


const router = express.Router();

/**
 * @route   POST /api/foros/:foroId/mensajes
 * @desc    Crear un nuevo mensaje en un foro
 * @access  Privado (usuarios con acceso al foro)
 */
router.post(
  '/:foroId/mensajes',
  authenticate,
  crearMensajeValidators,
  mensajeForoController.crearMensaje
);

/**
 * @route   GET /api/foros/:foroId/mensajes
 * @desc    Obtener mensajes de un foro
 * @access  Privado (usuarios con acceso al foro)
 * @query   ?respuestaA=null&page=1&limit=20&sort=reciente
 */
router.get(
  '/:foroId/mensajes',
  authenticate,
  listarMensajesValidators,
  mensajeForoController.obtenerMensajes
);

/**
 * @route   GET /api/mensajes/:id
 * @desc    Obtener un mensaje por ID
 * @access  Privado (usuarios con acceso al foro)
 */
router.get(
  '/mensajes/:id',
  authenticate,
  idMensajeValidator,
  mensajeForoController.obtenerMensajePorId
);

/**
 * @route   PUT /api/mensajes/:id
 * @desc    Actualizar un mensaje
 * @access  Autor del mensaje
 */
router.put(
  '/mensajes/:id',
  authenticate,
  actualizarMensajeValidators,
  mensajeForoController.actualizarMensaje
);

/**
 * @route   DELETE /api/mensajes/:id
 * @desc    Eliminar un mensaje
 * @access  Autor del mensaje o Administradores
 */
router.delete(
  '/mensajes/:id',
  authenticate,
  idMensajeValidator,
  mensajeForoController.eliminarMensaje
);

/**
 * @route   POST /api/mensajes/:id/like
 * @desc    Toggle like en un mensaje
 * @access  Privado (usuarios con acceso al foro)
 */
router.post(
  '/mensajes/:id/like',
  authenticate,
  likeValidators,
  mensajeForoController.toggleLike
);

export default router;