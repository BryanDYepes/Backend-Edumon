import Entrega from '../models/Entrega.js';
import Tarea from '../models/Tarea.js';
import { validationResult } from 'express-validator';
import { subirArchivoCloudinary, eliminarArchivoCloudinary } from '../utils/cloudinaryUpload.js';
import { notificarNuevaEntrega, notificarCalificacion } from '../services/notificacionService.js';

// ==================== ENDPOINTS PARA PADRE ====================

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

    // Procesar archivos adjuntos si existen
    let archivosAdjuntos = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const archivoSubido = await subirArchivoCloudinary(
          file.buffer,
          file.mimetype,
          'archivos-entregas',
          file.originalname
        );

        archivosAdjuntos.push({
          url: archivoSubido.url,
          publicId: archivoSubido.publicId,
          nombreOriginal: file.originalname,
          tipoArchivo: file.mimetype,
          tamano: file.size
        });
      }
    }

    const newEntrega = new Entrega({
      ...req.body,
      estado,
      archivosAdjuntos
    });

    const savedEntrega = await newEntrega.save();

    // Popular la entrega guardada
    await savedEntrega.populate([
      { path: 'tareaId', select: 'titulo descripcion fechaEntrega' },
      { path: 'padreId', select: 'nombre apellido correo' }
    ]);

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

