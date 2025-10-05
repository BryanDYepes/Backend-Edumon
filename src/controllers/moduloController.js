import Modulo from '../models/Modulo.js';
import { validationResult } from 'express-validator';

// Crear módulo
export const createModulo = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { cursoId, titulo, descripcion } = req.body;

    const newModulo = new Modulo({
      cursoId,
      titulo,
      descripcion
    });

    const savedModulo = await newModulo.save();

    res.status(201).json({
      message: "Módulo creado exitosamente",
      modulo: savedModulo
    });
  } catch (error) {
    console.error('Error al crear módulo:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar módulos con paginación y filtro por curso
export const getModulos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { cursoId } = req.query;

    // Construir filtro
    const filter = {};
    if (cursoId) {
      filter.cursoId = cursoId;
    }

    const modulos = await Modulo.find(filter)
      .populate('cursoId', 'nombre nivel') // Ajusta según los campos de tu modelo Curso
      .skip(skip)
      .limit(limit)
      .sort({ fechaCreacion: -1 });

    const total = await Modulo.countDocuments(filter);

    res.json({
      modulos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalModulos: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener módulos:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener módulo por ID
export const getModuloById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const modulo = await Modulo.findById(req.params.id)
      .populate('cursoId', 'nombre nivel');

    if (!modulo) {
      return res.status(404).json({
        message: "Módulo no encontrado"
      });
    }

    res.json(modulo);
  } catch (error) {
    console.error('Error al obtener módulo:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener módulos por curso
export const getModulosByCurso = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { cursoId } = req.params;

    const modulos = await Modulo.find({ cursoId })
      .sort({ fechaCreacion: -1 });

    res.json({
      modulos,
      total: modulos.length
    });
  } catch (error) {
    console.error('Error al obtener módulos por curso:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Actualizar módulo
export const updateModulo = async (req, res) => {
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

    const updatedModulo = await Modulo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('cursoId', 'nombre nivel');

    if (!updatedModulo) {
      return res.status(404).json({
        message: "Módulo no encontrado"
      });
    }

    res.json({
      message: "Módulo actualizado exitosamente",
      modulo: updatedModulo
    });
  } catch (error) {
    console.error('Error al actualizar módulo:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Eliminar módulo (soft delete)
export const deleteModulo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const updatedModulo = await Modulo.findByIdAndUpdate(
      id,
      { estado: 'inactivo' },
      { new: true }
    );

    if (!updatedModulo) {
      return res.status(404).json({
        message: "Módulo no encontrado"
      });
    }

    res.json({
      message: "Módulo desactivado exitosamente",
      modulo: updatedModulo
    });
  } catch (error) {
    console.error('Error al desactivar módulo:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};