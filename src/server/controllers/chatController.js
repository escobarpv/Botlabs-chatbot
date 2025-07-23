/**
 * Controladores para las rutas de chat
 */

const { 
  processUserMessage, 
  resetUserThread, 
  getWelcomeMessage 
} = require('../services/assistantService');

/**
 * Procesa la solicitud de chat del cliente y transmite la respuesta del asistente
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function handleChatRequest(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const userMessage = data.message;
      const sessionId = data.sessionId || 'default';
      
      // Validación de la entrada
      if (!userMessage || typeof userMessage !== 'string' || userMessage.trim() === '') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Mensaje vacío o inválido' }));
      }

      try {
        const result = await processUserMessage(userMessage, sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error('Error procesando mensaje:', err);
        const statusCode = err.statusCode || 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Error procesando el mensaje' }));
      }
    } catch (err) {
      console.error('Error al procesar body:', err);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Solicitud mal formada' }));
    }
  });
}

/**
 * Maneja la solicitud de reinicio de conversación
 * @param {http.IncomingMessage} req - Objeto de solicitud HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function handleResetThread(req, res) {
  let body = '';
  req.on('data', chunk => { body += chunk });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const sessionId = data.sessionId || 'default';
      
      try {
        const result = await resetUserThread(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Thread reiniciado',
          welcomeMessage: getWelcomeMessage()
        }));
      } catch (err) {
        const statusCode = err.statusCode || 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Solicitud mal formada' }));
    }
  });
}

module.exports = {
  handleChatRequest,
  handleResetThread
};
