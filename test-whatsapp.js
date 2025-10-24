import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendWhatsApp() {
  try {
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: "whatsapp:+573113014875", // <-- tu número verificado
      body: "✅ Prueba exitosa de notificación WhatsApp desde Edumon 🚀",
    });
    console.log("Mensaje enviado:", message.sid);
  } catch (error) {
    console.error("Error:", error);
  }
}

sendWhatsApp();
