// notification.js

// --- Variável para guardar o ID do timer ---
let countdownInterval = null;

// [NOVA VARIÁVEL]
let currentCopyString = ""; // Guarda o texto correto a ser copiado

// --- Constantes e Elementos Globais ---
const BASE_RGB_COLOR = "47, 49, 54"; // O RGB de #2f3136
const OPACITY_STORAGE_KEY = "notificationOpacity";

const CHAT_SENDER_NAME = "Mídia"; // Nome de quem envia a partir deste app

let lastMessageDateStr = null; // Rastreador da data do chat

// --- Seletores de Elementos ---
const container = document.querySelector('.container');
const settingsBtn = document.getElementById('settings-btn');
const closeBtn = document.getElementById('close-btn');
const opacitySlider = document.getElementById('opacity-slider');

// Seletores das "Views"
const mainView = document.getElementById('main-view');
const settingsView = document.getElementById('settings-view');

// Seletores do Histórico
const historyBtn = document.getElementById('history-btn');
const historyView = document.getElementById('history-view');
const historyList = document.getElementById('history-list');

// [NOVOS SELETORES DE CHAT]
const chatBtn = document.getElementById('chat-btn');
const chatView = document.getElementById('chat-view');
const chatList = document.getElementById('chat-list');

const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

// [NOVOS SELETORES] (O restante que já existia)
const copyBtn = document.getElementById('copy-btn'); // Botão de copiar

const displayCopyText = document.getElementById('display-copy-text'); // Texto a ser exibido

// --- Listener do botão "X" ---
closeBtn.addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

// --- Lógica do Botão de Copiar [BLOCO TOTALMENTE CORRIGIDO] ---
copyBtn.addEventListener('click', async () => {
  
  // 1. [CORRIGIDO] Pega o texto da nossa variável "mestra",
  //    NÃO do que está visível na tela.
  const textToCopy = currentCopyString;

  // Segurança: não faz nada se a variável estiver vazia
  if (!textToCopy) return; 

  try {
    // 2. Copia o texto correto
    await navigator.clipboard.writeText(textToCopy);

    // 3. Feedback visual (mostra "Copiado!")
    displayCopyText.textContent = 'Copiado!';

    // 4. Restaura o texto original após 1.5s
    setTimeout(() => {
      // [CORRIGIDO] Restaura usando a variável "mestra"
      displayCopyText.textContent = currentCopyString;
    }, 1500);

  } catch (err) {
    console.error('Falha ao copiar:', err);
    
    // Feedback de erro
    displayCopyText.textContent = 'Erro ao copiar!';
    
    // Restaura o texto original após 1.5s
    setTimeout(() => {
      // [CORRIGIDO] Restaura usando a variável "mestra"
      displayCopyText.textContent = currentCopyString;
    }, 1500);
  }
});


// --- Lógica do Painel de Configurações ---

function applySavedOpacity() {
  const savedOpacity = localStorage.getItem(OPACITY_STORAGE_KEY) || "20";
  const sliderValue = parseInt(savedOpacity, 10);
  const opacityValue = 120 - sliderValue;
  const alpha = opacityValue / 100;
  container.style.backgroundColor = `rgba(${BASE_RGB_COLOR}, ${alpha})`;
  opacitySlider.value = sliderValue;
}

opacitySlider.addEventListener('input', () => {
  const sliderValue = parseInt(opacitySlider.value, 10);
  const opacityValue = 120 - sliderValue;
  const alpha = opacityValue / 100;
  container.style.backgroundColor = `rgba(${BASE_RGB_COLOR}, ${alpha})`;
  localStorage.setItem(OPACITY_STORAGE_KEY, sliderValue.toString());
});

// [ADICIONE ESTE BLOCO - Funções Helper do Chat]

/**
 * Retorna uma string de estilo CSS para colorir o nome do remetente.
 * (Baseado nas cores do index.html, mas adaptado para esta UI).
 */
function getChatSenderStyle(senderName) {
  switch (senderName) {
    case 'Berçário':
      return `color: var(--accent-number);`; // Laranja
    case '02 a 04 anos':
      return `color: #E53935;`; // Vermelho
    case '05 a 08 anos':
      return `color: var(--accent-call);`; // Verde
    case '09 a 12 anos':
      return `color: #8E24AA;`; // Roxo
    default:
      return `color: var(--font-color-label);`; // Cinza
  }
}

// [ADICIONE ESTA NOVA FUNÇÃO HELPER]

/**
 * Formata uma data para o separador de chat (ex: "Hoje", "Ontem", "10/11/2025")
 * @param {Date} dateObj O objeto Date da mensagem
 * @returns {string} O texto formatado
 */
