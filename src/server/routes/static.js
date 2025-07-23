/**
 * Rutas para archivos estáticos
 */

const path = require('path');
const fs = require('fs');
const { serveStaticFile } = require('../utils/file-utils');

/**
 * Router para manejar archivos estáticos
 * @param {string} pathname - Ruta de la solicitud
 * @param {string} method - Método HTTP
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 * @returns {boolean} - True si la ruta fue manejada, false en caso contrario
 */
function routeStatic(pathname, method, req, res) {
  // Solo maneja solicitudes GET para archivos estáticos
  if (method !== 'GET') {
    return false;
  }

  // Ruta raíz sirve index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Construir ruta al archivo solicitado
  const clientDir = path.join(__dirname, '..', '..', 'client');
  const publicDir = path.join(clientDir, 'public');
  const filePath = path.join(publicDir, pathname);

  // Verificar si el archivo existe en la carpeta public
  if (fs.existsSync(filePath)) {
    serveStaticFile(filePath, res);
    return true;
  }

  // Si no existe en public, buscar en la raíz del cliente (solo para index.html)
  if (pathname === '/index.html') {
    const rootFilePath = path.join(clientDir, 'index.html');
    if (fs.existsSync(rootFilePath)) {
      serveStaticFile(rootFilePath, res);
      return true;
    }
  }

  // Archivo no encontrado
  res.writeHead(404);
  res.end('Archivo no encontrado');
  return true;
}

module.exports = {
  routeStatic
};
