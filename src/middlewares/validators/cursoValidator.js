// middlewares/validators/cursoValidator.js
import { body, param } from 'express-validator';

export const createCursoValidator = [
  body('nombre')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),

  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres')
    .trim(),

  body('docenteId')
    .notEmpty()
    .withMessage('El ID del docente es requerido')
    .isMongoId()
    .withMessage('El ID del docente debe ser un ObjectId válido'),

  body('fotoPortadaUrl')
    .optional()
    .isURL()
    .withMessage('La URL de la foto debe ser válida')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('La foto debe ser jpg, jpeg, png, gif o webp')
];

export const updateCursoValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de curso inválido'),

  body('nombre')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),

  body('descripcion')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('La descripción debe tener entre 10 y 500 caracteres')
    .trim(),

  body('fotoPortadaUrl')
    .optional()
    .isURL()
    .withMessage('La URL de la foto debe ser válida')
    .matches(/\.(jpg|jpeg|png|gif|webp)$/i)
    .withMessage('La foto debe ser jpg, jpeg, png, gif o webp')
];

export const participanteValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de curso inválido'),

  body('usuarioId')
    .notEmpty()
    .withMessage('El ID del usuario es requerido')
    .isMongoId()
    .withMessage('El ID del usuario debe ser un ObjectId válido'),

  body('etiqueta')
    .isIn(['padre', 'docente'])
    .withMessage('La etiqueta debe ser "padre" o "docente"')
];

export const cursoIdValidator = [
  param('id')
    .isMongoId()
    .withMessage('ID de curso inválido')
];

export const csvFileValidator = [
  body().custom((value, { req }) => {
    if (!req.file) {
      throw new Error('Se requiere un archivo CSV');
    }
    return true;
  })
];