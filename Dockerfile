# KartBot - Dockerfile optimizado para producción

# Usar Node.js LTS
FROM node:20-slim as base

# Metadata
LABEL maintainer="Karting Experience Team"
LABEL description="KartBot - Asistente de Karting Experience 2025"
LABEL version="1.0"

# Directorio de trabajo
WORKDIR /app

# Configuración de entorno para producción
ENV NODE_ENV=production
ENV PORT=8080

# Etapa de construcción separada para optimizar capas
FROM base as build

# Instalar dependencias para compilación
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
    python3 pkg-config build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias primero (para aprovechar la caché)
COPY package*.json ./
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Crear la carpeta public si no existe
RUN mkdir -p ./public

# Etapa final para la imagen de la aplicación
FROM base

# Copiar node_modules y código compilado desde la etapa de build
COPY --from=build /app /app

# Crear un usuario no-root para ejecutar la aplicación
RUN groupadd -r kartbot && \
    useradd -r -g kartbot -d /app kartbot && \
    chown -R kartbot:kartbot /app

# Cambiar al usuario no privilegiado
USER kartbot

# Exponer el puerto configurado en la variable de entorno PORT
EXPOSE $PORT

# Healthcheck para verificar el estado del servicio
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:$PORT/ || exit 1

# Comando para iniciar la aplicación - Corregido para usar la ruta correcta
CMD ["node", "src/server.js"]
