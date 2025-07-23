// --- Auto-scroll chat to bottom on new message ---
function scrollChatToBottom() {
  const chat = document.getElementById('chat-container');
  if (chat) {
    setTimeout(() => {
      chat.scrollTop = chat.scrollHeight;
    }, 0);
  }
}
/**
 * Script de manejo del chat KartBot
 * 
 * Funcionalidades:
 * - Gestión de mensajes de usuario y asistente
 * - Comunicación con el backend vía API
 * - Persistencia de sesión
 * - Efectos visuales para mejor experiencia de usuario
 */

// === REFERENCIAS DOM ===
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// === VARIABLES GLOBALES ===
let typingInterval; // Para animar los puntos durante la espera

// Mensaje de bienvenida predeterminado
const defaultWelcomeMessage = `¡Hola! Soy KartBot, tu asistente virtual diseñado para que vivas al máximo el Karting Experience 2025.
Estoy aquí para ayudarte a que tu experiencia sea increíble. 😎

¿Listo para acelerar?  Puedo entregarte información sobre:

- **Agenda del día:** Horarios de cada actividad. 🗓️🕒

- **Información del evento:** Ubicación, transporte y detalles prácticos. 📍🚗📋

- **Productos APC Schneider Electric & Dell Technologies:** Descubre las soluciones que tenemos preparadas. 💻💡🔌

- **Bundles Exclusivos:** ¡Beneficios imperdibles te esperan! 🎁💰

¡No dudes en preguntar!  Estoy aquí para apoyarte en todo momento. 😉`;

// Gestión de sesión del usuario
let sessionId = localStorage.getItem('kartbotSessionId') || generateSessionId();

// === FUNCIONES AUXILIARES ===

/**
 * Elimina referencias de documentos en el texto de respuesta
 * @param {string} text - Texto a procesar
 * @return {string} Texto limpio sin referencias
 */
function removeReference(text) {
    return text.replace(/【\d+:\d+†[^】]+】/g, "");
}

/**
 * Genera un nuevo ID de sesión aleatorio
 * @return {string} ID de sesión generado
 */
function generateSessionId() {
    const id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kartbotSessionId', id);
    return id;
}

/**
 * Añade un mensaje al contenedor de chat
 * @param {string} text - Contenido del mensaje
 * @param {boolean} isAssistant - Si es mensaje del asistente (true) o usuario (false)
 */
function addMessage(text, isAssistant = false) {
    // Crear la estructura del mensaje
    const div = document.createElement('div');
    div.className = 'd-flex justify-content-' + (isAssistant ? 'start' : 'end') + ' mb-4';

    // Crear contenedor de avatar
    const imgCont = document.createElement('div');
    imgCont.className = 'img_cont_msg';

    // Crear avatar
    const img = document.createElement('img');
    img.src = isAssistant 
        ? '/images/kartbot-avatar.png' 
        : '/images/user-avatar.png';
    img.alt = 'avatar';
    img.className = 'rounded-circle user_img_msg';
    imgCont.appendChild(img);

    // Crear burbuja de mensaje
    const msgContainer = document.createElement('div');
    msgContainer.className = isAssistant ? 'msg_container' : 'msg_container_send';
    
    // Para mensajes del asistente: eliminar referencias y parsear Markdown
    msgContainer.innerHTML = isAssistant ? marked.parse(removeReference(text)) : text;

    // Distribuir elementos según el remitente
    if (isAssistant) {
        div.appendChild(imgCont);
        div.appendChild(msgContainer);
    } else {
        div.appendChild(msgContainer);
        div.appendChild(imgCont);
    }

    chatContainer.appendChild(div);
    scrollChatToBottom();
}

// Función "bot is typing..."
function showTypingMessage() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'd-flex justify-content-start mb-4 typingMessage';

  const imgCont = document.createElement('div');
  imgCont.className = 'img_cont_msg';

  const img = document.createElement('img');
  img.src = '/images/kartbot-avatar.png';
  img.alt = 'avatar';
  img.className = 'rounded-circle user_img_msg';

  imgCont.appendChild(img);

  const msgContainer = document.createElement('div');
  msgContainer.className = 'msg_container long-url';
  msgContainer.textContent = "‎";

  typingDiv.appendChild(imgCont);
  typingDiv.appendChild(msgContainer);

  chatContainer.appendChild(typingDiv);
  scrollChatToBottom();

  // Animacion de los puntos
  let dotCount = 0;
  typingInterval = setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      msgContainer.textContent = "‎" + '.'.repeat(dotCount);
  }, 500);
}

// Borrar "bot is typing..."
function removeTypingMessage() {
  const typingMessage = document.querySelector('.typingMessage');
  if (typingMessage) {
      typingMessage.remove();
      scrollChatToBottom();
  }
}

// Función que envía el mensaje del usuario y procesa la respuesta.
function sendMessage() {
  const text = userInput.value.trim();
  if (text !== '') {
    addMessage(text, false); // Publica el mensaje del usuario
    userInput.value = '';

    // Deshabilitar el botón y el campo de entrada
    sendBtn.disabled = true;
    userInput.disabled = true;
    sendBtn.textContent = 'Enviar';

    // Mostrar "bot is typing..." message
    showTypingMessage();

    fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: sessionId })
    })
    .then(response => response.json())
    .then(data => {
        // Borrar "bot is typing..." message
        removeTypingMessage();
        addMessage(data.reply, true); // Publica el mensaje del asistente
    })
    .catch(error => {
        removeTypingMessage();
        addMessage('Error al comunicarse con el servidor', true);
        console.error('Error:', error);
    })
    .finally(() => {
        // Rehabilitar el botón y el campo de entrada
        sendBtn.disabled = false;
        userInput.disabled = false;
        sendBtn.textContent = 'Enviar';
    });
  }
}

// === INICIALIZACIÓN ===

// Evento para enviar mensaje cuando se hace clic en el botón
sendBtn.addEventListener('click', sendMessage);

// Evento para enviar mensaje al presionar Enter dentro del campo de texto
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
      sendMessage();
  }
});

// Mostrar mensaje inicial de bienvenida del asistente
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar mensaje inicial
    addMessage(defaultWelcomeMessage, true);
    
    // Asegurarnos de que el input siempre sea de tipo texto
    const userInput = document.getElementById('userInput');
    // Forzar tipo texto al cargar la página
    userInput.type = 'text';
    
    // Evitar que otros scripts cambien el tipo
    userInput.addEventListener('input', function() {
        if (this.type !== 'text') {
            this.type = 'text';
        }
    });
});
