import { body, param } from 'express-validator';

// Validador para crear usuario
export const createUserValidator = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),

  body('apellido')
    .notEmpty()
    .withMessage('El apellido es requerido')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),

  body('cedula')
    .notEmpty()
    .withMessage('La cédula es requerida')
    .trim()
    .isLength({ min: 6, max: 10 })
    .withMessage('La cédula debe tener entre 6 y 10 dígitos')
    .matches(/^\d{6,10}$/)  // ✅ CAMBIADO
    .withMessage('La cédula solo debe contener números'),

  body('correo')
    .notEmpty()
    .withMessage('El correo es requerido')
    .isEmail()
    .withMessage('El correo electrónico no es válido')
    .normalizeEmail(),

  body('contraseña')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),

  body('rol')
    .notEmpty()
    .withMessage('El rol es requerido')
    .isIn(['padre', 'docente', 'administrador'])
    .withMessage('El rol debe ser: padre, docente o administrador'),

  body('telefono')
    .optional()
    .trim()
    .isMobilePhone('es-CO')
    .withMessage('El teléfono no es válido para Colombia')
];

// Validador para actualizar usuario
export const updateUserValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de usuario inválido'),

  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),

  body('apellido')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),

  body('cedula')
    .optional()
    .trim()
    .isLength({ min: 6, max: 10 })
    .withMessage('La cédula debe tener entre 6 y 10 dígitos')
    .matches(/^\d{6,10}$/)  // ✅ CAMBIADO
    .withMessage('La cédula solo debe contener números'),

  body('correo')
    .optional()
    .isEmail()
    .withMessage('El correo electrónico no es válido')
    .normalizeEmail(),

  body('rol')
    .optional()
    .isIn(['padre', 'docente', 'administrador'])
    .withMessage('El rol debe ser: padre, docente o administrador'),

  body('telefono')
    .optional()
    .trim()
    .isMobilePhone('es-CO')
    .withMessage('El teléfono no es válido para Colombia'),

  body('estado')
    .optional()
    .isIn(['activo', 'suspendido'])
    .withMessage('El estado debe ser: activo o suspendido'),

  body('fotoPerfilUrl')
    .optional()
    .isString()
    .withMessage('La URL de la foto debe ser texto')
    .custom((value) => {
      if (value && !value.startsWith('/uploads/')) {
        throw new Error('URL de foto inválida');
      }
      return true;
    })
];

// Validador para ID de usuario
export const userIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de usuario inválido')
];