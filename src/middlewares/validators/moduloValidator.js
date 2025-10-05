import { body, param } from 'express-validator';

export const createModuloValidator = [
  body('cursoId')
    .notEmpty().withMessage('El ID del curso es obligatorio')
    .isMongoId().withMessage('El ID del curso no es válido'),
  
  body('titulo')
    .notEmpty().withMessage('El título es obligatorio')
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('El título debe tener entre 3 y 200 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres')
];

export const updateModuloValidator = [
  param('id')
    .isMongoId().withMessage('El ID del módulo no es válido'),
  
  body('cursoId')
    .optional()
    .isMongoId().withMessage('El ID del curso no es válido'),
  
  body('titulo')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('El título debe tener entre 3 y 200 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres')
];

export const moduloIdValidator = [
  param('id')
    .isMongoId().withMessage('El ID del módulo no es válido')
];