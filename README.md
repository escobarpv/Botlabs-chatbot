# 🏁 KartBot - Asistente Virtual para Karting Experience 2025

KartBot es un asistente virtual implementado como una aplicación de chat que utiliza la API de OpenAI Assistants para proporcionar información y responder preguntas relacionadas con el evento **Karting Experience 2025** organizado por APC Schneider Electric, Dell y Tecnoglobal.

![KartBot Preview](https://i.imgur.com/Rzi614z.png)

## ✨ Características

- **Interfaz de chat intuitiva**: Diseño responsivo y amigable para interactuar con el asistente.
- **Sesiones persistentes**: Mantiene conversaciones por usuario incluso si se actualiza la página.
- **Respuestas en tiempo real**: Streaming de respuestas del asistente para una experiencia más fluida.
- **Soporte Markdown**: Las respuestas pueden incluir formato, listas y más.
- **Gestión robusta de errores**: Manejo adecuado de situaciones de error para una experiencia confiable.

## 🛠️ Tecnologías utilizadas

- **Frontend**: HTML, CSS, JavaScript vanilla
- **Backend**: Node.js
- **AI**: OpenAI Assistants API
- **Despliegue**: Docker

## 📋 Requisitos previos

- Node.js 18+ 
- Cuenta en OpenAI con acceso a la API de Assistants
- API Key de OpenAI
- ID del Assistant configurado en OpenAI

## 🚀 Instalación y configuración

### Instalación local

1. Clonar el repositorio:
   ```bash
   git clone <url-repositorio>
   cd Kartbot
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   - Crea un archivo `.env` basado en `.env-example`:
   ```
   OPENAI_API_KEY=tu_api_key_aqui
   ASSISTANT_ID=id_del_assistant_aqui
   PORT=8080
   ```

4. Iniciar la aplicación:
   ```bash
   node server.js
   ```

5. Abrir el navegador en `http://localhost:8080`

### Instalación con Docker

1. Construir la imagen:
   ```bash
   docker build -t kartbot . 
   ```

2. Ejecutar el contenedor:
   ```bash
   docker run -p 8080:8080 \
     -e OPENAI_API_KEY=tu_api_key_aqui \
     -e ASSISTANT_ID=id_del_assistant_aqui \
     -d kartbot
   ```

3. Abrir el navegador en `http://localhost:8080`

## 🔧 Configuración avanzada

### Personalización del mensaje de bienvenida

Modifica la constante `WELCOME_MESSAGE` en el archivo `server.js` para cambiar el mensaje inicial que ve el usuario al comenzar una conversación.

### Configuración del Asistente en OpenAI

Para obtener resultados óptimos, el asistente debe ser configurado con:

1. **Instrucciones**: Información detallada sobre el evento Karting Experience 2025
2. **Base de conocimientos**: Documentos sobre horarios, ubicaciones, normas, etc.
3. **Capacidades habilitadas**: Code Interpreter si se desea que genere tablas o gráficos

## 📁 Estructura del proyecto

Kartbot/
├── server.js          # Servidor Node.js principal
├── index.html         # Interfaz de usuario del chat
├── public/            # Archivos estáticos (imágenes, CSS, JS)
├── .env               # Variables de entorno
├── package.json       # Dependencias y scripts
├── Dockerfile         # Configuración para contenedores Docker
└── README.md          # Documentación

## 🔄 Uso y funcionalidades

### Inicio de conversación
Al cargar la aplicación, KartBot saluda automáticamente con un mensaje de bienvenida que presenta las principales áreas sobre las que puede brindar asistencia:
- Horarios y ubicación del evento
- Información sobre bundles exclusivos APC-Dell
- Normas de seguridad en pista
- Detalles sobre menú y transporte

### Interacción con el chat
- **Envío de mensajes**: Escribe tu consulta en el campo de texto y presiona "Enviar" o la tecla Enter
- **Indicador de escritura**: Durante el procesamiento de la respuesta, verás un indicador "..." animado
- **Respuestas con formato**: KartBot puede responder utilizando formato Markdown, incluyendo:
  - Listas con viñetas
  - Enlaces
  - Texto en negrita o cursiva
  - Tablas de información

### Gestión de sesiones
- **Persistencia de conversaciones**: Tu conversación se mantiene incluso si actualizas la página
- **Identificación única**: Cada sesión de navegador recibe un ID único para mantener el contexto
- **Reinicio de conversación**: Si necesitas iniciar una nueva conversación, utiliza el botón "Reiniciar conversación" en la interfaz

### Información sobre el evento
KartBot puede proporcionar información detallada sobre:
- **Ubicación y horarios**: Dirección exacta del kartódromo, horarios de apertura y programación de actividades
- **Requisitos y normas**: Edad mínima, vestimenta recomendada, reglas de seguridad
- **Ofertas especiales**: Bundles y promociones disponibles para los participantes
- **Logística**: Opciones de transporte, estacionamiento y servicios disponibles

## 👥 Contribución

¿Quieres contribuir al proyecto? ¡Perfecto! Aquí está cómo puedes hacerlo:

1. **Fork** del proyecto
2. **Crea una rama** para tu feature (`git checkout -b feature/amazing-feature`)
3. **Haz commit** de tus cambios (`git commit -m 'Add some amazing feature'`)
4. **Push** a la rama (`git push origin feature/amazing-feature`)
5. Abre un **Pull Request**

### Áreas para contribuir
- Mejoras en la interfaz de usuario y experiencia
- Optimización del manejo de sesiones y conversaciones
- Expansión de funcionalidades (por ejemplo, compartir ubicación, recordatorios, etc.)
- Mejora de la documentación o ejemplos de uso

## 🔒 Seguridad

KartBot implementa las siguientes medidas de seguridad:
- **Sanitización de entradas**: Validación de todos los mensajes recibidos
- **Ejecución con privilegios mínimos**: En entornos Docker, el servicio se ejecuta como usuario no-root
- **Protección contra errores**: Manejo de excepciones para prevenir exposición de información sensible
- **Cierre graceful**: Manejo adecuado de señales de terminación para evitar pérdida de datos

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT** - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Contacto

Para cualquier pregunta o sugerencia sobre KartBot, contacta al equipo de desarrollo:
- **Email**: [kartbot-team@example.com](mailto:kartbot-team@example.com)
- **GitHub Issues**: Para reportar bugs o solicitar nuevas características

---

Desarrollado con ❤️ para Karting Experience 2025

