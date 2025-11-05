import MensajeForo from '../models/MensajeForo.js';
import Foro from '../models/Foro.js';
import User from '../models/User.js';
import { subirArchivoCloudinary, eliminarArchivoCloudinary } from '../utils/cloudinaryUpload.js';

// Crear mensaje en foro
export const crearMensaje = async (req, res) => {
  try {
    const { foroId, contenido, respuestaA } = req.body;
    const usuarioId = req.user.userId;

    // Verificar que el foro existe y está abierto
    const foro = await Foro.findById(foroId);
    if (!foro) {
      return res.status(404).json({ message: 'Foro no encontrado' });
    }

    if (!foro.estaAbierto()) {
      return res.status(403).json({ message: 'El foro está cerrado' });
    }

    // Verificar que el usuario tiene acceso al foro
    const tieneAcceso = await foro.tieneAcceso(usuarioId);
    const user = await User.findById(usuarioId);
    
    if (!tieneAcceso && user.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes acceso a este foro' });
    }

    // Si es una respuesta, verificar que solo responde al mensaje principal
    // Los padres no pueden responder a otros padres
    if (respuestaA) {
      const mensajeOriginal = await MensajeForo.findById(respuestaA);
      if (!mensajeOriginal) {
        return res.status(404).json({ message: 'Mensaje original no encontrado' });
      }

      // Verificar que el mensaje original no es una respuesta (solo responder al foro)
      if (mensajeOriginal.respuestaA) {
        return res.status(400).json({ message: 'Solo puedes responder directamente al foro' });
      }

      // Si el usuario es padre, solo puede responder si el mensaje original es del docente
      if (user.rol === 'padre') {
        const usuarioOriginal = await User.findById(mensajeOriginal.usuarioId);
        if (usuarioOriginal.rol !== 'docente' && usuarioOriginal.rol !== 'administrador') {
          return res.status(403).json({ message: 'Los padres solo pueden responder a mensajes de docentes' });
        }
      }
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
          continue;
        }

        const resultado = await subirArchivoCloudinary(
          file.buffer,
          file.mimetype,
          'mensajes-foro',
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

    const nuevoMensaje = new MensajeForo({
      foroId,
      usuarioId,
      contenido,
      archivos,
      respuestaA: respuestaA || null
    });

    await nuevoMensaje.save();

    // Poblar información del usuario
    await nuevoMensaje.populate('usuarioId', 'nombre apellido fotoPerfilUrl rol');

    res.status(201).json({
      message: 'Mensaje creado exitosamente',
      mensaje: nuevoMensaje
    });

  } catch (error) {
    console.error('Error al crear mensaje:', error);
    res.status(500).json({ message: 'Error al crear el mensaje', error: error.message });
  }
};

// Obtener mensajes de un foro
export const obtenerMensajesPorForo = async (req, res) => {
  try {
    const { foroId } = req.params;
    const usuarioId = req.user.userId;

    // Verificar que el foro existe
    const foro = await Foro.findById(foroId);
    if (!foro) {
      return res.status(404).json({ message: 'Foro no encontrado' });
    }

    // Verificar acceso
    const tieneAcceso = await foro.tieneAcceso(usuarioId);
    const user = await User.findById(usuarioId);
    
    if (!tieneAcceso && user.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes acceso a este foro' });
    }

    // Obtener mensajes principales (no son respuestas)
    const mensajes = await MensajeForo.find({ 
      foroId, 
      respuestaA: null 
    })
      .populate('usuarioId', 'nombre apellido fotoPerfilUrl rol')
      .sort({ fechaCreacion: 1 });

    // Obtener respuestas para cada mensaje
    const mensajesConRespuestas = await Promise.all(
      mensajes.map(async (mensaje) => {
        const respuestas = await MensajeForo.find({ 
          foroId, 
          respuestaA: mensaje._id 
        })
          .populate('usuarioId', 'nombre apellido fotoPerfilUrl rol')
          .sort({ fechaCreacion: 1 });

        return {
          ...mensaje.toObject(),
          respuestas
        };
      })
    );

    res.status(200).json({ mensajes: mensajesConRespuestas });

  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ message: 'Error al obtener los mensajes', error: error.message });
  }
};

// Dar/quitar like a un mensaje
export const toggleLikeMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    const mensaje = await MensajeForo.findById(id);
    if (!mensaje) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Verificar acceso al foro
    const foro = await Foro.findById(mensaje.foroId);
    const tieneAcceso = await foro.tieneAcceso(usuarioId);
    const user = await User.findById(usuarioId);
    
    if (!tieneAcceso && user.rol !== 'administrador') {
      return res.status(403).json({ message: 'No tienes acceso a este foro' });
    }

    mensaje.toggleLike(usuarioId);
    await mensaje.save();

    res.status(200).json({
      message: 'Like actualizado',
      likes: mensaje.likes,
      yaLeDioLike: mensaje.yaLeDioLike(usuarioId)
    });

  } catch (error) {
    console.error('Error al dar like:', error);
    res.status(500).json({ message: 'Error al actualizar like', error: error.message });
  }
};

// Eliminar mensaje
export const eliminarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.userId;

    const mensaje = await MensajeForo.findById(id);
    if (!mensaje) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Verificar permisos: solo el autor o administrador pueden eliminar
    const user = await User.findById(usuarioId);
    const esAutor = mensaje.usuarioId.toString() === usuarioId;
    const esAdministrador = user.rol === 'administrador';

    if (!esAutor && !esAdministrador) {
      return res.status(403).json({ message: 'No tienes permisos para eliminar este mensaje' });
    }

    // Eliminar archivos de Cloudinary
    if (mensaje.archivos && mensaje.archivos.length > 0) {
      for (const archivo of mensaje.archivos) {
        const resourceType = archivo.tipo === 'video' ? 'video' : 
                           archivo.tipo === 'pdf' ? 'raw' : 'image';
        await eliminarArchivoCloudinary(archivo.publicId, resourceType);
      }
    }

    // Eliminar respuestas asociadas
    await MensajeForo.deleteMany({ respuestaA: id });

    await MensajeForo.findByIdAndDelete(id);

    res.status(200).json({ message: 'Mensaje eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar mensaje:', error);
    res.status(500).json({ message: 'Error al eliminar el mensaje', error: error.message });
  }
};

// Actualizar mensaje
export const actualizarMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    const usuarioId = req.user.userId;

    const mensaje = await MensajeForo.findById(id);
    if (!mensaje) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Solo el autor puede actualizar
    if (mensaje.usuarioId.toString() !== usuarioId) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar este mensaje' });
    }

    // Verificar que el foro sigue abierto
    const foro = await Foro.findById(mensaje.foroId);
    if (!foro.estaAbierto()) {
      return res.status(403).json({ message: 'No se puede editar en un foro cerrado' });
    }

    mensaje.contenido = contenido;
    await mensaje.save();
    await mensaje.populate('usuarioId', 'nombre apellido fotoPerfilUrl rol');

    res.status(200).json({
      message: 'Mensaje actualizado exitosamente',
      mensaje
    });

  } catch (error) {
    console.error('Error al actualizar mensaje:', error);
    res.status(500).json({ message: 'Error al actualizar el mensaje', error: error.message });
  }
};