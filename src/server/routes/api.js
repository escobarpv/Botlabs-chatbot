/**
 * Rutas de API para SchneidBot
 */

const { handleChatRequest, handleResetThread } = require('../controllers/chatController');

/**
 * Router para manejar las solicitudes API
 * @param {string} pathname - Ruta de la solicitud
 * @param {string} method - Método HTTP
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 * @returns {boolean} - True si la ruta fue manejada, false en caso contrario
 */
function routeApi(pathname, method, req, res) {
  // Ruta: Enviar mensaje al chat
  if (pathname === '/api/chat' && method === 'POST') {
    handleChatRequest(req, res);
    return true;
  }
  
  // Ruta: Reiniciar thread/conversación
  if (pathname === '/api/reset-thread' && method === 'POST') {
    handleResetThread(req, res);
    return true;
  }
  
  return false;
}

module.exports = {
  routeApi
};
