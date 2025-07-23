/**
 * Servicio para interactuar con el asistente de OpenAI
 */

const OpenAI = require('openai').default;
const { ASSISTANT_ID, WELCOME_MESSAGE, MAX_THREADS, THREAD_CLEANUP_INTERVAL } = require('../config/config');
const { apiCall, apiError, updateActiveThreads } = require('../utils/monitoring');

// Inicializa el cliente OpenAI con la API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Almacén en memoria para los threads de conversación de cada sesión
const userThreads = {};

// Cola de solicitudes pendientes cuando se alcanza el límite de concurrencia
const pendingRequests = [];
let activeCalls = 0;
const MAX_CONCURRENT_CALLS = 5; // Limitar llamadas concurrentes a la API

/**
 * Actualiza métricas de threads activos
 */
function updateThreadMetrics() {
  updateActiveThreads(Object.keys(userThreads).length);
}

/**
 * Limpia threads inactivos después de un tiempo
 */
function cleanupInactiveThreads() {
  const now = Date.now();
  const inactivityTimeout = 3600000; // 1 hora
  
  Object.entries(userThreads).forEach(([sessionId, threadData]) => {
    if ((now - threadData.lastActivity) > inactivityTimeout) {
      console.log(`Limpiando thread inactivo: ${threadData.threadId} (sesión: ${sessionId})`);
      delete userThreads[sessionId];
    }
  });
  
  updateThreadMetrics();
}

/**
 * Procesa la cola de solicitudes pendientes
 */
function processPendingRequests() {
  if (pendingRequests.length > 0 && activeCalls < MAX_CONCURRENT_CALLS) {
    const next = pendingRequests.shift();
    executeApiCall(next.fn, next.args, next.resolve, next.reject);
  }
}

/**
 * Ejecuta una llamada a la API con control de concurrencia
 * @param {Function} fn - Función a ejecutar
 * @param {Array} args - Argumentos para la función
 * @param {Function} resolve - Función de resolución
 * @param {Function} reject - Función de rechazo
 */
async function executeApiCall(fn, args, resolve, reject) {
  activeCalls++;
  apiCall();
  
  try {
    const result = await fn(...args);
    resolve(result);
  } catch (err) {
    apiError();
    console.error(`Error en llamada a API: ${err.message}`);
    reject(err);
  } finally {
    activeCalls--;
    processPendingRequests();
  }
}

/**
 * Envuelve una llamada a la API con una promesa y control de concurrencia
 * @param {Function} fn - Función de la API a llamar
 * @param {Array} args - Argumentos para la función
 * @returns {Promise} - Promesa que resuelve con el resultado
 */
function queueApiCall(fn, args) {
  return new Promise((resolve, reject) => {
    if (activeCalls < MAX_CONCURRENT_CALLS) {
      executeApiCall(fn, args, resolve, reject);
    } else {
      // Poner en cola
      pendingRequests.push({ fn, args, resolve, reject });
    }
  });
}

/**
 * Procesa un mensaje del usuario y obtiene una respuesta del asistente
 * @param {string} userMessage - Mensaje del usuario
 * @param {string} sessionId - ID de sesión del usuario
 * @returns {Promise<Object>} - Respuesta del asistente
 */
