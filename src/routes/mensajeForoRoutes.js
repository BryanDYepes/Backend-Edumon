import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import {
  crearMensaje,
  obtenerMensajesPorForo,
  toggleLikeMensaje,
  eliminarMensaje,
  actualizarMensaje
} from '../controllers/mensajeForoController.js';
import {
  crearMensajeValidator,
  actualizarMensajeValidator,
  obtenerMensajesPorForoValidator,
  toggleLikeMensajeValidator,
  eliminarMensajeValidator
} from '../middlewares/validators/mensajeForoValidator.js';
import { validationResult } from 'express-validator';

const router = express.Router();

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Middleware para subir archivos (imágenes, videos, PDFs)
import multer from 'multer';

const storage = multer.memoryStorage();

const uploadArchivosMensajeMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 5 // Máximo 5 archivos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP), videos (MP4, MPEG, MOV) y archivos PDF'), false);
    }
  }
});

// Rutas de mensajes de foro

// Crear mensaje/respuesta en foro
router.post(
  '/',
  authMiddleware,
  uploadArchivosMensajeMiddleware.array('archivos', 5),
  crearMensajeValidator,
  handleValidationErrors,
  crearMensaje
);

// Obtener mensajes de un foro
router.get(
  '/foro/:foroId',
  authMiddleware,
  obtenerMensajesPorForoValidator,
  handleValidationErrors,
  obtenerMensajesPorForo
);

// Dar/quitar like a un mensaje
router.post(
  '/:id/like',
  authMiddleware,
  toggleLikeMensajeValidator,
  handleValidationErrors,
  toggleLikeMensaje
);

// Actualizar mensaje
router.put(
  '/:id',
  authMiddleware,
  actualizarMensajeValidator,
  handleValidationErrors,
  actualizarMensaje
);

// Eliminar mensaje
router.delete(
  '/:id',
  authMiddleware,
  eliminarMensajeValidator,
  handleValidationErrors,
  eliminarMensaje
);

export default router;