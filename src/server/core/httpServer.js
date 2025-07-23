/**
 * Configuración y gestión del servidor HTTP
 */

const http = require('http');
const url = require('url');
const { PORT } = require('../config/config');
const { routeApi } = require('../routes/api');
const { routeStatic } = require('../routes/static');
const { routeStatus } = require('../routes/status');
const { startRequest, endRequest, errorRequest } = require('../utils/monitoring');

// Registro de conexiones activas
const connections = new Set();

// Mapa para rastrear conexiones por IP para prevenir abuso
const connectionsByIp = new Map();
const MAX_CONNECTIONS_PER_IP = 25; // Aumentado para soportar más conexiones por IP
const CONNECTION_TIMEOUT = 30000; // 30 segundos

/**
 * Limpia las conexiones antiguas por IP
 */
function cleanupConnectionsByIp() {
  const now = Date.now();
  for (const [ip, connData] of connectionsByIp.entries()) {
    // Filtrar conexiones que hayan expirado
    connData.timestamps = connData.timestamps.filter(
      timestamp => (now - timestamp) < CONNECTION_TIMEOUT
    );
    
    // Si no hay más conexiones activas para esta IP, eliminar la entrada
    if (connData.timestamps.length === 0) {
      connectionsByIp.delete(ip);
    } else {
      connData.count = connData.timestamps.length;
    }
  }
}

/**
 * Registra una conexión para una IP
 * @param {string} ip - Dirección IP del cliente
 * @returns {boolean} - True si la conexión está permitida, false en caso contrario
 */
function registerConnection(ip) {
  if (!connectionsByIp.has(ip)) {
    connectionsByIp.set(ip, { count: 1, timestamps: [Date.now()] });
    return true;
  }
  
  const connData = connectionsByIp.get(ip);
  
  // Si hay demasiadas conexiones recientes desde esta IP, rechazar
  if (connData.count >= MAX_CONNECTIONS_PER_IP) {
    return false;
  }
  
  // Registrar timestamp de la nueva conexión
  connData.timestamps.push(Date.now());
  connData.count++;
  return true;
}

/**
 * Maneja las solicitudes entrantes
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function requestHandler(req, res) {
  const requestStartTime = startRequest(); // Inicio de medición de tiempo

  // Obtener dirección IP del cliente
  const ip = req.socket.remoteAddress || 
             req.headers['x-forwarded-for']?.split(',')[0].trim();
             
  // Limitar número de conexiones por IP
  if (!registerConnection(ip)) {
    res.writeHead(429);
    res.end('Demasiadas solicitudes. Inténtelo más tarde.');
    errorRequest(); // Registra error en monitoreo
    return;
  }
  
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Pre-vuelo CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Establecer timeout para la solicitud
  req.setTimeout(30000, () => {
    res.writeHead(408);
    res.end('Tiempo de espera agotado');
    errorRequest(); // Registra error en monitoreo
  });
  
  // Wrapper para res.end para registrar fin de solicitud
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    endRequest(requestStartTime); // Finaliza medición de tiempo
    return originalEnd.call(this, chunk, encoding);
  };
  
  // Analizar la URL solicitada
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // Rutas de monitoreo con prioridad
  if (routeStatus(pathname, req.method, req, res)) {
    return;
  }
  
  // Intentar manejar la solicitud como API
  if (routeApi(pathname, req.method, req, res)) {
    return;
  }
  
  // Si no es una API, tratar como archivo estático
  routeStatic(pathname, req.method, req, res);
}

/**
 * Crea e inicializa el servidor HTTP
 * @returns {http.Server} - Instancia del servidor HTTP
 */
function createServer() {
  const server = http.createServer(requestHandler);
  
  // Establecer límites de tiempo de espera para el servidor
  server.timeout = 120000; // 2 minutos
  server.keepAliveTimeout = 5000; // 5 segundos
  server.headersTimeout = 60000; // 60 segundos
  
  // Registro de conexiones
  server.on('connection', (connection) => {
    connections.add(connection);
    
    // Establecer timeout para la conexión
    connection.setTimeout(60000); // 60 segundos
    
    connection.on('close', () => {
      connections.delete(connection);
    });
    
    connection.on('timeout', () => {
      connection.end();
    });
  });
  
  // Manejar errores del servidor
  server.on('error', (err) => {
    console.error('Error en el servidor:', err);
  });
  
  // Iniciar limpieza periódica de conexiones por IP
  setInterval(cleanupConnectionsByIp, 60000); // Cada minuto
  
  return server;
}

/**
 * Inicia el servidor HTTP en el puerto configurado
 * @param {Function} callback - Función a ejecutar después de iniciar
 * @returns {http.Server} - Instancia del servidor iniciado
 */
function startServer(callback) {
  const server = createServer();
  
  server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
    console.log(`URL local: http://localhost:${PORT}/`);
    if (callback) callback();
  });
  
  return server;
}

/**
 * Cierra el servidor HTTP de manera controlada
 * @param {http.Server} server - Instancia del servidor a cerrar
 * @param {string} signal - Señal que causó el cierre
 */
function shutdownServer(server, signal) {
  console.log(`Recibida señal ${signal}, cerrando servidor...`);
  
  // Dejar de aceptar nuevas conexiones
  server.close(() => {
    console.log('Servidor cerrado, todas las conexiones terminadas');
    process.exit(0);
  });
  
  // Establecer un timeout para cierre forzado si el cierre normal tarda demasiado
  setTimeout(() => {
    console.error('No se pudo cerrar con gracia, forzando salida');
    process.exit(1);
  }, 30000); // 30 segundos de timeout
  
  // Cerrar conexiones existentes
  for (const connection of connections) {
    connection.end();
    connection.destroy();
  }
}

module.exports = {
  startServer,
  shutdownServer
};
