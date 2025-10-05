import Tarea from '../models/Tarea.js';
import { validationResult } from 'express-validator';

// Crear tarea
export const createTarea = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const newTarea = new Tarea(req.body);
    const savedTarea = await newTarea.save();

    res.status(201).json({
      message: "Tarea creada exitosamente",
      tarea: savedTarea
    });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar tareas con paginación y filtros
export const getTareas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { cursoId, moduloId, docenteId, estado } = req.query;

    // Construir filtro
    const filter = {};
    if (cursoId) filter.cursoId = cursoId;
    if (moduloId) filter.moduloId = moduloId;
    if (docenteId) filter.docenteId = docenteId;
    if (estado) filter.estado = estado;

    const tareas = await Tarea.find(filter)
      .populate('docenteId', 'nombre apellido')
      .populate('cursoId', 'nombre nivel')
      .populate('moduloId', 'titulo')
      .skip(skip)
      .limit(limit)
      .sort({ fechaEntrega: -1 });

    const total = await Tarea.countDocuments(filter);

    res.json({
      tareas,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTareas: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener tarea por ID
export const getTareaById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const tarea = await Tarea.findById(req.params.id)
      .populate('docenteId', 'nombre apellido correo')
      .populate('cursoId', 'nombre nivel')
      .populate('moduloId', 'titulo descripcion');

    if (!tarea) {
      return res.status(404).json({
        message: "Tarea no encontrada"
      });
    }

    res.json(tarea);
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Actualizar tarea
export const updateTarea = async (req, res) => {
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

    const updatedTarea = await Tarea.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('docenteId', 'nombre apellido')
      .populate('cursoId', 'nombre nivel')
      .populate('moduloId', 'titulo');

    if (!updatedTarea) {
      return res.status(404).json({
        message: "Tarea no encontrada"
      });
    }

    res.json({
      message: "Tarea actualizada exitosamente",
      tarea: updatedTarea
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Cerrar tarea (cambiar estado)
export const closeTarea = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const updatedTarea = await Tarea.findByIdAndUpdate(
      id,
      { estado: 'cerrada' },
      { new: true }
    );

    if (!updatedTarea) {
      return res.status(404).json({
        message: "Tarea no encontrada"
      });
    }

    res.json({
      message: "Tarea cerrada exitosamente",
      tarea: updatedTarea
    });
  } catch (error) {
    console.error('Error al cerrar tarea:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Eliminar tarea (soft delete - cerrar)
export const deleteTarea = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const updatedTarea = await Tarea.findByIdAndUpdate(
      id,
      { estado: 'cerrada' },
      { new: true }
    );

    if (!updatedTarea) {
      return res.status(404).json({
        message: "Tarea no encontrada"
      });
    }

    res.json({
      message: "Tarea eliminada exitosamente",
      tarea: updatedTarea
    });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};