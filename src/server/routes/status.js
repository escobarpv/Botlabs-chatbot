/**
 * Rutas para monitoreo y estado del servidor
 */

const { getMetrics } = require('../utils/monitoring');
const { getCacheStats } = require('../utils/file-utils');

/**
 * Maneja la solicitud de estado del servidor
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function handleStatusRequest(req, res) {
  // Verificar si es una solicitud autorizada (método simple)
  const authHeader = req.headers.authorization;
  const statusKey = process.env.STATUS_KEY || 'kartbot-monitor';
  
  if (!authHeader || authHeader !== `Bearer ${statusKey}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'No autorizado' }));
  }

  // Obtener métricas del sistema
  const metrics = getMetrics();
  const cacheStats = getCacheStats();
  
  // Devolver el estado completo
  const status = {
    timestamp: new Date().toISOString(),
    metrics,
    cache: cacheStats,
    processInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime()
    }
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(status, null, 2));
}

/**
 * Devuelve una respuesta simple para comprobar disponibilidad
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function handleHealthCheck(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }));
}

/**
 * Router para manejar solicitudes de estado
 * @param {string} pathname - Ruta de la solicitud
 * @param {string} method - Método HTTP
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 * @returns {boolean} - True si la ruta fue manejada, false en caso contrario
 */
function routeStatus(pathname, method, req, res) {
  // Verificación básica de salud
  if (pathname === '/health' && method === 'GET') {
    handleHealthCheck(req, res);
    return true;
  }
  
  // Estadísticas detalladas del servidor
  if (pathname === '/api/status' && method === 'GET') {
    handleStatusRequest(req, res);
    return true;
  }
  
  return false;
}

module.exports = {
  routeStatus
};