function getFormattedDateLabel(dateObj) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Zera a hora para comparar apenas os dias
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);

  // Clona o dateObj para não modificar o original ao comparar
  const dateToCompare = new Date(dateObj.getTime());
  dateToCompare.setHours(0, 0, 0, 0);

  if (dateToCompare.getTime() === today.getTime()) {
    return 'Hoje';
  }

  if (dateToCompare.getTime() === yesterday.getTime()) {
    return 'Ontem';
  }

  // Formato DD/MM/AAAA
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// [SUBSTITUA ESTA FUNÇÃO]

// [SUBSTITUA A FUNÇÃO 'addChatMessageToUI' INTEIRA PELA VERSÃO ABAIXO]

/**
 * Cria e adiciona o elemento HTML da mensagem ao painel de chat.
 * [MODIFICADO] Agora inclui separadores de data.
 * @param {object} message O objeto da mensagem vindo do Supabase
 */
function addChatMessageToUI(message) {
  const { sender_name, message_content, created_at } = message;

  // --- [NOVO BLOCO DE DATA] ---
  try {
    const messageDate = new Date(created_at);
    // Formato 'YYYY-MM-DD' para comparação
    const currentMessageDateStr = messageDate.toISOString().split('T')[0];

    // Compara com a data da última mensagem
    if (currentMessageDateStr !== lastMessageDateStr) {
      // A data mudou! Precisamos adicionar um separador.
      const dateLabel = getFormattedDateLabel(messageDate);

      const separatorEl = document.createElement('div');
      separatorEl.className = 'chat-date-separator'; // Classe do CSS
      separatorEl.innerHTML = `<span>${dateLabel}</span>`;

      // Limpa o "Ouvindo..." antes de adicionar o separador
      const listeningP = chatList.querySelector('p');
      if (listeningP) {
        listeningP.remove();
      }

      chatList.appendChild(separatorEl);

      // Atualiza o rastreador
      lastMessageDateStr = currentMessageDateStr;
    }
  } catch (e) {
    console.warn("Timestamp inválido para separador:", created_at);
  }
  // --- [FIM DO BLOCO DE DATA] ---


  // 1. Formata a hora (lógica existente)
  let timeString = '';
  try {
    const date = new Date(created_at);
    if (!isNaN(date.getTime())) {
      timeString = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (e) { /* Ignora erro de data */ }

  // 2. Cria o elemento da mensagem (lógica existente)
  const messageEl = document.createElement('div');

  // 3. Lógica de Alinhamento (Self vs Other) (lógica existente)
  if (sender_name === CHAT_SENDER_NAME) {
    // É nossa (Mídia)
    messageEl.className = 'chat-message self';
    messageEl.innerHTML = `
      <span>${message_content}</span>
      <span style="font-size: 0.7rem; color: var(--font-color-label); align-self: flex-end; margin-top: 2px;">
        (${timeString})
      </span>
    `;
  } else {
    // É de outro (Berçário, etc.)
    const senderStyle = getChatSenderStyle(sender_name);
    messageEl.className = 'chat-message other';
    messageEl.innerHTML = `
      <strong style="${senderStyle}">${sender_name} <span style="font-weight: 400; color: var(--font-color-label); font-size: 0.7rem;">(${timeString})</span></strong>
      <span>${message_content}</span>
    `;
  }

  // 4. Limpa a mensagem "Ouvindo..." (se ainda existir)
  const listeningP = chatList.querySelector('p');
  if (listeningP) {
    listeningP.remove();
  }

  // 5. Adiciona ao DOM e faz o auto-scroll (lógica existente)
  chatList.appendChild(messageEl);
  chatList.scrollTop = chatList.scrollHeight;
}

/**
 * Alterna a visualização para Configurações
 */
settingsBtn.addEventListener('click', () => {
  // Remove a outra tela ativa, se houver
  container.classList.remove('history-active');
  container.classList.remove('chat-active'); // [LINHA ADICIONADA]

  // Alterna a tela atual
  container.classList.toggle('settings-active');
});

// [ADICIONE ESTE BLOCO NOVO]

/**
 * Lida com o envio do formulário de chat.
 * Pega o texto, envia para o main.js e lida com a resposta.
 */
async function handleSendMessage(event) {
  event.preventDefault(); // Impede o recarregamento da página

  const messageText = chatInput.value.trim();
  if (!messageText) {
    return; // Não envia mensagens vazias
  }

  // Desativa o formulário para evitar envios duplicados
  chatInput.disabled = true;
  chatSendBtn.disabled = true;
  chatInput.value = 'Enviando...'; // Feedback visual

  // Prepara o objeto da mensagem
  const messageData = {
    sender_name: CHAT_SENDER_NAME,
    message_content: messageText
  };

  try {
    // 1. Envia para o main.js (via preload) e espera a resposta
    const response = await window.electronAPI.sendChatMessage(messageData);

    if (response.error) {
      // 2. Se o main.js retornou um erro (ex: falha no Supabase)
      console.error('Falha ao enviar mensagem:', response.error);
      // Opcional: Mostrar erro na UI
      chatInput.value = 'Erro ao enviar!';
      setTimeout(() => {
        chatInput.value = messageText; // Restaura o texto original
      }, 2000);

    } else if (response.success) {
      // 3. Sucesso!
      console.log('Mensagem enviada com sucesso.');
      chatInput.value = ''; // Limpa o campo

      // Não precisamos adicionar a mensagem manualmente.
      // O Supabase Realtime (que já configuramos) vai:
      // 1. Detectar o 'INSERT'
      // 2. Avisar o main.js
      // 3. O main.js avisa o notification.js
      // 4. O 'onChatMessage' vai exibir a mensagem (inclusive a nossa).
    }

  } catch (err) {
    // 4. Se o próprio 'invoke' falhar (erro mais sério)
    console.error('Erro no IPC invoke:', err);
    chatInput.value = 'Erro crítico!';
  } finally {
    // 5. Reativa o formulário
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    // Se o valor não foi limpo (sucesso) ou alterado (erro),
    // ele será reativado com o texto que o usuário tentou enviar.
    if (chatInput.value === 'Enviando...' || chatInput.value === 'Erro ao enviar!' || chatInput.value === 'Erro crítico!') {
      chatInput.value = ''; // Limpa em caso de erro final
    }
  }
}

// [ADICIONE ESTA NOVA FUNÇÃO - Perto de 'handleSendMessage']

/**
 * Busca o histórico de chat do main.js e o exibe na tela.
 */
async function loadChatHistory() {
  // 1. Reseta o rastreador de data
  // Isso força o addChatMessageToUI a recalcular o separador de data.
  lastMessageDateStr = null; 

  // 2. Mostra o estado de carregamento
  chatList.innerHTML = '<p>Carregando histórico...</p>';

  try {
    // 3. Pede os dados ao main.js (via preload)
    const { data, error } = await window.electronAPI.getChatHistory();

    if (error) {
      chatList.innerHTML = `<p style="color: #faa61a;">Erro: ${error}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      chatList.innerHTML = '<p>Nenhuma mensagem no histórico.</p>';
      return;
    }

    // 4. Limpa o "Carregando"
    chatList.innerHTML = '';

    // 5. Constrói a lista de chat
    // Os dados já vêm ordenados (antigo -> novo) do main.js
    data.forEach(message => {
      addChatMessageToUI(message);
    });

  } catch (err) {
    chatList.innerHTML = `<p style="color: #faa61a;">Erro: ${err.message}</p>`;
  }
}

// notification.js

// ... (perto das outras funções helper) ...

/**
 * [NOVA FUNÇÃO]
 * Força a abertura da visualização do chat.
 * APENAS muda a classe CSS, não carrega o histórico.
 */
function showChatView() {
  // Se já estiver visível, não faz nada
  if (container.classList.contains('chat-active')) {
    return; 
  }

  // Garante que as outras telas estão fechadas
  container.classList.remove('settings-active');
  container.classList.remove('history-active');

  // Abre a tela de chat
  container.classList.add('chat-active');
}

// Associa a função ao evento 'submit' do formulário
chatForm.addEventListener('submit', handleSendMessage);

/**
 * Alterna a visualização para Histórico e busca os dados
 */
historyBtn.addEventListener('click', async () => {
  // Remove a outra tela ativa, se houver
  container.classList.remove('settings-active');
  container.classList.remove('chat-active'); // [MODIFICADO]

  // Se já estiver aberto, apenas fecha
  if (container.classList.contains('history-active')) {
    container.classList.remove('history-active');
    return;
  }

  // Mostra a tela de histórico e o "Carregando"
  container.classList.add('history-active');
  historyList.innerHTML = '<p>Buscando histórico...</p>';

  try {
    // 1. Pede os dados ao main.js (via preload)
    const { data, error } = await window.electronAPI.getHistory();

    if (error) {
      historyList.innerHTML = `<p style="color: #faa61a;">Erro: ${error}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      historyList.innerHTML = '<p>Nenhuma chamada hoje.</p>';
      return;
    }

    // 2. Constrói o HTML do histórico
    const htmlList = data.map(call => {
      // Pega a hora da chamada (ex: "14:35:10")
      const hora = new Date(call.created_at).toLocaleTimeString();
      const sala = call.sala;
      const numero = String(call.numero).padStart(2, '0');

      return `
        <div class="history-item">
          [${hora}] <span>${sala}</span> - Nº <span>${numero}</span>
        </div>
      `;
    }).join(''); // Junta todos os itens

    // 3. Insere a lista no HTML
    historyList.innerHTML = htmlList;

  } catch (err) {
    historyList.innerHTML = `<p style="color: #faa61a;">Erro: ${err.message}</p>`;
  }
});

// notification.js

// [SUBSTITUA O LISTENER DO 'chatBtn' ANTIGO POR ESTE]

/**
 * Alterna a visualização para Chat e carrega o histórico.
 */
chatBtn.addEventListener('click', async () => {
  // Verifica se o chat já está ativo (vamos fechar)
  const isChatAlreadyActive = container.classList.contains('chat-active');

  if (isChatAlreadyActive) {
    // Estava aberto, vamos fechar
    container.classList.remove('chat-active');
    lastMessageDateStr = null; // Limpa o rastreador de data
  } else {
    // Estava fechado, vamos abrir E carregar o histórico
    showChatView(); // Ativa a view
    await loadChatHistory(); // Popula com o histórico
  }
});


/**
 * Helper: Formata milissegundos em uma string MM:SS
 */
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}


