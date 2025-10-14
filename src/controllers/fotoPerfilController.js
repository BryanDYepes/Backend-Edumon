import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Obtener todas las fotos predeterminadas disponibles
export const getFotosPredeterminadas = async (req, res) => {
  try {
    const fotosDir = path.join(__dirname, '../uploads/fotos-predeterminadas');
    
    // Crear carpeta si no existe
    if (!fs.existsSync(fotosDir)) {
      fs.mkdirSync(fotosDir, { recursive: true });
      return res.json({
        message: "No hay fotos predeterminadas disponibles",
        fotos: []
      });
    }

    // Leer archivos de la carpeta
    const archivos = fs.readdirSync(fotosDir);
    
    // Filtrar solo imágenes
    const extensionesValidas = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fotos = archivos
      .filter(archivo => {
        const ext = path.extname(archivo).toLowerCase();
        return extensionesValidas.includes(ext);
      })
      .map(archivo => ({
        nombre: archivo,
        url: `/uploads/fotos-predeterminadas/${archivo}`
      }));

    res.json({
      total: fotos.length,
      fotos
    });
  } catch (error) {
    console.error('Error al obtener fotos predeterminadas:', error);
    res.status(500).json({
      message: "Error al obtener fotos predeterminadas"
    });
  }
};

// Subir una nueva foto predeterminada (solo admin)
export const uploadFotoPredeterminada = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No se ha subido ningún archivo"
      });
    }

    const fotoUrl = `/uploads/fotos-predeterminadas/${req.file.filename}`;

    res.status(201).json({
      message: "Foto predeterminada subida exitosamente",
      foto: {
        nombre: req.file.filename,
        url: fotoUrl
      }
    });
  } catch (error) {
    console.error('Error al subir foto predeterminada:', error);
    res.status(500).json({
      message: "Error al subir foto predeterminada"
    });
  }
};

// Eliminar una foto predeterminada (solo admin)
export const deleteFotoPredeterminada = async (req, res) => {
  try {
    const { nombreArchivo } = req.params;
    const filePath = path.join(__dirname, '../uploads/fotos-predeterminadas', nombreArchivo);

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        message: "Foto no encontrada"
      });
    }

    // Eliminar archivo
    fs.unlinkSync(filePath);

    res.json({
      message: "Foto predeterminada eliminada exitosamente"
    });
  } catch (error) {
    console.error('Error al eliminar foto predeterminada:', error);
    res.status(500).json({
      message: "Error al eliminar foto predeterminada"
    });
  }
};