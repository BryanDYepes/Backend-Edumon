import Tarea from '../models/Tarea.js';
import Entrega from '../models/Entrega.js';

export const canCreateEntrega = async (req, res, next) => {
  try {
   

    const { tareaId, padreId } = req.body;


    const userId = req.user?.userId;
 

    if (!userId) {
      return res.status(401).json({ message: "Usuario no autenticado correctamente" });
    }

    if (padreId !== userId) {
     
      return res.status(403).json({ message: "Solo puedes crear entregas para ti mismo" });
    }

    const tarea = await Tarea.findById(tareaId)
      .populate({
        path: 'cursoId',
        populate: {
          path: 'participantes.usuarioId',
          select: '_id nombre apellido correo'
        }
      });

    if (!tarea) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }


    // --- 🔒 Validar asignación tipo "seleccionados" ---
    if (tarea.asignacionTipo === "seleccionados") {
      const seleccionados = tarea.participantesSeleccionados || [];

      const permitido = seleccionados.some(p => p.toString() === userId);


      if (!permitido) {
        return res.status(403).json({
          message: "No estás autorizado para entregar esta tarea (no estás seleccionado)"
        });
      }
    }

    // --- 🔒 Validar si el usuario pertenece al curso ---
    const participantes = tarea.cursoId?.participantes || [];

    const participanteValido = participantes.some(p =>
      p.usuarioId?._id?.toString() === userId ||
      p.usuarioId?.toString() === userId
    );


    if (!participanteValido) {
      return res.status(403).json({ message: "No estás autorizado para enviar esta entrega" });
    }

    next();

  } catch (error) {
    console.error("🔥 Error en canCreateEntrega:", error);
    res.status(500).json({ message: "Error interno al validar la entrega" });
  }
};

/**
 * Middleware para verificar si un usuario puede modificar una entrega
 * Solo el padre que creó la entrega puede modificarla
 * Además, solo se puede modificar si está en estado "borrador"
 */
export const canModifyEntrega = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const entrega = await Entrega.findById(id);

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Verificar que el usuario sea el dueño de la entrega
    if (entrega.padreId.toString() !== userId) {
      return res.status(403).json({
        message: "Solo puedes modificar tus propias entregas"
      });
    }

    // Opcional: Solo permitir modificar si está en borrador
    // Comenta estas líneas si quieres permitir modificar entregas enviadas
    if (entrega.estado !== 'borrador' && req.method !== 'DELETE') {
      return res.status(400).json({
        message: "Solo puedes modificar entregas en estado borrador"
      });
    }

    next();

  } catch (error) {
    console.error('Error en canModifyEntrega:', error);
    return res.status(500).json({
      message: "Error al verificar permisos para modificar entrega",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware para verificar si un usuario puede ver una entrega específica
 * Pueden ver:
 * - El padre que creó la entrega
 * - El docente de la tarea
 */
export const canViewEntrega = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.rol;

    const entrega = await Entrega.findById(id)
      .populate({
        path: 'tareaId',
        select: 'docenteId'
      });

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Si es el padre que creó la entrega
    if (entrega.padreId.toString() === userId) {
      return next();
    }

    // Si es el docente de la tarea
    if (entrega.tareaId.docenteId.toString() === userId) {
      return next();
    }

    // Si es admin, también puede ver
    if (userRole === 'admin') {
      return next();
    }

    return res.status(403).json({
      message: "No tienes permiso para ver esta entrega"
    });

  } catch (error) {
    console.error('Error en canViewEntrega:', error);
    return res.status(500).json({
      message: "Error al verificar permisos para ver entrega",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware para verificar si un usuario puede calificar una entrega
 * Solo el docente asignado a la tarea puede calificar
 */
export const canCalificarEntrega = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { docenteId } = req.body;

    // Validar que el docenteId del body coincida con el usuario autenticado
    if (docenteId !== userId) {
      return res.status(403).json({
        message: "Solo puedes calificar con tu propio ID de docente"
      });
    }

    const entrega = await Entrega.findById(id)
      .populate({
        path: 'tareaId',
        select: 'docenteId estado'
      });

    if (!entrega) {
      return res.status(404).json({
        message: "Entrega no encontrada"
      });
    }

    // Verificar que sea el docente asignado a la tarea
    if (entrega.tareaId.docenteId.toString() !== userId) {
      return res.status(403).json({
        message: "Solo el docente asignado a la tarea puede calificar entregas"
      });
    }

    next();

  } catch (error) {
    console.error('Error en canCalificarEntrega:', error);
    return res.status(500).json({
      message: "Error al verificar permisos para calificar entrega",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Middleware para filtrar entregas en el listado según el usuario
 */
export const filterEntregasForUser = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.rol;

    // Si es admin, ve todas las entregas
    if (userRole === 'admin') {
      return next();
    }

    // Si es docente, solo ve entregas de sus tareas
    if (userRole === 'docente') {
      // Obtener IDs de tareas del docente
      const tareas = await Tarea.find({ docenteId: userId }).select('_id');
      const tareaIds = tareas.map(t => t._id);
      
      // Agregar filtro al query
      req.docenteTareaIds = tareaIds;
    }

    // Si es padre/estudiante, solo ve sus propias entregas
    if (userRole === 'padre') {
      req.filteredPadreId = userId;
    }

    next();

  } catch (error) {
    console.error('Error en filterEntregasForUser:', error);
    return res.status(500).json({
      message: "Error al filtrar entregas",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};