
import multer from 'multer';
import path from 'path';

// Configuración de multer para archivos CSV
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Solo aceptar archivos CSV
  if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos CSV'), false);
  }
};

export const csvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  }
});