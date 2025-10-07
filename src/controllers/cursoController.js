// controllers/cursoController.js
import Curso from '../models/Curso.js';
import User from '../models/User.js';
import { validationResult } from 'express-validator';
import csv from 'csv-parser';
import { Readable } from 'stream';
import mongoose from 'mongoose';

// Función auxiliar para procesar CSV (reutilizable)
async function procesarUsuariosCSV(file, cursoId) {
  const resultados = {
    exitosos: [],
    errores: [],
    duplicados: []
  };

  try {
    const curso = await Curso.findById(cursoId);
    if (!curso) {
      throw new Error("Curso no encontrado");
    }

    const stream = Readable.from(file.buffer.toString());
    const usuarios = [];

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv({
          headers: ['nombre', 'apellido', 'telefono', 'cedula'],
          skipEmptyLines: true
        }))
        .on('data', (data) => {
          // Saltar headers
          if (data.nombre === 'nombre' && data.apellido === 'apellido') {
            return;
          }

          if (data.nombre && data.apellido && data.telefono && data.cedula) {
            usuarios.push({
              nombre: data.nombre.trim(),
              apellido: data.apellido.trim(),
              telefono: data.telefono.trim(),
              cedula: data.cedula.trim()
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Procesar cada usuario
    for (const userData of usuarios) {
      try {
        const { nombre, apellido, telefono, cedula } = userData;
        const correoTemporal = `${cedula}@temp.com`;

        let usuario = await User.findOne({
          $or: [
            { correo: correoTemporal },
            { contraseña: cedula }
          ]
        });

        if (usuario) {
          if (curso.esParticipante(usuario._id)) {
            resultados.duplicados.push({
              nombre: `${usuario.nombre} ${usuario.apellido}`,
              cedula: cedula,
              motivo: "Ya está inscrito en el curso"
            });
          } else {
            curso.agregarParticipante(usuario._id, 'padre');
            resultados.exitosos.push({
              nombre: `${usuario.nombre} ${usuario.apellido}`,
              cedula: cedula,
              telefono: usuario.telefono,
              accion: "Agregado al curso (usuario existente)"
            });
          }
        } else {
          const nuevoUsuario = new User({
            nombre,
            apellido,
            correo: correoTemporal,
            telefono,
            contraseña: cedula,
            rol: 'padre',
            estado: 'activo'
          });

          const usuarioCreado = await nuevoUsuario.save();
          curso.agregarParticipante(usuarioCreado._id, 'padre');

          resultados.exitosos.push({
            nombre: `${usuarioCreado.nombre} ${usuarioCreado.apellido}`,
            cedula: cedula,
            telefono: usuarioCreado.telefono,
            accion: "Usuario creado y agregado al curso"
          });
        }

      } catch (error) {
        if (error.code === 11000) {
          try {
            const { cedula } = userData;
            const correoTemporal = `${cedula}@temp.com`;

            let usuario = await User.findOne({
              $or: [
                { correo: correoTemporal },
                { contraseña: cedula }
              ]
            });

            if (usuario && curso.esParticipante(usuario._id)) {
              resultados.duplicados.push({
                nombre: `${usuario.nombre} ${usuario.apellido}`,
                cedula: cedula,
                motivo: "Ya está inscrito en el curso"
              });
            } else if (usuario) {
              curso.agregarParticipante(usuario._id, 'padre');
              resultados.exitosos.push({
                nombre: `${usuario.nombre} ${usuario.apellido}`,
                cedula: cedula,
                telefono: usuario.telefono,
                accion: "Agregado al curso (usuario existente)"
              });
            }
          } catch (innerError) {
            resultados.errores.push({
              datos: userData,
              error: error.message
            });
          }
        } else {
          resultados.errores.push({
            datos: userData,
            error: error.message
          });
        }
      }
    }

    await curso.save();

    return {
      resumen: {
        total: usuarios.length,
        exitosos: resultados.exitosos.length,
        errores: resultados.errores.length,
        duplicados: resultados.duplicados.length
      },
      detalles: resultados
    };

  } catch (error) {
    throw error;
  }
}

// Crear curso CON OPCIÓN de carga masiva de usuarios
export const createCurso = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { nombre, descripcion, fotoPortadaUrl, docenteId } = req.body;

    // Verificar que el docente existe y tiene el rol correcto
    const docente = await User.findById(docenteId);
    if (!docente || docente.rol !== 'docente') {
      return res.status(400).json({
        message: "El docenteId debe corresponder a un usuario con rol docente"
      });
    }

    // Crear el curso
    const nuevoCurso = new Curso({
      nombre,
      descripcion,
      fotoPortadaUrl,
      docenteId,
      participantes: [{ usuarioId: docenteId, etiqueta: 'docente' }]
    });

    const cursoGuardado = await nuevoCurso.save();

    // Si hay archivo CSV, procesar usuarios masivamente
    let resultadosCarga = null;
    if (req.file) {
      resultadosCarga = await procesarUsuariosCSV(req.file, cursoGuardado._id);

      // Recargar el curso con los nuevos participantes
      await cursoGuardado.populate('docenteId', 'nombre apellido correo');
      await cursoGuardado.populate('participantes.usuarioId', 'nombre apellido correo rol');
    } else {
      await cursoGuardado.populate('docenteId', 'nombre apellido correo');
    }

    const respuesta = {
      message: "Curso creado exitosamente",
      curso: cursoGuardado
    };

    // Si se procesó CSV, agregar resultados
    if (resultadosCarga) {
      respuesta.cargaMasiva = resultadosCarga;
    }

    res.status(201).json(respuesta);

  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar cursos con filtros y paginación
export const getCursos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const estado = req.query.estado || 'activo';
    const docenteId = req.query.docenteId;

    // Construir filtro
    let filtro = { estado };
    if (docenteId) {
      filtro.docenteId = docenteId;
    }

    const cursos = await Curso.find(filtro)
      .populate('docenteId', 'nombre apellido correo telefono')
      .populate('participantes.usuarioId', 'nombre apellido correo rol')
      .skip(skip)
      .limit(limit)
      .sort({ fechaCreacion: -1 });

    const total = await Curso.countDocuments(filtro);

    res.json({
      cursos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCursos: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener curso por ID
export const getCursoById = async (req, res) => {
  try {
    const curso = await Curso.findById(req.params.id)
      .populate('docenteId', 'nombre apellido correo telefono')
      .populate('participantes.usuarioId', 'nombre apellido correo rol telefono');

    if (!curso) {
      return res.status(404).json({
        message: "Curso no encontrado"
      });
    }

    res.json({ curso });

  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener cursos donde el usuario es participante
export const getMisCursos = async (req, res) => {
  try {
    const usuarioId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cursos = await Curso.find({
      'participantes.usuarioId': usuarioId,
      estado: 'activo'
    })
      .populate('docenteId', 'nombre apellido correo')
      .populate('participantes.usuarioId', 'nombre apellido correo rol')
      .skip(skip)
      .limit(limit)
      .sort({ fechaCreacion: -1 });

    const total = await Curso.countDocuments({
      'participantes.usuarioId': usuarioId,
      estado: 'activo'
    });

    res.json({
      cursos,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalCursos: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error al obtener mis cursos:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Actualizar curso
export const updateCurso = async (req, res) => {
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

    // No permitir actualizar participantes directamente
    delete updateData.participantes;
    delete updateData.fechaCreacion;

    const cursoActualizado = await Curso.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('docenteId', 'nombre apellido correo')
      .populate('participantes.usuarioId', 'nombre apellido correo rol');

    if (!cursoActualizado) {
      return res.status(404).json({
        message: "Curso no encontrado"
      });
    }

    res.json({
      message: "Curso actualizado exitosamente",
      curso: cursoActualizado
    });

  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Archivar curso (soft delete)
// Archivar curso (soft delete) - Usar DELETE en lugar de PUT
export const archivarCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioLogueado = req.user; // Desde el token JWT

    // Validar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "ID de curso no válido" 
      });
    }

    // Buscar el curso primero
    const curso = await Curso.findById(id);
    
    if (!curso) {
      return res.status(404).json({ 
        message: "Curso no encontrado" 
      });
    }

    // Validar que no esté ya archivado
    if (curso.estado === 'archivado') {
      return res.status(400).json({ 
        message: "El curso ya está archivado" 
      });
    }

    // Validar permisos (solo el docente del curso o admin puede archivar)
    if (usuarioLogueado.rol === 'docente' && 
        curso.docenteId.toString() !== usuarioLogueado.userId) {
      return res.status(403).json({ 
        message: "No tienes permisos para archivar este curso" 
      });
    }

    // Archivar el curso (soft delete)
    curso.estado = 'archivado';
    await curso.save();

    // Poblar datos para la respuesta
    await curso.populate('docenteId', 'nombre apellido correo');
    await curso.populate('participantes.usuarioId', 'nombre apellido correo rol');

    res.json({
      message: "Curso archivado exitosamente",
      curso
    });

  } catch (error) {
    console.error('Error al archivar curso:', error);
    res.status(500).json({ 
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Agregar participante al curso
export const agregarParticipante = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, telefono, cedula } = req.body;
    const usuarioLogueado = req.user;

    // Validar campos requeridos
    if (!nombre || !apellido || !telefono || !cedula) {
      return res.status(400).json({ 
        message: "Todos los campos son requeridos (nombre, apellido, telefono, cedula)" 
      });
    }

    // Validar que el ID del curso sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        message: "ID de curso no válido" 
      });
    }

    const curso = await Curso.findById(id);
    if (!curso) {
      return res.status(404).json({ 
        message: "Curso no encontrado" 
      });
    }

    // Validar permisos (solo el docente del curso o admin)
    if (usuarioLogueado.rol === 'docente' && 
        curso.docenteId.toString() !== usuarioLogueado.userId) {
      return res.status(403).json({ 
        message: "No tienes permisos para agregar participantes a este curso" 
      });
    }

    const correoTemporal = `${cedula.trim()}@temp.com`;
    let detalles = {};

    // Buscar si el usuario ya existe
    let usuario = await User.findOne({
      $or: [
        { correo: correoTemporal },
        { contraseña: cedula.trim() }
      ]
    });

    if (usuario) {
      // Usuario existe
      if (curso.esParticipante(usuario._id)) {
        return res.status(400).json({ 
          message: "El usuario ya está inscrito en este curso",
          usuario: {
            nombre: `${usuario.nombre} ${usuario.apellido}`,
            cedula: cedula
          }
        });
      }

      // Agregar al curso
      curso.agregarParticipante(usuario._id, 'padre');
      detalles = {
        nombre: `${usuario.nombre} ${usuario.apellido}`,
        cedula: cedula.trim(),
        telefono: usuario.telefono,
        accion: "Agregado al curso (usuario existente)"
      };

    } else {
      // Crear nuevo usuario
      const nuevoUsuario = new User({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correoTemporal,
        telefono: telefono.trim(),
        contraseña: cedula.trim(),
        rol: 'padre',
        estado: 'activo'
      });

      const usuarioCreado = await nuevoUsuario.save();
      curso.agregarParticipante(usuarioCreado._id, 'padre');
      
      detalles = {
        nombre: `${usuarioCreado.nombre} ${usuarioCreado.apellido}`,
        cedula: cedula.trim(),
        telefono: usuarioCreado.telefono,
        accion: "Usuario creado y agregado al curso"
      };
    }

    await curso.save();
    await curso.populate('docenteId', 'nombre apellido correo');
    await curso.populate('participantes.usuarioId', 'nombre apellido correo rol telefono');

    res.json({
      message: "Participante agregado exitosamente",
      detalles,
      curso
    });

  } catch (error) {
    console.error('Error al agregar participante:', error);
    
    // Manejar error de duplicado
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Ya existe un usuario con esta cédula o correo" 
      });
    }

    res.status(500).json({ 
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remover participante del curso
export const removerParticipante = async (req, res) => {
  try {
    const { id, usuarioId } = req.params;

    const curso = await Curso.findById(id);
    if (!curso) {
      return res.status(404).json({
        message: "Curso no encontrado"
      });
    }

    // No permitir remover al docente principal
    if (curso.docenteId.toString() === usuarioId) {
      return res.status(400).json({
        message: "No se puede remover al docente principal del curso"
      });
    }

    if (!curso.esParticipante(usuarioId)) {
      return res.status(400).json({
        message: "El usuario no es participante de este curso"
      });
    }

    curso.removerParticipante(usuarioId);
    await curso.save();

    await curso.populate('participantes.usuarioId', 'nombre apellido correo rol');

    res.json({
      message: "Participante removido exitosamente",
      curso
    });

  } catch (error) {
    console.error('Error al remover participante:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Registrar usuarios masivamente desde CSV (endpoint independiente)
export const registrarUsuariosMasivo = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioLogueado = req.user;

    if (!req.file) {
      return res.status(400).json({
        message: "No se ha subido ningún archivo CSV"
      });
    }

    const curso = await Curso.findById(id);
    if (!curso) {
      return res.status(404).json({
        message: "Curso no encontrado"
      });
    }

    if (usuarioLogueado.rol === 'docente' && curso.docenteId.toString() !== usuarioLogueado.userId) {
      return res.status(403).json({
        message: "No tienes permisos para agregar usuarios a este curso"
      });
    }

    const resultadosCarga = await procesarUsuariosCSV(req.file, id);

    res.status(200).json({
      message: "Proceso de registro masivo completado",
      ...resultadosCarga
    });

  } catch (error) {
    console.error('Error en registro masivo:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};