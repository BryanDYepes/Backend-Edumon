import Notificacion from '../models/Notificacion.js';
import User from '../models/User.js';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import webpush from 'web-push';
import { emitirNotificacion } from '../socket/socketHandlers.js';
import dotenv from "dotenv";
dotenv.config({ path: "./.env" }); // fuerza la carga del .env en la raíz
// ============ CONFIGURACIONES ============

// Configurar Web Push
webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Ejemplo de envío (para pruebas)
export const sendNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log("Notificación enviada");
  } catch (err) {
    console.error("Error enviando notificación:", err);
  }
};

// Configurar Nodemailer (para emails)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Configurar Twilio (para WhatsApp)
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ============ FUNCIÓN PRINCIPAL ============

/**
 * Crea y envía una notificación por los canales apropiados
 * @param {Object} datos - Datos de la notificación
 * @returns {Promise<Object>} - Notificación creada
 */
export const crearYEnviarNotificacion = async (datos) => {
  try {
    const {
      usuarioId,
      tipo,
      mensaje,
      prioridad = 'critica',
      referenciaId,
      referenciaModelo,
      metadata = {}
    } = datos;

    // Obtener usuario
    const usuario = await User.findById(usuarioId);
    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Crear notificación en BD
    const notificacion = new Notificacion({
      usuarioId,
      tipo,
      mensaje,
      prioridad,
      referenciaId,
      referenciaModelo,
      metadata
    });

    await notificacion.save();

    // ========== ENVIAR POR WEBSOCKET (SIEMPRE) ==========
    try {
      await emitirNotificacion(notificacion);
      notificacion.canalEnviado.websocket = true;
    } catch (error) {
      console.error('Error al enviar por WebSocket:', error);
    }

    // ========== ENVIAR PUSH (Alta/Crítica prioridad) ==========
    if (['alta', 'critica'].includes(prioridad)) {
      try {
        await enviarNotificacionPush(usuario, notificacion);
        notificacion.canalEnviado.push = true;
      } catch (error) {
        console.error('Error al enviar Push:', error);
      }
    }

    // ========== ENVIAR WHATSAPP (Crítica prioridad) ==========
    if (prioridad === 'critica' && usuario.telefono) {
      try {
        await enviarNotificacionWhatsApp(usuario, notificacion);
        notificacion.canalEnviado.whatsapp = true;
      } catch (error) {
        console.error('Error al enviar WhatsApp:', error);
      }
    }

    // ========== ENVIAR EMAIL (Solo docentes, prioridad alta/crítica) ==========
    if (
      usuario.rol === 'docente' && 
      ['alta', 'critica'].includes(prioridad)
    ) {
      try {
        await enviarNotificacionEmail(usuario, notificacion);
        notificacion.canalEnviado.email = true;
      } catch (error) {
        console.error('Error al enviar Email:', error);
      }
    }

    // Guardar canales enviados
    await notificacion.save();

    return notificacion;
  } catch (error) {
    console.error('Error al crear y enviar notificación:', error);
    throw error;
  }
};

// ============ FUNCIONES DE ENVÍO ============

/**
 * Envía notificación push
 */
export const enviarNotificacionPush = async (usuario, notificacion) => {
  try {
    // Obtener suscripciones push del usuario (debes guardarlas en tu BD)
    const suscripciones = await obtenerSuscripcionesPush(usuario._id);

    if (!suscripciones || suscripciones.length === 0) {
      console.log('Usuario sin suscripciones push');
      return;
    }

    const payload = JSON.stringify({
      title: obtenerTituloPush(notificacion.tipo),
      body: notificacion.mensaje,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: {
        notificacionId: notificacion._id,
        tipo: notificacion.tipo,
        url: obtenerUrlNotificacion(notificacion)
      }
    });

    const promesas = suscripciones.map(suscripcion =>
      webpush.sendNotification(suscripcion, payload)
        .catch(error => {
          console.error('Error al enviar a suscripción:', error);
          // Si la suscripción expiró, eliminarla de la BD
          if (error.statusCode === 410) {
            eliminarSuscripcionPush(suscripcion.endpoint);
          }
        })
    );

    await Promise.allSettled(promesas);
    console.log(`Push enviado a ${usuario.nombre}`);
  } catch (error) {
    console.error('Error en enviarNotificacionPush:', error);
    throw error;
  }
};

