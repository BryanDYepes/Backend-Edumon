// middlewares/cloudinaryMiddleware.js
import multer from 'multer';

const storage = multer.memoryStorage();

// Middleware para IMÁGENES (cursos, perfiles)
export const uploadImagenCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'), false);
    }
  }
});

// Middleware para IMÁGENES + CSV (sin validación estricta)
export const uploadImagenYCSV = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir imágenes
    const allowedImages = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    
    // Permitir CSV
    const isCSV = file.mimetype === 'text/csv' || 
                  file.mimetype === 'application/vnd.ms-excel' ||
                  file.originalname.endsWith('.csv');
    
    // Si es imagen o CSV, aceptar
    if (allowedImages.includes(file.mimetype) || isCSV) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP) o archivos CSV'), false);
    }
  }
});

// Middleware para CSV solamente
export const uploadCSVCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB máximo para CSV
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'), false);
    }
  }
});

// Middleware para ARCHIVOS GENERALES (PDFs, documentos, etc.)
export const uploadArchivoCloudinary = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'video/mp4', 
      'video/mpeg', 
      'video/webm' 
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no permitido'), false);
    }
  }
});