import mongoose from "mongoose";

const tareaSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: [true, 'El título es obligatorio'],
    trim: true,
    maxlength: [200, 'El título no puede exceder 200 caracteres']
  },
  descripcion: { 
    type: String,
    trim: true,
    maxlength: [2000, 'La descripción no puede exceder 2000 caracteres']
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  fechaEntrega: { 
    type: Date,
    required: [true, 'La fecha de entrega es obligatoria']
  },
  docenteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'El ID del docente es obligatorio']
  },
  etiquetas: { 
    type: [String],
    default: []
  },
  tipoEntrega: { 
    type: String, 
    enum: {
      values: ["texto", "archivo", "multimedia", "enlace", "presencial", "grupal"],
      message: '{VALUE} no es un tipo de entrega válido'
    },
    required: [true, 'El tipo de entrega es obligatorio']
  },
  archivosAdjuntos: { 
    type: [String],
    default: []
  },
  criterios: { 
    type: String,
    trim: true
  },
  estado: { 
    type: String, 
    enum: {
      values: ["publicada", "cerrada"],
      message: '{VALUE} no es un estado válido'
    },
    default: "publicada" 
  },
  cursoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Curso',
    required: [true, 'El ID del curso es obligatorio']
  },
  moduloId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Modulo',
    required: [true, 'El ID del módulo es obligatorio']
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar búsquedas
tareaSchema.index({ cursoId: 1, moduloId: 1, fechaEntrega: -1 });
tareaSchema.index({ docenteId: 1, estado: 1 });

// Virtual para saber si la tarea está vencida
tareaSchema.virtual('estaVencida').get(function() {
  return this.fechaEntrega < new Date() && this.estado === 'publicada';
});

export default mongoose.model("Tarea", tareaSchema);