/**
 * Envía notificación por WhatsApp
 */
export const enviarNotificacionWhatsApp = async (usuario, notificacion) => {
  try {
    if (!usuario.telefono) {
      console.log('Usuario sin teléfono');
      return;
    }

    const mensaje = `
🔔 *${obtenerTituloPush(notificacion.tipo)}*

${notificacion.mensaje}

---
_Notificación del Sistema Educativo_
    `.trim();

    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${usuario.telefono}`,
      body: mensaje
    });

    console.log(`WhatsApp enviado a ${usuario.nombre}`);
  } catch (error) {
    console.error('Error en enviarNotificacionWhatsApp:', error);
    throw error;
  }
};

/**
 * Envía notificación por email (solo docentes)
 */
export const enviarNotificacionEmail = async (usuario, notificacion) => {
  try {
    if (usuario.rol !== 'docente') {
      return;
    }

    const mailOptions = {
      from: `"Sistema Educativo" <${process.env.EMAIL_USER}>`,
      to: usuario.correo,
      subject: obtenerTituloPush(notificacion.tipo),
      html: generarHTMLEmail(usuario, notificacion)
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email enviado a ${usuario.correo}`);
  } catch (error) {
    console.error('Error en enviarNotificacionEmail:', error);
    throw error;
  }
};

// ============ FUNCIONES AUXILIARES ============

function obtenerTituloPush(tipo) {
  const titulos = {
    tarea: '📝 Nueva Tarea',
    entrega: '📤 Nueva Entrega',
    calificacion: '⭐ Nueva Calificación',
    foro: '💬 Nuevo Mensaje en Foro',
    evento: '📅 Nuevo Evento',
    sistema: '🔔 Notificación del Sistema'
  };
  return titulos[tipo] || '🔔 Notificación';
}

function obtenerUrlNotificacion(notificacion) {
  const urls = {
    tarea: `/tareas/${notificacion.referenciaId}`,
    entrega: `/entregas/${notificacion.referenciaId}`,
    calificacion: `/entregas/${notificacion.referenciaId}`,
    foro: `/foros/${notificacion.referenciaId}`,
    evento: `/eventos/${notificacion.referenciaId}`,
    sistema: '/notificaciones'
  };
  return urls[notificacion.tipo] || '/notificaciones';
}

function generarHTMLEmail(usuario, notificacion) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${obtenerTituloPush(notificacion.tipo)}</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${usuario.nombre}</strong>,</p>
          <p>${notificacion.mensaje}</p>
          ${notificacion.referenciaId ? `
            <a href="${process.env.FRONTEND_URL}${obtenerUrlNotificacion(notificacion)}" class="button">
              Ver Detalles
            </a>
          ` : ''}
        </div><div class="footer">
          <p>Este es un correo automático del Sistema Educativo. Por favor no responder.</p>
          <p>&copy; ${new Date().getFullYear()} Sistema Educativo. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============ FUNCIONES PARA MANEJAR SUSCRIPCIONES PUSH ============

/**
 * Obtener suscripciones push de un usuario
 * Debes crear un modelo PushSubscription para guardarlas
 */
async function obtenerSuscripcionesPush(usuarioId) {
  try {
    // Importar modelo de suscripciones (crearlo si no existe)
    const PushSubscription = (await import('../models/pushSubscription.js')).default;
    const suscripciones = await PushSubscription.find({ 
      usuarioId, 
      activa: true 
    });
    return suscripciones;
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    return [];
  }
}

/**
 * Eliminar suscripción push expirada
 */
async function eliminarSuscripcionPush(endpoint) {
  try {
    const PushSubscription = (await import('../models/pushSubscription.model.js')).default;
    await PushSubscription.deleteOne({ endpoint });
    console.log('Suscripción expirada eliminada');
  } catch (error) {
    console.error('Error al eliminar suscripción:', error);
  }
}

// ============ NOTIFICACIONES ESPECÍFICAS POR TIPO ============

/**
 * Notificación cuando se crea una tarea
 */
