import { validationResult } from 'express-validator';
import Foro from '../models/Foro.js';
import Curso from '../models/Curso.js';
import User from '../models/User.js';

export const foroController = {
  // Crear un nuevo foro
  crearForo: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { titulo, descripcion, cursos, publico, estado } = req.body;
      const usuarioId = req.user.id;

      // Verificar que el usuario es docente o administrador
      const usuario = await User.findById(usuarioId);
      if (!usuario || (usuario.rol !== 'docente' && usuario.rol !== 'administrador')) {
        return res.status(403).json({ 
          message: 'Solo docentes y administradores pueden crear foros' 
        });
      }

      // Verificar que los cursos existen y el usuario tiene acceso
      if (cursos && cursos.length > 0) {
        const cursosEncontrados = await Curso.find({ 
          _id: { $in: cursos },
          $or: [
            { docenteId: usuarioId },
            ...(usuario.rol === 'administrador' ? [{}] : [])
          ]
        });

        if (cursosEncontrados.length !== cursos.length) {
          return res.status(400).json({ 
            message: 'Algunos cursos no existen o no tienes acceso a ellos' 
          });
        }
      }

      const nuevoForo = new Foro({
        titulo,
        descripcion,
        docenteId: usuarioId,
        cursos: cursos || [],
        publico: publico || false,
        estado: estado || 'abierto'
      });

      await nuevoForo.save();
      await nuevoForo.populate('docenteId', 'nombre apellido correo rol fotoPerfilUrl');
      await nuevoForo.populate('cursos', 'nombre descripcion');

      res.status(201).json({
        message: 'Foro creado exitosamente',
        foro: nuevoForo
      });
    } catch (error) {
      console.error('Error al crear foro:', error);
      res.status(500).json({ message: 'Error al crear el foro', error: error.message });
    }
  },

  // Obtener todos los foros accesibles para el usuario
  obtenerForos: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const usuarioId = req.user.id;
      const { estado, cursoId, publico, page = 1, limit = 10 } = req.query;

      const usuario = await User.findById(usuarioId);
      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      let query = {};

      // Filtro por estado
      if (estado) {
        query.estado = estado;
      }

      // Filtro por curso
      if (cursoId) {
        query.cursos = cursoId;
      }

      // Filtro por público
      if (publico !== undefined) {
        query.publico = publico === 'true';
      }

      // Si no es administrador, filtrar por acceso
      if (usuario.rol !== 'administrador') {
        // Obtener cursos donde el usuario participa
        const cursosUsuario = await Curso.find({
          $or: [
            { docenteId: usuarioId },
            { 'participantes.usuarioId': usuarioId }
          ]
        }).select('_id');

        const cursosIds = cursosUsuario.map(c => c._id);

        query.$or = [
          { publico: true },
          { docenteId: usuarioId },
          { cursos: { $in: cursosIds } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [foros, total] = await Promise.all([
        Foro.find(query)
          .populate('docenteId', 'nombre apellido correo rol fotoPerfilUrl')
          .populate('cursos', 'nombre descripcion')
          .populate('totalMensajes')
          .sort({ fechaCreacion: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Foro.countDocuments(query)
      ]);

      res.status(200).json({
        foros,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error al obtener foros:', error);
      res.status(500).json({ message: 'Error al obtener los foros', error: error.message });
    }
  },

  // Obtener un foro por ID
  obtenerForoPorId: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const usuarioId = req.user.id;

      const foro = await Foro.findById(id)
        .populate('docenteId', 'nombre apellido correo rol fotoPerfilUrl')
        .populate('cursos', 'nombre descripcion')
        .populate('totalMensajes');

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

      res.status(200).json({ foro });
    } catch (error) {
      console.error('Error al obtener foro:', error);
      res.status(500).json({ message: 'Error al obtener el foro', error: error.message });
    }
  },

  // Actualizar un foro
  actualizarForo: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const usuarioId = req.user.id;
      const { titulo, descripcion, cursos, publico, estado } = req.body;

      const usuario = await User.findById(usuarioId);
      const foro = await Foro.findById(id);

      if (!foro) {
        return res.status(404).json({ message: 'Foro no encontrado' });
      }

      // Solo el creador o administrador puede editar
      if (foro.docenteId.toString() !== usuarioId && usuario.rol !== 'administrador') {
        return res.status(403).json({ 
          message: 'No tienes permiso para editar este foro' 
        });
      }

      // Verificar cursos si se están actualizando
      if (cursos && cursos.length > 0) {
        const cursosEncontrados = await Curso.find({ 
          _id: { $in: cursos },
          $or: [
            { docenteId: usuarioId },
            ...(usuario.rol === 'administrador' ? [{}] : [])
          ]
        });

        if (cursosEncontrados.length !== cursos.length) {
          return res.status(400).json({ 
            message: 'Algunos cursos no existen o no tienes acceso a ellos' 
          });
        }
      }

      // Actualizar campos
      if (titulo) foro.titulo = titulo;
      if (descripcion) foro.descripcion = descripcion;
      if (cursos) foro.cursos = cursos;
      if (publico !== undefined) foro.publico = publico;
      if (estado) foro.estado = estado;

      await foro.save();
      await foro.populate('docenteId', 'nombre apellido correo rol fotoPerfilUrl');
      await foro.populate('cursos', 'nombre descripcion');

      res.status(200).json({
        message: 'Foro actualizado exitosamente',
        foro
      });
    } catch (error) {
      console.error('Error al actualizar foro:', error);
      res.status(500).json({ message: 'Error al actualizar el foro', error: error.message });
    }
  },

  // Eliminar un foro
  eliminarForo: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const usuarioId = req.user.id;

      const usuario = await User.findById(usuarioId);
      const foro = await Foro.findById(id);

      if (!foro) {
        return res.status(404).json({ message: 'Foro no encontrado' });
      }

      // Solo el creador o administrador puede eliminar
      if (foro.docenteId.toString() !== usuarioId && usuario.rol !== 'administrador') {
        return res.status(403).json({ 
          message: 'No tienes permiso para eliminar este foro' 
        });
      }

      await Foro.findByIdAndDelete(id);

      res.status(200).json({ message: 'Foro eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar foro:', error);
      res.status(500).json({ message: 'Error al eliminar el foro', error: error.message });
    }
  }
};