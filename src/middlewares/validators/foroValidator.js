import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

// Validador personalizado para ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

export const crearForoValidators = [
  body('titulo')
    .notEmpty().withMessage('El título es obligatorio')
    .trim()
    .isLength({ min: 3, max: 150 }).withMessage('El título debe tener entre 3 y 150 caracteres'),
  
  body('descripcion')
    .notEmpty().withMessage('La descripción es obligatoria')
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
  
  body('cursos')
    .optional()
    .isArray().withMessage('Los cursos deben ser un array')
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every(id => isValidObjectId(id));
      }
      return true;
    }).withMessage('Todos los IDs de cursos deben ser válidos'),
  
  body('publico')
    .optional()
    .isBoolean().withMessage('El campo público debe ser un booleano'),
  
  body('estado')
    .optional()
    .isIn(['abierto', 'cerrado']).withMessage('El estado debe ser "abierto" o "cerrado"')
];

export const actualizarForoValidators = [
  param('id')
    .custom(isValidObjectId).withMessage('ID de foro inválido'),
  
  body('titulo')
    .optional()
    .trim()
    .isLength({ min: 3, max: 150 }).withMessage('El título debe tener entre 3 y 150 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 }).withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
  
  body('cursos')
    .optional()
    .isArray().withMessage('Los cursos deben ser un array')
    .custom((value) => {
      if (value && value.length > 0) {
        return value.every(id => isValidObjectId(id));
      }
      return true;
    }).withMessage('Todos los IDs de cursos deben ser válidos'),
  
  body('publico')
    .optional()
    .isBoolean().withMessage('El campo público debe ser un booleano'),
  
  body('estado')
    .optional()
    .isIn(['abierto', 'cerrado']).withMessage('El estado debe ser "abierto" o "cerrado"')
];

export const idForoValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('ID de foro inválido')
];

export const listarForosValidators = [
  query('estado')
    .optional()
    .isIn(['abierto', 'cerrado']).withMessage('El estado debe ser "abierto" o "cerrado"'),
  
  query('cursoId')
    .optional()
    .custom(isValidObjectId).withMessage('ID de curso inválido'),
  
  query('publico')
    .optional()
    .isBoolean().withMessage('El campo público debe ser un booleano'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100')
];