// main.js (Versão Completa e Corrigida)

// 1. Importações do Electron e Node.js
const {
  app,
  BrowserWindow, // Para nossa janela customizada
  ipcMain,         // Para ouvir o botão "X"
  Tray,            // Para o ícone na bandeja
  Menu,            // Para o menu do ícone
  nativeImage,     // Para criar o ícone
  screen           // Para posicionar a janela
} = require('electron');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// --- Configuração do Supabase (A MESMA DO SEU index.html) ---
const SUPABASE_URL = 'https://qlfcttfdxcfemwbtcviv.supabase.co';
// [COLE A CHAVE CORRETA AQUI]
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsZmN0dGZkeGNmZW13YnRjdml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjQ1MDUsImV4cCI6MjA3Nzc0MDUwNX0.2Iv_rbUrFVNIF0veElaCq6DZoO-eHVWGx3TPqrTghGI';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
const channel = supabaseClient.channel('chamadas_emergencia');

const chatChannel = supabaseClient.channel('chat_room');
// -------------------------------------------------------------

// --- Variáveis Globais ---
let tray = null;         // Guarda o ícone da bandeja
let notifyWindow = null; // Guarda a janela de notificação
let closeTimer = null;   // Guarda o timer de 5 minutos
let activeCall = null;   // Guarda a chamada ativa

function showNotification(room, number) {
  // 1. Define o tempo de expiração (5 minutos)
  const DURATION_MS = 5 * 60 * 1000;
  const endTime = Date.now() + DURATION_MS;

  // 2. Salva a chamada como "ativa"
  activeCall = { room, number, endTime };

  // 3. Cancela qualquer timer de fechamento anterior
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }

  // 4. Cria a janela (se ela não existir)
  if (!notifyWindow) {
    console.log('Criando nova janela de notificação (para chamada)...');
    const windowWidth = 389; // <-- Altere de 600
    const windowHeight = 305; // <-- Altere de 400

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // main.js (Dentro da função showChatNotification)

    // Calcula a posição (canto inferior direito)
    const x = width - windowWidth; 
    const y = height - windowHeight;

    notifyWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      minWidth: 384,
      minHeight: 300,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    });

    notifyWindow.loadFile('notification.html');

    notifyWindow.on('closed', () => {
      notifyWindow = null;
      activeCall = null;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    });

    // Quando a janela carregar, envie os dados e mostre
    notifyWindow.webContents.on('did-finish-load', () => {
      console.log('Janela carregada, enviando dados da CHAMADA...');
      notifyWindow.webContents.send('notify', room, number, endTime);
      notifyWindow.show();
    });

  } else {
    // Se a janela JÁ EXISTE:
    console.log('Janela existente, enviando dados da CHAMADA...');
    notifyWindow.webContents.send('notify', room, number, endTime);
    notifyWindow.show();
  }

  // 5. Inicia o novo timer para FECHAR (esconder) a janela
  closeTimer = setTimeout(() => {
    console.log('Timer de 5 minutos expirou. Escondendo janela.');
    if (notifyWindow) {
      notifyWindow.hide();
    }
    activeCall = null; // A chamada não está mais "ativa"
    closeTimer = null;
  }, DURATION_MS);
}

function showChatNotification(message) {

  // [RESTANTE DA FUNÇÃO ORIGINAL]
  // Se não há chamada ativa, continue normalmente...

  // 1. Cria a janela (se ela não existir)
  if (!notifyWindow) {
    console.log('Criando nova janela de notificação (para chat)...');
    // Define a largura e altura
    const windowWidth = 389; // <-- Altere de 600
    const windowHeight = 305; // <-- Altere de 400

    // Pega as dimensões da tela principal
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Calcula a posição (canto inferior direito)
    const x = width - windowWidth; 
    const y = height - windowHeight;

    notifyWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: x,
      y: y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: true,
      minWidth: 384,
      minHeight: 300,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    });

    // Carrega o seu arquivo HTML
    notifyWindow.loadFile('notification.html');

    // Limpa a variável quando a janela for fechada (destruída)
    notifyWindow.on('closed', () => {
      notifyWindow = null;
      activeCall = null;
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    });

    // [LÓGICA CHAVE 1]
    // Quando a janela carregar PELA PRIMEIRA VEZ,
    // envie os dados do chat e mostre.
    notifyWindow.webContents.on('did-finish-load', () => {
      console.log('Janela carregada, enviando comando de chat...');

      // 1. Envia o comando para ABRIR a view de chat
      notifyWindow.webContents.send('show-chat');

      // 2. Envia a mensagem para ser adicionada à lista
      notifyWindow.webContents.send('chat-message', message);

      // 3. Mostra a janela
      notifyWindow.show();
    });

  } else {
    // [LÓGICA CHAVE 2]
    // Se a janela JÁ EXISTE (visível ou oculta):

    // 1. Envie o comando para ABRIR a view de chat.
    console.log('Janela existente, enviando comando de chat...');
    notifyWindow.webContents.send('show-chat');

    // 2. Envie a mensagem para ser adicionada à lista.
    notifyWindow.webContents.send('chat-message', message);

    // 3. Mostre a janela (se estiver oculta, ela aparece; se estiver visível, ela vem para frente).
    notifyWindow.show();
  }

  // Note: Nenhum closeTimer é iniciado aqui.
}

