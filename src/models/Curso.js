// models/Curso.js
import mongoose from "mongoose";

const participanteSchema = new mongoose.Schema({
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  etiqueta: { 
    type: String, 
    enum: ["padre", "docente"], 
    required: true 
  }
}, { _id: false });

const cursoSchema = new mongoose.Schema({
  nombre: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  descripcion: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 500
  },
  fotoPortadaUrl: { 
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Campo opcional
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'La URL de la foto debe ser válida y terminar en jpg, jpeg, png, gif o webp'
    }
  },
  docenteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    validate: {
      validator: async function(v) {
        const user = await mongoose.model('User').findById(v);
        return user && user.rol === 'docente';
      },
      message: 'El docenteId debe corresponder a un usuario con rol docente'
    }
  },
   participantes: {
    type: [participanteSchema],
    default: [] // ✅ valor por defecto
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  estado: { 
    type: String, 
    enum: ["activo", "archivado"], 
    default: "activo" 
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
cursoSchema.index({ docenteId: 1 });
cursoSchema.index({ estado: 1 });
cursoSchema.index({ 'participantes.usuarioId': 1 });

cursoSchema.virtual('totalParticipantes').get(function() {
  return Array.isArray(this.participantes) ? this.participantes.length : 0; // ✅ seguro
});

// Método para verificar si un usuario es participante
cursoSchema.methods.esParticipante = function(usuarioId) {
  return this.participantes.some(p => p.usuarioId.toString() === usuarioId.toString());
};

// Método para agregar participante
cursoSchema.methods.agregarParticipante = function(usuarioId, etiqueta) {
  if (!this.esParticipante(usuarioId)) {
    this.participantes.push({ usuarioId, etiqueta });
  }
};

// Método para remover participante
cursoSchema.methods.removerParticipante = function(usuarioId) {
  this.participantes = this.participantes.filter(
    p => p.usuarioId.toString() !== usuarioId.toString()
  );
};

export default mongoose.model("Curso", cursoSchema);