// --- Listener Principal (Recebe dados do main.js) ---
window.electronAPI.onNotify((room, number, endTime) => {
  console.log('Dados recebidos:', room, number, 'Fecha em:', new Date(endTime));

  applySavedOpacity();

  // Garante que a view de notificação está visível
  // Esconde as telas de config/histórico ao receber nova chamada
  container.classList.remove('settings-active');
  container.classList.remove('history-active');

  container.classList.remove('chat-active');

  lastMessageDateStr = null; // Reseta o chat quando uma nova chamada chega

  // Atualiza os elementos na tela
  const roomLabel = document.getElementById('room-label');
  const numberLabel = document.getElementById('number-label');

  roomLabel.textContent = room.toUpperCase() || '---';
  numberLabel.textContent = String(number).padStart(2, '0') || '--';

  // [LÓGICA CORRIGIDA] Constrói e exibe a string de copiar

  // Linha removida: const formattedRoom = room.split(' ')[0];

  const formattedNumber = String(number).padStart(2, '0');

  // [LÓGICA ATUALIZADA] Adiciona "de" após "Sala", exceto para berçário
  const roomText = (room.toLowerCase() === 'berçário')
    ? room // Continua: "Berçário"
    : `Sala de ${room}`; // Alterado: "Sala de 1", "Sala de 2", etc.

  // 1. Cria a string final
  const textToSet = `Departamento Infantil | ${roomText} | Ficha ${formattedNumber}`;

  // 2. Salva na nossa variável "mestra"
  currentCopyString = textToSet;

  // 3. [A LINHA QUE FALTAVA!] Exibe o texto na tela
  displayCopyText.textContent = textToSet;

  // --- Lógica do Contador Regressivo ---
  const timerElement = document.getElementById('countdown-timer');

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  function updateTimer() {
    const now = Date.now();
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      timerElement.textContent = 'Fechando...';
      clearInterval(countdownInterval);
    } else {
      timerElement.textContent = `Fechando em ${formatTime(remainingMs)}`;
    }
  }

  countdownInterval = setInterval(updateTimer, 1000);
  updateTimer(); // Chama imediatamente
});