async function processUserMessage(userMessage, sessionId) {
  // Control de número de threads activos
  if (!userThreads[sessionId] && Object.keys(userThreads).length >= MAX_THREADS) {
    // Si hemos alcanzado el límite, intentar reutilizar un thread existente
    const oldestSessionId = Object.entries(userThreads)
      .sort(([, a], [, b]) => a.lastActivity - b.lastActivity)[0]?.[0];
    
    if (oldestSessionId) {
      console.log(`Reutilizando thread para sesión ${oldestSessionId}`);
      delete userThreads[oldestSessionId];
    } else {
      throw {
        statusCode: 503,
        message: 'Servidor ocupado. Inténtalo más tarde.',
        retry: true
      };
    }
  }

  // Inicialización del thread si no existe para esta sesión
  if (!userThreads[sessionId]) {
    try {
      // Crear nuevo thread en OpenAI
      const thread = await queueApiCall(
        openai.beta.threads.create.bind(openai.beta.threads), 
        []
      );
      
      userThreads[sessionId] = {
        threadId: thread.id,
        lastActivity: Date.now()
      };
      
      console.log(`Nuevo thread creado para sesión ${sessionId}: ${thread.id}`);
      updateThreadMetrics();
      
      // Añadir mensaje de bienvenida del asistente
      try {
        await queueApiCall(
          openai.beta.threads.messages.create.bind(openai.beta.threads.messages), 
          [thread.id, {
            role: "assistant",
            content: WELCOME_MESSAGE
          }]
        );
        console.log(`Mensaje de bienvenida añadido al thread ${thread.id}`);
      } catch (welcomeErr) {
        console.error('Error al añadir mensaje de bienvenida:', welcomeErr);
      }
    } catch (err) {
      console.error('Error al crear thread:', err);
      throw {
        statusCode: 500,
        message: 'Error al inicializar la conversación'
      };
    }
  }

  const threadId = userThreads[sessionId].threadId;
  userThreads[sessionId].lastActivity = Date.now();

  // Agregar mensaje del usuario al thread
  try {
    await queueApiCall(
      openai.beta.threads.messages.create.bind(openai.beta.threads.messages), 
      [threadId, {
        role: "user",
        content: userMessage
      }]
    );
  } catch (err) {
    console.error('Error al agregar mensaje al thread:', err);
    throw {
      statusCode: 500,
      message: 'Error al procesar tu mensaje'
    };
  }

  // Procesar respuesta mediante streaming
  return new Promise((resolve, reject) => {
    let replyText = "";
    
    try {
      openai.beta.threads.runs.stream(threadId, {
        assistant_id: ASSISTANT_ID
      })
        .on('textCreated', () => {
          console.log(`Respuesta iniciada para sesión ${sessionId}`);
        })
        .on('textDelta', (textDelta) => {
          replyText += textDelta.value;
        })
        .on('toolCallCreated', (toolCall) => {
          console.log(`Tool call creado: ${toolCall.type}`);
        })
        .on('toolCallDelta', (toolCallDelta) => {
          // Manejar salidas del intérprete de código si está habilitado
          if (toolCallDelta.type === 'code_interpreter') {
            if (toolCallDelta.code_interpreter.input) {
              replyText += toolCallDelta.code_interpreter.input;
            }
            if (toolCallDelta.code_interpreter.outputs) {
              replyText += "\noutput >\n";
              toolCallDelta.code_interpreter.outputs.forEach(output => {
                if (output.type === "logs") {
                  replyText += `\n${output.logs}\n`;
                }
              });
            }
          }
        })
        .on('error', (err) => {
          console.error('Error en stream:', err);
          apiError();
          reject({
            statusCode: 500,
            message: 'Error al generar la respuesta'
          });
        })
        .on('end', () => {
          resolve({ 
            reply: replyText,
            sessionId: sessionId
          });
          console.log(`Respuesta completada para sesión ${sessionId}`);
        });
    } catch (err) {
      console.error('Error al iniciar stream:', err);
      apiError();
      reject({
        statusCode: 500,
        message: 'Error al procesar la solicitud'
      });
    }
  });
}

/**
 * Reinicia el thread de un usuario
 * @param {string} sessionId - ID de sesión del usuario
 * @returns {Promise<boolean>} - True si se reinició correctamente
 */
async function resetUserThread(sessionId) {
  if (userThreads[sessionId]) {
    delete userThreads[sessionId];
    updateThreadMetrics();
    return true;
  } else {
    throw {
      statusCode: 404,
      message: 'Thread no encontrado'
    };
  }
}

/**
 * Obtiene el mensaje de bienvenida
 * @returns {string} - Mensaje de bienvenida
 */
function getWelcomeMessage() {
  return WELCOME_MESSAGE;
}

// Iniciar limpieza periódica de threads inactivos
setInterval(cleanupInactiveThreads, THREAD_CLEANUP_INTERVAL);

// Inicializar métricas
updateThreadMetrics();

module.exports = {
  processUserMessage,
  resetUserThread,
  getWelcomeMessage
};
