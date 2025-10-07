import Entrega from '../models/Entrega.js';
import Tarea from '../models/Tarea.js';
import { validationResult } from 'express-validator';

// Crear entrega
export const createEntrega = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { tareaId, padreId } = req.body;

    // Verificar si ya existe una entrega para esta tarea y padre
    const existingEntrega = await Entrega.findOne({ tareaId, padreId });
    if (existingEntrega) {
      return res.status(409).json({
        message: "Ya existe una entrega para esta tarea"
      });
    }

    // Verificar si la tarea existe y está publicada
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        message: "Tarea no encontrada"
      });
    }

    if (tarea.estado === 'cerrada') {
      return res.status(400).json({
        message: "La tarea está cerrada y no acepta entregas"
      });
    }

    // Determinar estado según fecha de entrega
    let estado = req.body.estado || 'borrador';
    if (estado === 'enviada' && new Date() > tarea.fechaEntrega) {
      estado = 'tarde';
    }

    const newEntrega = new Entrega({
      ...req.body,
      estado
    });

    const savedEntrega = await newEntrega.save();

    res.status(201).json({
      message: "Entrega creada exitosamente",
      entrega: savedEntrega
    });
  } catch (error) {
    console.error('Error al crear entrega:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar entregas con paginación y filtros
export const getEntregas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { tareaId, padreId, estado } = req.query;

    // Construir filtro
    const filter = {};
    if (tareaId) filter.tareaId = tareaId;
    if (padreId) filter.padreId = padreId;
    if (estado) filter.estado = estado;

    const entregas = await Entrega.find(filter)
      .populate('tareaId', 'titulo descripcion fechaEntrega')
      .populate('padreId', 'nombre apellido correo')
      .populate('calificacion.docenteId', 'nombre apellido')
      .skip(skip)
      .limit(limit)
      .sort({ fechaEntrega: -1 });

    const total = await Entrega.countDocuments(filter);

    res.json({
      entregas,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEntregas: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener entregas:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener entrega por ID
export const getEntregaById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const entrega = await Entrega.findById(req.params.id)
      .populate('tareaId', 'titulo descripcion fechaEntrega criterios')
      .populate('padreId', 'nombre apellido correo telefono')
      .populate('calificacion.docenteId', 'nombre apellido correo');

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    res.json(entrega);
  } catch (error) {
    console.error('Error al obtener entrega:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Actualizar entrega
export const updateEntrega = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = { ...req.body };

    // No permitir actualizar calificación directamente
    delete updateData.calificacion;
    
    // No permitir actualizar tareaId y padreId
    delete updateData.tareaId;
    delete updateData.padreId;

    const entrega = await Entrega.findById(id).populate('tareaId');
    
    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Verificar si se está enviando y está fuera de plazo
    if (updateData.estado === 'enviada' && new Date() > entrega.tareaId.fechaEntrega) {
      updateData.estado = 'tarde';
    }

    const updatedEntrega = await Entrega.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('tareaId', 'titulo fechaEntrega')
      .populate('padreId', 'nombre apellido correo'); // Agregado correo aquí

    res.json({
      message: "Entrega actualizada exitosamente",
      entrega: updatedEntrega
    });
  } catch (error) {
    console.error('Error al actualizar entrega:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
// Calificar entrega
export const calificarEntrega = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { nota, comentario, docenteId } = req.body;

    const entrega = await Entrega.findById(id);
    
    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    if (entrega.estado === 'borrador') {
      return res.status(400).json({
        message: "No se puede calificar una entrega en borrador"
      });
    }

    entrega.calificacion = {
      nota,
      comentario,
      fechaCalificacion: new Date(),
      docenteId
    };

    await entrega.save();

    const updatedEntrega = await Entrega.findById(id)
      .populate('tareaId', 'titulo')
      .populate('padreId', 'nombre apellido correo')
      .populate('calificacion.docenteId', 'nombre apellido');

    res.json({
      message: "Entrega calificada exitosamente",
      entrega: updatedEntrega
    });
  } catch (error) {
    console.error('Error al calificar entrega:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Eliminar entrega (soft delete cambiando a borrador)
export const deleteEntrega = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const entrega = await Entrega.findById(id);
    
    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Solo permitir eliminar si está en borrador
    if (entrega.estado !== 'borrador') {
      return res.status(400).json({
        message: "Solo se pueden eliminar entregas en borrador"
      });
    }

    await Entrega.findByIdAndDelete(id);

    res.json({
      message: "Entrega eliminada exitosamente"
    });
  } catch (error) {
    console.error('Error al eliminar entrega:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};