// notification.js

// [ADICIONE ESTE BLOCO - Perto dos outros listeners 'window.electronAPI...']

/**
 * Ouve o comando 'show-chat' vindo do main.js (via preload)
 * e força a abertura da tela de chat.
 */
window.electronAPI.onShowChat(() => {
  console.log('Recebido comando "show-chat" do main.js');

  // Apenas MOSTRA a view.
  showChatView();

  // A mensagem real será adicionada pelo listener 'onChatMessage',
  // que o main.js envia logo em seguida.
  // O `loadChatHistory` SÓ deve ser chamado quando o
  // *usuário* clica no botão de chat (como fizemos acima).
});


/**
 * Ouve por novas mensagens de chat vindas do main.js
 */
window.electronAPI.onChatMessage((message) => {
  // ... (esta função já existe, sem alterações)
});

// [ADICIONE ESTE BLOCO - Perto do listener 'onNotify']

/**
 * Ouve por novas mensagens de chat vindas do main.js
 */
window.electronAPI.onChatMessage((message) => {
  console.log('Mensagem de chat recebida no renderer:', message);

  // Adiciona a mensagem à UI
  addChatMessageToUI(message);

  // [Opcional] Se a mensagem chegar e o painel de chat não estiver
  // visível, podemos adicionar um indicador no botão (ex: um ponto).
  // Por enquanto, apenas adicionamos ao painel.
});