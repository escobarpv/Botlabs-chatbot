/**
 * Utilidades para manejo de archivos estáticos
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { MIME_TYPES } = require('../config/config');

// Caché de archivos estáticos
const fileCache = new Map();
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB máximo de caché
let currentCacheSize = 0;

// Compresión preferida por tipo de archivo
const COMPRESSIBLE_TYPES = [
  'text/html', 'text/css', 'text/plain', 'application/javascript',
  'application/json', 'application/xml', 'text/xml', 'application/rss+xml',
  'image/svg+xml'
];

/**
 * Sirve un archivo estático al cliente
 * @param {string} filePath - Ruta al archivo a servir
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function serveStaticFile(filePath, res) {
  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'text/plain';
  
  // Verificar si el archivo está en caché
  if (fileCache.has(filePath)) {
    const cacheEntry = fileCache.get(filePath);
    
    // Verificar si el archivo ha sido modificado
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error(`Error al verificar archivo ${filePath}:`, err);
        res.writeHead(500);
        res.end('Error interno del servidor');
        return;
      }
      
      // Si el archivo no ha sido modificado, servir desde caché
      if (stats.mtime.getTime() === cacheEntry.mtime.getTime()) {
        serveFromCache(filePath, contentType, res);
        return;
      }
      
      // Si fue modificado, recargar y actualizar caché
      loadAndCacheFile(filePath, contentType, res);
    });
  } else {
    // No está en caché, cargar y cachear
    loadAndCacheFile(filePath, contentType, res);
  }
}

/**
 * Sirve un archivo desde la caché
 * @param {string} filePath - Ruta al archivo
 * @param {string} contentType - Tipo MIME del archivo
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function serveFromCache(filePath, contentType, res) {
  const cacheEntry = fileCache.get(filePath);
  const acceptEncoding = res.req.headers['accept-encoding'] || '';
  
  // Determinar si podemos usar compresión
  if (acceptEncoding.includes('gzip') && cacheEntry.gzipped) {
    setCacheHeaders(res, contentType, 86400, 'gzip');
    res.end(cacheEntry.gzipped);
  } else if (acceptEncoding.includes('deflate') && cacheEntry.deflated) {
    setCacheHeaders(res, contentType, 86400, 'deflate');
    res.end(cacheEntry.deflated);
  } else {
    setCacheHeaders(res, contentType, 86400);
    res.end(cacheEntry.data);
  }
}

/**
 * Carga un archivo y lo guarda en caché
 * @param {string} filePath - Ruta al archivo
 * @param {string} contentType - Tipo MIME del archivo
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 */
function loadAndCacheFile(filePath, contentType, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Archivo no encontrado');
      } else {
        res.writeHead(500);
        res.end('Error interno del servidor');
        console.error(`Error al leer archivo ${filePath}:`, err);
      }
      return;
    }
    
    // Obtener la fecha de modificación
    fs.stat(filePath, (statErr, stats) => {
      if (statErr) {
        setCacheHeaders(res, contentType, 3600); // 1 hora si hay error
        res.end(data);
        return;
      }
      
      // Preparar entrada de caché
      const cacheEntry = { 
        data, 
        mtime: stats.mtime,
        size: stats.size
      };
      
      // Comprimir archivo si es de tipo compresible y tiene tamaño suficiente
      if (COMPRESSIBLE_TYPES.includes(contentType) && stats.size > 1024) {
        // Comprimir con gzip para navegadores modernos
        zlib.gzip(data, (gzipErr, gzipped) => {
          if (!gzipErr) {
            cacheEntry.gzipped = gzipped;
          }
          
          // También comprimir con deflate para compatibilidad
          zlib.deflate(data, (deflateErr, deflated) => {
            if (!deflateErr) {
              cacheEntry.deflated = deflated;
            }
            
            addToCache(filePath, cacheEntry);
            
            // Servir con compresión apropiada si disponible
            const acceptEncoding = res.req.headers['accept-encoding'] || '';
            if (acceptEncoding.includes('gzip') && cacheEntry.gzipped) {
              setCacheHeaders(res, contentType, 86400, 'gzip');
              res.end(cacheEntry.gzipped);
            } else if (acceptEncoding.includes('deflate') && cacheEntry.deflated) {
              setCacheHeaders(res, contentType, 86400, 'deflate');
              res.end(cacheEntry.deflated);
            } else {
              setCacheHeaders(res, contentType, 86400);
              res.end(data);
            }
          });
        });
      } else {
        // Archivo no compresible o muy pequeño
        addToCache(filePath, cacheEntry);
        setCacheHeaders(res, contentType, 86400);
        res.end(data);
      }
    });
  });
}

