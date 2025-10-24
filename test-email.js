import { crearYEnviarNotificacion } from './src/services/notificacionService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

await crearYEnviarNotificacion({
  usuarioId: '68f54f3dbbdb94770870f5fd', // 👈 reemplaza esto
  tipo: 'sistema',
  mensaje: '📬 Esto es una prueba de envío de correo con Nodemailer',
  prioridad: 'critica',
  referenciaModelo: 'User'
});

console.log('✅ Notificación de prueba enviada');
process.exit();
