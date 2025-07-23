/**
 * Configuración general de SchneidBot
 */

// Carga variables de entorno desde archivo .env
require('dotenv').config();

// Puerto para el servidor HTTP
const PORT = process.env.PORT || 8080;

// ID del asistente OpenAI a utilizar
const ASSISTANT_ID = process.env.ASSISTANT_ID || "asst_fZdfXdWwv0CBHYA3cWKzpRGx";

// Mensaje de bienvenida que se muestra al iniciar el chat y se guarda en el thread
const WELCOME_MESSAGE = `¡Hola! Soy KartBot, tu asistente virtual diseñado para que vivas al máximo el Karting Experience 2025.
Estoy aquí para ayudarte a que tu experiencia sea increíble. 😎

¿Listo para acelerar?  Puedo entregarte información sobre:

- **Agenda del día:** Horarios de cada actividad. 🗓️🕒

- **Información del evento:** Ubicación, transporte y detalles prácticos. 📍🚗📋

- **Productos APC Schneider Electric & Dell Technologies:** Descubre las soluciones que tenemos preparadas. 💻💡🔌

- **Bundles Exclusivos:** ¡Beneficios imperdibles te esperan! 🎁💰

¡No dudes en preguntar!  Estoy aquí para apoyarte en todo momento. 😉`;

// Tipos MIME para servir archivos estáticos correctamente
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Configuración para manejo de threads y optimización
const MAX_THREADS = process.env.MAX_THREADS ? parseInt(process.env.MAX_THREADS) : 100; // Máximo número de threads simultáneos
const THREAD_CLEANUP_INTERVAL = 900000; // Limpiar threads inactivos cada 15 minutos

module.exports = {
  PORT,
  ASSISTANT_ID,
  WELCOME_MESSAGE,
  MIME_TYPES,
  MAX_THREADS,
  THREAD_CLEANUP_INTERVAL
};
