import mongoose from "mongoose";

const foroSchema = new mongoose.Schema({
  titulo: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 150
  },
  descripcion: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 1000
  },
  docenteId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    validate: {
      validator: async function(v) {
        const user = await mongoose.model('User').findById(v);
        return user && (user.rol === 'docente' || user.rol === 'administrador');
      },
      message: 'El creador del foro debe ser un docente o administrador'
    }
  },
  cursos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Curso'
  }],
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  estado: { 
    type: String, 
    enum: ["abierto", "cerrado"], 
    default: "abierto" 
  },
  publico: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para optimizar consultas
foroSchema.index({ docenteId: 1 });
foroSchema.index({ estado: 1 });
foroSchema.index({ cursos: 1 });
foroSchema.index({ fechaCreacion: -1 });

// Virtual para contar mensajes
foroSchema.virtual('totalMensajes', {
  ref: 'MensajeForo',
  localField: '_id',
  foreignField: 'foroId',
  count: true
});

// Método para verificar si un usuario puede acceder al foro
foroSchema.methods.puedeAcceder = async function(usuarioId) {
  const user = await mongoose.model('User').findById(usuarioId);
  
  if (!user) return false;
  
  // Administradores pueden acceder a todo
  if (user.rol === 'administrador') return true;
  
  // Creador del foro puede acceder
  if (this.docenteId.toString() === usuarioId.toString()) return true;
  
  // Si es público, cualquiera puede acceder
  if (this.publico) return true;
  
  // Verificar si el usuario es participante de alguno de los cursos del foro
  const Curso = mongoose.model('Curso');
  const cursosUsuario = await Curso.find({
    _id: { $in: this.cursos },
    $or: [
      { docenteId: usuarioId },
      { 'participantes.usuarioId': usuarioId }
    ]
  });
  
  return cursosUsuario.length > 0;
};

export default mongoose.model("Foro", foroSchema);