// Listar entregas del padre por tarea específica
export const getEntregasByPadreAndTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const padreId = req.user.userId; // ID del padre autenticado

    const entregas = await Entrega.find({
      tareaId,
      padreId
    })
      .populate('tareaId', 'titulo descripcion fechaEntrega criterios')
      .populate('calificacion.docenteId', 'nombre apellido')
      .sort({ fechaEntrega: -1 });

    res.json({
      entregas,
      total: entregas.length
    });
  } catch (error) {
    console.error('Error al obtener entregas del padre:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar entrega (solo en borrador)
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
    delete updateData.tareaId;
    delete updateData.padreId;

    const entrega = await Entrega.findById(id).populate('tareaId');

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Procesar nuevos archivos adjuntos si existen
    if (req.files && req.files.length > 0) {
      let archivosAdjuntos = entrega.archivosAdjuntos || [];

      for (const file of req.files) {
        const archivoSubido = await subirArchivoCloudinary(
          file.buffer,
          file.mimetype,
          'archivos-entregas',
          file.originalname
        );

        archivosAdjuntos.push({
          url: archivoSubido.url,
          publicId: archivoSubido.publicId,
          nombreOriginal: file.originalname,
          tipoArchivo: file.mimetype,
          tamano: file.size
        });
      }

      updateData.archivosAdjuntos = archivosAdjuntos;
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
      .populate('padreId', 'nombre apellido correo');

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

// Enviar tarea (cambiar de borrador a enviada)
export const enviarEntrega = async (req, res) => {
  try {
    const { id } = req.params;

    const entrega = await Entrega.findById(id).populate('tareaId');

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    if (entrega.estado !== 'borrador') {
      return res.status(400).json({
        message: "Solo se pueden enviar entregas en estado borrador"
      });
    }

    // Verificar si la tarea acepta entregas
    if (entrega.tareaId.estado === 'cerrada') {
      return res.status(400).json({
        message: "La tarea está cerrada y no acepta entregas"
      });
    }

    // Determinar si está a tiempo o tarde
    const estado = new Date() > entrega.tareaId.fechaEntrega ? 'tarde' : 'enviada';

    entrega.estado = estado;
    entrega.fechaEntrega = new Date();
    await entrega.save();

    await entrega.populate([
      { path: 'tareaId', select: 'titulo fechaEntrega' },
      { path: 'padreId', select: 'nombre apellido' }
    ]);

    await notificarNuevaEntrega(entrega);

    res.json({
      message: `Entrega ${estado === 'tarde' ? 'enviada con retraso' : 'enviada exitosamente'}`,
      entrega
    });
  } catch (error) {
    console.error('Error al enviar entrega:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar entrega (solo en borrador)
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

    // Eliminar archivos adjuntos de Cloudinary
    if (entrega.archivosAdjuntos && entrega.archivosAdjuntos.length > 0) {
      for (const archivo of entrega.archivosAdjuntos) {
        await eliminarArchivoCloudinary(archivo.publicId, 'raw');
      }
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

// Eliminar archivo específico de una entrega
export const eliminarArchivoEntrega = async (req, res) => {
  try {
    const { id, archivoId } = req.params;

    const entrega = await Entrega.findById(id);

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Solo permitir eliminar archivos si está en borrador
    if (entrega.estado !== 'borrador') {
      return res.status(400).json({
        message: "Solo se pueden eliminar archivos de entregas en borrador"
      });
    }

    // Buscar el archivo en el array
    const archivoIndex = entrega.archivosAdjuntos.findIndex(
      archivo => archivo._id.toString() === archivoId
    );

    if (archivoIndex === -1) {
      return res.status(404).json({
        message: "Archivo no encontrado"
      });
    }

    // Eliminar de Cloudinary
    const archivo = entrega.archivosAdjuntos[archivoIndex];
    await eliminarArchivoCloudinary(archivo.publicId, 'raw');

    // Eliminar del array
    entrega.archivosAdjuntos.splice(archivoIndex, 1);
    await entrega.save();

    res.json({
      message: "Archivo eliminado exitosamente",
      entrega
    });
  } catch (error) {
    console.error('Error al eliminar archivo:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// ==================== ENDPOINTS PARA DOCENTE ====================

// Listar todas las entregas (con filtros y paginación)
export const getAllEntregas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { estado } = req.query;

    const userId = req.user.userId;
    const userRole = req.user.rol;

    // Construir filtro base
    const filter = {};

    if (estado) filter.estado = estado;

    // APLICAR FILTROS SEGÚN ROL
    if (userRole === 'docente') {
      // Docentes solo ven entregas de sus tareas
      if (req.docenteTareaIds && req.docenteTareaIds.length > 0) {
        filter.tareaId = { $in: req.docenteTareaIds };
      } else {
        filter.tareaId = { $in: [] };
      }
    }

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
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar todas las entregas de una tarea específica
export const getEntregasByTarea = async (req, res) => {
  try {
    const { tareaId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { estado } = req.query;

    // Verificar que la tarea existe
    const tarea = await Tarea.findById(tareaId);
    if (!tarea) {
      return res.status(404).json({
        message: "Tarea no encontrada"
      });
    }

    const filter = { tareaId };
    if (estado) filter.estado = estado;

    const entregas = await Entrega.find(filter)
      .populate('padreId', 'nombre apellido correo telefono')
      .populate('calificacion.docenteId', 'nombre apellido')
      .skip(skip)
      .limit(limit)
      .sort({ fechaEntrega: -1 });

    const total = await Entrega.countDocuments(filter);

    // Estadísticas de las entregas
    const stats = {
      total,
      enviadas: await Entrega.countDocuments({ tareaId, estado: 'enviada' }),
      tarde: await Entrega.countDocuments({ tareaId, estado: 'tarde' }),
      borradores: await Entrega.countDocuments({ tareaId, estado: 'borrador' }),
      calificadas: await Entrega.countDocuments({
        tareaId,
        'calificacion.nota': { $exists: true }
      })
    };

    res.json({
      tarea: {
        id: tarea._id,
        titulo: tarea.titulo,
        fechaEntrega: tarea.fechaEntrega
      },
      entregas,
      estadisticas: stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEntregas: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener entregas por tarea:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar entregas de un padre específico
export const getEntregasByPadre = async (req, res) => {
  try {
    const { padreId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { estado } = req.query;

    const filter = { padreId };
    if (estado) filter.estado = estado;

    const entregas = await Entrega.find(filter)
      .populate('tareaId', 'titulo descripcion fechaEntrega')
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
    console.error('Error al obtener entregas por padre:', error);
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

    await notificarCalificacion(entrega);

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

// ==================== ENDPOINT COMPARTIDO ====================

// Obtener entrega por ID (accesible por docente y padre dueño)
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