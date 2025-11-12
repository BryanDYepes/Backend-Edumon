import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear carpetas si no existen
const fotoPerfilDir = path.join(__dirname, '../uploads/fotos-perfil');
const fotoPredeterminadaDir = path.join(__dirname, '../uploads/fotos-predeterminadas');

if (!fs.existsSync(fotoPerfilDir)) {
  fs.mkdirSync(fotoPerfilDir, { recursive: true });
}

if (!fs.existsSync(fotoPredeterminadaDir)) {
  fs.mkdirSync(fotoPredeterminadaDir, { recursive: true });
}

// Filtro para validar tipos de archivo de imagen
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, WEBP, GIF)'), false);
  }
};

// Configuración para fotos de perfil de USUARIOS
const storageFotoPerfil = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, fotoPerfilDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `perfil-${uniqueSuffix}-${nameWithoutExt}${ext}`);
  }
});

export const uploadFotoPerfil = multer({
  storage: storageFotoPerfil,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// Configuración para fotos PREDETERMINADAS (admin sube)
const storageFotoPredeterminada = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, fotoPredeterminadaDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_');
    // Nombre más simple para fotos predeterminadas
    cb(null, `${nameWithoutExt}${ext}`);
  }
});

export const uploadFotoPredeterminada = multer({
  storage: storageFotoPredeterminada,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB máximo para predeterminadas
  }
});

// Función auxiliar para eliminar archivos antiguos
export const eliminarArchivo = (rutaArchivo) => {
  if (rutaArchivo && rutaArchivo.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '..', rutaArchivo);
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        console.error('Error al eliminar archivo:', err);
      }
    });
  }
};