export const notificarNuevaTarea = async (tarea) => {
  try {
    // Obtener participantes del curso
    const Curso = (await import('../models/Curso.js')).default;
    const curso = await Curso.findById(tarea.cursoId).populate('participantes');

    if (!curso) return;

    // Determinar destinatarios según asignación
    let destinatarios = [];
    if (tarea.asignacionTipo === 'todos') {
      destinatarios = curso.participantes.filter(p => p.rol === 'padre');
    } else if (tarea.asignacionTipo === 'seleccionados') {
      destinatarios = await User.find({
        _id: { $in: tarea.participantesSeleccionados },
        rol: 'padre'
      });
    }

    // Crear notificaciones para cada destinatario
    const promesas = destinatarios.map(usuario =>
      crearYEnviarNotificacion({
        usuarioId: usuario._id,
        tipo: 'tarea',
        mensaje: `Nueva tarea asignada: "${tarea.titulo}". Fecha de entrega: ${new Date(tarea.fechaEntrega).toLocaleDateString()}`,
        prioridad: 'alta',
        referenciaId: tarea._id,
        referenciaModelo: 'Tarea',
        metadata: {
          cursoNombre: curso.nombre,
          fechaEntrega: tarea.fechaEntrega,
          tipoEntrega: tarea.tipoEntrega
        }
      })
    );

    await Promise.allSettled(promesas);
    console.log(`Notificaciones de tarea enviadas a ${destinatarios.length} usuarios`);
  } catch (error) {
    console.error('Error en notificarNuevaTarea:', error);
  }
};

/**
 * Notificación cuando se envía una entrega
 */
export const notificarNuevaEntrega = async (entrega) => {
  try {
    const Tarea = (await import('../models/tarea.model.js')).default;
    const tarea = await Tarea.findById(entrega.tareaId);

    if (!tarea) return;

    const padre = await User.findById(entrega.padreId);

    // Notificar al docente de la tarea
    await crearYEnviarNotificacion({
      usuarioId: tarea.docenteId,
      tipo: 'entrega',
      mensaje: `${padre.nombre} ${padre.apellido} ha enviado la entrega de "${tarea.titulo}"`,
      prioridad: 'critica',
      referenciaId: entrega._id,
      referenciaModelo: 'Entrega',
      metadata: {
        tareaTitulo: tarea.titulo,
        padreNombre: `${padre.nombre} ${padre.apellido}`,
        estado: entrega.estado
      }
    });

    console.log('Notificación de entrega enviada al docente');
  } catch (error) {
    console.error('Error en notificarNuevaEntrega:', error);
  }
};

/**
 * Notificación cuando se califica una entrega
 */
export const notificarCalificacion = async (entrega) => {
  try {
    const Tarea = (await import('../models/tarea.model.js')).default;
    const tarea = await Tarea.findById(entrega.tareaId);

    if (!tarea) return;

    const docente = await User.findById(entrega.calificacion.docenteId);

    // Notificar al padre
    await crearYEnviarNotificacion({
      usuarioId: entrega.padreId,
      tipo: 'calificacion',
      mensaje: `Tu entrega de "${tarea.titulo}" ha sido calificada. Nota: ${entrega.calificacion.nota}/100`,
      prioridad: 'alta',
      referenciaId: entrega._id,
      referenciaModelo: 'Entrega',
      metadata: {
        tareaTitulo: tarea.titulo,
        nota: entrega.calificacion.nota,
        comentario: entrega.calificacion.comentario,
        docenteNombre: `${docente.nombre} ${docente.apellido}`
      }
    });

    console.log('Notificación de calificación enviada al padre');
  } catch (error) {
    console.error('Error en notificarCalificacion:', error);
  }
};

/**
 * Notificación cuando una tarea está próxima a vencer (24 horas)
 */