/**
 * Conecta ao Supabase Realtime e escuta por eventos de 'call'.
 */
function startSupabaseListener() {
  console.log('Conectando ao Supabase Realtime...');

  channel
    .on(
      'broadcast', // Escuta o evento 'broadcast'
      { event: 'call' }, // Filtra pelo evento 'call' (o mesmo que o painel envia)
      (message) => {
        // O payload vem dentro de message.payload
        const payload = message.payload;

        if (payload && payload.room && payload.number) {
          console.log(`✅ Chamada recebida via Supabase: Sala=${payload.room}, Número=${payload.number}`);

          // Chama a função para exibir a notificação
          showNotification(payload.room, payload.number);
        } else {
          console.warn('Mensagem de broadcast recebida sem payload esperado:', message);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Conectado e ouvindo o canal "chamadas_emergencia"!');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Erro ao conectar ao canal.');
      } else if (status === 'TIMED_OUT') {
        console.warn('⚠️ Conexão expirou (timeout).');
      } else {
        console.log(`Novo status do canal: ${status}`);
      }
    });

  // --- [NOVO BLOCO] Canal de CHAT ---
  chatChannel
    .on(
      'postgres_changes', // Ouvindo mudanças no banco
      {
        event: 'INSERT', // Especificamente no evento de INSERIR
        schema: 'public',
        table: 'chat_messages' // Na tabela chat_messages
      },
      (payload) => {
        // Quando uma nova mensagem (payload) chegar...
        console.log('✅ Nova mensagem de chat recebida no main.js:', payload.new);

        // [LÓGICA ALTERADA]
        // Em vez de apenas encaminhar a mensagem se a janela estiver aberta,
        // vamos chamar uma nova função que *garante* que a janela
        // abra E vá para a tela de chat.
        showChatNotification(payload.new);
      }
    )
    .subscribe((status) => {
      // ... (resto do subscribe sem alterações) ...
    });
}

/**
 * Cria o ícone na bandeja do sistema (System Tray) e o menu de contexto.
 */
function createTrayIcon() {

  // 1. Define o caminho e cria o ícone
  const iconPath = path.join(__dirname, 'icon.ico');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  /**
   * Função auxiliar para construir o menu (clique direito)
   */
  const buildContextMenu = (isCallActive) => {
    let statusItem;

    if (isCallActive) {
      statusItem = {
        label: `Ativa: ${activeCall.room} - Nº ${activeCall.number}`,
        enabled: false
      };
    } else {
      statusItem = {
        label: 'Nenhuma chamada ativa',
        enabled: false
      };
    }

    return Menu.buildFromTemplate([
      statusItem,
      { type: 'separator' },
      { label: 'Sair', click: () => { app.quit(); } }
    ]);
  };

  /**
   * Lógica do Clique Esquerdo (Ação Principal)
   * Reexibe a notificação se ela estiver ativa.
   */
  tray.on('click', () => {
    // 1. Verifica se a chamada está ativa
    if (activeCall && Date.now() < activeCall.endTime) {

      // 2. Se a chamada está ativa, MOSTRA A JANELA
      if (notifyWindow) {
        notifyWindow.show();
      } else {
        // 3. (Fallback) Se a janela não existir, recria
        showNotification(activeCall.room, activeCall.number);
      }

    } else {
      // 4. Se NÃO há chamada, mostra o menu "Nenhuma chamada"
      const contextMenu = buildContextMenu(false);
      tray.popUpContextMenu(contextMenu);
    }
  });

  /**
   * Lógica do Clique Direito (Menu de Opções)
   * Mostra o status e o botão "Sair".
   */
  tray.on('right-click', () => {
    const isActive = (activeCall && Date.now() < activeCall.endTime);
    const contextMenu = buildContextMenu(isActive);
    tray.popUpContextMenu(contextMenu);
  });

  // 4. Define um "tooltip" (texto ao passar o mouse)
  tray.setToolTip('Receptor de Chamadas (Ativo)');
}

/**
 * Ouve o pedido 'get-history' vindo do preload.js,
 * consulta o Supabase e retorna os dados.
 */
