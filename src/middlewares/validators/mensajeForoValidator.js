import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

// Validador personalizado para ObjectId
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

export const crearMensajeValidators = [
  param('foroId')
    .custom(isValidObjectId).withMessage('ID de foro inválido'),
  
  body('contenido')
    .notEmpty().withMessage('El contenido es obligatorio')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('El contenido debe tener entre 1 y 2000 caracteres'),
  
  body('respuestaA')
    .optional()
    .custom(isValidObjectId).withMessage('ID de mensaje inválido'),
  
  body('archivos')
    .optional()
    .isArray().withMessage('Los archivos deben ser un array'),
  
  body('archivos.*.url')
    .optional()
    .isURL().withMessage('La URL del archivo debe ser válida'),
  
  body('archivos.*.nombre')
    .optional()
    .trim()
    .notEmpty().withMessage('El nombre del archivo es obligatorio'),
  
  body('archivos.*.tipo')
    .optional()
    .trim()
    .notEmpty().withMessage('El tipo de archivo es obligatorio')
];

export const actualizarMensajeValidators = [
  param('id')
    .custom(isValidObjectId).withMessage('ID de mensaje inválido'),
  
  body('contenido')
    .notEmpty().withMessage('El contenido es obligatorio')
    .trim()
    .isLength({ min: 1, max: 2000 }).withMessage('El contenido debe tener entre 1 y 2000 caracteres')
];

export const idMensajeValidator = [
  param('id')
    .custom(isValidObjectId).withMessage('ID de mensaje inválido')
];

export const listarMensajesValidators = [
  param('foroId')
    .custom(isValidObjectId).withMessage('ID de foro inválido'),
  
  query('respuestaA')
    .optional()
    .custom((value) => {
      if (value === 'null') return true;
      return isValidObjectId(value);
    }).withMessage('ID de mensaje inválido'),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),
  
  query('sort')
    .optional()
    .isIn(['reciente', 'antiguo', 'likes']).withMessage('El orden debe ser "reciente", "antiguo" o "likes"')
];

export const likeValidators = [
  param('id')
    .custom(isValidObjectId).withMessage('ID de mensaje inválido')
];