/**
 * Añade un archivo a la caché, controlando el tamaño total
 * @param {string} filePath - Ruta del archivo
 * @param {Object} cacheEntry - Entrada de caché con datos y metadatos
 */
function addToCache(filePath, cacheEntry) {
  // Calcular el tamaño total de este elemento en caché
  let entrySize = cacheEntry.data.length;
  if (cacheEntry.gzipped) entrySize += cacheEntry.gzipped.length;
  if (cacheEntry.deflated) entrySize += cacheEntry.deflated.length;
  
  // Si ya existe en caché, restar su tamaño anterior
  if (fileCache.has(filePath)) {
    const oldEntry = fileCache.get(filePath);
    let oldSize = oldEntry.data.length;
    if (oldEntry.gzipped) oldSize += oldEntry.gzipped.length;
    if (oldEntry.deflated) oldSize += oldEntry.deflated.length;
    
    currentCacheSize -= oldSize;
  }
  
  // Verificar si excede el tamaño máximo de caché
  if (currentCacheSize + entrySize > MAX_CACHE_SIZE) {
    // Necesitamos hacer espacio, eliminar elementos más antiguos
    const entries = Array.from(fileCache.entries())
      .sort((a, b) => a[1].mtime.getTime() - b[1].mtime.getTime());
    
    while (currentCacheSize + entrySize > MAX_CACHE_SIZE && entries.length > 0) {
      const [oldestPath, oldestEntry] = entries.shift();
      
      // Calcular tamaño del elemento a eliminar
      let sizeToRemove = oldestEntry.data.length;
      if (oldestEntry.gzipped) sizeToRemove += oldestEntry.gzipped.length;
      if (oldestEntry.deflated) sizeToRemove += oldestEntry.deflated.length;
      
      // Eliminar de caché y actualizar contadores
      fileCache.delete(oldestPath);
      currentCacheSize -= sizeToRemove;
    }
  }
  
  // Añadir nueva entrada y actualizar tamaño de caché
  fileCache.set(filePath, cacheEntry);
  currentCacheSize += entrySize;
}

/**
 * Establece los encabezados de caché para respuestas HTTP
 * @param {http.ServerResponse} res - Objeto de respuesta HTTP
 * @param {string} contentType - Tipo MIME del contenido
 * @param {number} maxAge - Tiempo máximo de caché en segundos
 * @param {string} [encoding] - Codificación de compresión (gzip/deflate)
 */
function setCacheHeaders(res, contentType, maxAge, encoding) {
  const headers = { 
    'Content-Type': contentType,
    'Cache-Control': `public, max-age=${maxAge}`,
    'Expires': new Date(Date.now() + maxAge * 1000).toUTCString()
  };
  
  if (encoding) {
    headers['Content-Encoding'] = encoding;
    headers['Vary'] = 'Accept-Encoding';
  }
  
  res.writeHead(200, headers);
}

/**
 * Limpia archivos antiguos de la caché
 * @param {number} maxAge - Tiempo máximo de permanencia en caché (ms)
 */
function cleanupCache(maxAge = 3600000) { // 1 hora por defecto
  const now = Date.now();
  let freedSpace = 0;
  
  for (const [filePath, { mtime, data, gzipped, deflated }] of fileCache.entries()) {
    if ((now - mtime.getTime()) > maxAge) {
      // Calcular espacio liberado
      let entrySize = data.length;
      if (gzipped) entrySize += gzipped.length;
      if (deflated) entrySize += deflated.length;
      
      fileCache.delete(filePath);
      currentCacheSize -= entrySize;
      freedSpace += entrySize;
    }
  }
  
  if (freedSpace > 0) {
    console.log(`Caché limpiada: ${(freedSpace/1024/1024).toFixed(2)}MB liberados`);
  }
}

/**
 * Verifica si un directorio existe, si no, lo crea
 * @param {string} dirPath - Ruta del directorio a verificar/crear
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Carpeta ${path.basename(dirPath)} creada`);
  }
}

/**
 * Obtiene estadísticas sobre la caché de archivos
 * @returns {Object} Estadísticas de caché
 */
function getCacheStats() {
  return {
    itemCount: fileCache.size,
    totalSize: `${(currentCacheSize/1024/1024).toFixed(2)}MB`,
    maxSize: `${(MAX_CACHE_SIZE/1024/1024).toFixed(2)}MB`,
    usagePercent: (currentCacheSize / MAX_CACHE_SIZE * 100).toFixed(2) + '%'
  };
}

// Limpiar caché periódicamente
setInterval(() => cleanupCache(), 3600000); // Cada hora

module.exports = {
  serveStaticFile,
  ensureDirectoryExists,
  cleanupCache,
  getCacheStats
};
