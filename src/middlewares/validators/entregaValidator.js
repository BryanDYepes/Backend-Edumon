import { body, param } from 'express-validator';

export const createEntregaValidator = [
  body('tareaId')
    .notEmpty().withMessage('El ID de la tarea es obligatorio')
    .isMongoId().withMessage('El ID de la tarea no es válido'),
  
  body('padreId')
    .notEmpty().withMessage('El ID del padre es obligatorio')
    .isMongoId().withMessage('El ID del padre no es válido'),
  
  body('archivos')
    .optional()
    .isArray().withMessage('Los archivos deben ser un array'),
  
  body('textoRespuesta')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('El texto de respuesta no puede exceder 5000 caracteres'),
  
  body('estado')
    .optional()
    .isIn(["borrador", "enviada", "tarde"])
    .withMessage('Estado no válido')
];

export const updateEntregaValidator = [
  param('id')
    .isMongoId().withMessage('El ID de la entrega no es válido'),
  
  body('archivos')
    .optional()
    .isArray().withMessage('Los archivos deben ser un array'),
  
  body('textoRespuesta')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('El texto de respuesta no puede exceder 5000 caracteres'),
  
  body('estado')
    .optional()
    .isIn(["borrador", "enviada", "tarde"])
    .withMessage('Estado no válido')
];

export const calificarEntregaValidator = [
  param('id')
    .isMongoId().withMessage('El ID de la entrega no es válido'),
  
  body('nota')
    .notEmpty().withMessage('La nota es obligatoria')
    .isNumeric().withMessage('La nota debe ser un número')
    .isFloat({ min: 0, max: 100 }).withMessage('La nota debe estar entre 0 y 100'),
  
  body('comentario')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('El comentario no puede exceder 1000 caracteres'),
  
  body('docenteId')
    .notEmpty().withMessage('El ID del docente es obligatorio')
    .isMongoId().withMessage('El ID del docente no es válido')
];

export const entregaIdValidator = [
  param('id')
    .isMongoId().withMessage('El ID de la entrega no es válido')
];