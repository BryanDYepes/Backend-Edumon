import cron from 'node-cron';
import Tarea from '../models/Tarea.js';
import { notificarTareaProximaVencer } from '../services/notificationService.js';

/**
 * Ejecutar cada hora para verificar tareas próximas a vencer
 */
export const iniciarSchedulerTareas = () => {
  // Ejecutar cada hora
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🕐 Verificando tareas próximas a vencer...');

      const ahora = new Date();
      const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

      // Buscar tareas que vencen en 24 horas
      const tareas = await Tarea.find({
        estado: 'publicada',
        fechaEntrega: {
          $gte: ahora,
          $lte: en24Horas
        }
      });

      console.log(`📝 ${tareas.length} tareas próximas a vencer encontradas`);

      // Enviar notificaciones
      for (const tarea of tareas) {
        await notificarTareaProximaVencer(tarea);
      }

      console.log('✅ Notificaciones de recordatorio enviadas');
    } catch (error) {
      console.error('Error en scheduler de tareas:', error);
    }
  });

  console.log('⏰ Scheduler de tareas iniciado');
};