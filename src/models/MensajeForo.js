import mongoose from "mongoose";

const mensajeForoSchema = new mongoose.Schema({
  foroId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Foro',
    required: true
  },
  contenido: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 2000
  },
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  archivos: [{
    url: { type: String },
    publicId: { type: String },
    nombre: { type: String },
    tipo: { type: String }
  }],
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  respuestaA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MensajeForo',
    default: null
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  editado: {
    type: Boolean,
    default: false
  },
  fechaEdicion: {
    type: Date
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
mensajeForoSchema.index({ foroId: 1, fechaCreacion: -1 });
mensajeForoSchema.index({ usuarioId: 1 });
mensajeForoSchema.index({ respuestaA: 1 });

// Virtual para contar likes
mensajeForoSchema.virtual('totalLikes').get(function() {
  return Array.isArray(this.likes) ? this.likes.length : 0;
});

// Virtual para contar respuestas
mensajeForoSchema.virtual('respuestas', {
  ref: 'MensajeForo',
  localField: '_id',
  foreignField: 'respuestaA'
});

// Método para verificar si un usuario dio like
mensajeForoSchema.methods.tieneLink = function(usuarioId) {
  return this.likes.some(id => id.toString() === usuarioId.toString());
};

// Método para agregar/quitar like
mensajeForoSchema.methods.toggleLike = function(usuarioId) {
  const index = this.likes.findIndex(id => id.toString() === usuarioId.toString());
  
  if (index > -1) {
    // Quitar like
    this.likes.splice(index, 1);
    return false;
  } else {
    // Agregar like
    this.likes.push(usuarioId);
    return true;
  }
};

// Middleware para actualizar fecha de edición
mensajeForoSchema.pre('save', function(next) {
  if (this.isModified('contenido') && !this.isNew) {
    this.editado = true;
    this.fechaEdicion = new Date();
  }
  next();
});

export default mongoose.model("MensajeForo", mensajeForoSchema);