export const notificarTareaProximaVencer = async (tarea) => {
  try {
    const Curso = (await import('../models/curso.model.js')).default;
    const Entrega = (await import('../models/entrega.model.js')).default;
    
    const curso = await Curso.findById(tarea.cursoId).populate('participantes');
    if (!curso) return;

    // Obtener padres que AÚN NO han entregado
    const entregasRealizadas = await Entrega.find({ 
      tareaId: tarea._id,
      estado: { $in: ['enviada', 'tarde'] }
    }).distinct('padreId');

    let destinatarios = [];
    if (tarea.asignacionTipo === 'todos') {
      destinatarios = curso.participantes.filter(p => 
        p.rol === 'padre' && 
        !entregasRealizadas.some(id => id.equals(p._id))
      );
    } else if (tarea.asignacionTipo === 'seleccionados') {
      destinatarios = await User.find({
        _id: { 
          $in: tarea.participantesSeleccionados.filter(id =>
            !entregasRealizadas.some(entregaId => entregaId.equals(id))
          )
        },
        rol: 'padre'
      });
    }

    const promesas = destinatarios.map(usuario =>
      crearYEnviarNotificacion({
        usuarioId: usuario._id,
        tipo: 'tarea',
        mensaje: `⚠️ Recordatorio: La tarea "${tarea.titulo}" vence en 24 horas`,
        prioridad: 'critica',
        referenciaId: tarea._id,
        referenciaModelo: 'Tarea',
        metadata: {
          cursoNombre: curso.nombre,
          fechaEntrega: tarea.fechaEntrega,
          esRecordatorio: true
        }
      })
    );

    await Promise.allSettled(promesas);
    console.log(`Recordatorios enviados a ${destinatarios.length} usuarios`);
  } catch (error) {
    console.error('Error en notificarTareaProximaVencer:', error);
  }
};

/**
 * Notificación cuando se cierra una tarea
 */
export const notificarTareaCerrada = async (tarea) => {
  try {
    const Curso = (await import('../models/curso.model.js')).default;
    const curso = await Curso.findById(tarea.cursoId).populate('participantes');

    if (!curso) return;

    let destinatarios = [];
    if (tarea.asignacionTipo === 'todos') {
      destinatarios = curso.participantes.filter(p => p.rol === 'padre');
    } else if (tarea.asignacionTipo === 'seleccionados') {
      destinatarios = await User.find({
        _id: { $in: tarea.participantesSeleccionados },
        rol: 'padre'
      });
    }

    const promesas = destinatarios.map(usuario =>
      crearYEnviarNotificacion({
        usuarioId: usuario._id,
        tipo: 'tarea',
        mensaje: `La tarea "${tarea.titulo}" ha sido cerrada. Ya no se aceptan más entregas`,
        prioridad: 'critica',
        referenciaId: tarea._id,
        referenciaModelo: 'Tarea',
        metadata: {
          cursoNombre: curso.nombre,
          fechaCierre: new Date()
        }
      })
    );

    await Promise.allSettled(promesas);
    console.log(`Notificaciones de cierre enviadas a ${destinatarios.length} usuarios`);
  } catch (error) {
    console.error('Error en notificarTareaCerrada:', error);
  }
};

/**
 * Notificación de bienvenida a nuevo usuario
 */
export const notificarBienvenida = async (usuario) => {
  try {
    await crearYEnviarNotificacion({
      usuarioId: usuario._id,
      tipo: 'sistema',
      mensaje: `¡Bienvenido ${usuario.nombre}! Tu cuenta ha sido creada exitosamente`,
      prioridad: 'critica',
      referenciaId: usuario._id,
      referenciaModelo: 'User',
      metadata: {
        rol: usuario.rol,
        fechaRegistro: usuario.fechaRegistro
      }
    });

    console.log('Notificación de bienvenida enviada');
  } catch (error) {
    console.error('Error en notificarBienvenida:', error);
  }
};

/**
 * Notificación cuando se agrega a un curso
 */
export const notificarAgregarCurso = async (usuarioId, curso) => {
  try {
    await crearYEnviarNotificacion({
      usuarioId,
      tipo: 'sistema',
      mensaje: `Has sido agregado al curso "${curso.nombre}"`,
      prioridad: 'critica',
      referenciaId: curso._id,
      referenciaModelo: 'Curso',
      metadata: {
        cursoNombre: curso.nombre,
        cursoCodigo: curso.codigoCurso
      }
    });

    console.log('Notificación de nuevo curso enviada');
  } catch (error) {
    console.error('Error en notificarAgregarCurso:', error);
  }
};

// ============ EXPORTAR TODAS LAS FUNCIONES ============
export default {
  crearYEnviarNotificacion,
  enviarNotificacionPush,
  enviarNotificacionWhatsApp,
  enviarNotificacionEmail,
  notificarNuevaTarea,
  notificarNuevaEntrega,
  notificarCalificacion,
  notificarTareaProximaVencer,
  notificarTareaCerrada,
  notificarBienvenida,
  notificarAgregarCurso
};