import Notificacion from '../models/Notificacion.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import { 
  enviarNotificacionPush, 
  enviarNotificacionWhatsApp, 
  enviarNotificacionEmail 
} from '../services/notificacionService.js';
import { emitirNotificacion } from '../socket/socketHandlers.js';

// Crear notificación (uso interno principalmente)
export const createNotificacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notificacion = new Notificacion(req.body);
    await notificacion.save();

    // Emitir por WebSocket
    await emitirNotificacion(notificacion);

    res.status(201).json({
      message: 'Notificación creada exitosamente',
      notificacion
    });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ 
      message: 'Error al crear la notificación', 
      error: error.message 
    });
  }
};

// Obtener notificaciones del usuario autenticado
export const getMisNotificaciones = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      page = 1, 
      limit = 20, 
      tipo, 
      leido // ✅ Ya viene como Boolean desde query params
    } = req.query;

    const query = { usuarioId: req.user._id };

    if (tipo) query.tipo = tipo;
    
    // ✅ CORRECCIÓN: Usar directamente el valor booleano
    if (leido !== undefined && leido !== null) {
      query.leido = leido; // Ya es boolean gracias al validador
    }

    const skip = (page - 1) * limit;

    const [notificaciones, total] = await Promise.all([
      Notificacion.find(query)
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('referenciaId')
        .lean(),
      Notificacion.countDocuments(query)
    ]);

    const noLeidas = await Notificacion.contarNoLeidas(req.user._id);

    console.log(`📋 Notificaciones encontradas: ${notificaciones.length}`);
    console.log(`📊 Query: ${JSON.stringify(query)}`);
    console.log(`🔢 Total en BD: ${total}, No leídas: ${noLeidas}`);

    res.status(200).json({
      notificaciones,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      noLeidas
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ 
      message: 'Error al obtener las notificaciones', 
      error: error.message 
    });
  }
};

// Obtener notificación por ID
export const getNotificacionById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notificacion = await Notificacion.findOne({
      _id: req.params.id,
      usuarioId: req.user._id
    }).populate('referenciaId');

    if (!notificacion) {
      return res.status(404).json({ 
        message: 'Notificación no encontrada' 
      });
    }

    res.status(200).json(notificacion);
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json({ 
      message: 'Error al obtener la notificación', 
      error: error.message 
    });
  }
};

// Marcar notificación como leída
export const marcarComoLeida = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notificacion = await Notificacion.findOneAndUpdate(
      { 
        _id: req.params.id, 
        usuarioId: req.user._id 
      },
      { leido: true },
      { new: true }
    );

    if (!notificacion) {
      return res.status(404).json({ 
        message: 'Notificación no encontrada' 
      });
    }

    const noLeidas = await Notificacion.contarNoLeidas(req.user._id);

    res.status(200).json({
      message: 'Notificación marcada como leída',
      notificacion,
      noLeidas
    });
  } catch (error) {
    console.error('Error al marcar notificación:', error);
    res.status(500).json({ 
      message: 'Error al actualizar la notificación', 
      error: error.message 
    });
  }
};

// Marcar múltiples notificaciones como leídas
export const marcarVariasLeidas = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { notificacionIds } = req.body;

    await Notificacion.marcarVariasLeidas(req.user._id, notificacionIds);

    const noLeidas = await Notificacion.contarNoLeidas(req.user._id);

    res.status(200).json({
      message: 'Notificaciones marcadas como leídas',
      noLeidas
    });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ 
      message: 'Error al actualizar las notificaciones', 
      error: error.message 
    });
  }
};

// Marcar todas como leídas
export const marcarTodasLeidas = async (req, res) => {
  try {
    await Notificacion.marcarTodasLeidas(req.user._id);

    res.status(200).json({
      message: 'Todas las notificaciones marcadas como leídas',
      noLeidas: 0
    });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones:', error);
    res.status(500).json({ 
      message: 'Error al actualizar las notificaciones', 
      error: error.message 
    });
  }
};

// Eliminar notificación
export const deleteNotificacion = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notificacion = await Notificacion.findOneAndDelete({
      _id: req.params.id,
      usuarioId: req.user._id
    });

    if (!notificacion) {
      return res.status(404).json({ 
        message: 'Notificación no encontrada' 
      });
    }

    const noLeidas = await Notificacion.contarNoLeidas(req.user._id);

    res.status(200).json({
      message: 'Notificación eliminada exitosamente',
      noLeidas
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ 
      message: 'Error al eliminar la notificación', 
      error: error.message 
    });
  }
};

// Eliminar todas las notificaciones leídas
export const eliminarLeidasAntiguas = async (req, res) => {
  try {
    const { dias = 30 } = req.query;
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - parseInt(dias));

    const resultado = await Notificacion.deleteMany({
      usuarioId: req.user._id,
      leido: true,
      fecha: { $lt: fechaLimite }
    });

    res.status(200).json({
      message: `${resultado.deletedCount} notificaciones antiguas eliminadas`,
      eliminadas: resultado.deletedCount
    });
  } catch (error) {
    console.error('Error al eliminar notificaciones antiguas:', error);
    res.status(500).json({ 
      message: 'Error al eliminar notificaciones', 
      error: error.message 
    });
  }
};

// Obtener conteo de no leídas
export const getConteoNoLeidas = async (req, res) => {
  try {
    const noLeidas = await Notificacion.contarNoLeidas(req.user._id);

    res.status(200).json({ noLeidas });
  } catch (error) {
    console.error('Error al obtener conteo:', error);
    res.status(500).json({ 
      message: 'Error al obtener el conteo', 
      error: error.message 
    });
  }
};