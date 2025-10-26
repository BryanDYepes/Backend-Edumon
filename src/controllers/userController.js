import User from '../models/User.js';
import { validationResult } from 'express-validator';

// Crear usuario
export const createUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { nombre, apellido, cedula, correo, contraseña, rol, telefono } = req.body;

    // Verificar si ya existe un usuario con esa cédula
    const existingCedula = await User.findOne({ cedula });
    if (existingCedula) {
      return res.status(409).json({
        message: "Ya existe un usuario con esta cédula"
      });
    }

    // Verificar si el usuario ya existe por correo
    const existingUser = await User.findOne({ correo });
    if (existingUser) {
      return res.status(409).json({
        message: "Ya existe un usuario con este correo electrónico"
      });
    }

    const newUser = new User({
      nombre,
      apellido,
      cedula,
      correo,
      contraseña,
      rol,
      telefono
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: savedUser
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Listar usuarios con paginación
export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { rol, estado } = req.query;

    // Construir filtro
    const filter = {};
    if (rol) filter.rol = rol;
    if (estado) filter.estado = estado;

    const users = await User.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ fechaRegistro: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener usuario por ID
export const getUserById = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};

// Actualizar usuario
export const updateUser = async (req, res) => {
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

    // No permitir actualizar ciertos campos
    delete updateData.contraseña;
    delete updateData._id;
    delete updateData.fechaRegistro;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json({
      message: "Usuario actualizado exitosamente",
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar usuario (soft delete)
export const deleteUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Errores de validación",
        errors: errors.array()
      });
    }

    const { id } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { estado: 'suspendido' },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json({
      message: "Usuario suspendido exitosamente",
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al suspender usuario:', error);
    res.status(500).json({
      message: "Error interno del servidor"
    });
  }
};
