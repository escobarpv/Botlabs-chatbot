/**
 * Utilidades para monitoreo de rendimiento y uso
 */

// Métricas de rendimiento
const metrics = {
  // Solicitudes
  requestsTotal: 0,
  requestsSuccess: 0,
  requestsError: 0,
  
  // OpenAI
  apiCalls: 0,
  apiErrors: 0,
  
  // Rendimiento
  responseTimes: [],
  activeThreads: 0,
  
  // Uso de memoria
  memorySnapshots: [],
  
  // Métricas de carga
  concurrentRequests: 0,
  maxConcurrentRequests: 0,
  lastMinuteRequests: 0,
  requestsPerMinute: []
};

// Timestamp de inicio
const startTime = Date.now();

/**
 * Registra el inicio de una solicitud
 * @returns {number} Timestamp para calcular duración
 */
function startRequest() {
  metrics.requestsTotal++;
  metrics.concurrentRequests++;
  
  // Actualizar máximo de solicitudes concurrentes
  if (metrics.concurrentRequests > metrics.maxConcurrentRequests) {
    metrics.maxConcurrentRequests = metrics.concurrentRequests;
  }
  
  // Añadir a contador de último minuto
  metrics.lastMinuteRequests++;
  
  return Date.now();
}

/**
 * Registra el fin de una solicitud exitosa
 * @param {number} startTime - Timestamp de inicio
 */
function endRequest(startTime) {
  metrics.requestsSuccess++;
  metrics.concurrentRequests = Math.max(0, metrics.concurrentRequests - 1);
  const duration = Date.now() - startTime;
  metrics.responseTimes.push(duration);
  
  // Mantener solo las últimas 100 mediciones
  if (metrics.responseTimes.length > 100) {
    metrics.responseTimes.shift();
  }
}

/**
 * Registra un error en una solicitud
 */
function errorRequest() {
  metrics.requestsError++;
  metrics.concurrentRequests = Math.max(0, metrics.concurrentRequests - 1);
}

/**
 * Registra una llamada a la API de OpenAI
 */
function apiCall() {
  metrics.apiCalls++;
}

/**
 * Registra un error en la API de OpenAI
 */
function apiError() {
  metrics.apiErrors++;
}

/**
 * Actualiza el conteo de threads activos
 * @param {number} count - Número de threads activos
 */
function updateActiveThreads(count) {
  metrics.activeThreads = count;
}

/**
 * Toma una instantánea del uso de memoria actual
 */
function snapshotMemory() {
  const memUsage = process.memoryUsage();
  metrics.memorySnapshots.push({
    timestamp: Date.now(),
    rss: Math.round(memUsage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) // MB
  });
  
  // Mantener solo las últimas 60 mediciones
  if (metrics.memorySnapshots.length > 60) {
    metrics.memorySnapshots.shift();
  }
}

/**
 * Actualiza métricas de uso por minuto
 */
function updateRequestsPerMinute() {
  metrics.requestsPerMinute.push(metrics.lastMinuteRequests);
  metrics.lastMinuteRequests = 0;
  
  // Mantener solo los últimos 60 minutos
  if (metrics.requestsPerMinute.length > 60) {
    metrics.requestsPerMinute.shift();
  }
}

/**
 * Obtiene las métricas resumidas
 * @returns {Object} Resumen de métricas
 */
function getMetrics() {
  // Calcular tiempo promedio de respuesta
  let avgResponseTime = 0;
  if (metrics.responseTimes.length > 0) {
    avgResponseTime = metrics.responseTimes.reduce((sum, time) => sum + time, 0) / 
                     metrics.responseTimes.length;
  }
  
  // Calcular uso de memoria actual
  const memUsage = process.memoryUsage();
  
  // Calcular tasa de solicitudes por minuto
  let avgRequestsPerMinute = 0;
  if (metrics.requestsPerMinute.length > 0) {
    avgRequestsPerMinute = metrics.requestsPerMinute.reduce((sum, count) => sum + count, 0) / 
                         metrics.requestsPerMinute.length;
  }
  
  return {
    uptime: Math.round((Date.now() - startTime) / 1000), // segundos
    requests: {
      total: metrics.requestsTotal,
      success: metrics.requestsSuccess,
      error: metrics.requestsError,
      successRate: metrics.requestsTotal ? 
                  (metrics.requestsSuccess / metrics.requestsTotal * 100).toFixed(2) + '%' : '0%',
      concurrent: metrics.concurrentRequests,
      maxConcurrent: metrics.maxConcurrentRequests,
      perMinute: Math.round(avgRequestsPerMinute)
    },
    performance: {
      avgResponseTime: Math.round(avgResponseTime) + 'ms',
      activeThreads: metrics.activeThreads
    },
    openai: {
      calls: metrics.apiCalls,
      errors: metrics.apiErrors,
      errorRate: metrics.apiCalls ? 
                (metrics.apiErrors / metrics.apiCalls * 100).toFixed(2) + '%' : '0%'
    },
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
    },
    load: {
      status: getServerLoadStatus(metrics.concurrentRequests, avgRequestsPerMinute)
    }
  };
}

/**
 * Determina el estado de carga del servidor
 * @param {number} concurrentRequests - Solicitudes simultáneas actuales
 * @param {number} requestsPerMinute - Promedio de solicitudes por minuto
 * @returns {string} - Estado de carga (normal, medium, high, critical)
 */
function getServerLoadStatus(concurrentRequests, requestsPerMinute) {
  if (concurrentRequests > 80 || requestsPerMinute > 500) {
    return 'critical';
  } else if (concurrentRequests > 50 || requestsPerMinute > 300) {
    return 'high';
  } else if (concurrentRequests > 20 || requestsPerMinute > 100) {
    return 'medium';
  } else {
    return 'normal';
  }
}

// Tomar snapshot de memoria periódicamente
setInterval(snapshotMemory, 60000); // cada minuto

// Actualizar métricas de solicitudes por minuto
setInterval(updateRequestsPerMinute, 60000); // cada minuto

// Exportar funciones
module.exports = {
  startRequest,
  endRequest,
  errorRequest,
  apiCall,
  apiError,
  updateActiveThreads,
  getMetrics
};
