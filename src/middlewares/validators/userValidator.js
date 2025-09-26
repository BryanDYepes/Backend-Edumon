import { body } from 'express-validator';

export const createUserValidator = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres'),
  
  body('apellido')
    .notEmpty()
    .withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres'),
  
  body('correo')
    .isEmail()
    .withMessage('El correo electrónico no es válido')
    .normalizeEmail(),
  
  body('contraseña')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('rol')
    .isIn(['padre', 'docente', 'administrador'])
    .withMessage('El rol debe ser: padre, docente o administrador'),
  
  body('telefono')
    .optional()
    .isMobilePhone('es-ES')
    .withMessage('El teléfono no es válido')
];