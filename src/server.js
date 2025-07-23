/**
 * KartBot Server - Punto de entrada
 * 
 * Servidor de NodeJS que proporciona una interfaz de chat para interactuar con
 * un asistente de OpenAI, manteniendo conversaciones por sesión.
 */

// Carga variables de entorno desde archivo .env
require('dotenv').config();

// === IMPORTACIONES ===
const fs = require('fs');
const path = require('path');
const { ASSISTANT_ID, MAX_THREADS, PORT } = require('./server/config/config');
const { ensureDirectoryExists } = require('./server/utils/file-utils');
const { startServer, shutdownServer } = require('./server/core/httpServer');

// === INICIALIZACIÓN ===
console.log('Inicializando KartBot Server...');

// Crear estructura de directorios si no existen
ensureDirectoryExists(path.join(__dirname, 'client/public'));
ensureDirectoryExists(path.join(__dirname, 'client/public/css'));
ensureDirectoryExists(path.join(__dirname, 'client/public/js'));
ensureDirectoryExists(path.join(__dirname, 'client/public/images'));

// Iniciar servidor HTTP
const server = startServer(() => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
  console.log(`Accede a la aplicación en: http://localhost:${PORT}/`);
  console.log(`Usando Assistant ID: ${ASSISTANT_ID}`);
  console.log(`Capacidad máxima: ${MAX_THREADS} threads simultáneos`);
  console.log(`Servidor optimizado para 50-100 usuarios concurrentes`);
});

// === MANEJO DE ERRORES Y CIERRE GRACEFUL ===

// Manejar señales de terminación
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => shutdownServer(server, signal));
});

// Capturar excepciones no manejadas
process.on('uncaughtException', (err) => {
  console.error('Excepción no capturada:', err);
  shutdownServer(server, 'uncaughtException');
});

// Configurar reintentos para conexiones rechazadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', promise, 'razón:', reason);
});

console.log('KartBot Server iniciado correctamente');
