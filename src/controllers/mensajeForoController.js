import { validationResult } from 'express-validator';
import MensajeForo from '../models/MensajeForo.js';
import Foro from '../models/Foro.js';

export const mensajeForoController = {
  // Crear un nuevo mensaje en un foro
  crearMensaje: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { foroId } = req.params;
      const { contenido, respuestaA, archivos } = req.body;
      const usuarioId = req.user.id;

      // Verificar que el foro existe
      const foro = await Foro.findById(foroId);
      if (!foro) {
        return res.status(404).json({ message: 'Foro no encontrado' });
      }

      // Verificar que el foro está abierto
      if (foro.estado === 'cerrado') {
        return res.status(403).json({ 
          message: 'No se pueden crear mensajes en un foro cerrado' 
        });
      }

      // Verificar acceso al foro
      const puedeAcceder = await foro.puedeAcceder(usuarioId);
      if (!puedeAcceder) {
        return res.status(403).json({ 
          message: 'No tienes acceso a este foro' 
        });
      }

      // Si es una respuesta, verificar que el mensaje padre existe
      if (respuestaA) {
        const mensajePadre = await MensajeForo.findById(respuestaA);
        if (!mensajePadre) {
          return res.status(404).json({ message: 'El mensaje al que intentas responder no existe' });
        }
        if (mensajePadre.foroId.toString() !== foroId) {
          return res.status(400).json({ message: 'El mensaje no pertenece a este foro' });
        }
      }

      const nuevoMensaje = new MensajeForo({
        foroId,
        contenido,
        usuarioId,
        respuestaA: respuestaA || null,
        archivos: archivos || []
      });

      await nuevoMensaje.save();
      await nuevoMensaje.populate('usuarioId', 'nombre apellido correo rol fotoPerfilUrl');
      await nuevoMensaje.populate('respuestaA');

      res.status(201).json({
        message: 'Mensaje creado exitosamente',
        mensaje: nuevoMensaje
      });
    } catch (error) {
      console.error('Error al crear mensaje:', error);
      res.status(500).json({ message: 'Error al crear el mensaje', error: error.message });
    }
  },

  // Obtener mensajes de un foro
  obtenerMensajes: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { foroId } = req.params;
      const { respuestaA, page = 1, limit = 20, sort = 'reciente' } = req.query;
      const usuarioId = req.user.id;

      // Verificar que el foro existe
      const foro = await Foro.findById(foroId);
      if (!foro) {
        return res.status(404).json({ message: 'Foro no encontrado' });
      }

      // Verificar acceso
      const puedeAcceder = await foro.puedeAcceder(usuarioId);
      if (!puedeAcceder) {
        return res.status(403).json({ 
          message: 'No tienes acceso a este foro' 
        });
      }

      // Construir query
      let query = { foroId };

      // Filtrar por respuestas o mensajes principales
      if (respuestaA) {
        query.respuestaA = respuestaA === 'null' ? null : respuestaA;
      }

      // Determinar orden
      let sortOption = {};
      switch (sort) {
        case 'antiguo':
          sortOption = { fechaCreacion: 1 };
          break;
        case 'likes':
          sortOption = { likes: -1, fechaCreacion: -1 };
          break;
        case 'reciente':
        default:
          sortOption = { fechaCreacion: -1 };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [mensajes, total] = await Promise.all([
        MensajeForo.find(query)
          .populate('usuarioId', 'nombre apellido correo rol fotoPerfilUrl')
          .populate('respuestaA', 'contenido usuarioId fechaCreacion')
          .populate({
            path: 'respuestas',
            options: { limit: 3, sort: { fechaCreacion: -1 } },
            populate: { path: 'usuarioId', select: 'nombre apellido fotoPerfilUrl' }
          })
          .sort(sortOption)
          .skip(skip)
          .limit(parseInt(limit)),
        MensajeForo.countDocuments(query)
      ]);

      res.status(200).json({
        mensajes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      res.status(500).json({ message: 'Error al obtener los mensajes', error: error.message });
    }
  },

  // Obtener un mensaje por ID
  obtenerMensajePorId: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const usuarioId = req.user.id;

      const mensaje = await MensajeForo.findById(id)
        .populate('usuarioId', 'nombre apellido correo rol fotoPerfilUrl')
        .populate('respuestaA', 'contenido usuarioId fechaCreacion')
        .populate({
          path: 'respuestas',
          populate: { path: 'usuarioId', select: 'nombre apellido fotoPerfilUrl' }
        });

      if (!mensaje) {
        return res.status(404).json({ message: 'Mensaje no encontrado' });
      }

      // Verificar acceso al foro
      const foro = await Foro.findById(mensaje.foroId);
      if (!foro) {
        return res.status(404).json({ message: 'Foro no encontrado' });
      }

      const puedeAcceder = await foro.puedeAcceder(usuarioId);
      if (!puedeAcceder) {
        return res.status(403).json({ 
          message: 'No tienes acceso a este foro' 
        });
      }

      res.status(200).json({ mensaje });
    } catch (error) {
      console.error('Error al obtener mensaje:', error);
      res.status(500).json({ message: 'Error al obtener el mensaje', error: error.message });
    }
  },

  // Actualizar un mensaje
  actualizarMensaje: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { contenido } = req.body;
      const usuarioId = req.user.id;

      const mensaje = await MensajeForo.findById(id);
      if (!mensaje) {
        return res.status(404).json({ message: 'Mensaje no encontrado' });
      }

      // Solo el autor puede editar
      if (mensaje.usuarioId.toString() !== usuarioId) {
        return res.status(403).json({ 
          message: 'Solo puedes editar tus propios mensajes' 
        });
      }

      // Verificar que el foro no está cerrado
      const foro = await Foro.findById(mensaje.foroId);
      if (foro.estado === 'cerrado') {
        return res.status(403).json({ 
          message: 'No se pueden editar mensajes en un foro cerrado' 
        });
      }

      mensaje.contenido = contenido;
      await mensaje.save();

      await mensaje.populate('usuarioId', 'nombre apellido correo rol fotoPerfilUrl');

      res.status(200).json({
        message: 'Mensaje actualizado exitosamente',
        mensaje
      });
    } catch (error) {
      console.error('Error al actualizar mensaje:', error);
      res.status(500).json({ message: 'Error al actualizar el mensaje', error: error.message });
    }
  },

  // Eliminar un mensaje
  eliminarMensaje: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const usuarioId = req.user.id;

      const mensaje = await MensajeForo.findById(id);
      if (!mensaje) {
        return res.status(404).json({ message: 'Mensaje no encontrado' });
      }

      // El autor o un administrador pueden eliminar
      const usuario = await mongoose.model('User').findById(usuarioId);
      if (mensaje.usuarioId.toString() !== usuarioId && usuario.rol !== 'administrador') {
        return res.status(403).json({ 
          message: 'No tienes permiso para eliminar este mensaje' 
        });
      }

      await MensajeForo.findByIdAndDelete(id);

      res.status(200).json({ message: 'Mensaje eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      res.status(500).json({ message: 'Error al eliminar el mensaje', error: error.message });
    }
  },

  // Toggle like en un mensaje
  toggleLike: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const usuarioId = req.user.id;

      const mensaje = await MensajeForo.findById(id);
      if (!mensaje) {
        return res.status(404).json({ message: 'Mensaje no encontrado' });
      }

      // Verificar acceso al foro
      const foro = await Foro.findById(mensaje.foroId);
      const puedeAcceder = await foro.puedeAcceder(usuarioId);
      if (!puedeAcceder) {
        return res.status(403).json({ 
          message: 'No tienes acceso a este foro' 
        });
      }

      const agregado = mensaje.toggleLike(usuarioId);
      await mensaje.save();

      res.status(200).json({
        message: agregado ? 'Like agregado' : 'Like removido',
        totalLikes: mensaje.totalLikes,
        liked: agregado
      });
    } catch (error) {
      console.error('Error al procesar like:', error);
      res.status(500).json({ message: 'Error al procesar el like', error: error.message });
    }
  }
};