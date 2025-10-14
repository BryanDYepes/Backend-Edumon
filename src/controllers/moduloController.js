import Modulo from '../models/Modulo.js';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Crear módulo
export const createModulo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { cursoId, titulo, descripcion } = req.body;

    // Validar que cursoId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(cursoId)) {
      return res.status(400).json({
        message: "El ID del curso no es válido"
      });
    }

    const newModulo = new Modulo({
      cursoId,
      titulo,
      descripcion
    });

    const savedModulo = await newModulo.save();

    // Poblar la información del curso
    await savedModulo.populate('cursoId', 'nombre descripcion fotoPortadaUrl docenteId participantes estado fechaCreacion');

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
    const { cursoId, incluirInactivos } = req.query;

    // Construir filtro
    const filter = {};
    
    // Solo excluir inactivos si no se solicita incluirlos
    if (incluirInactivos !== 'true') {
      filter.estado = { $ne: 'inactivo' };
    }
    
    if (cursoId) {
      if (!mongoose.Types.ObjectId.isValid(cursoId)) {
        return res.status(400).json({
          message: "El ID del curso no es válido"
        });
      }
      filter.cursoId = cursoId;
    }

    const modulos = await Modulo.find(filter)
      .populate({
        path: 'cursoId',
        select: 'nombre descripcion fotoPortadaUrl docenteId participantes estado fechaCreacion',
        populate: [
          {
            path: 'docenteId',
            select: 'nombre apellido correo fotoPerfilUrl'
          },
          {
            path: 'participantes.usuarioId',
            select: 'nombre apellido correo rol fotoPerfilUrl'
          }
        ]
      })
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "El ID del módulo no es válido"
      });
    }

    const modulo = await Modulo.findById(req.params.id)
      .populate('cursoId', 'nombre descripcion fotoPortadaUrl docenteId participantes estado fechaCreacion');

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
    const { incluirInactivos } = req.query;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(cursoId)) {
      return res.status(400).json({
        message: "El ID del curso no es válido"
      });
    }

    const filter = { cursoId };
    
    // Solo excluir inactivos si no se solicita incluirlos
    if (incluirInactivos !== 'true') {
      filter.estado = { $ne: 'inactivo' };
    }

    const modulos = await Modulo.find(filter)
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "El ID del módulo no es válido"
      });
    }

    // No permitir actualizar ciertos campos
    const { _id, fechaCreacion, ...updateData } = req.body;

    const updatedModulo = await Modulo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('cursoId', 'nombre descripcion fotoPortadaUrl docenteId participantes estado fechaCreacion');

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
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "El ID del módulo no es válido"
      });
    }

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

// 🆕 Desarchivar módulo (reactivar)
export const restoreModulo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;

    // Validar ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "El ID del módulo no es válido"
      });
    }

    // Buscar el módulo
    const modulo = await Modulo.findById(id);

    if (!modulo) {
      return res.status(404).json({
        message: "Módulo no encontrado"
      });
    }

    // Verificar si ya está activo
    if (modulo.estado === 'activo') {
      return res.status(400).json({
        message: "El módulo ya está activo"
      });
    }

    // Reactivar el módulo
    modulo.estado = 'activo';
    await modulo.save();

    // Poblar información del curso
    await modulo.populate('cursoId', 'nombre descripcion fotoPortadaUrl docenteId participantes estado fechaCreacion');

    res.json({
      message: "Módulo reactivado exitosamente",
      modulo: modulo
    });
  } catch (error) {
    console.error('Error al reactivar módulo:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};