import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/database.js";

// Importar rutas
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import cursoRoutes from "./routes/cursoRoutes.js";
import moduloRoutes from './routes/moduloRoutes.js';
import tareaRoutes from './routes/tareaRoutes.js';
import entregaRoutes from './routes/entregaRoutes.js';
import fotoPerfilRoutes from './routes/fotoPerfilRoutes.js';

// Importar middlewares
import { errorHandler } from "./middlewares/errorMiddleware.js";

// Configurar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conectar a la base de datos
connectDB();

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

// CORS - Permitir peticiones desde otros dominios
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Parsear JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logger simple de requests (opcional)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// RUTAS
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cursos", cursoRoutes); 
app.use('/api/modulos', moduloRoutes);
app.use('/api/tareas', tareaRoutes);
app.use('/api/entregas', entregaRoutes);
app.use('/api/fotos-perfil', fotoPerfilRoutes);

// ============================================
// RUTA DE SALUD (Health Check)
// ============================================

app.get("/", (req, res) => {
  res.json({ 
    message: "API de E-Learning funcionando correctamente",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    uptime: process.uptime(),
    timestamp: new Date().toISOString() 
  });
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// Middleware de errores personalizado
app.use(errorHandler);

// Manejo de rutas no encontradas (debe ir al final)
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Servidor corriendo en: http://localhost:${PORT}`);
  console.log(`📁 Archivos estáticos en: http://localhost:${PORT}/uploads`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📅 Iniciado: ${new Date().toLocaleString()}`);
  console.log('='.repeat(50));
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // En producción, podrías querer cerrar el servidor aquí
  // process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

export default app;