ipcMain.handle('get-history', async () => {
  console.log('Recebido pedido de histórico...');

  // 1. Define o intervalo de "hoje" (lógica do index.html)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const startOfToday = today.toISOString();
  const startOfTomorrow = tomorrow.toISOString();

  try {
    // 2. Faz a consulta (SELECT) filtrada no Supabase
    // Puxando 'sala' (nome), 'numero' e 'created_at' da tabela 'chamadas'
    const { data, error } = await supabaseClient
      .from('chamadas')
      .select('sala, numero, created_at')
      .gte('created_at', startOfToday)
      .lt('created_at', startOfTomorrow)
      .order('created_at', { ascending: false }); // Mais recentes primeiro

    if (error) {
      console.error("Erro ao buscar histórico:", error.message);
      return { error: error.message }; // Retorna o erro
    }

    console.log(`Histórico encontrado: ${data.length} itens.`);
    return { data: data }; // Retorna os dados

  } catch (err) {
    console.error("Erro inesperado no get-history:", err.message);
    return { error: err.message };
  }
});

// [ADICIONE ESTE NOVO BLOCO - Perto do 'ipcMain.handle('get-history')']

/**
 * Ouve o pedido 'get-chat-history', consulta o Supabase
 * e retorna as últimas 50 mensagens.
 */
ipcMain.handle('get-chat-history', async () => {
  console.log('Recebido pedido de histórico do chat...');

  try {
    // 1. Faz a consulta (SELECT) na tabela 'chat_messages'
    const { data, error } = await supabaseClient
      .from('chat_messages')
      .select('sender_name, message_content, created_at') // Seleciona só o que precisamos
      .order('created_at', { ascending: false }) // Pega as mais recentes primeiro
      .limit(50); // Limita a 50 mensagens

    if (error) {
      console.error("Erro ao buscar histórico do chat:", error.message);
      return { error: error.message }; // Retorna o erro
    }

    // 2. IMPORTANTE: Os dados vieram (Mais Recente -> Mais Antigo)
    // Precisamos invertê-los para (Mais Antigo -> Mais Recente)
    // para que a lógica do separador de data funcione corretamente.
    const orderedData = data.reverse();

    console.log(`Histórico do chat encontrado: ${orderedData.length} itens.`);
    return { data: orderedData }; // Retorna os dados ordenados

  } catch (err) {
    console.error("Erro inesperado no get-chat-history:", err.message);
    return { error: err.message };
  }
});

// [ADICIONE ESTE NOVO BLOCO NO MAIN.JS]

/**
 * Ouve o pedido 'send-chat-message' vindo do preload.js,
 * insere a mensagem no Supabase e retorna o resultado.
 */
ipcMain.handle('send-chat-message', async (event, messageData) => {
  // messageData deve ser algo como:
  // { sender_name: 'Mídia', message_content: 'Olá' }

  console.log('Recebido pedido para enviar chat:', messageData);

  try {
    // 1. Tenta inserir no Supabase
    const { error } = await supabaseClient
      .from('chat_messages') // O nome da sua tabela de chat
      .insert([messageData]); // Insere o objeto da mensagem

    if (error) {
      // 2. Se o Supabase retornar um erro
      console.error("Erro ao enviar mensagem:", error.message);
      return { error: error.message }; // Retorna o erro para a janela
    }

    // 3. Se tudo deu certo
    console.log('Mensagem enviada ao Supabase com sucesso.');
    return { success: true }; // Retorna sucesso

  } catch (err) {
    // 4. Se o próprio código falhar (ex: sem internet)
    console.error("Erro inesperado no send-chat-message:", err.message);
    return { error: err.message };
  }
});

// Ouve o sinal 'close-notify-window' vindo do preload.js (botão "X")
ipcMain.on('close-notify-window', () => {
  if (notifyWindow) {
    notifyWindow.hide(); // Apenas esconde, não fecha/destrói
  }
});


// --- CICLO DE VIDA DO APLICATIVO ELECTRON ---

// Executa quando o Electron está pronto para iniciar
app.whenReady().then(() => {

  // ID do App para notificações no Windows (Importante!)
  if (process.platform === 'win32') {
    app.setAppUserModelId('io.github.silasdouglas.painel-emergencia-supabase');
  }

  // Inicia o ouvinte do Supabase
  startSupabaseListener();

  // Chama a função para criar o ícone na bandeja
  createTrayIcon();
});

// Mantém o app rodando em segundo plano mesmo se todas as janelas forem fechadas
app.on('window-all-closed', () => {
  // Não faz nada (não chama app.quit()),
  // assim o app continua rodando em segundo plano.
});