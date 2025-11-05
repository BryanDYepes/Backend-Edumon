import Foro from '../models/Foro.js';
import Curso from '../models/Curso.js';
import User from '../models/User.js';
import { subirArchivoCloudinary, eliminarArchivoCloudinary } from '../utils/cloudinaryUpload.js';
import MensajeForo from '../models/MensajeForo.js'; 
import mongoose from 'mongoose';  

// Crear foro
export const crearForo = async (req, res) => {
  try {
    const { titulo, descripcion, cursoId, publico } = req.body;
    const docenteId = req.user.userId;

    // Verificar que el curso existe
    const curso = await Curso.findById(cursoId);
    if (!curso) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    // Verificar que el usuario es docente del curso o administrador
    const user = await User.findById(docenteId);
    if (user.rol !== 'administrador' && curso.docenteId.toString() !== docenteId) {
      return res.status(403).json({ message: 'No tienes permisos para crear foros en este curso' });
    }

    // Procesar archivos adjuntos
    let archivos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        let tipo;
        if (file.mimetype.startsWith('image/')) {
          tipo = 'imagen';
        } else if (file.mimetype.startsWith('video/')) {
          tipo = 'video';
        } else if (file.mimetype === 'application/pdf') {
          tipo = 'pdf';
        } else {
          continue; // Saltar archivos no soportados
        }

        const resultado = await subirArchivoCloudinary(
          file.buffer,
          file.mimetype,
          'foros',
          file.originalname
        );

        archivos.push({
          url: resultado.url,
          publicId: resultado.publicId,
          tipo: tipo,
          nombre: file.originalname
        });
      }
    }

    const nuevoForo = new Foro({
      titulo,
      descripcion,
      docenteId,
      cursoId,
      archivos,
      publico: publico || false
    });

    await nuevoForo.save();

    // Poblar información del docente y curso
    await nuevoForo.populate([
      { path: 'docenteId', select: 'nombre apellido fotoPerfilUrl rol' },
      { path: 'cursoId', select: 'nombre' }
    ]);

    res.status(201).json({
      message: 'Foro creado exitosamente',
      foro: nuevoForo
    });

  } catch (error) {
    console.error('Error al crear foro:', error);
    res.status(500).json({ message: 'Error al crear el foro', error: error.message });
  }
};

// Obtener foros de un curso
export const obtenerForosPorCurso = async (req, res) => {
  try {
    const { cursoId } = req.params;
    const usuarioId = req.user.userId;

    // Verificar que el curso existe
    const curso = await Curso.findById(cursoId);
    if (!curso) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    // Verificar que el usuario tiene acceso al curso
    const user = await User.findById(usuarioId);
    const esDocenteDelCurso = curso.docenteId.toString() === usuarioId;
    const esParticipante = curso.esParticipante(usuarioId);
    const esAdministrador = user.rol === 'administrador';

    if (!esDocenteDelCurso && !esParticipante && !esAdministrador) {
      return res.status(403).json({ message: 'No tienes acceso a este curso' });
    }

    const foros = await Foro.find({ cursoId })
      .populate('docenteId', 'nombre apellido fotoPerfilUrl rol')
      .populate('cursoId', 'nombre')
      .populate('totalMensajes')
      .sort({ fechaCreacion: -1 });

    res.status(200).json({ foros });

  } catch (error) {
    console.error('Error al obtener foros:', error);
    res.status(500).json({ message: 'Error al obtener los foros', error: error.message });
  }
};

// Obtener un foro por ID
export const obtenerForoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    const foro = await Foro.findById(id)
      .populate('docenteId', 'nombre apellido fotoPerfilUrl rol')
      .populate('cursoId', 'nombre')
      .populate('totalMensajes');

    if (!foro) {
      return res.status(404).json({ message: 'Foro no encontrado' });
    }

    // Verificar acceso
    const tieneAcceso = await foro.tieneAcceso(usuarioId);
    const user = await User.findById(usuarioId);
    
    if (!tieneAcceso && user.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes acceso a este foro' });
    }

    res.status(200).json({ foro });

  } catch (error) {
    console.error('Error al obtener foro:', error);
    res.status(500).json({ message: 'Error al obtener el foro', error: error.message });
  }
};

// Actualizar foro
export const actualizarForo = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, estado, publico } = req.body;
    const usuarioId = req.user.userId;

    const foro = await Foro.findById(id);
    if (!foro) {
      return res.status(404).json({ message: 'Foro no encontrado' });
    }

    // Verificar permisos
    const user = await User.findById(usuarioId);
    const esCreador = foro.docenteId.toString() === usuarioId;
    const esAdministrador = user.rol === 'administrador';

    if (!esCreador && !esAdministrador) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar este foro' });
    }

    // Actualizar campos
    if (titulo) foro.titulo = titulo;
    if (descripcion) foro.descripcion = descripcion;
    if (estado) foro.estado = estado;
    if (publico !== undefined) foro.publico = publico;

    await foro.save();
    await foro.populate([
      { path: 'docenteId', select: 'nombre apellido fotoPerfilUrl rol' },
      { path: 'cursoId', select: 'nombre' }
    ]);

    res.status(200).json({
      message: 'Foro actualizado exitosamente',
      foro
    });

  } catch (error) {
    console.error('Error al actualizar foro:', error);
    res.status(500).json({ message: 'Error al actualizar el foro', error: error.message });
  }
};

// Eliminar foro
export const eliminarForo = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    const foro = await Foro.findById(id);
    if (!foro) {
      return res.status(404).json({ message: 'Foro no encontrado' });
    }

    // Verificar permisos
    const user = await User.findById(usuarioId);
    const esCreador = foro.docenteId.toString() === usuarioId;
    const esAdministrador = user.rol === 'administrador';

    if (!esCreador && !esAdministrador) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar este foro' });
    }

    // Eliminar archivos de Cloudinary
    if (foro.archivos && foro.archivos.length > 0) {
      for (const archivo of foro.archivos) {
        const resourceType = archivo.tipo === 'video' ? 'video' : 
                           archivo.tipo === 'pdf' ? 'raw' : 'image';
        await eliminarArchivoCloudinary(archivo.publicId, resourceType);
      }
    }

    // Eliminar mensajes asociados (se podría hacer con middleware pre('remove'))
    await mongoose.model('MensajeForo').deleteMany({ foroId: id });

    await Foro.findByIdAndDelete(id);

    res.status(200).json({ message: 'Foro eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar foro:', error);
    res.status(500).json({ message: 'Error al eliminar el foro', error: error.message });
  }
};

// Cambiar estado del foro (abrir/cerrar)
export const cambiarEstadoForo = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const usuarioId = req.user.userId;

    const foro = await Foro.findById(id);
    if (!foro) {
      return res.status(404).json({ message: 'Foro no encontrado' });
    }

    // Verificar permisos
    const user = await User.findById(usuarioId);
    const esCreador = foro.docenteId.toString() === usuarioId;
    const esAdministrador = user.rol === 'administrador';

    if (!esCreador && !esAdministrador) {
      return res.status(403).json({ message: 'No tienes permisos para cambiar el estado' });
    }

    foro.estado = estado;
    await foro.save();

    res.status(200).json({
      message: `Foro ${estado === 'cerrado' ? 'cerrado' : 'abierto'} exitosamente`,
      foro
    });

  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ message: 'Error al cambiar el estado', error: error.message });
  }
};