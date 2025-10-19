import express from 'express';
import multer from 'multer';
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

// Configuración de Multer para archivos en memoria
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Tipos MIME permitidos
  const allowedMimeTypes = [
    // Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Texto
    'text/plain',
    'text/csv',
    // Videos
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    // Comprimidos
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo por archivo
    files: 10 // Máximo 10 archivos por petición
  }
});

// Rutas
router.post(
  '/', 
  authMiddleware, 
  upload.array('archivos', 10), // Campo "archivos", máximo 10
  createTareaValidator, 
  createTarea
);

router.get('/', authMiddleware, getTareas);

router.get('/:id', authMiddleware, tareaIdValidator, getTareaById);

router.put(
  '/:id', 
  authMiddleware, 
  upload.array('archivos', 10),
  tareaIdValidator, 
  updateTareaValidator, 
  updateTarea
);

router.patch('/:id/close', authMiddleware, tareaIdValidator, closeTarea);

router.delete('/:id', authMiddleware, tareaIdValidator, deleteTarea);

// Manejo de errores de multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'El archivo es demasiado grande. Máximo 50MB por archivo.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Demasiados archivos. Máximo 10 archivos por petición.'
      });
    }
    return res.status(400).json({
      message: 'Error al subir archivos',
      error: error.message
    });
  }
  next(error);
});

export default router;